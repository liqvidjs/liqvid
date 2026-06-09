import type { Extension, Text } from "@codemirror/state";
import { type EditorView, ViewPlugin } from "@codemirror/view";
import { Duration, type DurationLike } from "@liqvid/duration";
import type { RecordingData } from "@liqvid/recording";
import type { CleanUpFn, ReplayData } from "@liqvid/utils";
import type { CMRange, CMState } from "@lqv/codemirror";
import {
  type Action,
  cmReplay,
  cmReplayMultiple,
  fakeSelection,
  selectCmd,
} from "@lqv/codemirror";
import type { FakeSelectionConfig } from "@lqv/codemirror/fake-selection";
import { useSeekable } from "@lqv/playback/react";
import { useCallback, useEffect, useMemo } from "react";

import { useClearMessages, useRun } from "../hooks.ts";
import { type LiveCodeStore, useLiveCodeStore } from "../store.ts";

import { useGroup } from "./context.tsx";
import { Editor } from "./Editor.tsx";

/** Single-file initial state. */
type SingleFileInitial = {
  content?: string;
  selection?: CMRange;
};

/** Recording data for single-file replay. */
type SingleFileRecording = RecordingData<ReplayData<Action>, SingleFileInitial>;

/** Recording data for multi-file replay. */
type MultiFileRecording = RecordingData<ReplayData<Action>, CMState>;

/**
 * Editor to replay recorded coding.
 */
export function Replay({
  extensions = [],
  handle,
  replay,
  scrollBehavior,
  selectionConfig,
  didScroll,
  shouldScroll,
  start = new Duration(),
  ...props
}: Pick<
  Parameters<typeof cmReplay>[0],
  "didScroll" | "scrollBehavior" | "shouldScroll"
> &
  React.ComponentProps<typeof Editor> & {
    /**
     * Callback to handle special commands.
     * @param useStore The CodeBooth store.
     * @param cmd The command to handle.
     * @param doc The CodeMirror document.
     */
    handle?: (useStore: LiveCodeStore, cmd: string, doc: Text) => void;

    /** Recording data to replay. */
    replay?: SingleFileRecording | Promise<SingleFileRecording>;

    /** Configuration for replaying the author's cursor and selection. */
    selectionConfig?: FakeSelectionConfig;

    /**
     * Time to start replaying.
     * @default 0
     */
    start?: DurationLike;
  }) {
  const startSeconds = Duration.from(start).inSeconds();
  const store = useLiveCodeStore();
  const playback = useSeekable();

  const run = useRun();
  const clear = useClearMessages();

  const __handle = useCallback(
    (cmd: string, doc: Text) => {
      if (cmd === "run") {
        // run command
        run();
      } else if (cmd === "clear") {
        // clear console
        clear();
      }

      // userspace handler
      handle?.(store, cmd, doc);
    },
    [
      handle,
      store,
      run, // clear console
      clear,
    ],
  );

  const __extensions: Extension[] = useMemo(
    () => [
      fakeSelection(selectionConfig),
      ViewPlugin.define((view) => {
        if (replay) {
          if (replay instanceof Promise) {
            replay.then((recording) =>
              cmReplay({
                data: recording.data,
                didScroll,
                handle: __handle,
                initial: recording.initial,
                playback,
                scrollBehavior,
                shouldScroll,
                start: startSeconds,
                view,
              }),
            );
          } else {
            cmReplay({
              data: replay.data,
              didScroll,
              handle: __handle,
              initial: replay.initial,
              playback,
              scrollBehavior,
              shouldScroll,
              start: startSeconds,
              view,
            });
          }
        }
        return {};
      }),
      ...extensions,
    ],
    [
      __handle,
      didScroll,
      extensions,
      playback,
      replay,
      scrollBehavior,
      selectionConfig,
      shouldScroll,
      startSeconds,
    ],
  );

  return <Editor extensions={__extensions} readOnly {...props} />;
}

/**
 * Replay coding to multiple editors.
 */
export function ReplayMultiple({
  didScroll,
  group: groupId,
  handle: propsHandle,
  replay,
  scrollBehavior,
  shouldScroll,
  start = new Duration(),
}: Pick<
  Parameters<typeof cmReplayMultiple>[0],
  "didScroll" | "scrollBehavior" | "shouldScroll"
> & {
  /** Editor group to replay. */
  group?: string;

  /**
   * Callback to handle special commands.
   * @param store The CodeBooth store.
   * @param cmd The command to handle.
   * @param docs CodeMirror documents.
   */
  handle?: (
    store: LiveCodeStore,
    cmd: string,
    docs: Record<string, Text>,
  ) => void;

  /**
   * Recording data to replay.
   */
  replay: MultiFileRecording | Promise<MultiFileRecording>;

  /**
   * Time to start replaying.
   * @default 0
   */
  start?: DurationLike;
}): null {
  const playback = useSeekable();
  const store = useLiveCodeStore();

  const contextGroup = useGroup();
  groupId ??= contextGroup;

  const startSeconds = Duration.from(start).inSeconds();

  const run = useRun();
  const clear = useClearMessages();

  /* Handle callback */
  const handle = useCallback(
    (cmd: string, docs: Record<string, Text>) => {
      // file selection change
      if (cmd.startsWith(selectCmd)) {
        store.setState((state) => ({
          groups: {
            ...state.groups,
            [groupId]: {
              ...state.groups[groupId]!,
              activeFile: cmd.slice(selectCmd.length),
            },
          },
        }));
      } else if (cmd === "run") {
        // run command
        run();
      } else if (cmd === "clear") {
        // clear console
        clear();
      }

      // userspace handler
      propsHandle?.(store, cmd, docs);
    },
    [
      groupId,
      propsHandle,
      store,
      clear, // run command
      run,
    ],
  );

  useEffect(() => {
    const state = store.getState();
    const group = state.groups[groupId];
    if (!group) return;

    const views: Record<string, EditorView> = {};
    for (const file of group.files) {
      views[file.filename] = file.view;
    }

    let unsubscribe: CleanUpFn;

    if (replay instanceof Promise) {
      replay.then((recording) => {
        unsubscribe = cmReplayMultiple({
          data: recording.data,
          didScroll,
          handle,
          initial: recording.initial,
          playback,
          scrollBehavior,
          shouldScroll,
          start: startSeconds,
          views,
        });
      });
    } else {
      unsubscribe = cmReplayMultiple({
        data: replay.data,
        didScroll,
        handle,
        initial: replay.initial,
        playback,
        scrollBehavior,
        shouldScroll,
        start: startSeconds,
        views,
      });
    }

    return () => {
      unsubscribe?.();
    };
  }, [
    didScroll,
    groupId,
    handle,
    playback,
    replay,
    scrollBehavior,
    shouldScroll,
    store,
    startSeconds,
  ]);

  return null;
}
