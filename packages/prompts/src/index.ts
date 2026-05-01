import { lazy } from "react";
import { Fragment } from "react/jsx-runtime";

export { Cue, type CueState } from "./Cue.tsx";
export { Prompt } from "./Prompt.tsx";
export {
  type PromptsContext,
  type PromptsPersistence,
  /** PromptsProvider without env-switching */
  PromptsProvider as PromptsProviderUnivalent,
  usePromptsApi,
} from "./PromptsProvider.tsx";

/* ------------------------------ ambidextrous components ------------------------------ */
const isDevelopment = process.env.NODE_ENV === "development";

export const PromptsProvider = isDevelopment
  ? lazy(() =>
      import("./PromptsProvider.tsx").then((imports) => ({
        default: imports.PromptsProvider,
      })),
    )
  : Fragment;
