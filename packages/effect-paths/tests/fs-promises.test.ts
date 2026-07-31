import fsp from "node:fs/promises";

import { AbsoluteDir, RelativeDir, type RelativePath } from "../src/index.ts";

const absoluteDir = AbsoluteDir("");
const relativeDir = RelativeDir("");

export async function main() {
  (await fsp.readdir(absoluteDir)) satisfies RelativePath[];
  (await fsp.readdir(relativeDir)) satisfies Error & {
    message: "Must pass an absolute directory";
  };
}
