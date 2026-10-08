import type { Editor, TLShape, TLStoreSnapshot } from "@tldraw/editor";

import {
  filterDevOnlyShapes,
  isDevModeEnabled,
  isDevOnlyShape,
  reconcileRestoredShapeLocks,
  rememberUserLocksInSnapshot,
  subscribeDevMode,
  syncDevModeShapeLocks,
  toggleDevMode,
  toggleDevOnlyOnSelectedShapes,
} from "../src/dev-mode.ts";

describe("dev mode", () => {
  test("toggles and explicitly sets the mode for new shapes", () => {
    let beforeCreate: ((shape: TLShape) => TLShape) | undefined;
    let unregisterCount = 0;
    const editor = {
      getCurrentPageShapes: () => [],
      getShape: () => undefined,
      sideEffects: {
        registerBeforeCreateHandler(
          _type: string,
          handler: (shape: TLShape) => TLShape,
        ) {
          beforeCreate = handler;
          return () => {
            unregisterCount += 1;
            beforeCreate = undefined;
          };
        },
      },
      store: {
        allRecords: () => [],
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
    } as unknown as Editor;
    const onChange = jest.fn();
    const unsubscribe = subscribeDevMode(editor, onChange);

    expect(isDevModeEnabled(editor)).toBe(false);
    expect(toggleDevMode(editor)).toBe(true);
    expect(isDevModeEnabled(editor)).toBe(true);
    expect(toggleDevMode(editor, true)).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);

    const shape = {
      id: "shape:test",
      meta: { existing: "value" },
      type: "geo",
      typeName: "shape",
    } as unknown as TLShape;
    const marked = beforeCreate?.(shape);
    expect(marked?.meta).toEqual({ devOnly: true, existing: "value" });
    expect(isDevOnlyShape(marked!)).toBe(true);

    expect(toggleDevMode(editor)).toBe(false);
    expect(isDevModeEnabled(editor)).toBe(false);
    expect(unregisterCount).toBe(1);
    expect(toggleDevMode(editor, false)).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(toggleDevMode(editor)).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test("filters dev-only shapes from snapshots without mutating them", () => {
    const visible = {
      id: "shape:visible",
      meta: {},
      typeName: "shape",
    };
    const devOnly = {
      id: "shape:dev-only",
      meta: { devOnly: true },
      typeName: "shape",
    };
    const page = { id: "page:page", typeName: "page" };
    const snapshot = {
      schema: {},
      store: {
        [visible.id]: visible,
        [devOnly.id]: devOnly,
        [page.id]: page,
      },
    };

    const filtered = filterDevOnlyShapes(
      snapshot as unknown as TLStoreSnapshot,
    );

    expect(Object.keys(filtered.store)).toEqual([visible.id, page.id]);
    expect(Object.keys(snapshot.store)).toContain(devOnly.id);
  });

  test("toggles selected shapes' dev-only flags without changing dev mode", () => {
    const shapes = [
      {
        id: "shape:visible",
        meta: { note: "keep" },
        type: "text",
      },
      {
        id: "shape:dev-only",
        meta: { devOnly: true },
        type: "geo",
      },
      {
        id: "shape:dev-only-2",
        meta: { devOnly: true },
        type: "geo",
      },
    ] as unknown as TLShape[];
    const updateShapes = jest.fn();
    const editor = {
      getEditingShape: () => undefined,
      getSelectedShapes: () => shapes,
      getShape: () => undefined,
      run: (callback: () => void) => callback(),
      sideEffects: { registerBeforeCreateHandler: () => () => {} },
      store: {
        allRecords: () => [],
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
      updateShapes,
    } as unknown as Editor;

    toggleDevMode(editor, true);
    toggleDevOnlyOnSelectedShapes(editor);

    expect(updateShapes).toHaveBeenCalledWith([
      {
        id: "shape:visible",
        meta: { devOnly: false, note: "keep" },
        type: "text",
      },
      {
        id: "shape:dev-only",
        meta: { devOnly: false },
        type: "geo",
      },
      {
        id: "shape:dev-only-2",
        meta: { devOnly: false },
        type: "geo",
      },
    ]);
    expect(isDevModeEnabled(editor)).toBe(true);
    toggleDevMode(editor, false);
  });

  test("sets all selected shapes dev-only when that flag is not the majority", () => {
    const shapes = [
      { id: "shape:one", meta: {}, type: "geo" },
      { id: "shape:two", meta: {}, type: "geo" },
      { id: "shape:three", meta: { devOnly: true }, type: "geo" },
    ] as unknown as TLShape[];
    const updateShapes = jest.fn();
    const editor = {
      getCurrentPageShapes: () => [],
      getEditingShape: () => undefined,
      getSelectedShapes: () => shapes,
      run: (callback: () => void) => callback(),
      store: {
        allRecords: () => [],
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
      updateShapes,
    } as unknown as Editor;

    toggleDevOnlyOnSelectedShapes(editor);

    expect(updateShapes).toHaveBeenCalledWith(
      shapes.map((shape) => ({
        id: shape.id,
        meta: { ...shape.meta, devOnly: true },
        type: shape.type,
      })),
    );
  });

  test("toggles a text shape being edited when nothing else is selected", () => {
    const textShape = {
      id: "shape:text",
      isLocked: false,
      meta: {},
      type: "text",
    } as unknown as TLShape;
    const updateShapes = jest.fn();
    const editor = {
      getEditingShape: () => textShape,
      getSelectedShapes: () => [],
      getShape: () => textShape,
      run: (callback: () => void) => callback(),
      store: {
        allRecords: () => [textShape],
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
      updateShapes,
    } as unknown as Editor;

    toggleDevOnlyOnSelectedShapes(editor);

    expect(updateShapes).toHaveBeenCalledWith([
      {
        id: textShape.id,
        meta: { devOnly: true },
        type: "text",
      },
    ]);
  });

  test("freezes the inactive shape category and restores existing locks", () => {
    const shapes = [
      {
        id: "shape:regular",
        isLocked: false,
        meta: {},
        type: "geo",
        typeName: "shape",
      },
      {
        id: "shape:dev-only",
        isLocked: false,
        meta: { devOnly: true },
        type: "geo",
        typeName: "shape",
      },
      {
        id: "shape:text",
        isLocked: false,
        meta: {},
        type: "text",
        typeName: "shape",
      },
      {
        id: "shape:user-locked",
        isLocked: true,
        meta: {},
        type: "geo",
        typeName: "shape",
      },
    ] as unknown as TLShape[];
    const updateShapes = jest.fn(
      (updates: Array<{ id: string; isLocked?: boolean }>) => {
        for (const update of updates) {
          const shape = shapes.find(({ id }) => id === update.id);
          if (shape && update.isLocked !== undefined) {
            Object.assign(shape, { isLocked: update.isLocked });
          }
        }
      },
    );
    const editor = {
      getShape: (id: string) => shapes.find((shape) => shape.id === id),
      run: (callback: () => void) => callback(),
      sideEffects: {
        registerBeforeCreateHandler: () => () => {},
      },
      store: {
        allRecords: () => shapes,
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
      updateShapes,
    } as unknown as Editor;

    syncDevModeShapeLocks(editor);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([
      false,
      true,
      false,
      true,
    ]);

    toggleDevMode(editor, true);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([
      true,
      false,
      true,
      true,
    ]);

    toggleDevMode(editor, false);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  test("keeps restored shapes editable in the mode they belong to", () => {
    const shapes = [
      {
        id: "shape:regular",
        isLocked: true,
        meta: {},
        type: "geo",
        typeName: "shape",
      },
      {
        id: "shape:dev-only",
        isLocked: false,
        meta: { devOnly: true },
        type: "geo",
        typeName: "shape",
      },
      {
        id: "shape:user-locked",
        isLocked: true,
        meta: { devOnly: true },
        type: "geo",
        typeName: "shape",
      },
    ] as unknown as TLShape[];
    const updateShapes = jest.fn(
      (updates: Array<{ id: string; isLocked?: boolean }>) => {
        for (const update of updates) {
          const shape = shapes.find(({ id }) => id === update.id);
          if (shape && update.isLocked !== undefined) {
            Object.assign(shape, { isLocked: update.isLocked });
          }
        }
      },
    );
    const editor = {
      getShape: (id: string) => shapes.find((shape) => shape.id === id),
      run: (callback: () => void) => callback(),
      sideEffects: {
        registerBeforeCreateHandler: () => () => {},
      },
      store: {
        allRecords: () => shapes,
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
      updateShapes,
    } as unknown as Editor;

    reconcileRestoredShapeLocks(editor);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([false, true, true]);

    toggleDevMode(editor, true);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([true, false, true]);

    toggleDevMode(editor, false);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([false, true, true]);
  });

  test("keeps restored dev-only shapes editable in dev mode", () => {
    const shapes = [
      {
        id: "shape:regular",
        isLocked: false,
        meta: {},
        type: "geo",
        typeName: "shape",
      },
      {
        id: "shape:dev-only",
        isLocked: true,
        meta: { devOnly: true },
        type: "geo",
        typeName: "shape",
      },
    ] as unknown as TLShape[];
    const updateShapes = jest.fn(
      (updates: Array<{ id: string; isLocked?: boolean }>) => {
        for (const update of updates) {
          const shape = shapes.find(({ id }) => id === update.id);
          if (shape && update.isLocked !== undefined) {
            Object.assign(shape, { isLocked: update.isLocked });
          }
        }
      },
    );
    const editor = {
      getShape: (id: string) => shapes.find((shape) => shape.id === id),
      run: (callback: () => void) => callback(),
      sideEffects: {
        registerBeforeCreateHandler: () => () => {},
      },
      store: {
        allRecords: () => shapes,
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
      updateShapes,
    } as unknown as Editor;

    toggleDevMode(editor, true);
    reconcileRestoredShapeLocks(editor);

    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([true, false]);
  });

  test("persists user locks instead of mode freezes", () => {
    const shapes = [
      {
        id: "shape:regular",
        isLocked: false,
        meta: {},
        type: "geo",
        typeName: "shape",
      },
      {
        id: "shape:dev-only",
        isLocked: false,
        meta: { devOnly: true },
        type: "geo",
        typeName: "shape",
      },
    ] as unknown as TLShape[];
    const editor = {
      getShape: (id: string) => shapes.find((shape) => shape.id === id),
      run: (callback: () => void) => callback(),
      sideEffects: {
        registerBeforeCreateHandler: () => () => {},
      },
      store: {
        allRecords: () => shapes,
        mergeRemoteChanges: (callback: () => void) => callback(),
      },
      updateShapes: (updates: Array<{ id: string; isLocked?: boolean }>) => {
        for (const update of updates) {
          const shape = shapes.find(({ id }) => id === update.id);
          if (shape && update.isLocked !== undefined) {
            Object.assign(shape, { isLocked: update.isLocked });
          }
        }
      },
    } as unknown as Editor;

    syncDevModeShapeLocks(editor);
    const snapshot = rememberUserLocksInSnapshot(editor, {
      document: {
        schema: {},
        store: {
          "shape:dev-only": { ...shapes[1], isLocked: true },
          "shape:regular": { ...shapes[0] },
        },
      },
      session: {},
    } as unknown as Parameters<typeof rememberUserLocksInSnapshot>[1]);

    expect(snapshot.document.store["shape:dev-only"]).toMatchObject({
      isLocked: false,
    });
    expect(snapshot.document.store["shape:regular"]).toMatchObject({
      isLocked: false,
    });
  });

  test("keeps the active category editable when the editor is recreated", () => {
    const shapes = [
      {
        id: "shape:regular",
        isLocked: false,
        meta: {},
        type: "geo",
        typeName: "shape",
      },
      {
        id: "shape:dev-only",
        isLocked: false,
        meta: { devOnly: true },
        type: "geo",
        typeName: "shape",
      },
    ] as unknown as TLShape[];
    const updateShapes = (
      updates: Array<{ id: string; isLocked?: boolean }>,
    ) => {
      for (const update of updates) {
        const shape = shapes.find(({ id }) => id === update.id);
        if (shape && update.isLocked !== undefined) {
          Object.assign(shape, { isLocked: update.isLocked });
        }
      }
    };
    const store = {
      allRecords: () => shapes,
      mergeRemoteChanges: (callback: () => void) => callback(),
    };
    const editor = {
      getShape: (id: string) => shapes.find((shape) => shape.id === id),
      run: (callback: () => void) => callback(),
      sideEffects: {
        registerBeforeCreateHandler: () => () => {},
      },
      store,
      updateShapes,
    } as unknown as Editor;

    toggleDevMode(editor, true);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([true, false]);

    const recreated = {
      getShape: (id: string) => shapes.find((shape) => shape.id === id),
      run: (callback: () => void) => callback(),
      sideEffects: {
        registerBeforeCreateHandler: () => () => {},
      },
      store,
      updateShapes,
    } as unknown as Editor;

    syncDevModeShapeLocks(recreated);

    expect(isDevModeEnabled(recreated)).toBe(true);
    expect(shapes.map(({ isLocked }) => isLocked)).toEqual([true, false]);
  });
});
