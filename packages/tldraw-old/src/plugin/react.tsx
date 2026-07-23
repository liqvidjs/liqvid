import {useME} from "@lqv/playback/react";
import {Tldraw, useEditor, type Editor} from "@tldraw/tldraw";
import {useEffect, useRef, useState} from "react";
import {tldrawReplay} from ".";
import {CanvasLayer} from "./react/CanvasLayer";
import {CursorImage} from "./react/CursorImage";
import type {TldrawData} from "./types";
import {objectKeys} from "./utils";

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
    replay: TldrawData | Promise<TldrawData>;
  }): React.ReactNode {
  const playback = useME();
  const [editor, setEditor] = useState<Editor | null>(null);

  const cursorRef = useRef<React.ComponentRef<typeof CursorImage>>(null);

  /** Whether to follow the author's camera. */
  const isFollowing = useRef(true);

  useEffect(() => {
    if (!editor) return;

    editor.store.listen(({changes, source}) => {
      if (!isFollowing.current || source !== "user") return;

      // initial call
      if ("document:document" in changes.updated) return;

      // look for camera records
      for (const key of objectKeys(changes.updated)) {
        const record = changes.updated[key][1];
        if (record.typeName !== "camera") continue;

        isFollowing.current = false;
        // TODO move the camera
        return;
      }
    });
  }, [editor]);

  // subscribe to replay
  useEffect(() => {
    const subscribe = (recording: TldrawData) => {
      if (!editor) return () => {};
      return tldrawReplay({
        editor,
        playback,
        recording,
        start,

        handlePointer: cursorRef.current?.handlePointer ?? (() => {}),
        isFollowing: () => isFollowing.current,
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
  }, [replay, editor, playback, props, start]);

  return (
    <Tldraw>
      {/*
       * React explodes if we call `loadSnapshot()`, which is part of
       * initialize(), inside <Tldraw>. So we have to do this awkward
       * thing instead.
       */}
      <SetEditor setEditor={setEditor} />
      <CanvasLayer>
        <CursorImage ref={cursorRef} />
      </CanvasLayer>
      <button
        style={{position: "absolute", top: `40px`, left: "0", zIndex: "1000"}}
        onClick={() => (isFollowing.current = true)}
      >
        Follow
      </button>
      {children}
    </Tldraw>
  );
}

function SetEditor({setEditor}: {setEditor: (editor: Editor | null) => void}) {
  const editor = useEditor();
  useEffect(() => {
    setEditor(editor);
  }, [editor, setEditor]);
  return null;
}

// <TldrawUiIcon icon={"tool-select" satisfies TLUiIconType}/>