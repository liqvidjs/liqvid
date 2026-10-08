"use server";

import path from "node:path";

import {
  createJob,
  getConfig,
  getParameterizedAssetsDir,
  getRoutesDir,
  serverRuntime,
} from "@liqvid/studio/server";
import { packageNameToDirName } from "@liqvid/studio-plugin-api";
import { Effect, FileSystem } from "effect";
import { type AbsoluteDir, RelativeDir, type RelativeFile } from "effect-paths";

import type { LiqvidMediaPluginConfig } from "../liqvid-studio-server-plugin/config.ts";
import {
  AUDIO_WEBM,
  VIDEO_WEBM,
} from "../liqvid-studio-server-plugin/conventions.ts";
import {
  generatePlainTranscript,
  reprocessHls,
  wantsTranscription,
} from "../liqvid-studio-server-plugin.ts";

const MEDIA_PACKAGE_DIR = RelativeDir(packageNameToDirName("@liqvid/media"));

type RecordingActionArgs = {
  projectParams: Record<string, string>;
  projectPath: RelativeDir;
  recordingName: string;
};

/** Return the media-specific capability needed to show transcript controls. */
export async function canGeneratePlainTranscriptAction(): Promise<boolean> {
  return serverRuntime.runPromise(canGeneratePlainTranscript());
}

/** Start a background job to re-encode an existing video.webm into HLS. */
export async function reprocessHlsAction(
  args: RecordingActionArgs,
): Promise<{ jobId: string }> {
  return serverRuntime.runPromise(reprocessHlsActionEffect(args));
}

/** Generate the configured plain-text transcript and return the refreshed list. */
export async function generatePlainTranscriptAction(
  args: RecordingActionArgs,
): Promise<string[]> {
  return serverRuntime.runPromise(generatePlainTranscriptEffect(args));
}

const canGeneratePlainTranscript = Effect.fnUntraced(function* () {
  const config = yield* getConfig();
  const mediaConfig = config.plugins?.["@liqvid/media"] as
    | LiqvidMediaPluginConfig
    | undefined;
  return wantsTranscription(mediaConfig?.audio?.transcribe);
});

const reprocessHlsActionEffect = Effect.fnUntraced(function* (
  args: RecordingActionArgs,
) {
  const pluginDir = yield* getMediaRecordingDir(args);
  const config = yield* getMediaPluginConfig();
  yield* assertMediaFile(pluginDir, VIDEO_WEBM);

  const job = yield* createJob(
    `Reprocess HLS: ${args.recordingName}`,
    reprocessHls(pluginDir, config),
    { path: args.projectPath },
  );

  return { jobId: job.id };
});

const generatePlainTranscriptEffect = Effect.fnUntraced(function* (
  args: RecordingActionArgs,
) {
  const pluginDir = yield* getMediaRecordingDir(args);
  const projectConfig = yield* getConfig();
  const config = (projectConfig.plugins?.["@liqvid/media"] ??
    {}) as LiqvidMediaPluginConfig;
  const whisperConfig = projectConfig.media?.captioning?.smartWhisperOptions;

  if (!wantsTranscription(config.audio?.transcribe)) {
    return yield* Effect.fail(new Error("Transcription is not configured"));
  }

  if (!(yield* hasMediaFile(pluginDir, AUDIO_WEBM))) {
    yield* assertMediaFile(pluginDir, VIDEO_WEBM);
  }

  yield* generatePlainTranscript(pluginDir, config, whisperConfig);
  return yield* listFiles(pluginDir);
});

const getMediaPluginConfig = Effect.fnUntraced(function* () {
  const config = yield* getConfig();
  return (config.plugins?.["@liqvid/media"] ?? {}) as LiqvidMediaPluginConfig;
});

const getMediaRecordingDir = Effect.fnUntraced(function* ({
  projectParams,
  projectPath,
  recordingName,
}: RecordingActionArgs) {
  yield* assertSafePath(projectPath, "Invalid project path");
  yield* assertSafePath(recordingName, "Invalid recording name");

  for (const [key, value] of Object.entries(projectParams)) {
    yield* assertSafePath(key, "Invalid project parameter");
    yield* assertSafePath(value, "Invalid project parameter value");
  }

  for (const [, parameter] of projectPath.matchAll(/\[([^\]]+)\]/g)) {
    if (!projectParams[parameter!]) {
      return yield* Effect.fail(new Error("Missing project parameter value"));
    }
  }

  const routesDir = getRoutesDir();
  const assetsDir = getParameterizedAssetsDir(
    routesDir,
    projectPath,
    projectParams,
  );
  const recordingDir = path.join(
    assetsDir,
    RelativeDir("recordings"),
    RelativeDir(recordingName),
  );
  const pluginDir = path.join(recordingDir, MEDIA_PACKAGE_DIR);
  const fs = yield* FileSystem.FileSystem;
  const routesRealPath = yield* fs.realPath(routesDir);
  const recordingRealPath = yield* fs.realPath(recordingDir);
  const pluginRealPath = yield* fs.realPath(pluginDir);

  if (
    !isWithin(routesRealPath, recordingRealPath) ||
    !isWithin(recordingRealPath, pluginRealPath)
  ) {
    return yield* Effect.fail(new Error("Invalid recording directory"));
  }

  return pluginRealPath as AbsoluteDir;
});

const assertMediaFile = Effect.fnUntraced(function* (
  pluginDir: AbsoluteDir,
  filename: RelativeFile,
) {
  if (!(yield* hasMediaFile(pluginDir, filename))) {
    return yield* Effect.fail(new Error(`${filename} does not exist`));
  }
});

const hasMediaFile = Effect.fnUntraced(function* (
  pluginDir: AbsoluteDir,
  filename: RelativeFile,
) {
  const fs = yield* FileSystem.FileSystem;
  return yield* Effect.gen(function* () {
    const filePath = yield* fs.realPath(path.join(pluginDir, filename));
    if (!isWithin(pluginDir, filePath)) return false;
    const stat = yield* fs.stat(filePath);
    return stat.type === "File";
  }).pipe(Effect.catch(() => Effect.succeed(false)));
});

const listFiles = Effect.fnUntraced(function* (directory: AbsoluteDir) {
  const fs = yield* FileSystem.FileSystem;
  const files: string[] = [];

  const pending: Array<{ directory: AbsoluteDir; prefix: string }> = [
    { directory, prefix: "" },
  ];
  while (pending.length > 0) {
    const current = pending.pop()!;
    const entries = yield* fs.readDirectory(current.directory);
    for (const entry of entries) {
      const filename = current.prefix ? `${current.prefix}/${entry}` : entry;
      const entryPath = path.join(current.directory, RelativeDir(entry));
      const realPath = yield* fs
        .realPath(entryPath)
        .pipe(Effect.catch(() => Effect.succeed(undefined)));

      // Match readdir({ withFileTypes: true }): don't follow symbolic links.
      if (realPath === undefined || realPath !== entryPath) continue;

      const stat = yield* fs
        .stat(entryPath)
        .pipe(Effect.catch(() => Effect.succeed(undefined)));
      if (stat?.type === "Directory") {
        pending.push({ directory: entryPath, prefix: filename });
      } else if (stat?.type === "File") {
        files.push(filename);
      }
    }
  }

  return files.sort();
});

function assertSafePath(
  value: string,
  message: string,
): Effect.Effect<void, Error> {
  if (
    !value ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    return Effect.fail(new Error(message));
  }
  return Effect.void;
}

function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== "..")
  );
}
