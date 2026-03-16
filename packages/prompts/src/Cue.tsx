import { useMarker, useScript } from "@liqvid/script/react";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";

/** Lines to be read at a particular marker */
export function Cue<M extends string>({
  classes,
  merge = classNames,
  ...props
}: {
  classes?: {
    active?: string;
    container?: string;
    cue?: string;
    inactive?: string;
    line?: string;
    measure?: string;
  };

  children?: React.ReactNode;

  /** Name of marker when this cue should be active */
  on: M;

  // biome-ignore lint/suspicious/noExplicitAny: variance
  merge?: (...args: any[]) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>();

  // split into lines
  useEffect(() => {
    if (!props.children) return;
    if (!ref.current) return;

    ref.current?.normalize();

    const lines = [];
    //
    for (const node of Array.from(ref.current.childNodes)) {
      if (!isText(node)) continue;

      const blocks = node.wholeText.split(" ");

      let line = blocks.shift() as string;
      let text = line;
      node.replaceData(0, node.wholeText.length, text);
      let height = ref.current.getBoundingClientRect().height;

      for (const block of blocks) {
        node.replaceData(0, node.wholeText.length, `${text} ${block}`);
        const newHeight = ref.current.getBoundingClientRect().height;

        if (newHeight !== height) {
          height = newHeight;
          lines.push(line);
          line = block;
        } else {
          line += ` ${block}`;
        }

        text += ` ${block}`;
      }
      lines.push(line);
    }

    setLines(lines);
  }, [props.children]);

  // render
  if (!props.children) {
    return null;
  }

  const script = useScript();

  const [active, setActive] = useState(
    () => script.active.index <= script.markers.get(props.on).index,
  );

  useMarker(() =>
    setActive(script.active.index <= script.markers.get(props.on).index),
  );

  return (
    <div
      className={
        merge(
          classes?.container,
          active && classes?.active,
          !active && classes?.inactive,
        ) || undefined
      }
      data-active={active || undefined}
    >
      <dt className={classes?.cue}>{props.on}</dt>

      {lines ? (
        lines.map((line, n) => (
          <dd className={classes?.line} key={n}>
            {line}
          </dd>
        ))
      ) : (
        <dd className={classes?.measure} ref={ref}>
          {props.children}
        </dd>
      )}
    </div>
  );
  // }
}

function isText(node: Node): node is Text {
  return node.nodeType === node.TEXT_NODE;
}
