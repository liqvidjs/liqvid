import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { State } from "./state.ts";

export const makeStore = () =>
  createStore<State>()(
    subscribeWithSelector(
      () =>
        ({
          captionBreaks: [],
          paragraphBreaks: [],
          redoStack: [],
          selection: { end: 0, start: 0 },
          undoStack: [],
          words: [],
        }) as State,
    ),
  );

export type Store = ReturnType<typeof makeStore>;
