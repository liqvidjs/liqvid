import * as fs from "node:fs";

import { AbsoluteDir, type RelativePath } from "../src";

const absoluteDir = AbsoluteDir("");

fs.readdirSync(absoluteDir) satisfies RelativePath[];

const dirent = fs.readdirSync(absoluteDir, { withFileTypes: true })[0]!;

dirent satisfies fs.Dirent<RelativePath>;
dirent.parentPath satisfies AbsoluteDir;
