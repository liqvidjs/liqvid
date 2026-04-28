import { z } from "zod";

export const ApiToken = z.object({
  content: z.string(),
  name: z.string(),
});

export type ApiToken = z.infer<typeof ApiToken>;
