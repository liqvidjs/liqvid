import { devProvider } from "@liqvid/ambidexterity/react";

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
