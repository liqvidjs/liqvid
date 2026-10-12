"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { useKeymap } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import type { Script } from "@liqvid/script";
import { useScriptOptional } from "@liqvid/script/react";
import { anyHover, between, clamp, onDrag } from "@liqvid/utils";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type RelativeOffset,
  type ThumbData,
  ThumbnailBox,
  type VideoHighlight,
} from "./ThumbnailBox.tsx";

export type { ThumbData };

/** Shortcut to seek forward/backward by a fixed amount of time. */
export type RelativeSeekShortcut = {
  delta: DurationLike;

  /** key to trigger the shortcut */
  key: string;
};

/** Shortcut to seek to a percentage of the Playback duration. */
export type PercentageSeekShortcut = {
  /** key to trigger the shortcut */
  key: string;

  /**
   * e.g. 0.1 will seek to 10% of the way through the Playback
   * @min 0
   * @max 1
   */
  multiplier: number;
};

export type ScrubberBarProps = {
  /**
   * Thumbnails will not preload until this promise resolves.
   * (By default, they preload on mount).
   */
  deferThumbnails?: Promise<void>;

  /** Callback to render a thumbnail preview image. */
  renderThumbnail?: React.ComponentProps<typeof ThumbnailBox>["render"];

  highlights?: readonly VideoHighlight[];

  /** seeking shortcuts */
  shortcuts?: {
    /** configure shortcuts for seeking forward/backward by a fixed amount of time */
    relative?: readonly RelativeSeekShortcut[];

    /** configure shortcuts for seeking to a percentage of the Playback duration */
    percentage?: readonly PercentageSeekShortcut[];
  };

  /** Thumbnail preview data */
  thumbs?: ThumbData;
};

/** Display a scrubber interface for playback, optionally including thumbnail previews and highlights. */
export function ScrubberBar({
  deferThumbnails,
  renderThumbnail,
  highlights,
  shortcuts,
  thumbs,
  ...props
}: ScrubberBarProps) {
  const playback = usePlayback();
  const script = useScriptOptional();

  const [progress, setProgress] = useState({
    scrubber: playback.currentTime / playback.duration,
    thumb: playback.currentTime / playback.duration,
  });
  const [buffered, setBuffered] = useState(playback.buffered);
  const [showThumb, setShowThumb] = useState(false);

  // refs
  const scrubberBar = useRef<HTMLDivElement>(null);

  /* Event handlers */
  usePlaybackEvent("seeked", () => {
    if (playback.seeking) return;
    const progress = playback.currentTime / playback.duration;
    setProgress({ scrubber: progress, thumb: progress });
  });

  usePlaybackEvent("seeked", () => {
    const progress = playback.currentTime / playback.duration;
    setProgress((prev) => ({ scrubber: progress, thumb: prev.thumb }));
  });

  usePlaybackEvent("timeupdate", () => {
    const progress = playback.currentTime / playback.duration;
    setProgress((prev) => ({ scrubber: progress, thumb: prev.thumb }));
  });

  usePlaybackEvent("bufferupdate", () => {
    setBuffered(playback.buffered);
  });

  useEffect(() => {
    setBuffered(playback.buffered);
  }, [playback]);

  useRelativeShortcuts(shortcuts?.relative);
  usePercentageShortcuts(shortcuts?.percentage);

  // event handlers
  const divEvents = useMemo(() => {
    if (!anyHover) return {};
    const listener = onDrag(
      // move
      (_e, { x }) => {
        if (!scrubberBar.current) return;
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setProgress({ scrubber: progress, thumb: progress });
        playback.currentTime = progress * playback.duration;
      },
      // down
      (_e, { x }) => {
        if (!scrubberBar.current) return;

        playback.seeking = true;

        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setProgress({ scrubber: progress, thumb: progress });
        playback.currentTime = progress * playback.duration;
      },
      // up
      () => {
        playback.seeking = false;
      },
    );
    return {
      onMouseDown: (e: React.MouseEvent) => listener(e.nativeEvent),
    };
  }, [playback]);

  // events to attach on the wrapper
  const wrapEvents = useMemo(() => {
    const props = {} as React.ComponentProps<"div">;

    if (anyHover) {
      Object.assign(props, {
        onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
          if (!scrubberBar.current) return;
          const rect = scrubberBar.current.getBoundingClientRect(),
            progress = clamp(0, (e.clientX - rect.left) / rect.width, 1);

          setProgress((prev) => ({ scrubber: prev.scrubber, thumb: progress }));
        },
        onMouseOut: () => setShowThumb(false),
        // show thumb preview on hover
        onMouseOver: () => setShowThumb(true),
      });
    }

    const listener = onDrag(
      // move
      (_e, { x }) => {
        if (!scrubberBar.current) return;
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setProgress({ scrubber: progress, thumb: progress });
      },
      // start
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        playback.seeking = true;
        setShowThumb(true);
      },
      // end
      (e, { x }: { x: number }) => {
        e.preventDefault();
        if (!scrubberBar.current) return;
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setShowThumb(false);
        playback.seeking = false;
        playback.currentTime = progress * playback.duration;
      },
    );

    props.onTouchStart = (e) => listener(e.nativeEvent);

    return props;
  }, [playback]);

  // events to be attached to the scrubber
  const scrubberEvents = useMemo(() => {
    // if (anyHover) return {};
    //
    const props = {} as React.ComponentProps<"svg">;

    const listener = onDrag(
      // move
      (_e, { x }) => {
        if (!scrubberBar.current) return;
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setProgress({ scrubber: progress, thumb: progress });
      },
      // start
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        playback.seeking = true;
        setShowThumb(true);
      },
      // end
      (e, { x }) => {
        e.preventDefault();
        if (!scrubberBar.current) return;

        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setShowThumb(false);
        playback.seeking = false;
        playback.currentTime = progress * playback.duration;
      },
    );

    props.onTouchStart = (e) => listener(e.nativeEvent);

    return props;
  }, [playback]);

  // resolve highlight times; marker-relative offsets are resolved against the script
  const parsedHighlights = useMemo(
    () =>
      highlights
        ?.map((highlight) => ({
          highlight,
          time: resolveHighlightTime(highlight.time, script),
        }))
        .filter(
          (entry): entry is { highlight: VideoHighlight; time: Duration } =>
            entry.time !== null,
        ) ?? [],
    [highlights, script],
  );

  // TODO: optimize this
  const activeHighlight = parsedHighlights.find(({ time }) =>
    between(
      time.inSeconds() / playback.duration,
      progress.thumb,
      time.inSeconds() / playback.duration + 0.01,
    ),
  );

  return (
    <div
      className="lv-controls-scrub"
      ref={scrubberBar}
      {...divEvents}
      {...props}
    >
      {thumbs && renderThumbnail && (
        <ThumbnailBox
          {...thumbs}
          defer={deferThumbnails}
          highlights={highlights}
          progress={progress.thumb}
          render={renderThumbnail}
          show={showThumb}
          title={activeHighlight?.highlight.title}
        />
      )}

      <div className="lv-controls-scrub-wrap" {...wrapEvents}>
        <svg
          className="lv-controls-scrub-progress"
          preserveAspectRatio="none"
          viewBox="0 0 100 10"
        >
          <rect
            className="lv-progress-remaining"
            height="10"
            width={(1 - progress.scrubber) * 100}
            x={progress.scrubber * 100}
            y="0"
          />

          {playback.duration > 0 &&
            Array.from({ length: buffered.length }, (_, index) => {
              const start = clamp(0, buffered.start(index), playback.duration);
              const end = clamp(0, buffered.end(index), playback.duration);
              if (end <= start) return null;

              return (
                <rect
                  className="lv-progress-buffered"
                  height="10"
                  key={`${start}-${end}`}
                  width={((end - start) / playback.duration) * 100}
                  x={(start / playback.duration) * 100}
                  y="0"
                />
              );
            })}

          <rect
            className="lv-progress-elapsed"
            height="10"
            width={progress.scrubber * 100}
            x="0"
            y="0"
          />

          {parsedHighlights.map(({ highlight: { title }, time }) => (
            <rect
              className={["lv-thumb-highlight"]
                .concat(time.inSeconds() <= playback.currentTime ? "past" : [])
                .join(" ")}
              height="10"
              key={`${time.inMilliseconds()}-${title}`}
              width="1"
              x={(time.inSeconds() / playback.duration) * 100}
              y="0"
            />
          ))}
        </svg>
        <svg
          className="lv-scrubber"
          style={{ left: `calc(${progress.scrubber * 100}% - 6px)` }}
          viewBox="0 0 100 100"
          {...scrubberEvents}
        >
          <circle cx="50" cy="50" r="50" stroke="none" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Resolve a highlight's fixed playback time, using the script to resolve
 * marker-relative offsets.
 *
 * Returns `null` for marker-relative offsets that cannot be resolved
 * (no script available or unknown marker).
 */
function resolveHighlightTime(
  time: VideoHighlight["time"],
  script: Script<string> | null,
): Duration | null {
  if (isMarkerOffset(time)) {
    if (!script?.has(time.marker)) return null;
    return script.get(time.marker).start.plus(time.offset);
  }
  return Duration.from(time as Exclude<VideoHighlight["time"], RelativeOffset>);
}

/** Check whether this time value is a marker-relative offset. */
function isMarkerOffset(
  time: DurationLike | RelativeOffset,
): time is RelativeOffset {
  return (
    typeof time === "object" &&
    time !== null &&
    "marker" in time &&
    "offset" in time
  );
}

function useRelativeShortcuts(
  shortcuts: readonly RelativeSeekShortcut[] | undefined,
) {
  const keymap = useKeymap();
  const playback = usePlayback();

  const configs = useMemo(
    () =>
      shortcuts?.map(({ key, delta }) => {
        delta = Duration.from(delta);

        const callback = () => {
          playback.currentTime$ = playback.currentTime$.plus(delta);
        };
        return [key, callback] as const;
      }) ?? [],
    [playback, shortcuts],
  );

  useEffect(() => {
    // bind
    for (const [key, callback] of configs) {
      keymap.bind(key, callback);
    }

    // unbind
    return () => {
      for (const [key, callback] of configs) {
        keymap.unbind(key, callback);
      }
    };
  }, [configs, keymap]);
}

function usePercentageShortcuts(
  shortcuts: readonly PercentageSeekShortcut[] | undefined,
) {
  const keymap = useKeymap();
  const playback = usePlayback();

  const configs = useMemo(
    () =>
      shortcuts?.map(({ key, multiplier }) => {
        const callback = () => {
          playback.currentTime = playback.duration * multiplier;
        };
        return [key, callback] as const;
      }) ?? [],
    [playback, shortcuts],
  );

  useEffect(() => {
    // bind
    for (const [key, callback] of configs) {
      keymap.bind(key, callback);
    }

    // unbind
    return () => {
      for (const [key, callback] of configs) {
        keymap.unbind(key, callback);
      }
    };
  }, [configs, keymap]);
}
