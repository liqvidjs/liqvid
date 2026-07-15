import "server-only";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parent = path.resolve(__dirname, "..");

export const STUDIO_ROOT =
  path.basename(parent) === "src"
    ? path.resolve(parent, "..")
    : path.resolve(parent, "..", "..");
