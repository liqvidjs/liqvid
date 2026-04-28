import { EventEmitter } from "@liqvid/event-emitter";
import { useEffect, useImperativeHandle, useRef, useState } from "react";

import { MathJaxReady } from "./loading.ts";

type RenderingStatus = "done" | "rendering";

/**
 * MJX element API
 */
export interface Handle {
  /** Underlying <span> or <mjx-container> element. */
  domElement: HTMLElement | null;

  hub: MathJaxEventEmitter;

  status: RenderingStatus;
}

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  children: string;

  /**
   * Whether to render in display mode
   * @default false
   */
  display?: boolean;

  ref?: React.Ref<Handle>;

  /**
   * Whether to rerender on resize (necessary for XyJax)
   * @default false
   */
  resize?: boolean;
}

type MathJaxEvents = {
  start: null;
  done: null;
};

class MathJaxEventEmitter extends EventEmitter<MathJaxEvents> {
  beginRendering() {
    this.emit("start", null);
  }

  doneRendering() {
    this.emit("done", null);
  }
}

/** Component for MathJax code */
export function MJX({
  children,
  display = false,
  ref,
  resize = false,
  ...attrs
}: Props) {
  const [hub] = useState(() => new MathJaxEventEmitter());

  useImperativeHandle(ref, () => ({
    get domElement() {
      return spanRef.current;
    },
    get hub() {
      return hub;
    },
    get status() {
      return status.current;
    },
  }));

  const status = useRef<RenderingStatus>("rendering");

  const spanRef = useRef<HTMLElement>(null);

  /* typeset */
  useEffect(() => {
    MathJaxReady.then(() => {
      // needed
      children;

      const span = spanRef.current;
      if (!span) return;

      hub.beginRendering();
      status.current = "rendering";

      console.log(`rendering`, children);

      MathJax.typesetPromise([span]).then(() => {
        hub.doneRendering();
        status.current = "done";
      });
    });
  }, [children, hub]);

  const [open, close] = display ? ["\\[", "\\]"] : ["\\(", "\\)"];

  return (
    <span {...attrs} ref={spanRef}>
      {open + children + close}
    </span>
  );
}
