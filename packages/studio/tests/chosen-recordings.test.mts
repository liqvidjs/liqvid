import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@jest/globals";
import Handlebars from "handlebars";
import type { DurationString } from "@liqvid/utils";

import { Recording } from "../src/assets.mts";
import {
  buildChosenRecordingsTree,
  type ChosenRecordingEntry,
  createRecordingTree,
  formatRecordingDuration,
  nestRecordingLeaves,
  renameChosenRecording,
  renderChosenRecordingsType,
  treeHasChosenRecordings,
} from "../src/utils/chosen-recordings.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Recording is a DirectoryHelper with a duration", () => {
  const recording = new Recording(
    "/example/recordings/abstract",
    formatRecordingDuration({ minutes: 45 }),
  );

  expect(recording.duration).toBe("0:45:00");
  expect(recording.file("audio/audio.webm")).toBe(
    "/example/recordings/abstract/audio/audio.webm",
  );
});

test("formatRecordingDuration formats as h:mm:ss", () => {
  expect(formatRecordingDuration({ minutes: 45 })).toBe("0:45:00");
  expect(formatRecordingDuration({ hours: 1, minutes: 2 })).toBe("1:02:00");
  expect(formatRecordingDuration({ seconds: 5 })).toBe("0:00:05");
  expect(formatRecordingDuration({ hours: 25 })).toBe("25:00:00");
  expect(formatRecordingDuration({ milliseconds: 61_999 })).toBe("0:01:01");
});

test("nestRecordingLeaves preserves recording-shaped data", () => {
  const chosenRecordings = { abstract: { duration: { milliseconds: 7 } } };

  expect(nestRecordingLeaves([], chosenRecordings)).toEqual({
    abstract: { duration: { milliseconds: 7 } },
  });
});

test("renameChosenRecording moves chosen and unchosen entries", () => {
  expect(
    renameChosenRecording(
      { abstract: true, intro: false },
      "abstract",
      "opening",
    ),
  ).toEqual({ intro: false, opening: true });

  expect(
    renameChosenRecording({ abstract: false }, "abstract", "opening"),
  ).toEqual({ opening: false });
});

test("renameChosenRecording leaves missing entries unchanged", () => {
  const chosenRecordings = { abstract: true };

  expect(renameChosenRecording(chosenRecordings, "missing", "opening")).toBe(
    chosenRecordings,
  );
  expect(renameChosenRecording(chosenRecordings, "abstract", "abstract")).toBe(
    chosenRecordings,
  );
});

test("nestRecordingLeaves nests under parameter values in order", () => {
  expect(
    nestRecordingLeaves(["en"], {
      abstract: { duration: { milliseconds: 7 } },
    }),
  ).toEqual({
    en: { abstract: { duration: { milliseconds: 7 } } },
  });

  expect(
    nestRecordingLeaves(["en", "US"], {
      abstract: { duration: { milliseconds: 7 } },
    }),
  ).toEqual({
    en: { US: { abstract: { duration: { milliseconds: 7 } } } },
  });
});

test("buildChosenRecordingsTree reduces to an entry list without parameters", () => {
  const entries: ChosenRecordingEntry[] = [
    { duration: "0:45:00", name: "abstract" },
  ];

  expect(buildChosenRecordingsTree([{ entries, values: [] }])).toEqual(entries);
});

test("buildChosenRecordingsTree nests entries by parameter values", () => {
  const tree = buildChosenRecordingsTree([
    {
      entries: [{ duration: "0:45:00", name: "abstract" }],
      values: ["en"],
    },
    { entries: [{ duration: "1:02:00", name: "intro" }], values: ["fr"] },
  ]);

  expect(tree).toEqual({
    en: [{ duration: "0:45:00", name: "abstract" }],
    fr: [{ duration: "1:02:00", name: "intro" }],
  });
});

test("treeHasChosenRecordings detects entries at any depth", () => {
  expect(treeHasChosenRecordings([])).toBe(false);
  expect(
    treeHasChosenRecordings([{ duration: "0:45:00", name: "abstract" }]),
  ).toBe(true);
  expect(treeHasChosenRecordings({ en: [], fr: [] })).toBe(false);
  expect(
    treeHasChosenRecordings({
      en: [],
      fr: [{ duration: "1:02:00", name: "intro" }],
    }),
  ).toBe(true);
});

test("renderChosenRecordingsType renders Record<string, never> when empty", () => {
  expect(renderChosenRecordingsType([])).toBe("Record<string, never>");
  expect(renderChosenRecordingsType({})).toBe("Record<string, never>");
});

test("renderChosenRecordingsType references ProjectStructure", () => {
  const tree = buildChosenRecordingsTree([
    {
      entries: [
        { duration: "0:45:00", name: "abstract" },
        { duration: "1:02:00", name: "desmos+slider" },
      ],
      values: [],
    },
  ]);

  expect(renderChosenRecordingsType(tree)).toBe(
    `{ "abstract": Recording<DurationString<"0:45:00">, ProjectStructure[".liqvid"]["recordings"]["abstract"]>; ` +
      `"desmos+slider": Recording<DurationString<"1:02:00">, ProjectStructure[".liqvid"]["recordings"]["desmos+slider"]> }`,
  );
});

test("renderChosenRecordingsType nests by parameter values", () => {
  const tree = buildChosenRecordingsTree([
    {
      entries: [{ duration: "0:45:00", name: "abstract" }],
      values: ["en"],
    },
    {
      entries: [{ duration: "1:02:00", name: "intro" }],
      values: ["fr"],
    },
    { entries: [], values: ["zh"] },
  ]);

  expect(renderChosenRecordingsType(tree)).toBe(
    `{ "en": { "abstract": Recording<DurationString<"0:45:00">, ProjectStructure[".liqvid"]["en"]["recordings"]["abstract"]> }; ` +
      `"fr": { "intro": Recording<DurationString<"1:02:00">, ProjectStructure[".liqvid"]["fr"]["recordings"]["intro"]> }; ` +
      `"zh": Record<string, never> }`,
  );
});

test("createRecordingTree creates Recording objects from recording data", () => {
  const tree = createRecordingTree("/api/liqvid/static/lesson/.liqvid", {
    abstract: { duration: { milliseconds: 45 * 60 * 1000 } },
  }) as { abstract: Recording<DurationString> };

  expect(tree.abstract).toBeInstanceOf(Recording);
  expect(tree.abstract.duration).toBe("0:45:00");
  expect(tree.abstract.file("audio/audio.webm")).toBe(
    "/api/liqvid/static/lesson/.liqvid/recordings/abstract/audio/audio.webm",
  );
});

test("createRecordingTree nests parameterized paths", () => {
  const tree = createRecordingTree(
    "/api/liqvid/static/[lang]/lesson/.liqvid",
    {
      en: { abstract: { duration: { milliseconds: 45 * 60 * 1000 } } },
    },
    1,
  ) as { en: { abstract: Recording<DurationString> } };

  expect(tree.en.abstract.file("recording-meta.json")).toBe(
    "/api/liqvid/static/[lang]/lesson/.liqvid/en/recordings/abstract/recording-meta.json",
  );
});

test("types.ts.hbs renders ChosenRecordings referencing ProjectStructure", () => {
  const template = Handlebars.compile(
    readFileSync(path.join(__dirname, "../templates/types.ts.hbs"), "utf8"),
  );

  const output = template({
    chosenRecordings: renderChosenRecordingsType(
      buildChosenRecordingsTree([
        {
          entries: [{ duration: "0:45:00", name: "abstract" }],
          values: [],
        },
      ]),
    ),
    directoryTypes: {},
    hasChosenRecordings: true,
    parameters: [],
  });

  expect(output).toContain(
    'import type { FileNames, Recording } from "@liqvid/studio";',
  );
  expect(output).toContain(
    '"abstract": Recording<DurationString<"0:45:00">, ProjectStructure[".liqvid"]["recordings"]["abstract"]>',
  );
});

test("types.ts.hbs renders an empty ChosenRecordings without the Recording import", () => {
  const template = Handlebars.compile(
    readFileSync(path.join(__dirname, "../templates/types.ts.hbs"), "utf8"),
  );

  const output = template({
    chosenRecordings: "Record<string, never>",
    directoryTypes: {},
    hasChosenRecordings: false,
    parameters: [],
  });

  expect(output).toContain('import type { FileNames } from "@liqvid/studio";');
  expect(output).toContain(
    "export type ChosenRecordings = Record<string, never>;",
  );
});
