import * as React from "react";
import {useEffect, useMemo, useRef, useState} from "react";

import ThumbnailBox, {ThumbData} from "./ThumbnailBox";

import {useKeyMap, usePlayback, useScript} from "../hooks";
import {dragHelper} from "../utils/interactivity";
import {between, constrain} from "../utils/misc";
import {anyHover} from "../utils/mobile";
import {captureRef} from "../utils/react-utils";

export {ThumbData};

interface Props {
  thumbs: ThumbData;
}

export default function ScrubberBar(props: Props) {
  const keymap = useKeyMap();
  const playback = usePlayback();
  const script = useScript();

  const [progress, setProgress] = useState({
    scrubber: playback.currentTime / playback.duration,
    thumb: playback.currentTime / playback.duration,
  });
  const [showThumb, setShowThumb] = useState(false);

  // refs
  const scrubberBar = useRef<HTMLDivElement>();

  /* subscriptions */
  useEffect(() => {
    /* playback liseners */
    playback.on("seek", () => {
      if (playback.seeking) return;
      const progress = playback.currentTime / playback.duration;
      setProgress({scrubber: progress, thumb: progress});
    });
    playback.on("seeked", () => {
      const progress = playback.currentTime / playback.duration;
      setProgress(prev => ({scrubber: progress, thumb: prev.thumb}));
    });
    playback.on("timeupdate", () => {
      const progress = playback.currentTime / playback.duration;
      setProgress(prev => ({scrubber: progress, thumb: prev.thumb}));
    });

    /* keyboard shortcuts */
    // seek 5
    keymap.bind("ArrowLeft", () => playback.seek(playback.currentTime - 5000));
    keymap.bind("ArrowRight", () => playback.seek(playback.currentTime + 5000));

    // seek 10
    keymap.bind("J", () => playback.seek(playback.currentTime - 10000));
    keymap.bind("L", () => playback.seek(playback.currentTime + 10000));

    // seek by marker
    keymap.bind("W", () => script.back());
    keymap.bind("E", () => script.forward());

    // percentage seeking
    keymap.bind("0,1,2,3,4,5,6,7,8,9", e => {
      const num = parseInt(e.key, 10);
      if (!isNaN(num)) {
        playback.seek(playback.duration * num / 10);
      }
    });
  }, []);

  // event handlers
  const divEvents = useMemo(() => {
    if (!anyHover) return {};
    return {onMouseDown: dragHelper(
      // move
      (e: MouseEvent, {x}: {x: number}) => {
        const rect = scrubberBar.current.getBoundingClientRect(),
              progress = constrain(0, (x - rect.left) / rect.width, 1);

        setProgress({scrubber: progress, thumb: progress});
        playback.seek(progress * playback.duration);
      },
      // down
      (e: React.MouseEvent<HTMLDivElement>) => {
        playback.seeking = true;

        const rect = scrubberBar.current.getBoundingClientRect(),
              progress = constrain(0, (e.clientX - rect.left) / rect.width, 1);

        setProgress({scrubber: progress, thumb: progress});
        playback.seek(progress * playback.duration);
      },
      // up
      () => playback.seeking = false
    )};
  }, []);

  // events to attach on the wrapper
  const wrapEvents = useMemo(() => {
    if (anyHover) {
      return {
        // show thumb preview on hover
        onMouseOver: () => setShowThumb(true),
        onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
          const rect = scrubberBar.current.getBoundingClientRect(),
                progress = constrain(0, (e.clientX - rect.left) / rect.width, 1);

          setProgress(prev => ({scrubber: prev.scrubber, thumb: progress}));
        },
        onMouseOut: () => setShowThumb(false)
      };
    } else {
      const listener = dragHelper(
        // move
        (e: TouchEvent, {x}: {x: number}) => {
          const rect = scrubberBar.current.getBoundingClientRect(),
                progress = constrain(0, (x - rect.left) / rect.width, 1);

          setProgress({scrubber: progress, thumb: progress});
        },
        // start
        (e: React.TouchEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          playback.seeking = true;
          setShowThumb(true);
        },
        // end
        (e: TouchEvent, {x}: {x: number}) => {
          e.preventDefault();
          const rect = scrubberBar.current.getBoundingClientRect(),
                progress = constrain(0, (x - rect.left) / rect.width, 1);

          setShowThumb(false);
          playback.seeking = false;
          playback.seek(progress * playback.duration);
        }
      );

      return {
        ref: captureRef((ref: HTMLDivElement) => {
          ref.addEventListener("touchstart", listener, {passive: false});
        })
      };
    }
  }, []);

  // events to be attached to the scrubber
  const scrubberEvents = useMemo(() => {
    if (anyHover) return {};

    const listener = dragHelper(
      // move
      (e: TouchEvent, {x}: {x: number}) => {
        const rect = scrubberBar.current.getBoundingClientRect(),
              progress = constrain(0, (x - rect.left) / rect.width, 1);

        setProgress({scrubber: progress, thumb: progress});
      },
      // start
      (e: React.TouchEvent<SVGSVGElement>) => {
        e.preventDefault();
        e.stopPropagation();
        playback.seeking = true;
        setShowThumb(true);
      },
      // end
      (e: TouchEvent, {x}: {x: number}) => {
        e.preventDefault();
        const rect = scrubberBar.current.getBoundingClientRect(),
              progress = constrain(0, (x - rect.left) / rect.width, 1);

        setShowThumb(false);
        playback.seeking = false;
        playback.seek(progress * playback.duration);
      }
    );

    return {
      ref: captureRef((ref: HTMLDivElement) => {
        ref.addEventListener("touchstart", listener, {passive: false});
      })
    };
  }, []);

  const highlights = (props.thumbs && props.thumbs.highlights) || [];
  const activeHighlight = highlights.find(
    _ => between(_.time / playback.duration, progress.thumb, _.time / playback.duration + 0.01)
  );
  const thumbTitle = activeHighlight ? activeHighlight.title : null;

  return (
    <div className="rp-controls-scrub" ref={scrubberBar} {...divEvents}>
      {props.thumbs &&
        <ThumbnailBox
          {...props.thumbs}
          progress={progress.thumb}
          show={showThumb}
          title={thumbTitle}/>
      }

      <div className="rp-controls-scrub-wrap" {...wrapEvents}>
        <svg className="rp-controls-scrub-progress" preserveAspectRatio="none" viewBox="0 0 100 10">
          <rect className="rp-progress-elapsed" x="0" y="0" height="10" width={progress.scrubber * 100}/>
          <rect className="rp-progress-remaining" x={progress.scrubber * 100} y="0" height="10" width={(1 - progress.scrubber) * 100}/>

          {/*ranges.map(([start, end]) => (
            <rect
              key={`${start}-${end}`} className="controls-progress-buffered"
              x={start / playback.duration * 100} y="0" height="10" width={(end - start) / playback.duration * 100}/>
          ))*/}

          {highlights.map(({time}) => (
            <rect
              key={time}
              className={["rp-thumb-highlight"].concat(time <= playback.currentTime ? "past" : []).join(" ")}
              x={time / playback.duration * 100}
              y="0"
              width="1"
              height="10"
            />
          ))}
        </svg>
        <svg className="rp-scrubber" style={{left: `calc(${progress.scrubber * 100}% - 6px)`}} viewBox="0 0 100 100" {...scrubberEvents}>
          <circle cx="50" cy="50" r="50" stroke="none"/>
        </svg>
      </div>
    </div>
  );
}
