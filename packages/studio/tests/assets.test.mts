import { expect, test } from "@jest/globals";

import {
  type Directory,
  DirectoryHelper,
  type FileNames,
  ServerDirectoryHelper,
} from "../src/assets.mts";

const DIR = {
  src: {
    "index.ts": () => undefined,
  },
} satisfies Directory;

type Dir = FileNames<typeof DIR>;

test("DirectoryHelper.file() returns correct path", () => {
  const dir = new DirectoryHelper<Dir>("/example");

  expect(dir.file("src/index.ts")).toEqual("/example/src/index.ts");
  expect(dir.dir("src").file("index.ts")).toEqual("/example/src/index.ts");
});

test("DirectoryHelper.interpolate() substitutes template variables", () => {
  const dir = new DirectoryHelper<Dir>("https://{domain}:{port}");

  expect(
    dir
      .interpolate({ domain: "example.com", port: "3000" })
      .file("src/index.ts"),
  ).toEqual("https://example.com:3000/src/index.ts");
});

test("DirectoryHelper.pattern() returns a path pattern", () => {
  const dir = new DirectoryHelper<Dir>("/example");

  expect(dir.pattern("thumbs/%s.png")).toEqual("/example/thumbs/%s.png");
});

test("ServerDirectoryHelper.has() checks files and wildcard paths", () => {
  const files = new ServerDirectoryHelper({
    audio: {
      "intro.mp3": () => undefined,
    },
    video: {
      "intro.mp4": () => undefined,
    },
  });

  expect(files.has("audio/intro.mp3")).toBe(true);
  expect(files.has("*/intro.mp4")).toBe(true);
  expect(files.has("audio/missing.mp3")).toBe(false);
  expect(files.has("*/missing.mp4")).toBe(false);
});

test("ServerDirectoryHelper.dir() scopes existence checks", () => {
  const files = new ServerDirectoryHelper({
    audio: {
      "intro.mp3": () => undefined,
    },
  });

  expect(files.dir("audio").has("intro.mp3")).toBe(true);
  expect(files.dir("audio").has("missing.mp3")).toBe(false);
});
