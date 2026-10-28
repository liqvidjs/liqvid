/** Generate the CodeMirror recording JSON Schema. */
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";
import { RelativeDir, RelativeFile } from "effect-paths";

import { CodeMirrorRecording } from "../src/schema.ts";
import { SCHEMA } from "../src/version.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, RelativeDir("../json-schemas"));
const OUTPUT_FILE = path.join(OUTPUT_DIR, RelativeFile("recording.json"));

async function main() {
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });

  const document = Schema.toJsonSchemaDocument(CodeMirrorRecording, {
    onExcessProperty: "error",
  });
  const jsonSchema = {
    $id: SCHEMA,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...document.schema,
    ...(Object.keys(document.definitions).length > 0
      ? { $defs: document.definitions }
      : {}),
  };

  await fsp.writeFile(OUTPUT_FILE, `${JSON.stringify(jsonSchema, null, 2)}\n`);
  console.log(`Generated ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Failed to generate CodeMirror recording schema:", error);
  process.exit(1);
});
