export type HlsSegment = Readonly<{ start: number; end: number }>;

/** Read the segment time ranges from an HLS media playlist. */
export async function getHlsSegments(source: string): Promise<HlsSegment[]> {
  const playlist = await fetchPlaylist(source);
  const variant = playlist.lines.findIndex((line) =>
    line.startsWith("#EXT-X-STREAM-INF:"),
  );
  if (variant !== -1) {
    const uri = playlist.lines[variant + 1];
    if (!uri || uri.startsWith("#")) {
      throw new Error(`Missing URI after ${playlist.lines[variant]}`);
    }
    return getHlsSegments(new URL(uri, playlist.url).href);
  }

  const segments: HlsSegment[] = [];
  let time = 0;
  for (const line of playlist.lines) {
    const match = line.match(/^#EXTINF:([\d.]+)/);
    if (!match?.[1]) continue;

    const duration = Number(match[1]);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    const start = time;
    time += duration;
    segments.push({ end: time, start });
  }
  return segments;
}

export function mergeHlsSegments(
  indexes: ReadonlySet<number>,
  segments: readonly HlsSegment[],
): readonly (readonly [number, number])[] {
  const ranges: Array<readonly [number, number]> = [];
  for (const index of [...indexes].sort((a, b) => a - b)) {
    const segment = segments[index];
    if (!segment) continue;
    const previous = ranges.at(-1);
    if (previous && previous[1] === segment.start) {
      ranges[ranges.length - 1] = [previous[0], segment.end];
    } else {
      ranges.push([segment.start, segment.end]);
    }
  }
  return ranges;
}

async function fetchPlaylist(uri: string): Promise<{
  lines: string[];
  url: string;
}> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist ${uri}: ${response.status}`);
  }
  return {
    lines: (await response.text()).trimEnd().split(/\r?\n/),
    url: response.url || uri,
  };
}
