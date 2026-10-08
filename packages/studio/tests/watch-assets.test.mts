import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@jest/globals";
import { Fiber, Option } from "effect";
import { AbsoluteDir } from "effect-paths";

import { getServerState } from "../src/initialize.ts";
import { serverRuntime } from "../src/server-runtime.ts";
import { watchAssets } from "../src/services/watch-assets.ts";
import { initProjectFiles } from "../src/services/watch-project-files.ts";

const projectPath = "[lang]/lesson/[part]";

test("legacy metadata keeps asset watchers working", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "liqvid-watch-assets-"));
  const projectDir = path.join(root, "app", projectPath);
  const assetsDir = path.join(projectDir, ".liqvid");
  const parameterDir = path.join(assetsDir, "en", "fibonacci");
  const typesFile = path.join(assetsDir, "types.ts");
  const projectFiles = path.join(assetsDir, "project-files.json");
  const metaFile = path.join(parameterDir, "project-meta.json");
  const assetFile = path.join(parameterDir, "new-asset.txt");

  await mkdir(path.join(parameterDir, "recordings", "main"), {
    recursive: true,
  });
  await writeFile(
    path.join(projectDir, "project.json"),
    JSON.stringify({
      aspectRatio: "16:9",
      parameters: { lang: ["en"], part: ["fibonacci"] },
      title: "Test project",
    }),
  );
  await writeFile(path.join(projectDir, "page.tsx"), "export default null;");
  await writeFile(
    path.join(parameterDir, "recordings", "main", "recording-meta.json"),
    JSON.stringify({
      created: "2026-01-01T00:00:00.000Z",
      duration: { milliseconds: 1000 },
    }),
  );
  await writeProjectMeta(metaFile, false);

  const state = getServerState();
  const previous = {
    config: state.config,
    cwd: state.cwd,
    projects: state.projects,
  };
  state.config = Option.none();
  state.cwd = AbsoluteDir(root);
  state.projects = {};

  try {
    await serverRuntime.runPromise(initProjectFiles(state.projects));
    expect(state.projects).toHaveProperty(projectPath);

    const watcher = serverRuntime.runFork(watchAssets());
    try {
      await waitFor(
        async () => (await exists(typesFile)) && (await exists(projectFiles)),
      );

      await writeProjectMeta(metaFile, true);
      await waitFor(async () =>
        /fibonacci:\s*\{\s*main:\s*Recording</s.test(
          await readFile(typesFile, "utf8"),
        ),
      );

      await writeFile(assetFile, "new asset");
      await waitFor(async () => {
        const manifest = JSON.parse(await readFile(projectFiles, "utf8"));
        return manifest[".liqvid"]?.en?.fibonacci?.["new-asset.txt"] === null;
      });
    } finally {
      await serverRuntime.runPromise(Fiber.interrupt(watcher));
    }
  } finally {
    state.config = previous.config;
    state.cwd = previous.cwd;
    state.projects = previous.projects;
    await rm(root, { recursive: true, force: true });
  }
});

async function writeProjectMeta(file: string, chosen: boolean): Promise<void> {
  await writeFile(
    file,
    JSON.stringify({
      $schema: "https://liqvid.com/schemas/latest/project-meta-autogen.json",
      chosenRecordings: { main: chosen },
      duration: { m: 0, s: 1, ms: 0 },
    }),
  );
}

async function exists(file: string): Promise<boolean> {
  return readFile(file).then(
    () => true,
    () => false,
  );
}

async function waitFor(assertion: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await assertion()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(await assertion()).toBe(true);
}
