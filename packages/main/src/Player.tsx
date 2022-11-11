import * as React from "react";
import {EventEmitter} from "events";
import type StrictEventEmitter from "strict-event-emitter-types";

import CaptionsDisplay from "./CaptionsDisplay";
import {Keymap} from "@liqvid/keymap";
import {Playback} from "./playback";
import {PlaybackContext} from "@liqvid/playback/react";
import {KeymapContext} from "@liqvid/keymap/react";
import {Script} from "./script";

import Controls from "./Controls";
import {Captions} from "./controls/Captions";
import {FullScreen} from "./controls/FullScreen";
import {PlayPause} from "./controls/PlayPause";
import type {ThumbData} from "./controls/ScrubberBar";
import {Settings} from "./controls/Settings";
import {TimeDisplay} from "./controls/TimeDisplay";
import {Volume} from "./controls/Volume";
import {bind} from "@liqvid/utils/misc";
import {anyHover} from "@liqvid/utils/interaction";
import {createUniqueContext} from "@liqvid/utils/react";

interface PlayerEvents {
  canplay: void;
  canplaythrough: void;
  canvasClick: void;
}

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  controls?: JSX.Element | JSX.Element[];
  playback?: Playback;
  script?: Script;
  thumbs?: ThumbData;
}

const allowScroll = Symbol();
const ignoreCanvasClick = Symbol();

export class Player extends React.PureComponent<Props> {
  /**
   * Liqvid analogue of the [`canplay`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canplay_event) event.
   * This can be used to wait for Audio or Video files to load. You can also use {@link obstruct} to add custom loaders.
   */
  canPlay: Promise<void>;

  /**
   * Liqvid analogue of the [`canplaythrough`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canplaythrough_event) event.
   * This can be used to wait for Audio or Video files to load. You can also use {@link obstruct} to add custom loaders.
   */
  canPlayThrough: Promise<void>;

  /** The {@link HTMLDivElement `<div>`} where content is attached (separate from controls). */
  canvas: HTMLDivElement;

  /** Whether keyboard controls are currently being handled. */
  captureKeys: boolean;

  hub: StrictEventEmitter<EventEmitter, PlayerEvents>;

  /** {@link Keymap} attached to the player */
  keymap: Keymap;

  /** {@link Playback} attached to the player */
  playback: Playback;

  /** {@link Script} attached to the player */
  script: Script;

  buffers: Map<HTMLMediaElement, [number, number][]>;

  private __canPlayTasks: Promise<unknown>[];
  private __canPlayThroughTasks: Promise<unknown>[];

  private dag: DAGLeaf;

  /** {@link React.Context} used to access ambient Player */
  static Context = createUniqueContext<Player>("@liqvid/player", null);

  /**
   * Symbol to access the {@link Player} instance attached to a DOM element
   *
   * `player.canvas.parentElement[Player.symbol] === player`
   */
  static symbol = Symbol();

  /** Default controls appearing on the left */
  static defaultControlsLeft = (
    <>
      <PlayPause />
      <Volume />
      <TimeDisplay />
    </>
  );

  /** Default controls appearing on the right */
  static defaultControlsRight = (
    <>
      <Captions />
      <Settings />
      <FullScreen />
    </>
  );

  static defaultProps = {
    controls: (
      <>
        {Player.defaultControlsLeft}

        <div className="lv-controls-right">{Player.defaultControlsRight}</div>
      </>
    ),
    style: {},
  };

  constructor(props: Props) {
    super(props);
    this.hub = new EventEmitter() as StrictEventEmitter<
      EventEmitter,
      PlayerEvents
    >;
    this.__canPlayTasks = [];
    this.__canPlayThroughTasks = [];

    this.keymap = new Keymap();
    this.captureKeys = true;

    if (props.script) {
      this.script = props.script;
      this.playback = this.script.playback;
    } else {
      this.playback = props.playback;
    }

    this.buffers = new Map();

    bind(this, [
      "onMouseUp",
      "suspendKeyCapture",
      "resumeKeyCapture",
      "reparseTree",
    ]);
    this.updateTree = this.updateTree.bind(this);
  }

  componentDidMount() {
    const element = this.canvas.parentElement;
    element[Player.symbol] = this;

    // inline or frame?
    // const client =
    //   element.parentElement.nodeName.toLowerCase() === "main" &&
    //   element.parentElement.parentElement === document.body &&
    //   element.parentElement.childNodes.length === 1;
    // document.documentElement.classList.toggle("lv-frame", client);
    // element.classList.toggle("lv-frame", client);

    // keyboard events
    document.body.addEventListener("keydown", (e) => {
      if (!this.captureKeys || document.activeElement !== document.body) return;
      this.keymap.handle(e);
    });

    // prevent scroll on mobile
    // document.addEventListener("touchmove", e => {
    //   if (e[allowScroll]) return;
    //   e.preventDefault();
    // }, {passive: false});
    // document.addEventListener("touchforcechange", e => e.preventDefault(), {passive: false});

    // canPlay events --- mostly unused
    this.canPlay = Promise.all(this.__canPlayTasks).then(() => {
      this.hub.emit("canplay");
    });

    this.canPlayThrough = Promise.all(this.__canPlayThroughTasks).then(() => {
      this.hub.emit("canplaythrough");
    });

    // hiding stuff
    if (this.script) {
      this.dag = toposort(this.canvas, this.script.markerNumberOf);

      this.script.on("markerupdate", this.updateTree);
      this.updateTree();
    }
  }

  private updateTree(): void {
    const {script} = this;

    recurse(this.dag);

    /** Hide element */
    function hide(leaf: DAGLeaf): void {
      leaf.element.style.opacity = "0";
      leaf.element.style["pointer-events"] = "none";
      leaf.element.setAttribute("aria-hidden", "true");
    }

    /** Show element */
    function show(leaf: DAGLeaf): void {
      leaf.element.style.removeProperty("opacity");
      leaf.element.style.removeProperty("pointer-events");
      leaf.element.removeAttribute("aria-hidden");
      return leaf.children.forEach(recurse);
    }

    /** Recurse through DAG */
    function recurse(leaf: DAGLeaf): void {
      if (typeof leaf.first !== "undefined") {
        if (
          leaf.first <= script.markerIndex &&
          (!leaf.last || script.markerIndex < leaf.last)
        ) {
          return show(leaf);
        }

        hide(leaf);
      } else if (typeof leaf.during !== "undefined") {
        if (script.markerName.startsWith(leaf.during)) {
          return show(leaf);
        }

        return hide(leaf);
      } else {
        return leaf.children.forEach(recurse);
      }
    }
  }

  private canvasClick(): void {
    const allow = this.hub.listeners("canvasClick").every((_) => _() ?? true);
    if (allow) {
      this.playback.paused ? this.playback.play() : this.playback.pause();
    }

    this.hub.emit("canvasClick");
  }

  onMouseUp(e: React.MouseEvent<HTMLDivElement>): void {
    // ignore clicks on input tags
    if (
      ["a", "area", "button", "input", "option", "select", "textarea"].includes(
        (e.target as Element).nodeName.toLowerCase()
      )
    )
      return;

    // data-affords markup
    if ((e.target as Element)?.closest(`*[data-affords~="click"]`)) {
      return;
    }

    // the reason for this escape hatch is that this gets called in between an element's onMouseUp
    // listener and the listener added by dragHelper, so you can't call stopPropagation() in the
    // onMouseUp or else the dragging won't release.
    if (e.nativeEvent[ignoreCanvasClick]) return;

    this.canvasClick();
  }

  static allowScroll(e: React.TouchEvent | TouchEvent): void {
    ("nativeEvent" in e ? e.nativeEvent : e)[allowScroll] = true;
  }

  /**
   * Prevent canvas clicks from pausing the video.
   * @param e Click event on video canvas
   * @deprecated Use data-affords="click" instead
   */
  static preventCanvasClick(e: React.MouseEvent | MouseEvent): void {
    ("nativeEvent" in e ? e.nativeEvent : e)[ignoreCanvasClick] = true;
  }

  /** Suspends keyboard controls so that components can receive keyboard input. */
  suspendKeyCapture(): void {
    this.captureKeys = false;
  }

  /** Resumes keyboard controls. */
  resumeKeyCapture(): void {
    this.captureKeys = true;
  }

  /** @deprecated */
  ready(): void {
    console.info(".ready() is a noop in v2.1");
  }

  /**
   * Reparse a section of the document for `during()` and `from()`
   * @param node Element to reparse
   */
  reparseTree(node: HTMLElement | SVGElement): void {
    const root = findClosest(node, this.dag);
    if (!root) {
      throw new Error("Could not find node in tree");
    }
    root.children = toposort(root.element, this.script.markerNumberOf).children;

    this.updateTree();
  }

  registerBuffer(elt: HTMLMediaElement): void {
    this.buffers.set(elt, []);
  }

  unregisterBuffer(elt: HTMLMediaElement): void {
    this.buffers.delete(elt);
  }

  updateBuffer(elt: HTMLMediaElement, buffers: [number, number][]): void {
    this.buffers.set(elt, buffers);
    this.playback.emit("bufferupdate");
  }

  /**
   * Obstruct {@link canPlay} or {@link canPlayThrough} events
   * @param event Which event type to obstruct
   * @param task Promise to append
   */
  obstruct(event: "canplay" | "canplaythrough", task: Promise<unknown>): void {
    if (event === "canplay") {
      this.__canPlayTasks.push(task);
    } else {
      this.__canPlayThroughTasks.push(task);
    }
  }

  render() {
    const attrs = {
      style: this.props.style,
    };
    const canvasAttrs = anyHover ? {onMouseUp: this.onMouseUp} : {};

    const classNames = ["lv-player", "ractive-player"];

    return (
      <Player.Context.Provider value={this}>
        <PlaybackContext.Provider value={this.playback}>
          <KeymapContext.Provider value={this.keymap}>
            <div className={classNames.join(" ")} {...attrs}>
              <div
                className="rp-canvas lv-canvas"
                {...canvasAttrs}
                ref={(canvas) => (this.canvas = canvas)}
              >
                {this.props.children}
              </div>
              <CaptionsDisplay />
              <Controls
                controls={this.props.controls}
                thumbs={this.props.thumbs}
              />
            </div>
          </KeymapContext.Provider>
        </PlaybackContext.Provider>
      </Player.Context.Provider>
    );
  }
}

interface DAGLeaf {
  children: DAGLeaf[];
  element: HTMLElement | SVGElement;
  during?: string;
  first?: number;
  last?: number;
}

/* topological sort */
function toposort(
  root: HTMLElement | SVGElement,
  mn: (markerName: string) => number
): DAGLeaf {
  const nodes = Array.from(
    root.querySelectorAll("*[data-from-first], *[data-during]")
  ) as (HTMLElement | SVGElement)[];

  const dag: DAGLeaf = {children: [], element: root};
  const path: DAGLeaf[] = [dag];

  for (const node of nodes) {
    // get first and last marker
    let firstMarkerName, lastMarkerName, during;

    if (node.dataset.fromFirst) {
      firstMarkerName = node.dataset.fromFirst;
      lastMarkerName = node.dataset.fromLast;
    } else if (node.dataset.during) {
      during = node.dataset.during;
    }

    // CSS hides this initially, take over now
    node.style.opacity = "0";
    node.style.pointerEvents = "none";

    // node.removeAttribute("data-from-first");
    // node.removeAttribute("data-from-last");
    // node.removeAttribute("data-from-during");

    // build the leaf
    const leaf: DAGLeaf = {
      children: [],
      element: node,
    };
    if (during) leaf.during = during;
    if (firstMarkerName) leaf.first = mn(firstMarkerName);
    if (lastMarkerName) leaf.last = mn(lastMarkerName);

    // figure out where to graft it
    let current = path[path.length - 1];

    while (!current.element.contains(node)) {
      path.pop();
      current = path[path.length - 1];
    }

    current.children.push(leaf);
    path.push(leaf);
  }

  return dag;
}

/**
 * Find element's closest ancestor in DAG
 * @param needle Element to find
 * @param haystack DAG leaf to search
 * @returns Closest ancestor
 */
function findClosest(
  needle: HTMLElement | SVGElement,
  haystack: DAGLeaf
): DAGLeaf {
  if (!haystack.element.contains(needle)) {
    return null;
  }
  for (let i = 0; i < haystack.children.length; ++i) {
    if (haystack.children[i].element.contains(needle)) {
      return findClosest(needle, haystack.children[i]) ?? haystack;
    }
  }
  return haystack;
}
