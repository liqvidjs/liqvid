import { fileURLToPath } from "node:url";

import type { AbsolutePath } from "../src";

fileURLToPath(import.meta.url) satisfies AbsolutePath;
