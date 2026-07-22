import * as path from "node:path";

import { compress } from "@liqvid/recording/utils";
import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import { writeTypedJson } from "@liqvid/studio-plugin-api/server";
import { Effect, FileSystem } from "effect";
import type { AbsoluteDir } from "effect-paths";
import { RelativeFile } from "effect-paths";

const RAW_JSON = RelativeFile("raw.json");
const RAW_DTS = RelativeFile("raw.d.json.ts");

/** TypeScript declaration for JSON files */
const declaration = `import type { RecordingData } from "@liqvid/recording";
import type { Action, CMState } from "@lqv/codemirror";

declare const data: RecordingData<Action, CMState>;
export default data;
`;

/**
 * Post-process @lqv/codemirror recording data.
 * Creates raw.d.json.ts declaration file.
 */
function postProcessRecording({ dirname }: { dirname: AbsoluteDir }) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* Effect.logInfo("codemirror post-processing");

    const rawJsonPath = path.join(dirname, RAW_JSON);
    const rawDtsPath = path.join(dirname, RAW_DTS);

    // Check if raw.json exists
    if (!(yield* fs.exists(rawJsonPath))) {
      // raw.json doesn't exist, nothing to do
      return;
    }

    // Write raw.d.json.ts
    yield* fs.writeFileString(rawDtsPath, declaration);

    // copy compressed data
    const data = JSON.parse(yield* fs.readFileString(rawJsonPath, "utf8"));

    yield* Effect.log("Compressing recording data...");

    yield* writeTypedJson({
      data: compress(data, 2),
      declaration,
      dirname,
      filename: RelativeFile("recording.json"),
    });

    yield* Effect.log("wrote recording.json for codemirror");
  });
}

const plugin: LiqvidStudioServerPlugin = {
  postProcessRecording,
};

export default plugin;
