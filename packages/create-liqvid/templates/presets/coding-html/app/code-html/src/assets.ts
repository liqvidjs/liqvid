import { DirectoryHelper } from "@liqvid/studio";

import type { ProjectDir } from "../.liqvid/types.ts";

/** @package */
export const project = new DirectoryHelper<ProjectDir>();

/** @package */
export const assets = project.dir(".liqvid");
