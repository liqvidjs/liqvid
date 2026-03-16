import type { Result } from "have-fun";
import { fromZod } from "have-fun/zod";
import type { z } from "zod";

export async function fetchJson<T extends z.ZodType>(
  Model: T,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<
  Result<z.core.output<T>, z.ZodError<z.core.output<T>> | SyntaxError>
> {
  const res = await fetch(input, init);
  const json = await res.json();

  return fromZod(Model.safeParse(json));
}
