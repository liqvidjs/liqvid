import {
  applyDiff,
  changeDiff,
  creationDiff,
  deletionDiff,
  diffObjects,
  objectDiff,
} from "@liqvid/diff";
import {assertType} from "@liqvid/utils/types";
import type {RecordsDiff, TLRecord, TLShape, UnknownRecord} from "@tldraw/tldraw";

import {defaultShape} from "./defaults";
import {
  isCameraCoords,
  isCurrentTool,
  isPointer,
  isShape,
} from "./record-types";
import type {
  CameraCoords,
  Point3,
  PointerCoords,
  ShapeAppend,
  ShapeRemove,
  ShapeUpdate,
  TldrawEvent,
  TldrawHistory,
} from "./types";
import {storeDiff} from "./utils";
import {extractSegmentAppend, isSegmentAppend, segmentAppend} from "./zsa";

const deletePlaceholder = 0;

/** Compress */
export function compressChanges(
  changes: RecordsDiff<UnknownRecord>,
  shapeCache: Map<string, TLShape>,
): TldrawEvent[] {
  const events: TldrawEvent[] = [];
  // new records
  for (const [key, created] of Object.entries(changes.added)) {
    switch (true) {
      case isShape(key): {
        assertType<TLShape>(created);
        events.push({
          [key]: diffObjects(defaultShape as unknown as TLShape, created),
        } satisfies ShapeUpdate);
        shapeCache.set(created.id, created);
        break;
      }
    }
  }

  // updated records
  for (const [key, update] of Object.entries(changes.updated)) {
    const [from, to] = update as [TLRecord, TLRecord];

    switch (true) {
      // instance
      case to.typeName === "camera":
        events.push([to.x, to.y, to.z] satisfies CameraCoords);
        break;
      // pointer
      case to.typeName === "pointer":
        events.push([to.x, to.y] satisfies PointerCoords);
        break;
      // shape
      case isShape(key): {
        assertType<TLShape>(from);
        assertType<TLShape>(to);

        const shape = shapeCache.get(to.id);
        if (shape) {
          const diff = diffObjects(shape, to);

          // appending to a shape is a common event so we compress it
          if (isSegmentAppend(diff)) {
            const points = extractSegmentAppend(diff);

            let toAppend: Point3[] | Point3;
            if (points.length > 1) {
              toAppend = points.map(
                (p): Point3 =>
                  typeof p.z === "number" ? [p.x, p.y, p.z] : [p.x, p.y],
              );
            } else {
              const p = points[0];
              toAppend = typeof p.z === "number" ? [p.x, p.y, p.z] : [p.x, p.y];
            }

            events.push({[key]: toAppend} satisfies ShapeAppend);
          } else {
            events.push({[key]: diffObjects(shape, to)} satisfies ShapeUpdate);
          }
        } else {
          // @todo is this necessary? what happens if the shape exists before recording,
          // we need to initialize the shape cache better
          events.push({
            [key]: diffObjects(defaultShape as unknown as TLShape, to),
          });
        }
        shapeCache.set(to.id, to);
        break;
      }
    }
  }

  // removed records
  for (const [key, removed] of Object.entries(changes.removed)) {
    switch (true) {
      case isShape(key):
        events.push({[key]: 0} satisfies ShapeRemove);
        shapeCache.delete(removed.id);
        break;
    }
  }

  return events;
}

/** Decompress */
export function decompress(datum: TldrawEvent, history: TldrawHistory) {
  history.shapes ??= new Map();

  // pointer coordinates
  if (isPointer(datum)) {
    const [x, y] = datum;
    if (typeof x === "undefined") {
      console.error(datum)
    }
    return objectDiff("pointer", {
      ...changeDiff("x", x),
      ...changeDiff("y", y),
    });
  }

  // tool
  if (isCurrentTool(datum)) {
    return objectDiff("pointer", changeDiff("tool", datum));
  }

  // camera coordinates
  if (isCameraCoords(datum)) {
    const [x, y, z] = datum;

    return storeDiff(
      objectDiff("camera:page:page", {
        ...changeDiff("x", x),
        ...changeDiff("y", y),
        ...changeDiff("z", z),
      }),
    );
  }

  // get unique key
  const keys = Object.keys(datum);
  if (keys.length !== 1) {
    return {};
  }
  const key = keys[0];

  // shape commands
  if (isShape(key)) {
    const update = datum[key];

    // shape remove
    if (update === deletePlaceholder) {
      history.shapes.delete(key);
      return storeDiff(deletionDiff(key));
    }
    // shape append
    else if (Array.isArray(update)) {
      if (update.length === 0) {
        console.error("Expected non-empty array");
        return {};
      }

      if (typeof update[0] === "number") {
        assertType<Point3>(update);
        return storeDiff(objectDiff(key, segmentAppend([update])));
      } else {
        assertType<Point3[]>(update);
        return storeDiff(objectDiff(key, segmentAppend(update)));
      }
    }
    // shape create
    if (!history.shapes.has(key)) {
      const shape = applyDiff(defaultShape, update) as unknown as TLShape;
      history.shapes.set(key, shape);
      return storeDiff(creationDiff(key, shape));
    }
    // shape update
    return storeDiff(objectDiff(key, update));
  }

  return {};
}
