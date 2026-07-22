import * as fsp from "node:fs/promises";
import * as path from "node:path";

import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import type { AbsoluteDir, RelativeFile } from "effect-paths";

const RAW_JSON = "raw.json" as RelativeFile;
const TIMINGS_JSON = "timings.json" as RelativeFile;
const TIMINGS_DTS = "timings.d.json.ts" as RelativeFile;

/**
 * Generate TypeScript declaration content from timings JSON.
 */
function generateTimingsDeclaration(timings: Array<[string, string]>): string {
  const entries = timings
    .map(
      ([name, time]) => `\t${JSON.stringify(name)}: ${JSON.stringify(time)};`,
    )
    .join("\n");

  return `declare const data: {\n${entries}\n};\nexport default data;\n`;
}

/**
 * Post-process @liqvid/script recording data.
 * Renames raw.json to timings.json and creates timings.d.json.ts
 */
async function postProcessRecording({
  dirname,
}: {
  dirname: AbsoluteDir;
}): Promise<void> {
  const rawJsonPath = path.join(dirname, RAW_JSON);
  const timingsJsonPath = path.join(dirname, TIMINGS_JSON);
  const timingsDtsPath = path.join(dirname, TIMINGS_DTS);

  // Read raw.json
  let rawContent: string;
  try {
    rawContent = await fsp.readFile(rawJsonPath, "utf-8");
  } catch {
    // raw.json doesn't exist, nothing to do
    return;
  }

  // Parse the raw data (array of [name, time] tuples)
  let rawData: Array<[string, string]>;
  try {
    rawData = JSON.parse(rawContent);
  } catch {
    console.error("Failed to parse raw.json for @liqvid/script");
    return;
  }

  // Convert array format to object format for timings.json
  const timingsObject: Record<string, string> = {};
  for (const [name, time] of rawData) {
    timingsObject[name] = time;
  }

  // Write timings.json
  await fsp.writeFile(
    timingsJsonPath,
    JSON.stringify(timingsObject, null, "\t"),
  );

  // Write timings.d.json.ts
  const dtsContent = generateTimingsDeclaration(rawData);
  await fsp.writeFile(timingsDtsPath, dtsContent);

  // Remove raw.json
  await fsp.unlink(rawJsonPath);
}

const plugin: LiqvidStudioServerPlugin = {
  postProcessRecording,
};

export default plugin;
