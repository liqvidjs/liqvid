import { expect, test } from "@jest/globals";
import { AbsoluteDir, RelativeDir } from "effect-paths";

import { getRecordingLocation } from "../src/services/recording-location.mts";

test("getRecordingLocation resolves a parameterized recording directory", () => {
  const location = getRecordingLocation(
    AbsoluteDir(
      "/routes/[lang]/[locale]/lesson/.liqvid/en/US/recordings/take-1",
    ),
    AbsoluteDir("/routes"),
    [RelativeDir("[lang]/[locale]/lesson")],
  );

  expect(location).toEqual({
    projectParams: { lang: "en", locale: "US" },
    projectPath: "[lang]/[locale]/lesson",
  });
});

test("getRecordingLocation resolves an unparameterized recording directory", () => {
  const location = getRecordingLocation(
    AbsoluteDir("/routes/lesson/.liqvid/recordings/take-1"),
    AbsoluteDir("/routes"),
    [RelativeDir("lesson")],
  );

  expect(location).toEqual({
    projectParams: {},
    projectPath: "lesson",
  });
});
