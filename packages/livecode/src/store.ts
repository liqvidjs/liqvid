"use client";

import type { EditorView, KeyBinding } from "@codemirror/view";
import { makeContext } from "@liqvid/utils";
import type { CodeRecorder } from "@lqv/codemirror/recording";
import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

/** Console message. */
export interface ConsoleMessage<T = unknown, K extends string = string> {
  characterNumber?: number;
  data: T;
  filename?: string;
  kind: K;
  lineNumber?: number;
  timestamp: Date;
}

export type LiveCodeFile = {
  /** Whether the buffer can be edited by the viewer. */
  editable: boolean;

  /** File name. */
  filename: string;

  /** Reference to CodeMirror {@link EditorView} */
  view: EditorView;
};

type LiveCodeGroup = {
  /** Name of active file. */
  activeFile: string;
  /** Files contained in this editor group. */
  files: LiveCodeFile[];
};

/** LiveCode store state. */
export interface LiveCodeState {
  /**
   * Name of active editor group.
   */
  activeGroup: string | undefined;

  /** Class names to attach to root. */
  classNames: string[];

  /** Group of files/editors. */
  groups: Record<string, LiveCodeGroup>;

  /** Console logs. */
  messages: ConsoleMessage[];

  /** Code recorder. */
  recorder?: CodeRecorder;

  /** Used to broadcast run events. */
  __run: number;

  /** Keyboard shortcuts. */
  shortcuts: Record<string, KeyBinding>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeStore = (state: Partial<LiveCodeState> = {}) =>
  createStore<LiveCodeState>()(
    subscribeWithSelector(
      (_set): LiveCodeState => ({
        __run: 0,
        // default values
        activeGroup: undefined,
        classNames: ["lqv-codebooth"],
        groups: {},
        messages: [],
        recorder: undefined,
        shortcuts: {},
        ...state,
      }),
    ),
  );

export type LiveCodeStore = ReturnType<typeof makeStore>;

export const LiveCodeContext = makeContext<LiveCodeStore | null>({
  defaultValue: null,
  name: "LiveCode",
  uniqueKey: "@liqvid/livecode/store",
});

/** Get a reference to the Zustand store for this CodeBooth. See {@link LiveCodeState} for store shape. */
export const useLiveCodeStore = LiveCodeContext.use;

/** Get a reference to the Zustand store for this CodeBooth, or null if unavailable. See {@link LiveCodeState} for store shape. */
export const useLiveCodeStoreOptional = LiveCodeContext.useOptional;
