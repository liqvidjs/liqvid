import "server-only";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { UP } from "@liqvid/cli/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parent = path.resolve(__dirname, UP);

export const STUDIO_ROOT =
  path.basename(parent) === "src"
    ? path.resolve(parent, UP)
    : path.resolve(parent, UP, UP);
