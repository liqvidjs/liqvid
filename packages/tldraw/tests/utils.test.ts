import { applyDiff, diffObjects } from "@liqvid/diff";
import { b64Vecs } from "tldraw";

import { defaultShape } from "../src/defaults.ts";
import {
  decodeDiffPaths,
  decodeShape,
  encodeDiffPaths,
  encodeShape,
} from "../src/utils.ts";
import {
  extractSegmentAppend,
  isSegmentAppend,
  segmentAppend,
} from "../src/zsa.ts";

/** Build a minimal draw shape with a base64-encoded path. */
function makeDrawShape(points: { x: number; y: number; z?: number }[]) {
  return {
    id: "shape:test",
    index: "a1",
    isLocked: false,
    meta: {},
    opacity: 1,
    parentId: "page:page",
    props: {
      color: "black",
      dash: "draw",
      fill: "none",
      isClosed: false,
      isComplete: false,
      isPen: false,
      segments: [{ path: b64Vecs.encodePoints2D(points), type: "free" }],
      size: "m",
    },
    rotation: 0,
    type: "draw" as const,
    typeName: "shape" as const,
    x: 0,
    y: 0,
  };
}

describe("shape base64 decode/encode", () => {
  test("decodeShape turns base64 paths into VecModel arrays", () => {
    const points = [
      { x: 0, y: 0, z: 0.5 },
      { x: 10, y: 20, z: 0.5 },
    ];
    const shape = makeDrawShape(points);

    // biome-ignore lint/suspicious/noExplicitAny: test
    const decoded = decodeShape(shape as any) as any;
    expect(Array.isArray(decoded.props.segments[0].path)).toBe(true);
    expect(decoded.props.segments[0].path).toHaveLength(2);
    expect(decoded.props.segments[0].path[0].x).toBeCloseTo(0);
    expect(decoded.props.segments[0].path[1].x).toBeCloseTo(10);
  });

  test("encodeShape is the inverse of decodeShape (up to quantization)", () => {
    const points = [
      { x: 0, y: 0, z: 0.5 },
      { x: 10, y: 20, z: 0.5 },
    ];
    const shape = makeDrawShape(points);

    // biome-ignore lint/suspicious/noExplicitAny: test
    const decoded = decodeShape(shape as any) as any;
    // biome-ignore lint/suspicious/noExplicitAny: test
    const reencoded = encodeShape(decoded) as any;

    expect(typeof reencoded.props.segments[0].path).toBe("string");
    // decoding the re-encoded path recovers the same points
    const roundTripped = b64Vecs.decodePoints2D(
      reencoded.props.segments[0].path,
    );
    expect(roundTripped[0].x).toBeCloseTo(0);
    expect(roundTripped[1].x).toBeCloseTo(10);
    expect(roundTripped[1].y).toBeCloseTo(20);
  });
});

describe("diff path base64 encode/decode", () => {
  test("encodeDiffPaths converts VecModel arrays to base64 strings", () => {
    const points = [
      { x: 1, y: 2, z: 0.5 },
      { x: 3, y: 4, z: 0.5 },
    ];
    const diff = {
      "@props": {
        "#segments": [1, [], { path: points, type: "free" }],
      },
      "+id": "shape:test",
    };

    // biome-ignore lint/suspicious/noExplicitAny: test
    const encoded = encodeDiffPaths(diff) as any;
    expect(typeof encoded["@props"]["#segments"][2].path).toBe("string");
  });

  test("decodeDiffPaths is the inverse of encodeDiffPaths", () => {
    const points = [
      { x: 1, y: 2, z: 0.5 },
      { x: 3, y: 4, z: 0.5 },
    ];
    const diff = {
      "@props": {
        "#segments": [1, [], { path: points, type: "free" }],
      },
    };

    // biome-ignore lint/suspicious/noExplicitAny: test
    const encoded = encodeDiffPaths(diff) as any;
    // biome-ignore lint/suspicious/noExplicitAny: test
    const decoded = decodeDiffPaths(encoded) as any;

    const rt = decoded["@props"]["#segments"][2].path;
    expect(Array.isArray(rt)).toBe(true);
    expect(rt[0].x).toBeCloseTo(1);
    expect(rt[1].y).toBeCloseTo(4);
  });

  test("encodeDiffPaths handles runed path keys", () => {
    const points = [{ x: 5, y: 6, z: 0.5 }];
    const diff = { "=path": points };

    // biome-ignore lint/suspicious/noExplicitAny: test
    const encoded = encodeDiffPaths(diff) as any;
    expect(typeof encoded["=path"]).toBe("string");
  });
});

describe("zeroth-segment append (zsa)", () => {
  test("segmentAppend builds a recognizable append diff", () => {
    const diff = segmentAppend([[1, 2, 0.5]]);
    expect(isSegmentAppend(diff)).toBe(true);
  });

  test("extractSegmentAppend recovers appended points", () => {
    const diff = segmentAppend([
      [1, 2, 0.5],
      [3, 4, 0.5],
    ]);
    const points = extractSegmentAppend(diff);
    expect(points).toEqual([
      { x: 1, y: 2, z: 0.5 },
      { x: 3, y: 4, z: 0.5 },
    ]);
  });

  test("a full segment replacement is not an append", () => {
    const a = {
      props: { segments: [{ path: [{ x: 0, y: 0, z: 0.5 }], type: "free" }] },
    };
    const b = {
      props: { segments: [{ path: [{ x: 9, y: 9, z: 0.5 }], type: "free" }] },
    };
    const diff = diffObjects(a, b);
    expect(isSegmentAppend(diff)).toBe(false);
  });
});

describe("record → replay round trip", () => {
  /**
   * Simulate the recorder's compression of a single shape change: diff the
   * decoded shapes, compress a segment append to the compact `[x, y, z]`
   * form, or otherwise re-encode the vectors as base64.
   */
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  function compress(prev: any, next: any): any {
    const diff = diffObjects(prev, next);
    if (isSegmentAppend(diff)) {
      const points = extractSegmentAppend(diff);
      return points.map((p) => [p.x, p.y, p.z]);
    }
    return encodeDiffPaths(diff);
  }

  /**
   * Simulate the replay decompression + application against the decoded
   * in-memory store.
   */
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  function decompressAndApply(store: any, compressed: any): any {
    // segment append
    if (Array.isArray(compressed)) {
      const points = (
        typeof compressed[0] === "number" ? [compressed] : compressed
      ) as [number, number, number][];
      return applyDiff(store, segmentAppend(points));
    }
    // general diff (decode base64 vectors first)
    return applyDiff(store, decodeDiffPaths(compressed));
  }

  test("shape creation then appends replays to the recorded state", () => {
    // The author draws a shape with one point, then appends two more.
    const decodedStates = [
      {
        ...structuredClone(defaultShape),
        id: "shape:a",
        props: {
          ...structuredClone(defaultShape.props),
          segments: [{ path: [{ x: 0, y: 0, z: 0.5 }], type: "free" }],
        },
      },
    ];
    decodedStates.push({
      ...structuredClone(decodedStates[0]),
      props: {
        ...structuredClone(decodedStates[0].props),
        segments: [
          {
            path: [
              { x: 0, y: 0, z: 0.5 },
              { x: 10, y: 20, z: 0.5 },
            ],
            type: "free",
          },
        ],
      },
    });
    decodedStates.push({
      ...structuredClone(decodedStates[1]),
      props: {
        ...structuredClone(decodedStates[1].props),
        segments: [
          {
            path: [
              { x: 0, y: 0, z: 0.5 },
              { x: 10, y: 20, z: 0.5 },
              { x: 30, y: 40, z: 0.5 },
            ],
            type: "free",
          },
        ],
      },
    });

    // Record: compress each transition.
    const compressed = [
      compress(defaultShape, decodedStates[0]),
      compress(decodedStates[0], decodedStates[1]),
      compress(decodedStates[1], decodedStates[2]),
    ];

    // The first event is a shape creation (base64-encoded diff), the rest are
    // compact appends.
    expect(Array.isArray(compressed[1])).toBe(true);
    expect(Array.isArray(compressed[2])).toBe(true);

    // Replay: rebuild the decoded shape by applying each event in order.
    let store = structuredClone(defaultShape);
    for (const event of compressed) {
      store = decompressAndApply(store, event);
    }

    // The replayed decoded shape matches the final recorded state.
    // biome-ignore lint/suspicious/noExplicitAny: test
    const path = (store as any).props.segments[0].path;
    expect(path).toHaveLength(3);
    expect(path[0]).toMatchObject({ x: 0, y: 0 });
    expect(path[1]).toMatchObject({ x: 10, y: 20 });
    expect(path[2]).toMatchObject({ x: 30, y: 40 });

    // And it re-encodes to a base64 path that tldraw can consume.
    // biome-ignore lint/suspicious/noExplicitAny: test
    const encoded = encodeShape(store as any) as any;
    expect(typeof encoded.props.segments[0].path).toBe("string");
    expect(b64Vecs.decodePoints2D(encoded.props.segments[0].path)).toHaveLength(
      3,
    );
  });
});
