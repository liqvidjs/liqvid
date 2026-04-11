import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { compress } from "@liqvid/recording/utils";
import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";

const RAW_JSON = "raw.json";
const RAW_DTS = "raw.d.json.ts";
const DATA_JSON = "recording.json";
const DATA_DTS = "recording.d.json.ts";

/** TypeScript declaration for JSON files */
const jsonDeclaration = `import type { ReplayData } from "@liqvid/utils";
import type { Action, CMState } from "@lqv/codemirror";

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

  const dataJsonPath = path.join(dirname, DATA_JSON);
  const dataDtsPath = path.join(dirname, DATA_DTS);

  // Check if raw.json exists
  try {
    await fsp.access(rawJsonPath);
  } catch {
    // raw.json doesn't exist, nothing to do
    return;
  }

  // Write raw.d.json.ts
  await fsp.writeFile(rawDtsPath, jsonDeclaration);
  await fsp.writeFile(dataDtsPath, jsonDeclaration);

  const data = JSON.parse(await fsp.readFile(rawJsonPath, "utf8"));

  await fsp.writeFile(dataJsonPath, JSON.stringify(compress(data, 2)));
}

const plugin: LiqvidStudioServerPlugin = {
  postProcessRecording,
};

export default plugin;
