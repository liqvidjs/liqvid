import { diffObjects } from "@liqvid/diff";
import type { DurationLike } from "@liqvid/duration";
import type { RecordingData } from "@liqvid/recording";
import { getFinalState } from "@liqvid/recording/utils";
import {
  concatenateReplayData,
  type DurationString,
  type ReplayData,
} from "@liqvid/utils";
import type { TLStoreSnapshot } from "@tldraw/tlschema";

import { getDefaultShape } from "./defaults.ts";
import { isPage, isShape } from "./record-types.ts";
import { apply, blankState, decompress, merge } from "./replay.ts";
import type { PageKey, ReplayState, ShapeKey, TldrawEvent } from "./types.ts";
import { decodeStore, encodeDiffPaths, encodePointer } from "./utils.ts";
import { PACKAGE, VERSION } from "./version.ts";

type TldrawRecordingData = RecordingData<ReplayData<TldrawEvent>, ReplayState>;

export function joinTldrawRecordings(
  ...configs: ReadonlyArray<
    readonly [TldrawRecordingData, { start?: DurationLike | DurationString }?]
  >
): TldrawRecordingData {
  const head = configs[0];

  if (!head) {
    throw new Error("no recordings provided");
  }

  let state = getFinalState({
    apply,
    blankState,
    data: head[0].data,
    decompress,
    initial: head[0].initial,
    initialize: initializeNoProps,
    merge,
  });

  const parts: (readonly [
    ReplayData<TldrawEvent>,
    number | DurationLike | DurationString,
  ])[] = [];
  for (const [recording, { start } = {}] of configs) {
    const events = diffStates(state, recording.initial);

    state = getFinalState({
      apply,
      blankState,
      data: recording.data,
      decompress,
      initial: recording.initial,
      initialize: initializeNoProps,
      merge,
    });

    parts.push([
      [
        ...events.map((event): [number, TldrawEvent] => [0, event]),
        ...recording.data,
      ],
      start ?? 0,
    ]);
  }

  return {
    data: concatenateReplayData(parts[0]!, ...parts.slice(1)),
    initial: head[0].initial,
    package: PACKAGE,
    version: VERSION,
  };
}

function initializeNoProps(state: ReplayState) {
  return {
    ...state,
    snapshot: {
      ...state.snapshot,
      store: decodeStore(state.snapshot.store),
    } as unknown as TLStoreSnapshot,
  };
}

function diffStates(a: ReplayState, b: ReplayState): TldrawEvent[] {
  const next = initializeNoProps(b);
  const events = diffStoreStates(
    a.snapshot.store as Record<string, unknown>,
    next.snapshot.store as Record<string, unknown>,
  );

  if (a.pointer[0] !== next.pointer[0] || a.pointer[1] !== next.pointer[1]) {
    events.push(encodePointer(next.pointer));
  }

  const viewport: Partial<ReplayState["viewport"]> = {};
  if (a.viewport.page !== next.viewport.page) {
    viewport.page = next.viewport.page;
  }

  if (
    a.viewport.camera[0] !== next.viewport.camera[0] ||
    a.viewport.camera[1] !== next.viewport.camera[1] ||
    a.viewport.camera[2] !== next.viewport.camera[2]
  ) {
    viewport.camera = next.viewport.camera;
  }

  if (Object.keys(viewport).length > 0) {
    events.push({ v: viewport });
  }

  return events;
}

function diffStoreStates(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): TldrawEvent[] {
  const events: TldrawEvent[] = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    const event = diffStoreRecord(key, a[key], b[key]);
    if (event) events.push(event);
  }

  return events;
}

function diffStoreRecord(
  key: string,
  from: unknown,
  to: unknown,
): TldrawEvent | undefined {
  if (isShape(key)) {
    return diffRecord(key, from, to, (shape) =>
      encodeDiffPaths(diffObjects(getDefaultShape(), shape)),
    );
  }
  if (isPage(key)) {
    return diffRecord(key, from, to, (page) => diffObjects({}, page));
  }

  return undefined;
}

function diffRecord(
  key: ShapeKey | PageKey,
  from: unknown,
  to: unknown,
  createDiff: (record: unknown) => unknown,
): TldrawEvent | undefined {
  if (to === undefined) {
    return from === undefined ? undefined : ({ [key]: 0 } as TldrawEvent);
  }
  if (from !== undefined && Object.keys(diffObjects(from, to)).length === 0) {
    return undefined;
  }

  return { [key]: createDiff(to) } as TldrawEvent;
}
