import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { State } from "./state.ts";

export const makeStore = () =>
  createStore<State>()(
    subscribeWithSelector(
      () =>
        ({
          captionBreaks: [],

          selection: { end: 0, start: 0 },

          stack: [],
          transcript: [],
        }) as State,
    ),
  );
