import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(HARNESS_DIR, "../..");
const TESTS_DIR = path.join(PACKAGE_DIR, "tests");
const BUILD_DIR = path.join(PACKAGE_DIR, "node_modules/.cache/media-tests");

export const VIEWPORT = { height: 400, width: 600 };

export type Harness = Readonly<{
  browser: Browser;
  close: () => Promise<void>;
  origin: string;
  page: Page;
  /** Paths requested from the test server, in order. */
  requests: string[];
}>;

let built: Promise<void> | null = null;

/** Build the package with its real build script, then bundle the fixture. */
function buildOnce(): Promise<void> {
  built ??= (async () => {
    try {
      execFileSync(path.join(PACKAGE_DIR, "node_modules/.bin/tsc"), {
        cwd: PACKAGE_DIR,
        stdio: "ignore",
      });
    } catch {
      // The workspace has pre-existing type errors; tsc still emits.
    }
    execFileSync(
      process.execPath,
      [path.join(PACKAGE_DIR, "scripts/rewrite-worker-urls.mjs")],
      { cwd: PACKAGE_DIR, stdio: "inherit" },
    );

    fs.rmSync(BUILD_DIR, { force: true, recursive: true });
    await esbuild.build({
      bundle: true,
      define: {
        "import.meta.env.SSR": "false",
        "process.env.NODE_ENV": '"development"',
      },
      entryPoints: [path.join(HARNESS_DIR, "fixture.tsx")],
      format: "esm",
      jsx: "automatic",
      logLevel: "error",
      outdir: BUILD_DIR,
      plugins: [workerPlugin()],
      sourcemap: "inline",
    });
    fs.writeFileSync(
      path.join(BUILD_DIR, "index.html"),
      `<!doctype html><html lang="en"><body style="margin:0"><div id="root"></div><script type="module" src="/app/fixture.js"></script></body></html>`,
    );
    // Don't keep Jest alive with esbuild's service process.
    await esbuild.stop();
  })();
  return built;
}

/**
 * Emulates how application bundlers treat
 * `new Worker(new URL("./file.js", import.meta.url))`: the referenced file is
 * bundled as a separate worker entry, and the URL is rewritten to point at it.
 */
function workerPlugin(): esbuild.Plugin {
  const pattern =
    /new Worker\(\s*new URL\(\s*(["'])(\.{1,2}\/[^"']+)\1\s*,\s*import\.meta\.url\s*\)/g;

  return {
    name: "worker-url",
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        if (!args.path.startsWith(path.join(PACKAGE_DIR, "dist"))) return;
        let contents = await fs.promises.readFile(args.path, "utf8");
        const matches = [...contents.matchAll(pattern)];
        if (matches.length === 0) return;

        for (const match of matches) {
          const specifier = match[2]!;
          const entry = path.resolve(path.dirname(args.path), specifier);
          if (!fs.existsSync(entry)) {
            throw new Error(`Worker entry ${specifier} not found at ${entry}`);
          }
          const outName = `worker-${path.basename(entry)}`;
          await esbuild.build({
            bundle: true,
            entryPoints: [entry],
            format: "esm",
            logLevel: "error",
            outfile: path.join(BUILD_DIR, outName),
            sourcemap: "inline",
          });
          contents = contents.replace(
            match[0],
            match[0].replace(specifier, `./${outName}`),
          );
        }
        return { contents, loader: "js" };
      });
    },
  };
}

function findChrome(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  const cacheDir = path.join(os.homedir(), ".cache/puppeteer/chrome");
  if (fs.existsSync(cacheDir)) {
    for (const version of fs.readdirSync(cacheDir)) {
      candidates.push(
        path.join(
          cacheDir,
          version,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        path.join(cacheDir, version, "chrome-linux64/chrome"),
      );
    }
  }
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Could not find Chrome; set CHROME_PATH");
  return found;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".png": "image/png",
  ".ts": "video/mp2t",
};

function startServer(requests: string[]): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    requests.push(url.pathname);

    let file: string | null = null;
    if (url.pathname === "/") {
      file = path.join(BUILD_DIR, "index.html");
    } else if (url.pathname.startsWith("/app/")) {
      file = path.join(BUILD_DIR, url.pathname.slice("/app/".length));
    } else if (url.pathname.startsWith("/tests/")) {
      file = path.join(TESTS_DIR, url.pathname.slice("/tests/".length));
    }
    if (!file?.startsWith(PACKAGE_DIR) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }

    const data = fs.readFileSync(file);
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Length": data.length,
      "Content-Type":
        MIME_TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    res.end(data);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

export async function startHarness({
  browserArgs = [],
  init = [],
  nativeHls = false,
}: {
  browserArgs?: string[];
  /** Scripts evaluated before any page script (e.g. API instrumentation). */
  init?: (() => void)[];
  /**
   * Whether the browser reports native HLS support. Defaults to false so
   * tests exercise only the MediaBunny pipeline, regardless of the Chrome
   * version.
   */
  nativeHls?: boolean;
} = {}): Promise<Harness> {
  await buildOnce();

  const requests: string[] = [];
  const server = await startServer(requests);
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    args: ["--autoplay-policy=no-user-gesture-required", ...browserArgs],
    executablePath: findChrome(),
    headless: process.env.HEADLESS !== "false",
  });
  const page = await browser.newPage();
  await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
  page.on("pageerror", (error) => {
    console.error("[page error]", error);
  });
  await page.evaluateOnNewDocument((nativeHls: boolean) => {
    const original = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type: string) {
      if (type === "application/vnd.apple.mpegurl") {
        return nativeHls ? "maybe" : "";
      }
      return original.call(this, type);
    };
  }, nativeHls);
  for (const script of init) await page.evaluateOnNewDocument(script);
  await page.goto(`${origin}/`);
  await page.waitForFunction(() => window.__fixture !== undefined);

  return {
    browser,
    async close() {
      await browser.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
    origin,
    page,
    requests,
  };
}
