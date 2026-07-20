import { fileURLToPath } from "node:url";

import type { AbsolutePath } from "../src/index.ts";

fileURLToPath(import.meta.url) satisfies AbsolutePath;
