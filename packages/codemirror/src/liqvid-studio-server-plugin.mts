import * as fsp from "node:fs/promises";
import * as path from "node:path";

import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";

const RAW_JSON = "raw.json";
const RAW_DTS = "raw.d.json.ts";

/**
 * Generate TypeScript declaration content for raw.json.
 */
function generateRawDeclaration(): string {
  return `import type { ReplayData } from "@liqvid/utils";
import type { Action } from "@lqv/codemirror";

declare const data: ReplayData<Action>;
export default data;
`;
}

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
  const dtsContent = generateRawDeclaration();
  await fsp.writeFile(rawDtsPath, dtsContent);
}

const plugin: LiqvidStudioServerPlugin = {
  postProcessRecording,
};

export default plugin;
