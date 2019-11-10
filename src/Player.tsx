import {EventEmitter} from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import * as React from "react";
import Controls, {ThumbData} from "./Controls";
import Captions from "./Captions";

import {bind} from "./utils/misc";
import {anyHover} from "./utils/mobile";

import Playback from "./playback";
import Script from "./script";

import {PlayerContext} from "./shared";

interface HookMap {
  canvasClick: boolean;
  classNames: string;
  controls: React.ReactChild;
}

type HookFn<T extends keyof HookMap> = (name: T, listener: () => HookMap[T]) => void;
interface Plugin {
  setup(hook: HookFn<keyof HookMap>): void;
}

interface PlayerEvents {
  "canplay": void;
  "canplaythrough": void;
  "canvasClick": void;
}

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  plugins?: Plugin[];
  script: Script;
  thumbs?: ThumbData;
}

interface State {
  ready: boolean;
}

const ignoreCanvasClick = Symbol();

export default class Player extends React.PureComponent<Props, State> {
  controls: Controls;
  canvas: HTMLDivElement;
  hub: StrictEventEmitter<EventEmitter, PlayerEvents>;
  playback: Playback;
  script: Script;

  buffers: Map<HTMLMediaElement, [number, number][]>;

  private hooks: Map<string, (() => unknown)[]>;

  private __canPlayTasks: Promise<void>[];
  private __canPlayThroughTasks: Promise<void>[];

  private dag: DAGLeaf;

  static Context = PlayerContext;

  static defaultProps = {
    plugins: [] as Plugin[],
    style: {}
  }

  constructor(props: Props) {
    super(props);
    this.hub = new EventEmitter() as StrictEventEmitter<EventEmitter, PlayerEvents>;
    this.__canPlayTasks = [];
    this.__canPlayThroughTasks = [];

    this.script = this.props.script;
    this.playback = this.script.playback;

    this.rememberVolumeSettings();

    this.buffers = new Map();
    this.hooks = new Map();

    const hook = (name: string, listener: () => unknown) => {
      if (!this.hooks.has(name)) {
        this.hooks.set(name, []);
      }

      this.hooks.get(name).push(listener);
    };

    this.props.plugins.forEach(plugin => plugin.setup(hook));

    this.state = {ready: false};
    bind(this, ["onMouseUp", "suspendKeyCapture", "resumeKeyCapture"]);
  }

  componentDidMount() {
    // prevent scroll on mobile
    document.addEventListener("touchmove", e => e.preventDefault(), {passive: false});
    document.addEventListener("touchforcechange", e => e.preventDefault(), {passive: false});

    Promise.all(this.__canPlayTasks)
    .then(() => this.hub.emit("canplay"));

    Promise.all(this.__canPlayThroughTasks)
    .then(() => this.hub.emit("canplaythrough"));
  }

  private rememberVolumeSettings() {
    const {playback} = this,
          storage = window.sessionStorage;

    // restore volume settings
    playback.volume = parseFloat(storage.getItem("ractive volume") || "1");
    playback.muted = "true" === (storage.getItem("ractive muted") || "false");

    // save volume settings
    playback.hub.on("volumechange", () => {
      storage.setItem("ractive muted", playback.muted.toString());
      storage.setItem("ractive volume", playback.volume.toString());
    });
  }

  private updateTree() {
    const {script} = this;

    recurse(this.dag);

    function recurse(leaf: DAGLeaf) {
      if (typeof leaf.first !== "undefined") {
        if (leaf.first <= script.markerIndex && (!leaf.last || script.markerIndex < leaf.last)) {
          leaf.element.style.removeProperty("opacity");
          leaf.element.style.removeProperty("pointer-events");
          return leaf.children.forEach(recurse);
        }

        leaf.element.style.opacity = "0";
        leaf.element.style["pointer-events"] = "none";
      } else if (typeof leaf.during !== "undefined") {
        if (script.markerName.startsWith(leaf.during)) {
          leaf.element.style.removeProperty("opacity");
          leaf.element.style.removeProperty("pointer-events");
          return leaf.children.forEach(recurse);
        }

        leaf.element.style.opacity = "0";
        leaf.element.style["pointer-events"] = "none";
      } else {
        return leaf.children.forEach(recurse);
      }
    }
  }

  onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    // the reason for this escape hatch is that this gets called in between an element's onMouseUp
    // listener and the listener added by dragHelper, so you can't call stopPropagation() in the
    // onMouseUp or else the dragging won't release.
    if (e.nativeEvent[ignoreCanvasClick]) return;
        
    this.controls.canvasClick();
  }

  static preventCanvasClick(e: React.MouseEvent | MouseEvent) {
    ("nativeEvent" in e ? e.nativeEvent : e)[ignoreCanvasClick] = true;
  }
  
  suspendKeyCapture() {
    this.controls.captureKeys = false;
  }
  
  resumeKeyCapture() {
    this.controls.captureKeys = true;
  }
  
  // toposort needs to be called after MathJax has rendered stuff
  ready() {
    this.dag = toposort(this.canvas, this.script.markerNumberOf);

    this.script.hub.on("markerupdate", () => this.updateTree());
    this.updateTree();

    this.setState({
      ready: true
    });
  }
  
  registerBuffer(elt: HTMLMediaElement) {
    this.buffers.set(elt, []);
  }
  
  updateBuffer(elt: HTMLMediaElement, buffers: [number, number][]) {
    this.buffers.set(elt, buffers);
    this.playback.hub.emit("bufferupdate");
  }
  
  obstruct(event: "canplay" | "canplaythrough", task: Promise<void>) {
    if (event === "canplay") {
      this.__canPlayTasks.push(task);
    } else {
      this.__canPlayThroughTasks.push(task);
    }
  }
  
  applyHooks<K extends keyof HookMap>(name: K): HookMap[K][] {
    if (!this.hooks.has(name)) return [];
    // @ts-ignore
    return this.hooks.get(name).map(_ => _());
  }
  
  render() {
    const attrs = {
      style: this.props.style
    };
    const canvasAttrs = anyHover ? {onMouseUp: this.onMouseUp} : {};
    
    const classNames = ["ractive-player"];
    
    if (!this.state.ready)
      classNames.push("not-ready");
    
    classNames.push(...this.applyHooks("classNames"));
    
    return (
      <Player.Context.Provider value={this}>
        <div className={classNames.join(" ")} {...attrs}>
          <LoadingScreen/>
          <div className="rp-canvas"
            {...canvasAttrs}
            ref={canvas => this.canvas = canvas}
          >
            {this.props.children}
          </div>
          <Captions player={this}/>
          <Controls
            player={this}
            ref={ref => this.controls = ref}
            ready={this.state.ready}
            thumbs={this.props.thumbs}
          />
        </div>
      </Player.Context.Provider>
    );
  }
}

function LoadingScreen() {
  return (
    <div className="rp-loading-screen">
      <div className="rp-loading-spinner"/>
    </div>
  );
}

interface DAGLeaf {
  children: DAGLeaf[];
  element: HTMLElement | SVGElement;
  during?: string;
  first?: number;
  last?: number;
}

/* topological sort */
function toposort(root: HTMLElement, mn: (markerName: string) => number): DAGLeaf {
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
