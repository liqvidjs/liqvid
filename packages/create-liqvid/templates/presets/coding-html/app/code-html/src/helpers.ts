/**
 * @file This file contains various helpers with type safety
 * for the markers for this particular project.
 */
"use client";

import { DirectoryHelper } from "@liqvid/studio";
import { UniversalHelper } from "liqvid";
import { usePathname } from "next/navigation";

import type { ProjectDir } from "../.liqvid/types.ts";

/* -------------------- helpers -------------------- */

/**
 * @package
 * General-purpose helper component for:
 * - creating `<Segment>`s, when passed `during`, `from`, or `to`
 * - positioning, when passed `b`ottom, `r`ight `x` (= left), or `y` (= top)
 * - sizing, when passed `h`eight or `w`idth
 */
export const $u = UniversalHelper;

/** @package Reference the files in this project with type-safety. Need to interpolate the pathname before using. */
export const projectDirTemplated = new DirectoryHelper<ProjectDir, "pathname">(
  process.env.NODE_ENV === "development"
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/liqvid/static{pathname}`
    : `${process.env.NEXT_PUBLIC_LIQVID_MEDIA_BASE}{pathname}`,
);

/** @package Reference the files in this project with type-safety. */
export function useProjectFiles() {
  const pathname = usePathname();
  return projectDirTemplated.interpolate({ pathname });
}
