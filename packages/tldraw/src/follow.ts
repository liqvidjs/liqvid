import type { Editor, TLPageId } from "tldraw";

import type { Viewport } from "./types.ts";

/**
 * Controls whether the replay viewport follows the author's viewport.
 *
 * By default the replay follows the author: as viewport events are committed,
 * the editor's camera and current page are snapped to match the author's. As
 * soon as the viewer moves the camera or switches pages on their own, following
 * is suspended, leaving the viewer in control. Re-enabling following (e.g. from
 * a "follow author" affordance) snaps the viewport back to the author's and
 * resumes following.
 *
 * The controller also handles viewport scaling: when the viewer's container
 * differs in size from the author's, zoom values are scaled proportionally so
 * the same canvas region remains visible.
 */
export class FollowController {
  #editor: Editor | undefined;

  /** Whether the replay is currently following the author. */
  #following = true;

  /**
   * The author's most recent viewport (page + camera), in author coordinates
   * (i.e., unscaled). Stored unscaled so that when the scale changes (e.g., on
   * container resize), we can recompute the scaled viewport.
   */
  #authorViewport: Viewport | undefined;

  /**
   * The scale factor to apply to viewport zoom values. This is the ratio of
   * viewer container width to author container width.
   */
  #scale = 1;

  /**
   * The viewport the controller most recently drove the editor to. Store
   * changes that match this are the controller's own doing (the camera/page
   * write from {@link setCamera}/{@link setCurrentPage} can land asynchronously,
   * after any synchronous "applying" flag would have been cleared), so they
   * must not be mistaken for viewer input.
   */
  #expected: Viewport | undefined;

  #subscribers = new Set<() => void>();

  /**
   * Timestamp (ms) of the last genuine viewer input (pointer / wheel / pinch /
   * keyboard). Camera and page changes are only treated as viewer-initiated
   * when they closely follow such input — this excludes tldraw's own
   * mount/resize camera adjustments, which occur with no user interaction and
   * would otherwise spuriously suspend following on load.
   */
  #lastInteraction = 0;

  /** Remove the editor input listener, if any. */
  #unlistenInput: (() => void) | undefined;

  /** How long after user input a viewport change still counts as theirs. */
  static readonly INTERACTION_WINDOW_MS = 1000;

  /** Provide the editor to control. */
  provideEditor(editor: Editor): void {
    this.#unlistenInput?.();
    this.#editor = editor;

    // Track genuine viewer input so we can distinguish viewer-driven viewport
    // changes from tldraw's own (e.g. mount/resize) camera adjustments.
    const onEvent = (info: { type: string; name?: string }): void => {
      // Only count input that can move the viewport. Notably `pointer_move`
      // (plain hovering, including tldraw's synthetic move at mount) must NOT
      // count, or merely loading the page with the cursor over the canvas
      // would look like a viewer pan and suspend following.
      const isViewportInput =
        info.type === "wheel" ||
        info.type === "pinch" ||
        info.type === "keyboard" ||
        (info.type === "pointer" && info.name !== "pointer_move");
      if (isViewportInput) {
        this.#lastInteraction = Date.now();
      }
    };
    editor.on("event", onEvent);
    this.#unlistenInput = () => editor.off("event", onEvent);
  }

  /** Detach from the current editor (removes the input listener). */
  dispose(): void {
    this.#unlistenInput?.();
    this.#unlistenInput = undefined;
    this.#editor = undefined;
  }

  /**
   * Whether the viewer has interacted (pointer / wheel / pinch / keyboard)
   * within the interaction window. A viewport change is only attributed to the
   * viewer when this is true.
   */
  isViewerInteracting(): boolean {
    return (
      Date.now() - this.#lastInteraction <
      FollowController.INTERACTION_WINDOW_MS
    );
  }

  /** Whether the replay is currently following the author. */
  get following(): boolean {
    return this.#following;
  }

  /** The author's most recent viewport. */
  get authorViewport(): Viewport | undefined {
    return this.#authorViewport;
  }

  /** Subscribe to `following` changes. Returns an unsubscribe function. */
  subscribe(callback: () => void): () => void {
    this.#subscribers.add(callback);
    return () => this.#subscribers.delete(callback);
  }

  #notify(): void {
    for (const callback of this.#subscribers) callback();
  }

  /**
   * Set the scale factor for viewport zoom values. This should be the ratio of
   * viewer container width to author container width.
   */
  setScale(scale: number): void {
    this.#scale = scale;
    // Re-snap with the new scale if following
    if (this.#following) this.#snap();
  }

  /** Get the current scale factor. */
  get scale(): number {
    return this.#scale;
  }

  /**
   * Record the author's viewport (from a committed viewport action) and, if
   * following, snap the editor to it. The viewport is stored in author
   * coordinates (unscaled) and scaled when snapping.
   */
  setAuthorViewport(next: Partial<Viewport>): void {
    this.#authorViewport = {
      camera: next.camera ?? this.#authorViewport?.camera ?? [0, 0, 1],
      page: next.page ?? this.#authorViewport?.page ?? this.#currentPageId(),
    };

    if (this.#following) this.#snap();
  }

  /**
   * Suspend following. Called when the viewer moves the camera or changes
   * pages on their own.
   */
  suspend(): void {
    if (!this.#following) return;
    this.#following = false;
    this.#notify();
  }

  /**
   * Re-enable following and snap the viewport (and page) back to the author's.
   * This is the mechanism a consumer's "follow author" affordance should call.
   */
  followAuthor(): void {
    this.#following = true;
    this.#snap();
    this.#notify();
  }

  /**
   * Whether a camera position matches the one the controller last drove the
   * editor to (i.e. it is the controller's own change, not viewer input).
   *
   * Camera writes triggered by `setCamera` can land in the store
   * asynchronously, so we detect our own changes by value rather than by a
   * synchronous flag.
   */
  isSelfCamera(x: number, y: number, z: number): boolean {
    const cam = this.#expected?.camera;
    if (!cam) return false;
    return approx(x, cam[0]) && approx(y, cam[1]) && approx(z, cam[2]);
  }

  /**
   * Whether a page id matches the one the controller last drove the editor to
   * (i.e. it is the controller's own change, not viewer input).
   */
  isSelfPage(page: TLPageId): boolean {
    return this.#expected?.page === page;
  }

  #currentPageId(): TLPageId {
    return this.#editor?.getCurrentPageId() ?? ("page:page" as TLPageId);
  }

  /** Snap the editor to the author's viewport (scaled for viewer container). */
  #snap(): void {
    const editor = this.#editor;
    const viewport = this.#authorViewport;
    if (!editor || !viewport) return;

    // Scale the zoom for the viewer's container size
    const [x, y, z] = viewport.camera;
    const scaledZ = z * this.#scale;

    // remember what we are about to drive the editor to, so the resulting
    // (possibly async) store writes are recognized as our own
    this.#expected = {
      camera: [x, y, scaledZ],
      page: viewport.page,
    };

    if (
      editor.getCurrentPageId() !== viewport.page &&
      editor.getPage(viewport.page)
    ) {
      editor.setCurrentPage(viewport.page);
    }
    editor.setCamera({ x, y, z: scaledZ });

    // tldraw may clamp the camera to its constraints; record the actual
    // resulting camera so a clamped value is still recognized as our own.
    const actual = editor.getCamera();
    this.#expected = {
      camera: [actual.x, actual.y, actual.z],
      page: editor.getCurrentPageId(),
    };
  }
}

/** Whether two numbers are equal within a small tolerance. */
function approx(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}
