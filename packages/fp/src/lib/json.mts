import { Err, Ok, type Result } from "../result.mts";

export function safeJsonParse<T>(str: string): Result<T, SyntaxError> {
  try {
    return Ok(JSON.parse(str));
  } catch (err) {
    return Err(err as SyntaxError);
  }
}
