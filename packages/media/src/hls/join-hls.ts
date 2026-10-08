type MasterVariant = Readonly<{
  info: string;
  uri: string;
}>;

type Playlist = Readonly<{
  lines: readonly string[];
  url: string;
}>;

function parsePlaylist(content: string, url: string): Playlist {
  return { lines: content.trimEnd().split(/\r?\n/), url };
}

function parseMasterVariants(
  lines: readonly string[],
): readonly MasterVariant[] {
  const variants: MasterVariant[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line?.startsWith("#EXT-X-STREAM-INF:")) {
      const uri = lines[index + 1];
      if (uri === undefined || uri === "" || uri.startsWith("#")) {
        throw new Error(`Missing URI after ${line}`);
      }
      variants.push({ info: line, uri });
      index += 1;
    }
  }

  return variants;
}

function attributeValue(info: string, attribute: string): number {
  const match = info.match(new RegExp(`(?:^|[:,])${attribute}=(\\d+)`));
  if (match?.[1] === undefined) {
    throw new Error(`Missing ${attribute} in ${info}`);
  }
  return Number(match[1]);
}

function setAttribute(info: string, attribute: string, value: number): string {
  const pattern = new RegExp(`(^|[:,])${attribute}=\\d+`);
  if (pattern.test(info)) {
    return info.replace(pattern, `$1${attribute}=${value}`);
  }
  return `${info},${attribute}=${value}`;
}

function duration(playlist: Playlist): number {
  return playlist.lines.reduce((total, line) => {
    const match = line.match(/^#EXTINF:([\d.]+)/);
    return total + (match?.[1] === undefined ? 0 : Number(match[1]));
  }, 0);
}

function segmentLines(playlist: Playlist): readonly string[] {
  const firstSegment = playlist.lines.findIndex((line) =>
    line.startsWith("#EXTINF:"),
  );
  if (firstSegment === -1) {
    throw new Error(`Playlist has no segments: ${playlist.url}`);
  }
  return playlist.lines
    .slice(firstSegment)
    .filter((line) => line !== "#EXT-X-ENDLIST");
}

function absoluteUri(uri: string, base: string): string {
  return new URL(uri, base).href;
}

function inlineUri(content: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}

async function fetchPlaylist(uri: string): Promise<Playlist> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist ${uri}: ${response.status}`);
  }
  return parsePlaylist(await response.text(), response.url || uri);
}

/**
 * Join HLS master playlists into a self-contained data URL.
 *
 * The input playlists must have the same number of variants, and the variants
 * must be in the same order. Relative variant and segment URLs are resolved
 * against the URL of the playlist that contains them.
 */
export async function joinHls(masterUrls: readonly string[]): Promise<string> {
  if (import.meta.env.SSR) {
    return "";
  }

  const masters = await Promise.all(masterUrls.map(fetchPlaylist));
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

  const outputVariants = await Promise.all(
    firstVariants.map(async (variant, index) => {
      const playlists = await Promise.all(
        masterVariants.map((variants, masterIndex) => {
          const inputVariant = variants[index];
          if (inputVariant === undefined) {
            throw new Error("Input master playlists have different variants");
          }
          return fetchPlaylist(
            absoluteUri(inputVariant.uri, masters[masterIndex]!.url),
          );
        }),
      );
      const durations = playlists.map(duration);
      const totalDuration = durations.reduce(
        (total, value) => total + value,
        0,
      );
      const averageBandwidth = Math.round(
        durations.reduce(
          (total, playlistDuration, playlistIndex) =>
            total +
            attributeValue(
              masterVariants[playlistIndex]![index]!.info,
              "AVERAGE-BANDWIDTH",
            ) *
              playlistDuration,
          0,
        ) / totalDuration,
      );
      const bandwidth = Math.max(
        ...masterVariants.map((variants) =>
          attributeValue(variants[index]!.info, "BANDWIDTH"),
        ),
      );
      const info = setAttribute(
        setAttribute(variant.info, "BANDWIDTH", bandwidth),
        "AVERAGE-BANDWIDTH",
        averageBandwidth,
      );
      const outputPlaylist = [
        "#EXTM3U",
        "#EXT-X-VERSION:6",
        "#EXT-X-TARGETDURATION:3",
        "#EXT-X-MEDIA-SEQUENCE:0",
        "#EXT-X-PLAYLIST-TYPE:VOD",
        "#EXT-X-INDEPENDENT-SEGMENTS",
        ...playlists.flatMap((playlist, playlistIndex) => [
          ...(playlistIndex === 0 ? [] : ["#EXT-X-DISCONTINUITY"]),
          ...segmentLines(playlist).map((line) =>
            line === "" || line.startsWith("#")
              ? line.replace(
                  /URI="([^"]+)"/g,
                  (_match, uri: string) =>
                    `URI="${absoluteUri(uri, playlist.url)}"`,
                )
              : absoluteUri(line, playlist.url),
          ),
        ]),
        "#EXT-X-ENDLIST",
        "",
      ].join("\n");

      return { info, uri: inlineUri(outputPlaylist) };
    }),
  );

  return inlineUri(
    [
      "#EXTM3U",
      "#EXT-X-VERSION:6",
      ...outputVariants.flatMap(({ info, uri }) => [info, uri, ""]),
    ].join("\n"),
  );
}
