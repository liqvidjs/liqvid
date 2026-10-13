import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";
import puppeteer from "puppeteer-core";

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(HARNESS_DIR, "..");
const MEDIA_DIR = path.resolve(PACKAGE_DIR, "../media");
const TESTS_DIR = path.join(PACKAGE_DIR, "tests");
const BUILD_DIR = path.join(PACKAGE_DIR, "node_modules/.cache/renderer-tests");

export const VIEWPORT = { height: 480, width: 640 };
export const FRAME_SIZE = { height: 180, width: 320 };

let built;

async function buildFixture() {
  if (built) return built;
  built = (async () => {
    try {
      execFileSync(path.join(MEDIA_DIR, "node_modules/.bin/tsc"), {
        cwd: MEDIA_DIR,
        stdio: "ignore",
      });
    } catch {
      // The workspace has pre-existing type errors; tsc still emits output.
    }
    execFileSync(
      process.execPath,
      [path.join(MEDIA_DIR, "scripts/rewrite-worker-urls.mjs")],
      { cwd: MEDIA_DIR, stdio: "inherit" },
    );

    fs.rmSync(BUILD_DIR, { force: true, recursive: true });
    await esbuild.build({
      bundle: true,
      define: { "process.env.NODE_ENV": '"development"' },
      entryPoints: [path.join(HARNESS_DIR, "fixture.tsx")],
      format: "esm",
      jsx: "automatic",
      logLevel: "error",
      outdir: BUILD_DIR,
      plugins: [workerPlugin()],
    });
    fs.writeFileSync(
      path.join(BUILD_DIR, "index.html"),
      '<!doctype html><html><body style="margin:0"><div id="root"></div><script type="module" src="/app/fixture.js"></script></body></html>',
    );
    await esbuild.stop();
  })();
  return built;
}

function workerPlugin() {
  const pattern =
    /new Worker\(\s*new URL\(\s*(["'])(\.{1,2}\/[^"']+)\1\s*,\s*import\.meta\.url\s*\)/g;

  return {
    name: "media-worker-url",
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        if (!args.path.startsWith(path.join(MEDIA_DIR, "dist"))) return;
        let contents = await fs.promises.readFile(args.path, "utf8");
        const matches = [...contents.matchAll(pattern)];
        if (matches.length === 0) return;

        for (const match of matches) {
          const specifier = match[2];
          const entry = path.resolve(path.dirname(args.path), specifier);
          if (!fs.existsSync(entry)) {
            throw new Error(`Worker entry ${specifier} not found at ${entry}`);
          }
          const outputName = `worker-${path.basename(entry)}`;
          await esbuild.build({
            bundle: true,
            entryPoints: [entry],
            format: "esm",
            logLevel: "error",
            outfile: path.join(BUILD_DIR, outputName),
          });
          contents = contents.replace(
            match[0],
            match[0].replace(specifier, `./${outputName}`),
          );
        }
        return { contents, loader: "js" };
      });
    },
  };
}

function findChrome() {
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

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".png": "image/png",
  ".ts": "video/mp2t",
};

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname === "/favicon.ico") {
      response.writeHead(204).end();
      return;
    }
    let file;
    if (pathname === "/") {
      file = path.join(BUILD_DIR, "index.html");
    } else if (pathname.startsWith("/app/")) {
      file = path.join(BUILD_DIR, pathname.slice("/app/".length));
    } else if (pathname.startsWith("/tests/")) {
      file = path.join(TESTS_DIR, pathname.slice("/tests/".length));
    }
    if (!file?.startsWith(PACKAGE_DIR) || !fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }

    const data = fs.readFileSync(file);
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Length": data.length,
      "Content-Type":
        MIME_TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    response.end(data);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

export async function startHarness() {
  await buildFixture();
  const server = await startServer();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const browser = await puppeteer.launch({
    args: ["--autoplay-policy=no-user-gesture-required"],
    executablePath: findChrome(),
    headless: process.env.HEADLESS !== "false",
  });
  const page = await browser.newPage();
  await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
  page.on("pageerror", (error) => console.error("[page error]", error));
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error("[page console]", message.text());
    }
  });
  await page.goto(`${origin}/`);
  await page.waitForFunction(() => window.__fixture !== undefined, {
    timeout: 5_000,
  });

  return {
    close: async () => {
      await browser.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
    origin,
    page,
  };
}
