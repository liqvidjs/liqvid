import { devProvider } from "@liqvid/ssr/react";

export { Cue } from "./Cue";
export { Prompt } from "./Prompt";
export {
  type PromptsContext,
  type PromptsPersistence,
  PromptsProvider as PromptsProviderProd,
  usePromptsApi,
} from "./PromptsProvider";

export const PromptsProvider = devProvider(() =>
  import("./PromptsProvider").then((imports) => imports.PromptsProvider),
);
