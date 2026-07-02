/**
 * Generate JSON Schema files from Zod schemas.
 * Run with: node --experimental-strip-types scripts/generate-schemas.mts
 */
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { toJSONSchema, type ZodType } from "zod";

import { ThumbnailsJob } from "../src/jobs/thumbnails.mts";
// Import schemas
import { LiqvidConfig } from "../src/liqvid-config.mts";
import {
  AspectRatio,
  AspectRatioSpecifier,
  AutoGenProjectMeta,
  ProjectJson,
} from "../src/project.mts";
import { RecordingMeta, RecordingMetaFile } from "../src/recording-meta.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "json-schemas");

interface SchemaEntry {
  name: string;
  schema: ZodType;
}

const schemas: SchemaEntry[] = [
  // liqvid-config
  { name: "liqvid-config", schema: LiqvidConfig },

  // project
  { name: "aspect-ratio", schema: AspectRatio },
  { name: "aspect-ratio-specifier", schema: AspectRatioSpecifier },
  { name: "project-json", schema: ProjectJson },
  { name: "project-meta-autogen", schema: AutoGenProjectMeta },

  // recording-meta
  { name: "recording-meta-file", schema: RecordingMetaFile },
  { name: "recording-meta", schema: RecordingMeta },

  // thumbnails-job
  { name: "thumbnails-job", schema: ThumbnailsJob },
];

async function main() {
  // Ensure output directory exists
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Generating JSON schemas in ${OUTPUT_DIR}...\n`);

  for (const { name, schema } of schemas) {
    const filename = `${name}.json`;

    console.log(`  ${filename}...`);

    const filepath = path.join(OUTPUT_DIR, filename);
    const jsonSchema = toJSONSchema(schema, { io: "input" });

    await fsp.writeFile(filepath, JSON.stringify(jsonSchema, null, 2) + "\n");
  }

  console.log(`\nGenerated ${schemas.length} schema(s).`);
}

main().catch((error) => {
  console.error("Failed to generate schemas:", error);
  process.exit(1);
});
