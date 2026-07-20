/**
 * @file This file sets up the Liqvid development server for Next.js
 */

import {
  deleteHandler,
  getHandler,
  patchHandler,
  postHandler,
  putHandler,
  upgradeHandler,
} from "@liqvid/studio/next/api";

import dynamicImports from "@/.dynamic-imports";

export const DELETE = deleteHandler(dynamicImports);
export const GET = getHandler(dynamicImports);
export const PATCH = patchHandler(dynamicImports);
export const POST = postHandler(dynamicImports);
export const PUT = putHandler(dynamicImports);
export const UPGRADE = upgradeHandler(dynamicImports);
