import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import { compare } from "@liqvid/utils";
import { safeGet } from "have-fun";
import { StatusCodes } from "http-status-codes";

import { RECORDING_META_FILE } from "../conventions.mts";
import type { DynamicImports } from "../next/api.mts";
import type {
  RecordingMeta,
  RecordingMetaFile,
} from "../schemas/recording-meta.mts";
import { RecordingMetaFile as RecordingMetaFileSchema } from "../schemas/recording-meta.mts";
import { loadJson } from "../utils/fs.mts";

export async function listRecordings(
  searchParams: URLSearchParams,
): Promise<Response> {
  const $url = safeGet(searchParams, "url");
  if ($url.isNone) {
    return Response.json(
      { error: "invalid" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  let projectDir = fileURLToPath($url.unwrap());
  if (projectDir.endsWith("page.tsx")) {
    projectDir = path.dirname(projectDir);
  }

  const assetsDir = path.join(projectDir, ".liqvid");

  // error if assets dir doesn't exist
  if (!fs.existsSync(assetsDir)) {
    return Response.json(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
  }

  const recordingsDir = path.join(assetsDir, "recordings");

  if (!fs.existsSync(recordingsDir)) {
    return Response.json([]);
  }

  const recordingNames = await fsp.readdir(recordingsDir);
  const $recordings = await Promise.all(
    recordingNames.map(async (name) => {
      const dir = path.join(recordingsDir, name);
      const recordingMeta = await loadJson(
        RecordingMetaFileSchema,
        path.join(dir, RECORDING_META_FILE),
      );
      const children = await fsp.readdir(dir);
      return recordingMeta.map((file) => ({
        ...file,
        name,
        plugins: children.filter((x) => x !== RECORDING_META_FILE),
      }));
    }),
  );

  const recordings = $recordings.reduce((acc, $curr) => {
    if ($curr.isErr) return acc;
    acc.push($curr.unwrap());
    return acc;
  }, [] as RecordingMeta[]);

  recordings.sort((a, b) => compare(a.created, b.created));

  return Response.json(recordings);
}

interface SaveRecordingMetadata {
  durationMs: number;
  plugins: Array<{
    key: string;
    isBlob: boolean;
    filename?: string;
  }>;
}

/**
 * Convert package name to directory name (replace / with .)
 */
function packageToDir(packageName: string): string {
  return packageName.replace(/\//g, ".");
}

/**
 * Save a new recording to disk.
 */
export async function saveRecording(
  searchParams: URLSearchParams,
  formData: FormData,
  dynamicImports: DynamicImports,
): Promise<Response> {
  const $url = safeGet(searchParams, "url");
  if ($url.isNone) {
    return Response.json(
      { error: "invalid" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  // Parse metadata
  const metadataStr = formData.get("metadata");
  if (typeof metadataStr !== "string") {
    return Response.json(
      { error: "missing metadata" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  let metadata: SaveRecordingMetadata;
  try {
    metadata = JSON.parse(metadataStr);
  } catch {
    return Response.json(
      { error: "invalid metadata" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  let projectDir = fileURLToPath($url.unwrap());
  if (projectDir.endsWith("page.tsx")) {
    projectDir = path.dirname(projectDir);
  }

  const assetsDir = path.join(projectDir, ".liqvid");

  // Create assets dir if it doesn't exist
  if (!fs.existsSync(assetsDir)) {
    await fsp.mkdir(assetsDir, { recursive: true });
  }

  const recordingsDir = path.join(assetsDir, "recordings");
  if (!fs.existsSync(recordingsDir)) {
    await fsp.mkdir(recordingsDir, { recursive: true });
  }

  // Create recording directory with ISO datetime name
  const recordingName = new Date().toISOString().replace(/[:.]/g, "-");
  const recordingDir = path.join(recordingsDir, recordingName);
  await fsp.mkdir(recordingDir, { recursive: true });

  // Write recording-meta.json
  const recordingMeta: RecordingMetaFile = {
    created: new Date().toISOString(),
    duration: {
      milliseconds: metadata.durationMs,
    },
  };
  await fsp.writeFile(
    path.join(recordingDir, RECORDING_META_FILE),
    JSON.stringify(recordingMeta, null, "\t"),
  );

  // Write plugin data
  for (const pluginInfo of metadata.plugins) {
    const pluginDir = path.join(recordingDir, packageToDir(pluginInfo.key));
    await fsp.mkdir(pluginDir, { recursive: true });

    const data = formData.get(pluginInfo.key);
    if (data === null) continue;

    if (pluginInfo.isBlob) {
      // Write blob data with specified filename
      // In Node.js/Next.js, the data comes as a File/Blob-like object with arrayBuffer() method
      const filename = pluginInfo.filename ?? "data.bin";
      const blobData = data as Blob;
      const buffer = Buffer.from(await blobData.arrayBuffer());
      await fsp.writeFile(path.join(pluginDir, filename), buffer);
    } else if (typeof data === "string") {
      // Write JSON data as raw.json
      await fsp.writeFile(path.join(pluginDir, "raw.json"), data);
    }
  }

  // Run post-processing plugins
  await runPostProcessing(recordingDir, metadata.plugins, dynamicImports);

  return new Response(null, { status: StatusCodes.CREATED });
}

/**
 * Attempt to discover and run post-processing plugins.
 */
async function runPostProcessing(
  recordingDir: string,
  plugins: SaveRecordingMetadata["plugins"],
  dynamicImports: DynamicImports,
): Promise<void> {
  for (const pluginInfo of plugins) {
    const pluginDir = path.join(recordingDir, packageToDir(pluginInfo.key));

    const dynamicImporter =
      dynamicImports[`${pluginInfo.key}/liqvid-studio-server-plugin`];

    // no server plugin
    if (!dynamicImporter) {
      continue;
    }

    let serverPlugin: {
      default?: LiqvidStudioServerPlugin;
    } & LiqvidStudioServerPlugin;

    try {
      // Try to import the server plugin
      serverPlugin = await dynamicImporter();
    } catch (e) {
      console.error(`error loading server plugin for ${pluginInfo.key}`, e);
      continue;
    }

    const plugin = serverPlugin.default ?? serverPlugin;

    if (!plugin.postProcessRecording) continue;

    try {
      await plugin.postProcessRecording({ dirname: pluginDir });
    } catch (e) {
      console.error(`error in ${pluginInfo.key}`, e);
    }
  }
}
