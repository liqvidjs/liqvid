import { spawn } from "node:child_process";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { OpenApi } from "effect/http-api";

import { LiqvidStudioPublicApi } from "../src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, "..", "openapi.json");

const formatWithBiome = async (contents: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      ["exec", "biome", "format", "--stdin-file-path", OUTPUT_FILE],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const output: Buffer[] = [];
    const errors: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(output).toString("utf8"));
      } else {
        reject(new Error(Buffer.concat(errors).toString("utf8")));
      }
    });

    child.stdin.end(contents);
  });

async function main(): Promise<void> {
  const openapi = {
    $schema: "https://spec.openapis.org/oas/3.1/dialect/base",
    ...OpenApi.fromApi(LiqvidStudioPublicApi),
  };

  await fsp.writeFile(OUTPUT_FILE, `${JSON.stringify(openapi, null, 2)}\n`);
  const contents = await fsp.readFile(OUTPUT_FILE, "utf8");
  const formatted = await formatWithBiome(contents);
  await fsp.writeFile(OUTPUT_FILE, formatted);
  console.log(`Generated OpenAPI schema at ${OUTPUT_FILE}`);
}

main().catch((error: unknown) => {
  console.error("Failed to generate OpenAPI schema:", error);
  process.exit(1);
});
