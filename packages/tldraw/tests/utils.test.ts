import { applyDiff, diffObjects } from "@liqvid/diff";
import { b64Vecs } from "tldraw";

import { getDefaultShape } from "../src/defaults.ts";
import { isPointer } from "../src/record-types.ts";
import type { Point3 } from "../src/types.ts";
import {
  decodeDiffPaths,
  decodePointer,
  decodePoints,
  decodeShape,
  encodeAppend,
  encodeDiffPaths,
  encodePointer,
  encodePoints,
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
      // `encodePoints2D` drops z, so the segment must declare `dim: 2` to
      // match; an absent `dim` would mean the legacy 3D (x, y, z) encoding.
      segments: [
        { dim: 2, path: b64Vecs.encodePoints2D(points), type: "free" },
      ],
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
      const points = extractSegmentAppend(diff).map(
        (p): Point3 => [p.x, p.y, p.z ?? 0.5],
      );
      // pick the smaller of raw / base64, exactly like the recorder
      return encodeAppend(points);
    }
    return encodeDiffPaths(diff);
  }

  /**
   * Simulate the replay decompression + application against the decoded
   * in-memory store.
   */
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  function decompressAndApply(store: any, compressed: any): any {
    // base64-encoded segment append
    if (typeof compressed === "string") {
      return applyDiff(store, segmentAppend(decodePoints(compressed)));
    }
    // raw segment append
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
        ...structuredClone(getDefaultShape()),
        id: "shape:a",
        props: {
          ...structuredClone(getDefaultShape().props),
          segments: [{ dim: 2, path: [{ x: 0, y: 0, z: 0.5 }], type: "free" }],
        },
      },
    ];
    decodedStates.push({
      ...structuredClone(decodedStates[0]),
      props: {
        ...structuredClone(decodedStates[0].props),
        segments: [
          {
            dim: 2,
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
            dim: 2,
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
      compress(getDefaultShape(), decodedStates[0]),
      compress(decodedStates[0], decodedStates[1]),
      compress(decodedStates[1], decodedStates[2]),
    ];

    // The first event is a shape creation (base64-encoded diff), the rest are
    // compact appends.
    expect(Array.isArray(compressed[1])).toBe(true);
    expect(Array.isArray(compressed[2])).toBe(true);

    // Replay: rebuild the decoded shape by applying each event in order.
    let store = structuredClone(getDefaultShape());
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

describe("pointer base64 encode/decode", () => {
  test("encodePointer produces a base64 string", () => {
    const encoded = encodePointer([120, 340]);
    expect(typeof encoded).toBe("string");
  });

  test("decodePointer is the inverse of encodePointer", () => {
    const [x, y] = decodePointer(encodePointer([120, 340]));
    expect(x).toBeCloseTo(120);
    expect(y).toBeCloseTo(340);
  });

  test("round-trips negative and fractional coordinates", () => {
    const [x, y] = decodePointer(encodePointer([-42.5, 7.25]));
    expect(x).toBeCloseTo(-42.5);
    expect(y).toBeCloseTo(7.25);
  });

  test("isPointer recognizes an encoded pointer but not shape events", () => {
    expect(isPointer(encodePointer([1, 2]))).toBe(true);
    // shape events are objects, appends are arrays — neither is a string
    expect(isPointer({ "shape:a": { "=x": 1 } })).toBe(false);
    expect(isPointer([1, 2, 0.5])).toBe(false);
    expect(isPointer(0)).toBe(false);
  });
});

describe("append point encode/decode", () => {
  test("decodePoints is the inverse of encodePoints", () => {
    const points: Point3[] = [
      [1, 2, 0.5],
      [3, 4, 0.5],
      [5, 6, 0.5],
    ];
    const decoded = decodePoints(encodePoints(points));
    expect(decoded).toHaveLength(3);
    for (let i = 0; i < points.length; i++) {
      expect(decoded[i]![0]).toBeCloseTo(points[i]![0]);
      expect(decoded[i]![1]).toBeCloseTo(points[i]![1]);
    }
  });

  test("encodeAppend keeps the raw point for a single point (smaller)", () => {
    const result = encodeAppend([[1, 2, 0.5]]);
    // a lone point is cheaper as JSON than as base64
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([1, 2, 0.5]);
  });

  test("encodeAppend uses base64 for a long run of points (smaller)", () => {
    const points: Point3[] = Array.from(
      { length: 20 },
      (_, i): Point3 => [i, i * 2, 0.5],
    );
    const result = encodeAppend(points);
    expect(typeof result).toBe("string");
  });

  test("encodeAppend chooses whichever representation is smaller", () => {
    const points: Point3[] = Array.from(
      { length: 30 },
      (_, i): Point3 => [i, i, 0.5],
    );
    const result = encodeAppend(points);
    const rawSize = JSON.stringify(points).length;
    const b64Size = JSON.stringify(encodePoints(points)).length;
    const chosenSize = JSON.stringify(result).length;
    expect(chosenSize).toBe(Math.min(rawSize, b64Size));
  });
});
