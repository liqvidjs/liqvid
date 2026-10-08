import { useIsPreview } from "@liqvid/studio-plugin-api";
import {
  type Awaitable,
  assertType,
  createUniqueContext,
  omit,
} from "@liqvid/utils";
import { type RenderMode, useSeekable } from "@lqv/playback/react";
import type { Editor } from "@tldraw/editor";
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
import { Tldraw, useEditor } from "tldraw";

import { isDevModeEnabled, subscribeDevMode } from "../dev-mode.ts";
import { FollowController } from "../index.ts";
import { tldrawReplay } from "../replay.ts";
import type { PointerHandler, TldrawData } from "../types.ts";

import { CanvasLayer } from "./CanvasLayer.tsx";
import { CursorImage } from "./CursorImage.tsx";
import {
  AttachSymbol,
  PreserveViewportOnResize,
  SetDataAffords,
  SetDevOnlyShapeSvgAttributes,
  SetEditor,
  SetTldrawColorScheme,
} from "./helpers.tsx";

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

/** Read whether newly created shapes are currently marked dev-only. */
export function useDevMode(): boolean {
  const editor = useEditor();

  return useSyncExternalStore(
    useCallback((onChange) => subscribeDevMode(editor, onChange), [editor]),
    useCallback(() => isDevModeEnabled(editor), [editor]),
    () => false,
  );
}

/**
 * In development mode, `<TldrawRecord>` component.
 * In production mode (or preview), a `<TldrawReplay>` component.
 */
export const TldrawAmbi = lazy(
  import.meta.env.DEV
    ? async () =>
        import("./record.tsx").then((mod) => ({
          default: function TldrawAmbi(
            props: React.ComponentProps<typeof TldrawReplay>,
          ): React.ReactNode {
            const isPreview = useIsPreview();
            if (isPreview) {
              return <TldrawReplay {...props} />;
            }

            return <mod.TldrawRecord {...omit(props, ["replay", "start"])} />;
          },
        }))
    : async () => ({ default: TldrawReplay }),
);

/**
 * Replay Tldraw canvas. React version of {@link tldrawReplay}.
 */
export function TldrawReplay({
  children,
  cursorVisibility,
  start,
  replay,
  colorScheme: _colorScheme,
  ...props
}: Omit<
  Parameters<typeof tldrawReplay>[0],
  "data" | "playback" | "editor" | "handlePointer" | "follow" | "recording"
> &
  React.ComponentPropsWithoutRef<typeof Tldraw> & {
    cursorVisibility?: RenderMode | readonly RenderMode[];

    /** Cursor data to replay. */
    replay?: Awaitable<TldrawData>;
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

  return (
    <FollowContext.Provider value={follow}>
      <Tldraw {...props}>
        {/*
         * React explodes if we call `loadSnapshot()`, which is part of
         * initialize(), inside <Tldraw>. So we have to do this awkward
         * thing instead.
         */}
        <SetEditor setEditor={setEditor} />
        <AttachSymbol />
        <SetTldrawColorScheme />
        <SetDataAffords />
        <SetDevOnlyShapeSvgAttributes />
        <PreserveViewportOnResize />
        <CanvasLayer>
          <CursorImage ref={cursorRef} visibility={cursorVisibility} />
        </CanvasLayer>
        {children}
      </Tldraw>
    </FollowContext.Provider>
  );
}
