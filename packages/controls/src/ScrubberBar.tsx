"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import { useKeymap } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { anyHover, between, clamp, onDrag } from "@liqvid/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type ThumbData, ThumbnailBox } from "./ThumbnailBox";

export type { ThumbData };

export interface RelativeSeekShortcut {
  delta: DurationLike;
  key: string;
}

export interface PercentageSeekShortcut {
  key: string;

  /**
   * @min 0
   * @max 1
   */
  multiplier: number;
}

export interface ScrubberBarProps {
  shortcuts?: {
    relative?: RelativeSeekShortcut[];
    percentage?: PercentageSeekShortcut[];
  };
  thumbs?: ThumbData;
}

export function ScrubberBar({ shortcuts, thumbs, ...props }: ScrubberBarProps) {
  const playback = usePlayback();

  const [progress, setProgress] = useState({
    scrubber: playback.currentTime / playback.duration,
    thumb: playback.currentTime / playback.duration,
  });
  const [showThumb, setShowThumb] = useState(false);

  // refs
  const scrubberBar = useRef<HTMLDivElement>(null);

  /* Event handlers */
  usePlaybackEvent(
    "seek",
    useCallback(() => {
      if (playback.seeking) return;
      const progress = playback.currentTime / playback.duration;
      setProgress({ scrubber: progress, thumb: progress });
    }, [playback]),
  );

  usePlaybackEvent(
    "seeked",
    useCallback(() => {
      const progress = playback.currentTime / playback.duration;
      setProgress((prev) => ({ scrubber: progress, thumb: prev.thumb }));
    }, [playback]),
  );

  usePlaybackEvent(
    "timeupdate",
    useCallback(() => {
      const progress = playback.currentTime / playback.duration;
      setProgress((prev) => ({ scrubber: progress, thumb: prev.thumb }));
    }, [playback]),
  );

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
    const props = {} as React.HTMLAttributes<HTMLDivElement> &
      React.RefAttributes<HTMLDivElement>;

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

    props.onTouchStart = listener;

    return props;
  }, [playback]);

  // events to be attached to the scrubber
  const scrubberEvents = useMemo(() => {
    // if (anyHover) return {};

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

    return {
      onTouchStart: listener,
    };
  }, [playback]);

  // TODO: optimize this
  const activeHighlight = thumbs?.highlights?.find((h) =>
    between(
      Duration.from(h.time).inSeconds() / playback.duration,
      progress.thumb,
      Duration.from(h.time).inSeconds() / playback.duration + 0.01,
    ),
  );

  return (
    <div
      className="lv-controls-scrub"
      ref={scrubberBar}
      {...divEvents}
      {...props}
    >
      {thumbs && (
        <ThumbnailBox
          {...thumbs}
          progress={progress.thumb}
          show={showThumb}
          title={activeHighlight?.title}
        />
      )}

      <div className="lv-controls-scrub-wrap" {...wrapEvents}>
        <svg
          className="lv-controls-scrub-progress"
          preserveAspectRatio="none"
          viewBox="0 0 100 10"
        >
          <rect
            className="lv-progress-elapsed"
            height="10"
            width={progress.scrubber * 100}
            x="0"
            y="0"
          />
          <rect
            className="lv-progress-remaining"
            height="10"
            width={(1 - progress.scrubber) * 100}
            x={progress.scrubber * 100}
            y="0"
          />

          {/*ranges.map(([start, end]) => (
            <rect
              key={`${start}-${end}`} className="controls-progress-buffered"
              x={start / playback.duration * 100} y="0" height="10" width={(end - start) / playback.duration * 100}/>
          ))*/}

          {thumbs?.highlights?.map(({ time }) => {
            const $time = Duration.from(time);
            return (
              <rect
                className={["lv-thumb-highlight"]
                  .concat(
                    $time.inSeconds() <= playback.currentTime ? "past" : [],
                  )
                  .join(" ")}
                height="10"
                key={$time.inSeconds()}
                width="1"
                x={($time.inSeconds() / playback.duration) * 100}
                y="0"
              />
            );
          })}
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

function useRelativeShortcuts(shortcuts: RelativeSeekShortcut[] | undefined) {
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
  shortcuts: PercentageSeekShortcut[] | undefined,
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
