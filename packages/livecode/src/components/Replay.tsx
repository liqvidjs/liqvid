import type { Extension, Text } from "@codemirror/state";
import { type EditorView, ViewPlugin } from "@codemirror/view";
import {
  cmReplay,
  cmReplayMultiple,
  fakeSelection,
  selectCmd,
} from "@lqv/codemirror";
import type { FakeSelectionConfig } from "@lqv/codemirror/fake-selection";
import { useME } from "@lqv/playback/react";
import { useCallback, useEffect, useMemo } from "react";

import { type Store, useBoothStore } from "../store";

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
  start = 0,
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
    handle?: (useStore: Store, cmd: string, doc: Text) => void;

    /** Coding data to replay. */
    replay?: CodeData | Promise<CodeData>;

    /** Configuration for replaying the author's cursor and selection. */
    selectionConfig?: FakeSelectionConfig;

    /**
     * Time to start replaying.
     * @default 0
     */
    start?: number;
  }): JSX.Element {
  const store = useBoothStore();
  const playback = useME();

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
                start,
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
              start,
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
      start,
    ],
  );

  return <Editor editable={false} extensions={__extensions} {...props} />;
}

/**
 * Replay coding to multiple editors.
 */
export function ReplayMultiple({
  didScroll,
  group,
  handle: propsHandle,
  replay,
  scrollBehavior,
  shouldScroll,
  start = 0,
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
  handle?: (store: Store, cmd: string, docs: Record<string, Text>) => void;

  /**
   * Coding data to replay.
   */
  replay: CodeData | Promise<CodeData>;

  /**
   * Time to start replaying.
   * @default 0
   */
  start?: number;
}): null {
  const playback = useME();
  const store = useBoothStore();

  /* Handle callback */
  const handle = useCallback(
    (cmd: string, docs: Record<string, Text>) => {
      // file selection change
      if (cmd.startsWith(selectCmd)) {
        store.setState((state) => ({
          groups: {
            ...state.groups,
            [group]: {
              ...state.groups[group],
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
    [group, propsHandle, store],
  );

  useEffect(() => {
    const state = store.getState();

    const views: Record<string, EditorView> = {};
    for (const file of state.groups[group].files) {
      views[file.filename] = file.view;
    }

    if (replay instanceof Promise) {
      replay.then((data) =>
        cmReplayMultiple({
          data,
          didScroll,
          handle,
          playback,
          scrollBehavior,
          shouldScroll,
          start,
          views,
        }),
      );
    } else {
      cmReplayMultiple({
        data: replay,
        didScroll,
        handle,
        playback,
        scrollBehavior,
        shouldScroll,
        start,
        views,
      });
    }
  }, [
    didScroll,
    group,
    handle,
    playback,
    replay,
    scrollBehavior,
    shouldScroll,
    start,
    store,
  ]);

  return null;
}
