/**
 * @file This file contains various helpers with type safety
 * for the markers for this particular project.
 */
"use client";

import { DirectoryHelper } from "@liqvid/studio";
import { UniversalHelper } from "liqvid";

import type { ProjectStructure } from "../.liqvid/types.ts";

import projectPath from "../.liqvid/project-path.json" with { type: "json" };

/* -------------------- helpers -------------------- */

/**
 * @package
 * General-purpose helper component for:
 * - creating `<Segment>`s, when passed `during`, `from`, or `to`
 * - positioning, when passed `b`ottom, `r`ight `x` (= left), or `y` (= top)
 * - sizing, when passed `h`eight or `w`idth
 */
export const $u = UniversalHelper;

/**
 * Reference the files in this project with type-safety.
 * @access parent
 */
export const projectFiles = new DirectoryHelper<
  ProjectStructure,
  "projectPath"
>(
  process.env.NODE_ENV === "development"
    ? `/api/liqvid/static/${projectPath}`
    : `${process.env.NEXT_PUBLIC_LIQVID_MEDIA_BASE}/${projectPath}`,
);
