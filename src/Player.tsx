import * as EventEmitter from 'events';
import * as React from 'react';
import Controls, {ThumbData} from './Controls';
import Captions from './Captions';

import {bind} from './utils/misc';

import IdMap from './IdMap';
import Playback from './playback';
import Script from './script';

import ErrorBoundary from './ErrorBoundary';

import {createContextBroadcaster} from './utils/react-utils';
import {PlayerContext, PlayerReceiverSymbol, PlayerReceiver, PlayerPureReceiver, PlayerBroadcaster} from './shared';

interface SVGElement {
  dataset: DOMStringMap;
  style: CSSStyleDeclaration;
  removeAttribute: (qualifiedName: string) => void;
}

interface HookMap {
  canvasClick: boolean;
  classNames: string;
  controls: React.ReactChild;
}

type HookFn<T extends keyof HookMap> = (name: T, listener: () => HookMap[T]) => void;
interface Plugin {
  setup(hook: HookFn<keyof HookMap>): void;
}

interface Props {
  activities?: React.Component;
  plugins?: Plugin[];
  script: Script;
  style?: Object;
  thumbs?: ThumbData;
}

interface State {
  ready: boolean;
}

export default class Player extends React.PureComponent<Props, State> {
  $controls: Controls;
  canvas: HTMLDivElement;
  hub: EventEmitter;
  playback: Playback;
  script: Script;

  buffers: Map<HTMLMediaElement, [number, number][]>;

  private hooks: Map<string, (() => any)[]>;

  private __canPlayTasks: Promise<any>[];
  private __canPlayThroughTasks: Promise<any>[];

  private dag: DAGLeaf;

  static ReceiverSymbol = PlayerReceiverSymbol;
  static Context = PlayerContext;
  static Receiver = PlayerReceiver;
  static PureReceiver = PlayerPureReceiver;
  static Broadcaster = PlayerBroadcaster;

  static ignoreCanvasClick = Symbol();

  static defaultProps = {
    plugins: [] as Plugin[],
    style: {}
  }

  static CONTROLS_HEIGHT = 44;

  constructor(props: Props) {
    super(props);
    this.hub = new EventEmitter();
    this.__canPlayTasks = [];
    this.__canPlayThroughTasks = [];

    this.script = this.props.script;
    this.playback = this.script.playback;

    this.rememberVolumeSettings();

    this.buffers = new Map();
    this.hooks = new Map();

    const hook = (name: string, listener: () => any) => {
      if (!this.hooks.has(name)) {
        this.hooks.set(name, []);
      }

      this.hooks.get(name).push(listener);
    };

    this.props.plugins.forEach(plugin => plugin.setup(hook));

    this.state = {ready: false};
    bind(this, ["onMouseUp"]);
  }

  componentDidMount() {
    Promise.all(this.__canPlayTasks)
      .then(() => this.hub.emit('canplay'));

    Promise.all(this.__canPlayThroughTasks)
      .then(() => this.hub.emit('canplaythrough'));
  }

  rememberVolumeSettings() {
    const {playback} = this,
          storage = window.sessionStorage;

    // restore volume settings
    playback.volume = parseFloat(storage.getItem('ractive volume') || '1');
    playback.muted = 'true' === (storage.getItem('ractive muted') || 'false');

    // save volume settings
    playback.hub.on('volumechange', () => {
      storage.setItem('ractive muted', playback.muted.toString());
      storage.setItem('ractive volume', playback.volume.toString());
    });
  }

  updateSlides() {
    const {script} = this;

    recurse(this.dag);

    function recurse(leaf: DAGLeaf) {
      // root node
      if (typeof leaf.first === 'undefined') return leaf.children.forEach(recurse);

      if (leaf.first <= script.slideIndex && (!leaf.last || script.slideIndex < leaf.last)) {
        leaf.element.style.removeProperty('opacity');
        leaf.element.style.removeProperty('pointer-events');
        return leaf.children.forEach(recurse);
      }

      leaf.element.style.opacity = '0';
      leaf.element.style['pointer-events'] = 'none';
    }
  }

  onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    //  the reason for this garbage is that this gets called in between an element's onMouseUp listener
    //  and the listener added by dragHelper, so you can't call stopPropagation() in the onMouseUp or
    //  else the dragging won't release.
    //  Note that e.persist() must be called on e if one is using this escape hatch.
    if (e[Player.ignoreCanvasClick]) return;
        
    this.$controls.canvasClick();
  }

  // toposort needs to be called after MathJax has rendered stuff
  ready() {
    this.dag = toposort(this.canvas, this.script.slideNumberOf);

    this.script.hub.on('slideupdate', () => this.updateSlides());
    this.updateSlides();

    this.setState({
      ready: true
    });
  }

  registerBuffer(elt: HTMLMediaElement) {
    this.buffers.set(elt, []);
  }

  updateBuffer(elt: HTMLMediaElement, buffers: [number, number][]) {
    this.buffers.set(elt, buffers);
    this.playback.hub.emit('bufferupdate');
  }

  obstruct(event: 'canplay' | 'canplaythrough', task: Promise<any>, name: string = 'miscellaneous') {
    if (event === 'canplay') {
      this.__canPlayTasks.push(task);
    } else {
      this.__canPlayThroughTasks.push(task);
    }
  }

  applyHooks<K extends keyof HookMap>(name: K): HookMap[K][] {
    if (!this.hooks.has(name)) return [];
    return this.hooks.get(name).map(_ => _());
  }

  render() {
    const attrs = {
      style: this.props.style
    };

    const classNames = ['ractive-player'];

    if (!this.state.ready)
      classNames.push('not-ready');
    
    classNames.push(...this.applyHooks('classNames'));

    return (
      <Player.Context.Provider value={this}>
        <div className={classNames.join(' ')} {...attrs}>
          <LoadingScreen ref={ref => this.loadingScreen = ref}/>
          <div className="rp-canvas"
            onMouseUp={this.onMouseUp}
            ref={canvas => this.canvas = canvas}>
            {this.props.children}
          </div>
          <Captions player={this}/>
          <ErrorBoundary>
            <Controls
              player={this}
              ref={$controls => this.$controls = $controls}
              activities={this.props.activities}
              ready={this.state.ready}
              thumbs={this.props.thumbs}
              />
            </ErrorBoundary>
        </div>
      </Player.Context.Provider>
    );
  }
}

class LoadingScreen extends React.PureComponent<{tasks: any[]}, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="rp-loading-screen">
        <div className="rp-loading-spinner"/>
      </div>
   );
  }
}

interface DAGLeaf {
  children: DAGLeaf[];
  element: HTMLElement | SVGElement;
  first?: number;
  last?: number;
}

/* topological sort */
function toposort(root: HTMLElement, sn: (slideName: string) => number): DAGLeaf {
  const nodes = Array.from(root.querySelectorAll('*[data-from-first], *[data-annotation_slide]')) as (HTMLElement | SVGElement)[];

  const dag: DAGLeaf = {children: [], element: root};
  const path: DAGLeaf[] = [dag];

  for (const node of nodes) {
    // get first and last slide
    let firstSlideName, lastSlideName;

    if (node.dataset.fromFirst) {
      firstSlideName = node.dataset.fromFirst;
      lastSlideName = node.dataset.fromLast;
    } else {
      [firstSlideName, lastSlideName] = node.dataset.annotation_slide.split(',');
    }

    // CSS hides this initially, take over now
    node.style.opacity = '0';
    node.style.pointerEvents = 'none';

    node.removeAttribute('data-from-first');
    node.removeAttribute('data-from-last');
    node.removeAttribute('data-annotation_slide');

    // build the leaf
    const leaf: DAGLeaf = {
      children: [],
      element: node,
      first: sn(firstSlideName),
    };
    if (lastSlideName) leaf.last = sn(lastSlideName);

    // figure out where to graft it
    let current = path[path.length - 1];

    while (!(current.element as any).contains(node)) {
      path.pop();
      current = path[path.length - 1];
    }

    current.children.push(leaf);
    path.push(leaf);
  }

  return dag;
}
