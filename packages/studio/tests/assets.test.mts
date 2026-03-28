import { expect, test } from "@jest/globals";

import { DirectoryHelper } from "../src/assets.mts";
import type { FileNames } from "../src/types.mts";

const DIR = {
  src: {
    "index.ts": null,
  },
};

type Dir = FileNames<typeof DIR>;

test("DirectoryHelper.file() returns correct path", () => {
  const dir = new DirectoryHelper<Dir>("/example");

  // This test needs proper typing - for now just check it runs
  expect(dir.file("src/index.ts")).toEqual("/example/src/index.ts");
});

test("DirectoryHelper.interpolate() works", () => {
  const dir = new DirectoryHelper<Dir>("https://{domain}:{port}");

  // This test needs proper typing - for now just check it runs
  expect(
    dir
      .interpolate({ domain: "example.com", port: "3000" })
      .file("src/index.ts"),
  ).toEqual("https://example.com:3000/src/index.ts");
});
