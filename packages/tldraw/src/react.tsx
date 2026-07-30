import type { Awaitable } from "@liqvid/utils";
import { useSeekable } from "@lqv/playback/react";
import { useEffect, useRef, useState } from "react";
import { type Editor, Tldraw, useEditor } from "tldraw";

import { type PointerHandler, tldrawReplay } from "./index.ts";
import { CanvasLayer } from "./react/CanvasLayer.tsx";
import { CursorImage } from "./react/CursorImage.tsx";
import type { TldrawData } from "./types.ts";

/**
 * Replay Tldraw canvas. React version of {@link tldrawReplay}.
 */
export function TldrawReplay({
  children,
  start,
  replay,
  ...props
}: Omit<
  Parameters<typeof tldrawReplay>[0],
  "data" | "playback" | "editor" | "handlePointer"
> &
  React.ComponentPropsWithoutRef<typeof Tldraw> & {
    /** Cursor data to replay. */
    replay: Awaitable<TldrawData>;
  }): React.ReactNode {
  const playback = useSeekable();
  const [editor, setEditor] = useState<Editor | null>(null);

  const cursorRef = useRef<{ handlePointer: PointerHandler }>(null);

  /** Whether to follow the author's camera. */
  const isFollowing = useRef(true);

  // subscribe to replay
  useEffect(() => {
    const subscribe = (recording: TldrawData) => {
      if (!editor) return () => {};

      return tldrawReplay({
        editor,
        handlePointer: cursorRef.current?.handlePointer ?? (() => {}),
        isFollowing: () => isFollowing.current,
        playback,
        recording,
        start,
      });
    };

    // Promise polymorphism
    if (replay instanceof Promise) {
      let unsub: () => void;
      replay.then((d) => (unsub = subscribe(d)));
      return () => {
        unsub?.();
      };
    } else {
      return subscribe(replay);
    }
  }, [replay, editor, playback, start]);

  return (
    <Tldraw {...props}>
      {/*
       * React explodes if we call `loadSnapshot()`, which is part of
       * initialize(), inside <Tldraw>. So we have to do this awkward
       * thing instead.
       */}
      <SetEditor setEditor={setEditor} />
      <CanvasLayer>
        <CursorImage ref={cursorRef} />
      </CanvasLayer>
      {children}
    </Tldraw>
  );
}

function SetEditor({
  setEditor,
}: {
  setEditor: (editor: Editor | null) => void;
}) {
  const editor = useEditor();
  useEffect(() => {
    setEditor(editor);
  }, [editor, setEditor]);
  return null;
}
