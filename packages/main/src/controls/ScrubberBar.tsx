import * as React from "react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {ThumbnailBox, ThumbData} from "./ThumbnailBox";

import {useKeymap, usePlayback, useScript} from "../hooks";
import {between, clamp} from "@liqvid/utils/misc";
import {anyHover, onDrag} from "@liqvid/utils/interaction";
import {captureRef} from "@liqvid/utils/react";

export {ThumbData};

export function ScrubberBar(props: {thumbs: ThumbData}) {
  const keymap = useKeymap();
  const playback = usePlayback();
  const script = useScript();

  const [progress, setProgress] = useState({
    scrubber: playback.currentTime / playback.duration,
    thumb: playback.currentTime / playback.duration,
  });
  const [showThumb, setShowThumb] = useState(false);

  // refs
  const scrubberBar = useRef<HTMLDivElement>();

  /* Event handlers */
  const seek = useCallback(() => {
    if (playback.seeking) return;
    const progress = playback.currentTime / playback.duration;
    setProgress({scrubber: progress, thumb: progress});
  }, [playback]);

  const seeked = useCallback(() => {
    const progress = playback.currentTime / playback.duration;
    setProgress((prev) => ({scrubber: progress, thumb: prev.thumb}));
  }, [playback]);

  const timeupdate = useCallback(() => {
    const progress = playback.currentTime / playback.duration;
    setProgress((prev) => ({scrubber: progress, thumb: prev.thumb}));
  }, [playback]);

  const back5 = useCallback(
    () => playback.seek(playback.currentTime - 5000),
    [playback]
  );
  const fwd5 = useCallback(
    () => playback.seek(playback.currentTime + 5000),
    [playback]
  );
  const back10 = useCallback(
    () => playback.seek(playback.currentTime - 10000),
    [playback]
  );
  const fwd10 = useCallback(
    () => playback.seek(playback.currentTime + 10000),
    [playback]
  );

  const seekPercent = useCallback(
    (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (!isNaN(num)) {
        playback.seek((playback.duration * num) / 10);
      }
    },
    [playback]
  );

  /*
    Set up subscriptions.
    We don't do this in useEffect() because it needs to run
    before useEffect()s in the video content.
  */
  const subscribed = useRef(false);
  if (!subscribed.current) {
    /* playback listeners */
    playback.on("seek", seek);
    playback.on("seeked", seeked);
    playback.on("timeupdate", timeupdate);

    /* keyboard shortcuts */
    // seek 5
    keymap.bind("ArrowLeft", back5);
    keymap.bind("ArrowRight", fwd5);

    // seek 10
    keymap.bind("J", back10);
    keymap.bind("L", fwd10);

    // percentage seeking
    keymap.bind("0,1,2,3,4,5,6,7,8,9", seekPercent);

    // seek by marker
    if (script) {
      keymap.bind("W", script.back);
      keymap.bind("E", script.forward);
    }

    subscribed.current = true;
  }

  useEffect(() => {
    return () => {
      playback.off("seek", seek);
      playback.off("seeked", seeked);
      playback.off("timeupdate", timeupdate);

      keymap.unbind("ArrowLeft", back5);
      keymap.unbind("ArrowRight", fwd5);
      keymap.unbind("J", back10);
      keymap.unbind("L", fwd10);

      keymap.unbind("0,1,2,3,4,5,6,7,8,9", seekPercent);

      if (script) {
        keymap.unbind("W", script.back);
        keymap.unbind("E", script.forward);
      }
      subscribed.current = false;
    };
  }, [
    back10,
    back5,
    fwd10,
    fwd5,
    keymap,
    playback,
    script,
    seek,
    seekPercent,
    seeked,
    timeupdate,
  ]);

  // event handlers
  const divEvents = useMemo(() => {
    if (!anyHover) return {};
    const listener = onDrag(
      // move
      (e, {x}) => {
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setProgress({scrubber: progress, thumb: progress});
        playback.seek(progress * playback.duration);
      },
      // down
      (e: MouseEvent) => {
        playback.seeking = true;

        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (e.clientX - rect.left) / rect.width, 1);

        setProgress({scrubber: progress, thumb: progress});
        playback.seek(progress * playback.duration);
      },
      // up
      () => (playback.seeking = false)
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
        // show thumb preview on hover
        onMouseOver: () => setShowThumb(true),
        onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
          const rect = scrubberBar.current.getBoundingClientRect(),
            progress = clamp(0, (e.clientX - rect.left) / rect.width, 1);

          setProgress((prev) => ({scrubber: prev.scrubber, thumb: progress}));
        },
        onMouseOut: () => setShowThumb(false),
      });
    }

    const listener = onDrag(
      // move
      (e, {x}) => {
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setProgress({scrubber: progress, thumb: progress});
      },
      // start
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        playback.seeking = true;
        setShowThumb(true);
      },
      // end
      (e: TouchEvent, {x}: {x: number}) => {
        e.preventDefault();
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setShowThumb(false);
        playback.seeking = false;
        playback.seek(progress * playback.duration);
      }
    );

    props.ref = captureRef((ref: HTMLDivElement) => {
      ref.addEventListener("touchstart", listener, {passive: false});
    });

    return props;
  }, [playback]);

  // events to be attached to the scrubber
  const scrubberEvents = useMemo(() => {
    // if (anyHover) return {};

    const listener = onDrag(
      // move
      (e, {x}) => {
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setProgress({scrubber: progress, thumb: progress});
      },
      // start
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        playback.seeking = true;
        setShowThumb(true);
      },
      // end
      (e, {x}) => {
        e.preventDefault();
        const rect = scrubberBar.current.getBoundingClientRect(),
          progress = clamp(0, (x - rect.left) / rect.width, 1);

        setShowThumb(false);
        playback.seeking = false;
        playback.seek(progress * playback.duration);
      }
    );

    return {
      ref: captureRef((ref: SVGSVGElement) => {
        ref.addEventListener("touchstart", listener, {passive: false});
      }),
    };
  }, [playback]);

  const highlights = (props.thumbs && props.thumbs.highlights) || [];
  const activeHighlight = highlights.find((_) =>
    between(
      _.time / playback.duration,
      progress.thumb,
      _.time / playback.duration + 0.01
    )
  );
  const thumbTitle = activeHighlight ? activeHighlight.title : null;

  return (
    <div className="lv-controls-scrub" ref={scrubberBar} {...divEvents}>
      {props.thumbs && (
        <ThumbnailBox
          {...props.thumbs}
          progress={progress.thumb}
          show={showThumb}
          title={thumbTitle}
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
            x="0"
            y="0"
            height="10"
            width={progress.scrubber * 100}
          />
          <rect
            className="lv-progress-remaining"
            x={progress.scrubber * 100}
            y="0"
            height="10"
            width={(1 - progress.scrubber) * 100}
          />

          {/*ranges.map(([start, end]) => (
            <rect
              key={`${start}-${end}`} className="controls-progress-buffered"
              x={start / playback.duration * 100} y="0" height="10" width={(end - start) / playback.duration * 100}/>
          ))*/}

          {highlights.map(({time}) => (
            <rect
              key={time}
              className={["lv-thumb-highlight"]
                .concat(time <= playback.currentTime ? "past" : [])
                .join(" ")}
              x={(time / playback.duration) * 100}
              y="0"
              width="1"
              height="10"
            />
          ))}
        </svg>
        <svg
          className="lv-scrubber"
          style={{left: `calc(${progress.scrubber * 100}% - 6px)`}}
          viewBox="0 0 100 100"
          {...scrubberEvents}
        >
          <circle cx="50" cy="50" r="50" stroke="none" />
        </svg>
      </div>
    </div>
  );
}
