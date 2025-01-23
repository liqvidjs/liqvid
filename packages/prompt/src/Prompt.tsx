import * as React from "react";
import {useEffect, useMemo, useRef, useState} from "react";

import {Utils, usePlayer} from "liqvid";
const {dragHelperReact} = Utils.interactivity;

const NS = "lv-prompt";

import {Cue} from "./Cue";

/**
 * Container for {@link Cue}s
 */
export function Prompt(
  props: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>,
) {
  const {script} = usePlayer();

  const ref = useRef<HTMLDivElement>();
  const {children, ...attrs} = props;

  const [activeIndex, setActiveIndex] = useState(
    (React.Children.toArray(children) as unknown as Cue[])
      .map(
        (cue: Cue) =>
          cue.props.children &&
          script.markerNumberOf(cue.props.on) <= script.markerIndex,
      )
      .lastIndexOf(true),
  );

  useEffect(() => {
    if (!ref.current.style.left) {
      Object.assign(ref.current.style, {
        left: "0%",
        top: "0%",
      });
    }

    // subscribe to marker updates
    script.on("markerupdate", () => {
      setActiveIndex(
        (React.Children.toArray(children) as unknown as Cue[])
          .map(
            (cue: Cue) =>
              cue.props.children &&
              script.markerNumberOf(cue.props.on) <= script.markerIndex,
          )
          .lastIndexOf(true),
      );
    });
  });

  const dragEvents = useMemo(() => {
    let lastX: number, lastY: number;
    return dragHelperReact<HTMLDivElement>(
      (e, hit) => {
        const offset = offsetParent(ref.current);

        const x = offset.left + hit.x - lastX,
          y = offset.top + hit.y - lastY,
          left = (x / offset.width) * 100,
          top = (y / offset.height) * 100;

        lastX = hit.x;
        lastY = hit.y;

        Object.assign(ref.current.style, {
          left: `${left}%`,
          top: `${top}%`,
        });
      },
      (e, hit) => {
        lastX = hit.x;
        lastY = hit.y;
      },
    );
  }, []);

  return (
    <div className={NS} {...attrs} {...dragEvents} ref={ref}>
      {React.Children.map(props.children, (node: Cue & React.ReactElement, i) =>
        React.cloneElement(node, {active: activeIndex === i}),
      )}
    </div>
  );
}

function offsetParent(node: HTMLElement) {
  if (
    typeof node.offsetLeft !== "undefined" &&
    typeof node.offsetTop !== "undefined"
  ) {
    return {
      left: node.offsetLeft,
      top: node.offsetTop,
      width: node.offsetParent.getBoundingClientRect().width,
      height: node.offsetParent.getBoundingClientRect().height,
    };
  }

  const rect = node.getBoundingClientRect();

  let parent = node;
  while ((parent = parent.parentNode as HTMLElement)) {
    if (!["absolute", "relative"].includes(getComputedStyle(parent).position))
      continue;

    const prect = parent.getBoundingClientRect();

    return {
      left: rect.left - prect.left,
      top: rect.top - prect.top,
      width: prect.width,
      height: prect.height,
    };
  }

  return {
    left: rect.left,
    top: rect.top,
    width: innerWidth,
    height: innerHeight,
  };
}
