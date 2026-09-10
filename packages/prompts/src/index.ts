import { lazy } from "react";
import { Fragment } from "react/jsx-runtime";

export { Cue, type CueState } from "./Cue.tsx";
export { Prompt as PromptUnivalent } from "./Prompt.tsx";
export {
  type PromptsContext,
  type PromptsPersistence,
  /** PromptsProvider without env-switching */
  PromptsProvider as PromptsProviderUnivalent,
  usePromptsApi,
} from "./PromptsProvider.tsx";

import { devComponent } from "@liqvid/ssr/react";

/* ------------------------------ ambidextrous components ------------------------------ */

export const PromptsProvider = import.meta.env.DEV
  ? lazy(() =>
      import("./PromptsProvider.tsx").then((imports) => ({
        default: imports.PromptsProvider,
      })),
    )
  : Fragment;

import { Prompt as PromptUnivalent } from "./Prompt.tsx";
export const Prompt = devComponent(PromptUnivalent);
