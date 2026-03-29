"use client";

import type { EditorView, KeyBinding } from "@codemirror/view";
import type { CodeRecorder } from "@lqv/codemirror/recording";
import { createContext, useContext } from "react";
import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type RecordType<T> = T extends Record<string, infer K> ? K : never;
type ArrayType<T> = T extends (infer K)[] ? K : never;

/** LiveCode store state. */
export interface LiveCodeState {
  /**
   * Name of active editor group.
   */
  activeGroup: string;

  /** Class names to attach to root. */
  classNames: string[];

  /** Group of files/editors. */
  groups: Record<
    string,
    {
      /** Name of active file. */
      activeFile: string;

      /** Files contained in this editor group. */
      files: {
        /** Whether the buffer can be edited by the viewer. */
        editable: boolean;

        /** File name. */
        filename: string;

        /** Reference to CodeMirror {@link EditorView} */
        view: EditorView;
      }[];
    }
  >;

  /** Console logs. */
  messages: React.ReactNode[];

  /** Code recorder. */
  recorder?: CodeRecorder;

  /** Used to broadcast run events. */
  run: number;

  /** Keyboard shortcuts. */
  shortcuts: Record<string, KeyBinding>;

  /** Get the active file. */
  getActiveFile(): ArrayType<RecordType<LiveCodeState["groups"]>["files"]>;

  /** Get the active view. */
  getActiveView(): EditorView;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeStore = (state: Partial<LiveCodeState> = {}) =>
  createStore<LiveCodeState>()(
    subscribeWithSelector(
      (_set, get): LiveCodeState => ({
        // default values
        activeGroup: undefined,
        classNames: ["lqv-codebooth"],
        getActiveFile() {
          const state = get();
          const group = state.groups[state.activeGroup];
          return group?.files?.find((_) => _.filename === group.activeFile);
        },
        getActiveView() {
          return get().getActiveFile().view;
        },
        groups: {},
        messages: [],
        recorder: undefined,
        run: 0,
        shortcuts: {},
        ...state,
      }),
    ),
  );

export type LiveCodeStore = ReturnType<typeof makeStore>;

export const LiveCodeContext = createContext<LiveCodeStore | null>(null);
LiveCodeContext.displayName = "LiveCode";

/** Get a reference to the Zustand store for this CodeBooth. See {@link LiveCodeState} for store shape. */
export function useLiveCodeStore(): LiveCodeStore {
  const store = useContext(LiveCodeContext);

  if (!store) {
    throw new Error("LiveCode store not available");
  }

  return store;
}

export function useLiveCodeStoreOptional(): LiveCodeStore | null {
  return useContext(LiveCodeContext);
}
