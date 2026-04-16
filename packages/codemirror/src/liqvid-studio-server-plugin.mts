import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { compress } from "@liqvid/recording/utils";
import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import { writeTypedJson } from "@liqvid/studio-plugin-api/server";

const RAW_JSON = "raw.json";
const RAW_DTS = "raw.d.json.ts";

/** TypeScript declaration for JSON files */
const declaration = `import type { Action, CMState } from "@lqv/codemirror";

declare const data: RecordingData<Action, CMState>;
export default data;
`;

/**
 * Post-process @lqv/codemirror recording data.
 * Creates raw.d.json.ts declaration file.
 */
async function postProcessRecording({
  dirname,
}: {
  dirname: string;
}): Promise<void> {
  const rawJsonPath = path.join(dirname, RAW_JSON);
  const rawDtsPath = path.join(dirname, RAW_DTS);

  // Check if raw.json exists
  try {
    await fsp.access(rawJsonPath);
  } catch {
    // raw.json doesn't exist, nothing to do
    return;
  }

  // Write raw.d.json.ts
  await fsp.writeFile(rawDtsPath, declaration);

  // copy compressed data
  const data = JSON.parse(await fsp.readFile(rawJsonPath, "utf8"));

  await writeTypedJson({
    data: compress(data, 2),
    declaration,
    dirname,
    filename: "recording.json",
  });
}

const plugin: LiqvidStudioServerPlugin = {
  postProcessRecording,
};

export default plugin;
