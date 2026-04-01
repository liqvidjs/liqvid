import type { Extension, Text } from "@codemirror/state";
import { type EditorView, ViewPlugin } from "@codemirror/view";
import { Duration, type DurationLike } from "@liqvid/duration";
import {
  cmReplay,
  cmReplayMultiple,
  fakeSelection,
  selectCmd,
} from "@lqv/codemirror";
import type { FakeSelectionConfig } from "@lqv/codemirror/fake-selection";
import { useSeekable } from "@lqv/playback/react";
import { useCallback, useEffect, useMemo } from "react";

import { type LiveCodeStore, useLiveCodeStore } from "../store";

import { useGroup } from "./context";
import { Editor } from "./Editor";

type CodeData = Parameters<typeof cmReplay>[0]["data"];

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

    /** Coding data to replay. */
    replay?: CodeData | Promise<CodeData>;

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

  const __handle = useCallback(
    (cmd: string, doc: Text) => {
      if (cmd === "run") {
        // run command
        store.setState((state) => ({ run: state.run + 1 }));
      } else if (cmd === "clear") {
        // clear console
        store.setState(() => ({ messages: [] }));
      }

      // userspace handler
      handle?.(store, cmd, doc);
    },
    [handle, store],
  );

  const __extensions: Extension[] = useMemo(
    () => [
      fakeSelection(selectionConfig),
      ViewPlugin.define((view) => {
        if (replay) {
          if (replay instanceof Promise) {
            replay.then((data) =>
              cmReplay({
                data,
                didScroll,
                handle: __handle,
                playback,
                scrollBehavior,
                shouldScroll,
                start: startSeconds,
                view,
              }),
            );
          } else {
            cmReplay({
              data: replay,
              didScroll,
              handle: __handle,
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
   * Coding data to replay.
   */
  replay: CodeData | Promise<CodeData>;

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

  /* Handle callback */
  const handle = useCallback(
    (cmd: string, docs: Record<string, Text>) => {
      // file selection change
      if (cmd.startsWith(selectCmd)) {
        store.setState((state) => ({
          groups: {
            ...state.groups,
            [groupId]: {
              ...state.groups[groupId],
              activeFile: cmd.slice(selectCmd.length),
            },
          },
        }));
      } else if (cmd === "run") {
        // run command
        store.setState((state) => ({ run: state.run + 1 }));
      } else if (cmd === "clear") {
        // clear console
        store.setState(() => ({ messages: [] }));
      }

      // userspace handler
      propsHandle?.(store, cmd, docs);
    },
    [groupId, propsHandle, store],
  );

  useEffect(() => {
    const state = store.getState();
    const group = state.groups[groupId];
    if (!group) return;

    const views: Record<string, EditorView> = {};
    for (const file of group.files) {
      views[file.filename] = file.view;
    }

    let unsubscribe: () => void;

    if (replay instanceof Promise) {
      replay.then(
        (data) =>
          (unsubscribe = cmReplayMultiple({
            data,
            didScroll,
            handle,
            playback,
            scrollBehavior,
            shouldScroll,
            start: startSeconds,
            views,
          })),
      );
    } else {
      console.log("subscribing with views", Object.keys(views));
      unsubscribe = cmReplayMultiple({
        data: replay,
        didScroll,
        handle,
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
