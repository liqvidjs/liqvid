import { assertType } from "@liqvid/utils";
import type { VecModel } from "tldraw";

import {
  type DiffRecord,
  matchRunes,
  objectItemDiff,
  updateArrayDiff,
  updateObjectDiff,
} from "./diff/index.ts";
import type { ItemDiff, Key, RuneName } from "./diff/types.ts";
import { matchItemDiff, objectKeys } from "./diff/utils.ts";
import type { Point3 } from "./types.ts";
import { isSingleton } from "./utils.ts";

/** Zeroth-segment append */
export type ZSA = DiffRecord & {
  [_ in Key<"object", "props">]: {
    [_ in Key<"array", "segments">]: [
      0,
      [
        [
          Key<"object">,
          { [_ in Key<"array", "points">]: [number, [], ...VecModel[]] },
        ],
      ],
    ];
  };
};

export function extractSegmentAppend(zsa: ZSA) {
  const [, , ...points] = zsa["@props"]["#segments"][1][0][1]["#points"];
  return points;
}

export function isSegmentAppend(diff: DiffRecord): diff is ZSA {
  let keys: Key<RuneName>[];

  // @props
  keys = objectKeys(diff);
  if (!isSingleton(keys)) return false;
  const _props = matchRunes(diff, keys[0], {
    object: (key, props) => key === "props" && props,
  });
  if (!_props) return false;

  // []segments
  keys = objectKeys(_props);
  if (!isSingleton(keys)) return false;
  const _segments = matchRunes(_props, keys[0], {
    array: (key, props) => key === "segments" && props,
  });
  if (!_segments) return false;

  // array update
  if (_segments.length !== 2 || _segments[0] !== 0) return false;
  assertType<[0, ItemDiff[]]>(_segments);
  const segmentDiffs = _segments[1];

  // zeroth segment
  if (!isSingleton(segmentDiffs)) return false;
  const segmentDiff = matchItemDiff(segmentDiffs[0], {
    object: (_, diff) => diff,
  });
  if (!segmentDiff) return false;

  // updating points
  keys = objectKeys(segmentDiff);
  if (!isSingleton(keys)) return false;
  const _points = matchRunes(segmentDiff, keys[0], {
    array: (key, props) => key === "points" && props,
  });
  if (!_points) return false;

  return (_points[1] ?? []).length === 0;
}

export function segmentAppend(points: Point3[]): ZSA {
  return updateObjectDiff(
    "props" as const,
    updateArrayDiff("segments" as const, [
      0 as const,
      [
        objectItemDiff(
          1,
          updateArrayDiff("points" as const, [
            points.length,
            [] as const,
            ...points.map((p) => ({ x: p[0], y: p[1], z: p[2] ?? 0 })),
          ]),
        ),
      ] as const,
    ]),
  );
}
