import { createStore } from "zustand";

import type { State, Transcript } from "./state.ts";

export const makeStore = () =>
  createStore<State>()(() => ({
    captionBreaks: [],

    selection: { end: 0, start: 0 },

    stack: [],
    transcript: [],
  }));
