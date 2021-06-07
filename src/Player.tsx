import * as React from "react";
import {EventEmitter} from "events";
import type StrictEventEmitter from "strict-event-emitter-types";

import Captions from "./Captions";
import KeyMap from "./keymap";
import Playback from "./playback";
import Script from "./script";

import Controls from "./Controls";
import FullScreen from "./controls/FullScreen";
import PlayPause from "./controls/PlayPause";
import type {ThumbData} from "./controls/ScrubberBar";
import Settings from "./controls/Settings";
import TimeDisplay from "./controls/TimeDisplay";
import Volume from "./controls/Volume";
import {bind} from "./utils/misc";
import {anyHover} from "./utils/mobile";

interface PlayerEvents {
  "canplay": void;
  "canplaythrough": void;
  "canvasClick": void;
}

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  controls?: JSX.Element;
  playback?: Playback;
  script?: Script;
  thumbs?: ThumbData;
}

const allowScroll = Symbol();
const ignoreCanvasClick = Symbol();

export default class Player extends React.PureComponent<Props> {
  canPlay: Promise<void[]>;
  canPlayThrough: Promise<void[]>;
  canvas: HTMLDivElement;
  captureKeys: boolean;
  hub: StrictEventEmitter<EventEmitter, PlayerEvents>;
  keymap: KeyMap;
  playback: Playback;
  script: Script;

  buffers: Map<HTMLMediaElement, [number, number][]>;

  private __canPlayTasks: Promise<void>[];
  private __canPlayThroughTasks: Promise<void>[];

  private dag: DAGLeaf;

  static Context = React.createContext<Player>(null);

  static defaultControlsLeft = (<>
    <PlayPause/>
    <Volume/>
    <TimeDisplay/>
  </>);
  static defaultControlsRight = (<>
    <Settings/>
    <FullScreen/>
  </>);

  static defaultProps = {
    controls: (<>
      {Player.defaultControlsLeft}

      <div className="rp-controls-right">
        {Player.defaultControlsRight}
      </div>
    </>),
    style: {}
  }

  constructor(props: Props) {
    super(props);
    this.hub = new EventEmitter() as StrictEventEmitter<EventEmitter, PlayerEvents>;
    this.__canPlayTasks = [];
    this.__canPlayThroughTasks = [];

    this.keymap = new KeyMap();
    this.captureKeys = true;

    if (props.script) {
      this.script = props.script;
      this.playback = this.script.playback;
    } else {
      this.playback = props.playback;
    }

    this.buffers = new Map();
    
    bind(this, ["onMouseUp", "suspendKeyCapture", "resumeKeyCapture", "updateTree", "reparseTree"]);
  }

  componentDidMount() {
    // keyboard events
    document.body.addEventListener("keydown", e => {
      if (!this.captureKeys || document.activeElement !== document.body)
        return;
      this.keymap.handle(e);
    });

    // prevent scroll on mobile
    document.addEventListener("touchmove", e => {
      if (e[allowScroll]) return;
      e.preventDefault();
    }, {passive: false});
    document.addEventListener("touchforcechange", e => e.preventDefault(), {passive: false});

    // canPlay events --- mostly unused
    this.canPlay = Promise.all(this.__canPlayTasks);
    this.canPlay
    .then(() => {
      this.hub.emit("canplay");
    });

    this.canPlayThrough = Promise.all(this.__canPlayThroughTasks);
    this.canPlayThrough
    .then(() => this.hub.emit("canplaythrough"));

    // hiding stuff
    if (this.script) {
      this.dag = toposort(this.canvas, this.script.markerNumberOf);

      this.script.on("markerupdate", this.updateTree);
      this.updateTree();
    }
  }

  private updateTree() {
    const {script} = this;

    recurse(this.dag);

    function hide(leaf: DAGLeaf) {
      leaf.element.style.opacity = "0";
      leaf.element.style["pointer-events"] = "none";
      leaf.element.setAttribute("aria-hidden", "true");
    }

    function show(leaf: DAGLeaf) {
      leaf.element.style.removeProperty("opacity");
      leaf.element.style.removeProperty("pointer-events");
      leaf.element.removeAttribute("aria-hidden");
      return leaf.children.forEach(recurse);
    }

    function recurse(leaf: DAGLeaf) {
      if (typeof leaf.first !== "undefined") {
        if (leaf.first <= script.markerIndex && (!leaf.last || script.markerIndex < leaf.last)) {
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

  private canvasClick() {
    const allow = this.hub.listeners("canvasClick").every(_ => _() ?? true);
    if (allow) {
      this.playback.paused ? this.playback.play() : this.playback.pause();
    }
    
    this.hub.emit("canvasClick");
  }

  onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    // ignore clicks on input tags
    if ([
      "a", "area",
      "button",
      "input",
      "option",
      "select",
      "textarea",
      "video"
    ].includes((e.target as Element).nodeName.toLowerCase()))
      return;
    
    // the reason for this escape hatch is that this gets called in between an element's onMouseUp
    // listener and the listener added by dragHelper, so you can't call stopPropagation() in the
    // onMouseUp or else the dragging won't release.
    if (e.nativeEvent[ignoreCanvasClick]) return;
        
    this.canvasClick();
  }

  static allowScroll(e: React.TouchEvent | TouchEvent) {
    ("nativeEvent" in e ? e.nativeEvent : e)[allowScroll] = true;
  }

  static preventCanvasClick(e: React.MouseEvent | MouseEvent) {
    ("nativeEvent" in e ? e.nativeEvent : e)[ignoreCanvasClick] = true;
  }
  
  suspendKeyCapture() {
    this.captureKeys = false;
  }
  
  resumeKeyCapture() {
    this.captureKeys = true;
  }
  
  // toposort needs to be called after MathJax has rendered stuff
  ready() {
    console.info(".ready() is a noop in v2.1");
  }

  reparseTree(node: HTMLElement | SVGElement) {
    // find where to update the tree from
    function findClosest(needle: HTMLElement | SVGElement, haystack: DAGLeaf): [DAGLeaf, number] {
      if (!haystack.element.contains(needle)) {
        return null;
      }
      for (let i = 0; i < haystack.children.length; ++i) {
        if (haystack.children[i].element.contains(needle)) {
          return findClosest(needle, haystack.children[i]) ?? [haystack, i];
        }
      }
    }

    const [root, index] = findClosest(node, this.dag);
    if (!root) {
      throw new Error("Could not find node in tree");
    }
    root.children[index].children = toposort(root.children[index].element, this.script.markerNumberOf).children;

    this.updateTree();
  }
  
  registerBuffer(elt: HTMLMediaElement) {
    this.buffers.set(elt, []);
  }

  unregisterBuffer(elt: HTMLMediaElement) {
    this.buffers.delete(elt);
  }
  
  updateBuffer(elt: HTMLMediaElement, buffers: [number, number][]) {
    this.buffers.set(elt, buffers);
    this.playback.emit("bufferupdate");
  }
  
  obstruct(event: "canplay" | "canplaythrough", task: Promise<void>) {
    if (event === "canplay") {
      this.__canPlayTasks.push(task);
    } else {
      this.__canPlayThroughTasks.push(task);
    }
  }
  
  render() {
    const attrs = {
      style: this.props.style
    };
    const canvasAttrs = anyHover ? {onMouseUp: this.onMouseUp} : {};
    
    const classNames = ["ractive-player"];
    
    return (
      <Player.Context.Provider value={this}>
        <div className={classNames.join(" ")} {...attrs}>
          <div className="rp-canvas"
            {...canvasAttrs}
            ref={canvas => this.canvas = canvas}
          >
            {this.props.children}
          </div>
          <Captions/>
          <Controls controls={this.props.controls} thumbs={this.props.thumbs}/>
        </div>
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
function toposort(root: HTMLElement | SVGElement, mn: (markerName: string) => number): DAGLeaf {
  const nodes = Array.from(root.querySelectorAll(
    "*[data-from-first], *[data-during]"
  )) as (HTMLElement | SVGElement)[];

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
      element: node
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
