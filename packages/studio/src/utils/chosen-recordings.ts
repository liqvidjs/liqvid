import { Duration, type DurationOptions } from "@liqvid/duration";
import type { DurationString } from "@liqvid/utils";
import type { RelativeDir } from "effect-paths";

import { Recording } from "../assets.ts";

/**
 * Serializable data for one chosen recording. Keeping duration inside the
 * recording-shaped object lets the client boundary evolve with recording
 * metadata instead of exposing a parallel duration-only structure.
 */
export type ChosenRecordingData = Readonly<{
  duration: DurationOptions;
}>;

/** Serializable recording-shaped data passed across the server/client boundary. */
export type ChosenRecordingsData = {
  [key: string]: ChosenRecordingData | ChosenRecordingsData;
};

/** A chosen recording, for code generation. */
export type ChosenRecordingEntry = Readonly<{
  /** duration string, e.g. `"0:45:00"` */
  duration: DurationString;

  /** recording directory name */
  name: RelativeDir;
}>;

/**
 * Move a recording's choice to its renamed directory key. Returns the input
 * unchanged when the old name is not present.
 */
export function renameChosenRecording(
  chosenRecordings: Readonly<Record<string, boolean>> | undefined,
  oldName: RelativeDir,
  newName: RelativeDir,
): Record<RelativeDir, boolean> | undefined {
  if (
    !chosenRecordings ||
    oldName === newName ||
    !Object.hasOwn(chosenRecordings, oldName)
  ) {
    return chosenRecordings;
  }

  const next = { ...chosenRecordings };
  next[newName] = next[oldName]!;
  delete next[oldName];
  return next;
}

/**
 * Tree of chosen recordings used to generate the `ChosenRecordings` type:
 * parameter values nest, and the leaves are lists of {@link ChosenRecordingEntry}.
 */
export type ChosenRecordingsTree =
  | Readonly<{ [paramValue: string]: ChosenRecordingsTree }>
  | readonly ChosenRecordingEntry[];

/**
 * Format a recording duration as `"h:mm:ss"` for the `ChosenRecordings` type
 * and the runtime {@link Recording.duration} values.
 */
export function formatRecordingDuration(
  options: DurationOptions,
): DurationString {
  const ms = Duration.inMilliseconds(options);

  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${hours}:${pad(minutes)}:${pad(seconds)}` as DurationString;
}

/**
 * Nest per-recording leaves under the given parameter values. With no
 * parameter values this simply returns the leaves. Only the current
 * combination is populated, matching the runtime contract of
 * `ChosenRecordings`.
 */
export function nestRecordingLeaves<T>(
  values: readonly string[],
  leaves: Readonly<Record<string, T>>,
): Record<string, unknown> {
  if (values.length === 0) {
    return { ...leaves };
  }

  const root: Record<string, unknown> = {};
  let node = root;
  for (const value of values) {
    node[value] ??= {};
    node = node[value] as Record<string, unknown>;
  }
  for (const [name, leaf] of Object.entries(leaves)) {
    node[name] = leaf;
  }

  return root;
}

/**
 * Build the code-generation tree from per-combination chosen recordings.
 * Non-parameterized projects (a single combination with no values) reduce to
 * a bare entry list.
 */
export function buildChosenRecordingsTree(
  perCombination: ReadonlyArray<{
    entries: readonly ChosenRecordingEntry[];
    values: readonly string[];
  }>,
): ChosenRecordingsTree {
  if (perCombination.length === 1 && perCombination[0]!.values.length === 0) {
    return perCombination[0]!.entries;
  }

  const root: Record<string, ChosenRecordingsTree> = {};
  for (const { entries, values } of perCombination) {
    let node = root;
    for (const value of values.slice(0, -1)) {
      node[value] ??= {};
      node = node[value] as Record<string, ChosenRecordingsTree>;
    }
    if (values.length > 0) {
      node[values.at(-1)!] = entries;
    }
  }

  return root;
}

/**
 * Whether any combination in the tree has chosen recordings. Used to gate the
 * `Recording` import in the generated types.
 */
export function treeHasChosenRecordings(tree: ChosenRecordingsTree): boolean {
  if (Array.isArray(tree)) {
    return tree.length > 0;
  }
  return Object.values(tree).some(treeHasChosenRecordings);
}

/**
 * Render the body of the generated `ChosenRecordings` type, referencing
 * `ProjectStructure`. Assumes `ProjectStructure` and (when any recordings are
 * present) `Recording` are in scope.
 */
export function renderChosenRecordingsType(tree: ChosenRecordingsTree): string {
  // ".liqvid" mirrors ASSETS_DIR in ../conventions.mts
  return renderNode(tree, [".liqvid"]);
}

function renderNode(
  node: ChosenRecordingsTree,
  segments: readonly string[],
): string {
  if (Array.isArray(node)) {
    if (node.length === 0) return "Record<string, never>";

    const prefix = segments
      .map((segment) => `[${JSON.stringify(segment)}]`)
      .join("");

    const properties = node.map(
      ({ duration, name }) =>
        `${JSON.stringify(name)}: Recording<DurationString<${JSON.stringify(duration)}>, ` +
        // "recordings" mirrors RECORDINGS_DIR in ../conventions.mts
        `ProjectStructure${prefix}["recordings"][${JSON.stringify(name)}]>`,
    );

    return `{ ${properties.join("; ")} }`;
  }

  const entries = Object.entries(node);
  if (entries.length === 0) return "Record<string, never>";

  const properties = entries.map(
    ([value, child]) =>
      `${JSON.stringify(value)}: ${renderNode(child, [...segments, value])}`,
  );

  return `{ ${properties.join("; ")} }`;
}

/**
 * Build {@link Recording} objects from serializable recording data, rooting
 * each at its URL path under `base` (the `.liqvid` assets URL). `parameterDepth`
 * distinguishes parameter-value branches from recording leaves without
 * reserving a recording name as a discriminator.
 */
export function createRecordingTree(
  base: string,
  recordings: ChosenRecordingsData,
  parameterDepth = 0,
): Record<string, unknown> {
  const build = (
    node: ChosenRecordingsData,
    paramValues: readonly string[],
  ): Record<string, unknown> => {
    if (paramValues.length < parameterDepth) {
      return Object.fromEntries(
        Object.entries(node).map(([value, child]) => [
          value,
          build(child as ChosenRecordingsData, [...paramValues, value]),
        ]),
      );
    }

    const subdirectory =
      paramValues.length > 0 ? `${paramValues.join("/")}/` : "";

    return Object.fromEntries(
      Object.entries(node).map(([name, recording]) => {
        const { duration } = recording as ChosenRecordingData;

        return [
          name,
          new Recording(
            `${base}/${subdirectory}recordings/${name}`,
            formatRecordingDuration(duration),
          ),
        ];
      }),
    );
  };

  return build(recordings, []);
}
