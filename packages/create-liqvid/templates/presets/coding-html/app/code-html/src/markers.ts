import { Script, withTimings } from "liqvid";

const markerNames = [
  "m1",
  "m2",
  "m3",
  "m4",
  "m5",
  "m6",
  "m7",
  "m8",
  "m9",
  "m10",
] as const;

// In development, you can use withTimings to assign a duration of 1 minute
// to any unassigned timings.
// When you are ready for production, use withTimingsStrict to ensure that
// all markers have been assigned timings.
const markers = withTimings(markerNames, {});

/** @package script for this project */
export const script = new Script(markers);

/** @package marker name */
export type M = (typeof markerNames)[number];
