import {
  arrayDiff,
  matchItemDiff,
  matchRunes,
  objectDiff,
  objectItemDiff,
  type ItemDiff,
  type ObjectDiff,
  type RuneName,
  type RunedKey,
} from "@liqvid/diff";
import {assertType} from "@liqvid/utils/types";
import type {VecModel} from "@tldraw/tldraw";
import type {Point3} from "./types";
import {objectKeys} from "./utils";

/** Zeroth-segment append */
export type ZSA = ObjectDiff<unknown> & {
  [_ in RunedKey<"object", "props">]: {
    [_ in RunedKey<"array", "segments">]: [
      0,
      [
        [
          RunedKey<"object">,
          {
            [_ in RunedKey<"array", "points">]: [number, [], ...VecModel[]];
          },
        ],
      ],
    ];
  };
};

export function extractSegmentAppend(zsa: ZSA) {
  const [, , ...points] = zsa["@props"]["#segments"][1][0][1]["#points"];
  return points;
}

export function isSegmentAppend(diff: ObjectDiff<unknown>): diff is ZSA {
  let keys: RunedKey<RuneName>[];

  // @props
  keys = objectKeys(diff);
  if (keys.length !== 1) return false;
  const _props = matchRunes(diff, keys[0], {
    object: (key, props) => key === "props" && props,
  });
  if (!_props) return false;

  // []segments
  keys = objectKeys(_props);
  if (keys.length !== 1) return false;
  const _segments = matchRunes(_props, keys[0], {
    array: (key, props) => key === "segments" && props,
  });
  if (!_segments) return false;

  // array update
  if (_segments.length !== 2 || _segments[0] !== 0) return false;
  assertType<[0, ItemDiff<any>[]]>(_segments);
  const segmentDiffs = _segments[1];

  // zeroth segment
  if (segmentDiffs.length !== 1) return false;
  const segmentDiff = matchItemDiff(segmentDiffs[0], {
    object: (_, diff) => diff,
  });
  if (!segmentDiff) return false;

  // updating points
  keys = objectKeys(segmentDiff);
  if (keys.length !== 1) return false;
  const _points = matchRunes(segmentDiff, keys[0], {
    array: (key, props) => key === "points" && props,
  });
  if (!_points) return false;

  return (_points[1] ?? []).length === 0;
}

export function segmentAppend(points: Point3[]): ZSA {
  return objectDiff(
    "props" as const,
    arrayDiff("segments" as const, [
      0 as const,
      [
        objectItemDiff(
          1,
          arrayDiff("points" as const, [
            points.length,
            [] as const,
            ...points.map((p) => ({x: p[0], y: p[1], z: p[2] ?? 0})),
          ]),
        ),
      ] as const,
    ]),
  );
}
