import { useColorScheme } from "@liqvid/color-scheme/react";
import { useKeymap } from "@liqvid/keymap/react";
import {
  useIsPreview,
  useIsPreviewOrProduction,
} from "@liqvid/studio-plugin-api";
import {
  type Awaitable,
  assertType,
  createUniqueContext,
  omit,
} from "@liqvid/utils";
import { useSeekable } from "@lqv/playback/react";
import {
  lazy,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type Editor,
  type TLEventInfo,
  type TLKeyboardEventInfo,
  Tldraw,
  useEditor,
} from "tldraw";

import {
  FollowController,
  type PointerHandler,
  tldrawReplay,
} from "./index.ts";
import { CanvasLayer } from "./react/CanvasLayer.tsx";
import { CursorImage } from "./react/CursorImage.tsx";
import { TldrawRecording } from "./recording.tsx";
import type { TldrawData } from "./types.ts";

/**
 * Context exposing the {@link FollowController} for the current
 * {@link TldrawReplay}. Consumers can read it via {@link useFollow} to build a
 * "follow author" affordance.
 */
export const FollowContext = createUniqueContext<FollowController | null>(
  "@lqv/tldraw/FollowContext",
  null,
  "FollowContext",
);

/**
 * Access the replay's follow state and controls.
 *
 * @returns `following` — whether the replay is currently following the author;
 *   `followAuthor()` — re-enable following and snap the viewport (and page)
 *   back to the author's; `controller` — the underlying {@link FollowController}
 *   (or `null` outside a {@link TldrawReplay}).
 */
export function useFollow(): {
  following: boolean;
  followAuthor: () => void;
  controller: FollowController | null;
} {
  const controller = useContext(FollowContext);

  const following = useSyncExternalStore(
    useCallback(
      (onChange) => controller?.subscribe(onChange) ?? (() => {}),
      [controller],
    ),
    () => controller?.following ?? true,
    () => true,
  );

  const followAuthor = useCallback(
    () => controller?.followAuthor(),
    [controller],
  );

  return { controller, followAuthor, following };
}

/**
 * In development mode, `<TldrawRecord>` component.
 * In production mode (or preview), a `<TldrawReplay>` component.
 */
export const TldrawAmbi = lazy(
  import.meta.env.DEV
    ? async () => ({
        default: function TldrawAmbi(
          props: React.ComponentProps<typeof TldrawReplay>,
        ) {
          const isPreview = useIsPreview();
          if (isPreview) {
            return <TldrawReplay {...props} />;
          }

          return <TldrawRecord {...omit(props, ["replay", "start"])} />;
        },
      })
    : async () => ({ default: TldrawReplay }),
);

export function TldrawRecord({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tldraw>) {
  const { colorScheme } = useColorScheme();
  return (
    <Tldraw colorScheme={colorScheme} {...props}>
      <BubbleKeyboardEvents />
      <AttachEditor />
      <SetDataAffords />
      {children}
    </Tldraw>
  );
}

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
  "data" | "playback" | "editor" | "handlePointer" | "follow" | "recording"
> &
  React.ComponentPropsWithoutRef<typeof Tldraw> & {
    /** Cursor data to replay. */
    replay: Awaitable<TldrawData>;
  }): React.ReactNode {
  const playback = useSeekable();
  const [editor, setEditor] = useState<Editor | null>(null);

  const cursorRef = useRef<{ handlePointer: PointerHandler }>(null);

  /** Controls whether the replay follows the author's viewport. */
  const follow = useMemo(() => new FollowController(), []);

  // provide the editor to the follow controller and suspend following when the
  // viewer moves the camera or switches pages on their own
  useEffect(() => {
    if (!editor) return;
    follow.provideEditor(editor);

    const unlisten = editor.store.listen(
      ({ changes }) => {
        // A camera change is only the viewer's if it closely follows genuine
        // viewer input (pointer / wheel / pinch / keyboard). This excludes
        // tldraw's own mount/resize camera adjustments, which happen with no
        // interaction and would otherwise suspend following on load. Page
        // changes are unambiguous (they only come from a real page switch or a
        // self/replayed change, filtered by `isSelfPage`), so they suspend
        // regardless of the interaction gate — a page switch is triggered from
        // the page menu, which is not a canvas input event.
        const interacting = follow.isViewerInteracting();

        // A new camera record means the viewer panned/zoomed on a fresh page —
        // unless it matches what the controller itself just drove us to.
        if (interacting) {
          for (const record of Object.values(changes.added)) {
            if (
              record.typeName === "camera" &&
              !follow.isSelfCamera(record.x, record.y, record.z)
            ) {
              follow.suspend();
              return;
            }
          }
        }

        // Only suspend on *actual* viewport movement, and only when it did not
        // originate from the controller's own snap. The `instance` record
        // carries `currentPageId` alongside many transient fields (cursor,
        // hover, brush, chat, …) that change on ordinary clicks — so we must
        // compare from/to and react solely to real camera moves and page
        // switches, not any instance write. Camera/page writes from the
        // controller land asynchronously (after `setCamera`), so they arrive
        // as `user`-source changes here; we recognize and ignore them by
        // matching the value the controller last drove us to.
        for (const [from, to] of Object.values(changes.updated)) {
          if (to.typeName === "camera") {
            assertType<typeof to>(from);

            if (
              interacting &&
              (to.x !== from.x || to.y !== from.y || to.z !== from.z) &&
              !follow.isSelfCamera(to.x, to.y, to.z)
            ) {
              follow.suspend();
              return;
            }
          }

          if (to.typeName === "instance") {
            assertType<typeof to>(from);

            if (
              to.currentPageId !== from.currentPageId &&
              !follow.isSelfPage(to.currentPageId)
            ) {
              follow.suspend();
              return;
            }
          }
        }
      },
      // viewer-initiated changes (replay writes shapes/pages as "remote"); the
      // controller's own camera/page writes also arrive here and are filtered
      // out via `isSelfCamera` / `isSelfPage`.
      { source: "user" },
    );

    return () => {
      unlisten();
      follow.dispose();
    };
  }, [editor, follow]);

  // subscribe to replay
  useEffect(() => {
    const subscribe = (recording: TldrawData) => {
      if (!editor) return () => {};

      return tldrawReplay({
        editor,
        follow,
        handlePointer: cursorRef.current?.handlePointer ?? (() => {}),
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
  }, [replay, editor, playback, start, follow]);

  const { colorScheme } = useColorScheme();

  return (
    <FollowContext.Provider value={follow}>
      <Tldraw colorScheme={colorScheme} {...props}>
        {/*
         * React explodes if we call `loadSnapshot()`, which is part of
         * initialize(), inside <Tldraw>. So we have to do this awkward
         * thing instead.
         */}
        <SetEditor setEditor={setEditor} />
        <SetDataAffords />
        <PreserveViewportOnResize />
        <CanvasLayer>
          <CursorImage ref={cursorRef} />
        </CanvasLayer>
        {children}
      </Tldraw>
    </FollowContext.Provider>
  );
}

/* ------------------------------ helpers ------------------------------ */

function AttachEditor() {
  const editor = useEditor();
  const isPreview = useIsPreviewOrProduction();

  if (!isPreview) {
    TldrawRecording.recorder.provideEditor(editor);
  }

  return null;
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

function SetDataAffords() {
  const editor = useEditor();

  // set data-affords="click keys" on DOM element

  useEffect(() => {
    editor.getContainer().setAttribute("data-affords", "click keys");
  }, [editor]);

  return null;
}

/**
 * Preserve the viewport when the container is resized. When the container width
 * changes (assuming constant aspect ratio), the zoom is scaled proportionally
 * so the same canvas region remains visible.
 *
 * This works in conjunction with the FollowController's scale factor:
 * - When following: updates the scale factor, and the controller re-snaps
 * - When not following: directly scales the camera zoom
 */
function PreserveViewportOnResize() {
  const editor = useEditor();
  const { controller } = useFollow();
  const referenceWidthRef = useRef<number | null>(null);

  useEffect(() => {
    const container = editor.getContainer();

    // Store the initial width as the reference
    referenceWidthRef.current = container.clientWidth;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const referenceWidth = referenceWidthRef.current;

        if (newWidth > 0 && referenceWidth && referenceWidth > 0) {
          const resizeScale = newWidth / referenceWidth;

          // Only adjust if there's a meaningful change
          if (Math.abs(resizeScale - 1) > 1e-6) {
            if (controller) {
              // Update the follow controller's scale (multiplied by the resize
              // ratio). This handles both following and not-following cases:
              // the controller stores the new scale for future viewport snaps.
              const newScale = controller.scale * resizeScale;
              controller.setScale(newScale);
            }

            // If not following, directly scale the camera
            if (!controller?.following) {
              const camera = editor.getCamera();
              editor.setCamera({
                x: camera.x,
                y: camera.y,
                z: camera.z * resizeScale,
              });
            }

            referenceWidthRef.current = newWidth;
          }
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [editor, controller]);

  return null;
}

/** Pass keyboard shortcuts up to the Liqvid keymap */
function BubbleKeyboardEvents() {
  const editor = useEditor();
  const keymap = useKeymap();

  const handleKeyboardShortcuts = useCallback(
    (e: TLEventInfo) => {
      if (!(e.type === "keyboard" && e.name === "key_down")) return;

      // only want to do recording shortcuts
      // remove if you're changing the recording shortcuts
      if (!(e.ctrlKey && e.altKey)) return;

      keymap.handle(asKeyboardEventish(e));
    },
    [keymap],
  );

  useEffect(() => {
    editor.on("event", handleKeyboardShortcuts);

    return () => {
      editor.off("event", handleKeyboardShortcuts);
    };
  }, [editor, handleKeyboardShortcuts]);

  return null;
}

/** Wrap a Tldraw event info so that Liqvid's keymap can handle it */
function asKeyboardEventish(
  e: TLKeyboardEventInfo,
): Pick<KeyboardEvent, "getModifierState" | "preventDefault"> &
  TLKeyboardEventInfo {
  return {
    ...e,
    getModifierState(modifier: string) {
      switch (modifier) {
        case "Alt":
          return e.altKey;
        case "Control":
          return e.ctrlKey;
        case "Shift":
          return e.shiftKey;
      }
      return false;
    },
    preventDefault() {},
  };
}
