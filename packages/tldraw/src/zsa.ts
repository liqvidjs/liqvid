import {
  arrayDiff,
  type ItemDiff,
  matchItemDiff,
  matchRunes,
  type ObjectDiff,
  objectDiff,
  objectItemDiff,
  objectKeys,
  type RunedKey,
  type RuneName,
} from "@liqvid/diff";
import { assertType } from "@liqvid/utils";
import type { VecModel } from "tldraw";

import type { Point3 } from "./types.ts";
import { isSingleton } from "./utils.ts";

/**
 * Zeroth-segment append.
 *
 * A draw shape stores its stroke as segments, each with a `path` of vectors.
 * The overwhelmingly common edit while drawing is appending points to the end
 * of the first (last) segment's decoded `path` array, so we detect and encode
 * that case compactly.
 */
export type ZSA = ObjectDiff<unknown> & {
  [_ in RunedKey<"object", "props">]: {
    [_ in RunedKey<"array", "segments">]: [
      0,
      [
        [
          RunedKey<"object">,
          {
            [_ in RunedKey<"array", "path">]: [number, [], ...VecModel[]];
          },
        ],
      ],
    ];
  };
};

export function extractSegmentAppend(zsa: ZSA): VecModel[] {
  const [, , ...points] = zsa["@props"]["#segments"][1][0][1]["#path"];
  return points;
}

export function isSegmentAppend(diff: ObjectDiff<unknown>): diff is ZSA {
  let keys: RunedKey<RuneName>[];

  // @props
  keys = objectKeys(diff);
  if (!isSingleton(keys)) return false;
  const _props = matchRunes(diff, keys[0], {
    object: (key, props) => key === "props" && props,
  });
  if (!_props) return false;

  // #segments
  keys = objectKeys(_props);
  if (!isSingleton(keys)) return false;
  const _segments = matchRunes(_props, keys[0], {
    array: (key, props) => key === "segments" && props,
  });
  if (!_segments) return false;

  // array update
  if (_segments.length !== 2 || _segments[0] !== 0) return false;
  assertType<[0, ItemDiff<unknown>[]]>(_segments);
  const segmentDiffs = _segments[1];

  // zeroth segment
  if (!isSingleton(segmentDiffs)) return false;
  const segmentDiff = matchItemDiff(segmentDiffs[0], {
    object: (_, diff) => diff,
  });
  if (!segmentDiff) return false;

  // appending to the path
  keys = objectKeys(segmentDiff);
  if (!isSingleton(keys)) return false;
  const _path = matchRunes(segmentDiff, keys[0], {
    array: (key, props) => key === "path" && props,
  });
  if (!_path) return false;

  return (_path[1] ?? []).length === 0;
}

export function segmentAppend(points: Point3[]): ZSA {
  return objectDiff(
    "props" as const,
    arrayDiff("segments" as const, [
      0 as const,
      [
        objectItemDiff(
          1,
          arrayDiff("path" as const, [
            points.length,
            [] as const,
            // z defaults to tldraw's constant pressure value (0.5)
            ...points.map((p) => ({ x: p[0], y: p[1], z: p[2] ?? 0.5 })),
          ]),
        ),
      ] as const,
    ]),
  ) as ZSA;
}
