import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AbsoluteDir,
  type AbsoluteFile,
  type AnyPath,
  RelativeDir,
  type RelativeFile,
} from "effect-paths";

type HlsPlaylist = {
  path: AbsoluteFile;
  lines: string[];
};

function withoutEndList(lines: string[]): string[] {
  return lines.filter((line) => line !== "#EXT-X-ENDLIST");
}

function segmentLines(
  playlist: HlsPlaylist,
  outputDirectory: AbsoluteDir,
): string[] {
  const playlistDirectory = resolve(playlist.path, "..");
  const firstSegment = playlist.lines.findIndex((line) =>
    line.startsWith("#EXTINF:"),
  );

  if (firstSegment === -1) {
    throw new Error(`Playlist has no segments: ${playlist.path}`);
  }

  return withoutEndList(playlist.lines.slice(firstSegment)).map((line) => {
    if (line === "" || line.startsWith("#")) {
      return line;
    }

    const segmentPath = isAbsolute(line)
      ? line
      : resolve(playlistDirectory, line);
    return relative(outputDirectory, segmentPath);
  });
}

function parseMasterVariants(
  lines: string[],
): ReadonlyArray<{ info: string; uri: RelativeFile }> {
  const variants: Array<{ info: string; uri: RelativeFile }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line?.startsWith("#EXT-X-STREAM-INF:")) {
      const uri = lines[index + 1] as RelativeFile | undefined;
      if (uri === undefined || uri === "" || uri.startsWith("#")) {
        throw new Error(`Missing URI after ${line}`);
      }
      variants.push({ info: line, uri });
      index += 1;
    }
  }

  return variants;
}

function parsePlaylist(path: AbsoluteFile, content: string): HlsPlaylist {
  return { lines: content.trimEnd().split(/\r?\n/), path };
}

async function readPlaylist(path: AbsoluteFile): Promise<HlsPlaylist> {
  return parsePlaylist(path, await readFile(path, "utf8"));
}

function relativeUri<From extends AnyPath, To extends AnyPath>(
  from: From,
  to: To,
) {
  return relative(resolve(from, RelativeDir("..")), to);
}

/**
 * Join multiple HLS playslists into a single playlist.
 * The input playlists must have the same number of variants, and the variants must be in the same order.
 */
export async function experimental_joinHls(
  masterPaths: readonly AbsoluteFile[],
  outputMasterPath: AbsoluteFile,
): Promise<void> {
  const masters = await Promise.all(masterPaths.map(readPlaylist));
  const firstMaster = masters[0];
  if (firstMaster === undefined) {
    throw new Error("At least two master playlists are required");
  }

  const masterVariants = masters.map((master) =>
    parseMasterVariants(master.lines),
  );
  const firstVariants = masterVariants[0];
  if (firstVariants === undefined) {
    throw new Error("At least two master playlists are required");
  }

  if (
    masterVariants.some((variants) => variants.length !== firstVariants.length)
  ) {
    throw new Error("Input master playlists have different variant counts");
  }

  const outputDirectory = resolve(outputMasterPath, RelativeDir(".."));
  const outputVariants = await Promise.all(
    firstVariants.map(async (variant, index) => {
      const playlists = await Promise.all(
        masters.map((master, masterIndex) => {
          const masterVariant = masterVariants[masterIndex]?.[index];
          if (masterVariant === undefined) {
            throw new Error("Input master playlists have different variants");
          }
          return readPlaylist(
            resolve(master.path, RelativeDir(".."), masterVariant.uri),
          );
        }),
      );
      const outputPath = resolve(outputDirectory, variant.uri);
      const outputPlaylist = [
        "#EXTM3U",
        "#EXT-X-VERSION:6",
        "#EXT-X-TARGETDURATION:3",
        "#EXT-X-MEDIA-SEQUENCE:0",
        "#EXT-X-PLAYLIST-TYPE:VOD",
        "#EXT-X-INDEPENDENT-SEGMENTS",
        ...playlists.flatMap((playlist, playlistIndex) => [
          ...(playlistIndex === 0 ? [] : ["#EXT-X-DISCONTINUITY"]),
          ...segmentLines(playlist, resolve(outputPath, RelativeDir(".."))),
        ]),
        "#EXT-X-ENDLIST",
        "",
      ].join("\n");

      return { content: outputPlaylist, info: variant.info, path: outputPath };
    }),
  );

  const master = [
    "#EXTM3U",
    "#EXT-X-VERSION:6",
    ...outputVariants.flatMap(({ info, path }) => [
      info,
      relativeUri(outputMasterPath, path),
      "",
    ]),
  ].join("\n");

  await Promise.all([
    mkdir(outputDirectory, { recursive: true }),
    ...outputVariants.map(({ path }) =>
      mkdir(resolve(path, ".."), { recursive: true }),
    ),
    writeFile(outputMasterPath, master),
    ...outputVariants.map(({ path, content }) => writeFile(path, content)),
  ]);
}
