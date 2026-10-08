import type {
  Editor,
  TLEditorSnapshot,
  TLShape,
  TLStoreSnapshot,
} from "@tldraw/editor";

import { isShape } from "./record-types.ts";

type EditorStore = Editor["store"];

const devModeStores = new WeakSet<EditorStore>();
const unregisterShapeHandler = new WeakMap<Editor, () => void>();
const subscribers = new WeakMap<Editor, Set<() => void>>();
const previousLockStates = new WeakMap<EditorStore, Map<string, boolean>>();
const reconcilingLocks = new WeakSet<EditorStore>();

/** Whether dev mode is active for this editor's store. */
export function isDevModeEnabled(editor: Editor): boolean {
  return devModeStores.has(editor.store);
}

function markDevOnlyShape(shape: TLShape): TLShape {
  return {
    ...shape,
    meta: { ...shape.meta, devOnly: true },
  };
}

/** Re-bind dev mode after the editor is recreated on the same store. */
function attachDevModeHandler(editor: Editor): void {
  if (!devModeStores.has(editor.store) || unregisterShapeHandler.has(editor)) {
    return;
  }
  unregisterShapeHandler.set(
    editor,
    editor.sideEffects.registerBeforeCreateHandler("shape", markDevOnlyShape),
  );
}

/** Subscribe to dev-mode changes for an editor. */
export function subscribeDevMode(
  editor: Editor,
  subscriber: () => void,
): () => void {
  let editorSubscribers = subscribers.get(editor);
  if (!editorSubscribers) {
    editorSubscribers = new Set();
    subscribers.set(editor, editorSubscribers);
  }
  editorSubscribers.add(subscriber);

  return () => {
    editorSubscribers?.delete(subscriber);
    if (editorSubscribers?.size === 0) subscribers.delete(editor);
  };
}

/** Whether a shape should be omitted from recordings. */
export function isDevOnlyShape(shape: Pick<TLShape, "meta">): boolean {
  return shape.meta.devOnly === true;
}

/** Freeze the shape category that should not be editable in the current mode. */
export function syncDevModeShapeLocks(
  editor: Editor,
  shapeIds?: ReadonlySet<string>,
): void {
  attachDevModeHandler(editor);
  if (reconcilingLocks.has(editor.store)) return;

  let previousStates = previousLockStates.get(editor.store);
  if (!previousStates) {
    previousStates = new Map();
    previousLockStates.set(editor.store, previousStates);
  }

  if (shapeIds) {
    for (const id of shapeIds) {
      if (!editor.getShape(id as TLShape["id"])) previousStates.delete(id);
    }
  } else {
    const allShapeIds = new Set(
      editor.store
        .allRecords()
        .filter((record) => record.typeName === "shape")
        .map((shape) => shape.id),
    );
    for (const id of previousStates.keys()) {
      if (!allShapeIds.has(id as TLShape["id"])) previousStates.delete(id);
    }
  }

  const devMode = isDevModeEnabled(editor);
  const updates: Array<{
    id: TLShape["id"];
    isLocked: boolean;
    type: TLShape["type"];
  }> = [];

  const shapes = shapeIds
    ? Array.from(shapeIds)
        .map((id) => editor.getShape(id as TLShape["id"]))
        .filter((shape): shape is TLShape => shape !== undefined)
    : editor.store
        .allRecords()
        .filter((record): record is TLShape => record.typeName === "shape");

  for (const shape of shapes) {
    const shouldFreeze = isDevOnlyShape(shape) !== devMode;

    if (shouldFreeze) {
      if (!previousStates.has(shape.id)) {
        previousStates.set(shape.id, shape.isLocked);
      }
      if (!shape.isLocked) {
        updates.push({ id: shape.id, isLocked: true, type: shape.type });
      }
    } else if (previousStates.has(shape.id)) {
      const isLocked = previousStates.get(shape.id)!;
      previousStates.delete(shape.id);
      if (shape.isLocked !== isLocked) {
        updates.push({ id: shape.id, isLocked, type: shape.type });
      }
    }
  }

  if (updates.length === 0) return;

  applyShapeLockUpdates(editor, updates);
}

/**
 * Saved snapshots include freeze locks from whichever mode was active.
 * After a restore, shapes that belong to the current mode stay editable, and
 * shapes from the other mode stay editable once that mode is active again.
 */
export function reconcileRestoredShapeLocks(editor: Editor): void {
  const devMode = isDevModeEnabled(editor);
  const shapes = editor.store
    .allRecords()
    .filter((record): record is TLShape => record.typeName === "shape");
  const active = shapes.filter((shape) => isDevOnlyShape(shape) === devMode);
  const inactive = shapes.filter((shape) => isDevOnlyShape(shape) !== devMode);

  // A whole category locked together is a mode freeze, not a set of user locks.
  const activeWasFrozen = isUniformlyLocked(active);
  const inactiveWasFrozen = isUniformlyLocked(inactive);
  const previous = new Map<string, boolean>();
  const updates: Array<{
    id: TLShape["id"];
    isLocked: boolean;
    type: TLShape["type"];
  }> = [];

  for (const shape of active) {
    if (activeWasFrozen && shape.isLocked) {
      updates.push({ id: shape.id, isLocked: false, type: shape.type });
    }
  }

  for (const shape of inactive) {
    const isLocked = inactiveWasFrozen ? false : shape.isLocked;
    previous.set(shape.id, isLocked);
    if (!shape.isLocked) {
      updates.push({ id: shape.id, isLocked: true, type: shape.type });
    }
  }

  previousLockStates.set(editor.store, previous);
  applyShapeLockUpdates(editor, updates);
}

/** Write remembered user locks into a snapshot so freezes are not persisted. */
export function rememberUserLocksInSnapshot(
  editor: Editor,
  snapshot: TLEditorSnapshot,
): TLEditorSnapshot {
  const previous = previousLockStates.get(editor.store);
  if (!previous) return snapshot;

  for (const [id, isLocked] of previous) {
    const record =
      snapshot.document.store[id as keyof typeof snapshot.document.store];
    if (record?.typeName === "shape") {
      record.isLocked = isLocked;
    }
  }

  return snapshot;
}

function isUniformlyLocked(shapes: readonly TLShape[]): boolean {
  return shapes.length > 0 && shapes.every((shape) => shape.isLocked);
}

function applyShapeLockUpdates(
  editor: Editor,
  updates: Readonly<{
    id: TLShape["id"];
    isLocked: boolean;
    type: TLShape["type"];
  }>[],
): void {
  if (updates.length === 0) return;

  reconcilingLocks.add(editor.store);
  try {
    editor.store.mergeRemoteChanges(() => {
      editor.run(() => editor.updateShapes(updates), { ignoreShapeLock: true });
    });
  } finally {
    reconcilingLocks.delete(editor.store);
  }
}

/**
 * Toggle the dev-only metadata on each selected shape without changing dev mode.
 */
export function toggleDevOnlyOnSelectedShapes(editor: Editor): void {
  const selectedShapes = editor.getSelectedShapes();
  const editingShape = editor.getEditingShape();
  const shapes =
    selectedShapes.length === 0 && editingShape
      ? [editingShape]
      : selectedShapes;
  if (shapes.length === 0) return;
  const devOnlyCount = shapes.filter(isDevOnlyShape).length;
  // A tie defaults to enabling dev-only so mixed selections resolve together.
  const devOnly = devOnlyCount <= shapes.length / 2;

  editor.run(
    () =>
      editor.updateShapes(
        shapes.map((shape) => ({
          id: shape.id,
          meta: { ...shape.meta, devOnly },
          type: shape.type,
        })),
      ),
    { ignoreShapeLock: true },
  );
  syncDevModeShapeLocks(editor, new Set(shapes.map((shape) => shape.id)));
}

/** Return a snapshot without development-only shapes. */
export function filterDevOnlyShapes(
  snapshot: TLStoreSnapshot,
): TLStoreSnapshot {
  const store = Object.fromEntries(
    Object.entries(snapshot.store).filter(([key, record]) => {
      return !isShape(key) || !isDevOnlyShape(record as TLShape);
    }),
  );

  return { ...snapshot, store };
}

/**
 * Toggle whether newly created shapes are marked as development-only.
 * Pass a boolean to explicitly enable or disable the behavior.
 *
 * @returns Whether dev mode is enabled after the call.
 */
export function toggleDevMode(editor: Editor, enabled?: boolean): boolean {
  const current = isDevModeEnabled(editor);
  const next = enabled ?? !current;
  if (next === current) {
    if (next) attachDevModeHandler(editor);
    return next;
  }

  if (next) {
    devModeStores.add(editor.store);
    attachDevModeHandler(editor);
  } else {
    devModeStores.delete(editor.store);
    unregisterShapeHandler.get(editor)?.();
    unregisterShapeHandler.delete(editor);
  }

  syncDevModeShapeLocks(editor);
  for (const callback of subscribers.get(editor) ?? []) callback();
  return next;
}
