import type { ZodError, ZodSafeParseResult } from "zod";

import { Err, Ok, type Result } from "../result.mts";

export function fromZod<T>(
  zodResult: ZodSafeParseResult<T>,
): Result<T, ZodError<T>> {
  if (zodResult.success) {
    return Ok(zodResult.data);
  } else {
    return Err(zodResult.error);
  }
}
