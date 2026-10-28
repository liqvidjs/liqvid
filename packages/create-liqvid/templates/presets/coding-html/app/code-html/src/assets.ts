import { DirectoryHelper } from "@liqvid/studio";

import type { ProjectStructure } from "../.liqvid/types.ts";

/** @package */
export const project = new DirectoryHelper<ProjectStructure>();

/** @package */
export const assets = project.dir(".liqvid");
