/**
 * Generate JSON Schema file (in YAML syntax) from Zod schemas.
 * Run with: pnpm generate:openapi
 */
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";
import { toJSONSchema, type ZodType } from "zod";

// Import schemas
import { ApiToken } from "../src/index.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "yaml");

interface SchemaEntry {
  name: string;
  schema: ZodType;
}

const schemas: SchemaEntry[] = [{ name: "ApiToken", schema: ApiToken }];

async function main() {
  // Ensure output directory exists
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Generating JSON schemas in ${OUTPUT_DIR}...\n`);

  // Build combined schemas object
  const combinedSchemas: Record<string, unknown> = {};

  for (const { name, schema } of schemas) {
    const jsonSchema = toJSONSchema(schema);
    combinedSchemas[name] = jsonSchema;
    console.log(`  - ${name}`);
  }

  // Write as YAML
  const filepath = path.join(OUTPUT_DIR, "schemas.yaml");
  const yamlContent = yaml.dump(combinedSchemas, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
  });

  await fsp.writeFile(filepath, yamlContent);

  console.log(`\nGenerated ${schemas.length} schema(s) to ${filepath}`);
}

main().catch((error) => {
  console.error("Failed to generate schemas:", error);
  process.exit(1);
});
