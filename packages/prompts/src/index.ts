import { lazy } from "react";
import { Fragment } from "react/jsx-runtime";

export { Cue, type CueState } from "./Cue";
export { Prompt } from "./Prompt";
export {
  type PromptsContext,
  type PromptsPersistence,
  /** PromptsProvider without env-switching */
  PromptsProvider as PromptsProviderUnivalent,
  usePromptsApi,
} from "./PromptsProvider";

/* ------------------------------ ambidextrous components ------------------------------ */
const isDevelopment = process.env.NODE_ENV === "development";

export const PromptsProvider = isDevelopment
  ? lazy(() =>
      import("./PromptsProvider").then((imports) => ({
        default: imports.PromptsProvider,
      })),
    )
  : Fragment;
