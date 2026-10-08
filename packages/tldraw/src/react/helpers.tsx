import { useColorScheme } from "@liqvid/color-scheme/react";
import { useKeymap } from "@liqvid/keymap/react";
import { useIsPreviewOrProduction } from "@liqvid/studio-plugin-api";
import type { TLShapeId } from "@tldraw/editor";
import { useCallback, useEffect, useRef } from "react";
import {
  type Editor,
  type TLEventInfo,
  type TLKeyboardEventInfo,
  useEditor,
} from "tldraw";

import { syncDevModeShapeLocks } from "../dev-mode.ts";
import { TldrawRecording } from "../recording.tsx";
import { TLDRAW_SYMBOL } from "../symbols.ts";

import { useFollow } from ".";

/**
 * Preserve the viewport when the container is resized. When the container width
 * changes (assuming constant aspect ratio), the zoom is scaled proportionally
 * so the same canvas region remains visible.
 *
 * This works in conjunction with the FollowController's scale factor:
 * - When following: updates the scale factor, and the controller re-snaps
 * - When not following: directly scales the camera zoom
 */
export function PreserveViewportOnResize() {
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
export function BubbleKeyboardEvents() {
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

/**
 * DO NOT set colorScheme on `<Tlraw>` component directly
 * as that recreates the component and breaks the camera
 */
export function SetTldrawColorScheme() {
  const editor = useEditor();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    editor.setColorMode(colorScheme);
  }, [colorScheme, editor]);

  return null;
}

/** Set data-affords attribute on DOM element so that it works in Liqvid */
export function SetDataAffords() {
  const editor = useEditor();

  // set data-affords="click keys" on DOM element
  useEffect(() => {
    editor.getContainer().setAttribute("data-affords", "click keys");
  }, [editor]);

  return null;
}

/** Mirror dev-only shape metadata onto shape wrappers and rendered SVG elements. */
export function SetDevOnlyShapeSvgAttributes() {
  const editor = useEditor();

  useEffect(() => {
    const container = editor.getContainer();

    const updateSvgAttributes = (shapeIds?: ReadonlySet<string>) => {
      for (const wrapper of container.querySelectorAll<HTMLElement>(
        "[data-shape-id]",
      )) {
        const id = wrapper.getAttribute("data-shape-id");
        if (!id || (shapeIds && !shapeIds.has(id))) continue;

        const isDevOnly =
          editor.getShape(id as TLShapeId)?.meta.devOnly === true;
        if (isDevOnly) {
          wrapper.setAttribute("data-dev-only", "true");
        } else {
          wrapper.removeAttribute("data-dev-only");
        }

        for (const svg of wrapper.querySelectorAll("svg")) {
          // Nested shapes have their own wrapper and should use their own meta.
          if (svg.closest("[data-shape-id]") !== wrapper) continue;

          if (isDevOnly) {
            svg.setAttribute("data-dev-only", "true");
          } else {
            svg.removeAttribute("data-dev-only");
          }
        }
      }
    };

    let lockSyncScheduled = false;
    let fullLockSyncPending = false;
    let pendingLockSyncIds = new Set<string>();
    const scheduleLockSync = (
      shapeIds: ReadonlySet<string>,
      fullSync = false,
    ) => {
      for (const id of shapeIds) pendingLockSyncIds.add(id);
      fullLockSyncPending ||= fullSync;
      if (lockSyncScheduled) return;
      lockSyncScheduled = true;
      queueMicrotask(() => {
        lockSyncScheduled = false;
        const shapeIdsToSync = pendingLockSyncIds;
        pendingLockSyncIds = new Set();
        const fullSync = fullLockSyncPending;
        fullLockSyncPending = false;
        syncDevModeShapeLocks(editor, fullSync ? undefined : shapeIdsToSync);
      });
    };

    const unlisten = editor.store.listen(({ changes }) => {
      const shapeIds = new Set(
        [
          ...Object.keys(changes.added),
          ...Object.keys(changes.updated),
          ...Object.keys(changes.removed),
        ].filter((id) => id.startsWith("shape:")),
      );
      if (shapeIds.size > 0) {
        updateSvgAttributes(shapeIds);
        const lockTopologyChanged = Object.values(changes.updated).some(
          ([from, to]) =>
            from.typeName === "shape" &&
            to.typeName === "shape" &&
            (from.isLocked !== to.isLocked || from.parentId !== to.parentId),
        );
        scheduleLockSync(shapeIds, lockTopologyChanged);
      }
    });
    const observer = new MutationObserver(() => updateSvgAttributes());
    observer.observe(container, { childList: true, subtree: true });
    updateSvgAttributes();
    syncDevModeShapeLocks(editor);

    return () => {
      unlisten();
      observer.disconnect();
    };
  }, [editor]);

  return null;
}

export function SetEditor({
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

/** Hack to make editor available to the helper drawer */
export function AttachSymbol() {
  const editor = useEditor();

  // TODO: temporary hack to make the helper thing work
  useEffect(() => {
    (editor.getContainer() as unknown as { [sym: symbol]: Editor })[
      TLDRAW_SYMBOL
    ] = editor;
  }, [editor]);

  return null;
} /** Wrap a Tldraw event info so that Liqvid's keymap can handle it */

export function asKeyboardEventish(
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

/* ------------------------------ helpers ------------------------------ */
/** Hack to make editor available to recording */
export function ProvideEditorToRecording() {
  const editor = useEditor();
  const isPreview = useIsPreviewOrProduction();

  if (!isPreview) {
    TldrawRecording.recorder.provideEditor(editor);
  }

  return null;
}
