import {EventEmitter} from "events";
import * as React from "react";

export = RactivePlayer;
export as namespace RactivePlayer;

declare namespace RactivePlayer {
  const aspectRatio: number;

  type ReplayData<K> = [number, K][];

  // type only!
  class Activity extends React.Component<{close: Function}> {}
  type ActivityList = React.Component<{open: Function}>;

  // Block
  class Block<P = {}, S = {}> extends Player.PureReceiver<P, S> {
    player: Player;

    sbn(name: string): [string, number, number];
    sn(name: string): number;
    onSlideUpdate(prevIndex: number): void;
    onTimeUpdate(t: number): void;
  }

  // Cursor
  interface CursorProps {
    src: string;
    start: number | string;
    end: number | string;
    replay: ReplayData<[number, number]>;
  }

  class Cursor extends React.PureComponent<CursorProps, {}> {}

  // IdMap
  interface IdMapProps {
    map?: object;
  }

  class IdMap extends React.PureComponent<IdMapProps, {}> {
    foundIds: Set<string>;
  }

  // Media
  interface MediaProps {
    obstructCanPlay?: boolean;
    obstructCanPlayThrough?: boolean;
    src?: string;
    start: number | string;
  }

  class Media extends React.PureComponent<MediaProps, {}> {}

  class Audio extends Media {
    domElement: HTMLAudioElement;
  }

  class Video extends Media {
    domElement: HTMLVideoElement;
  }

  // Playback
  class Playback {
    audioContext: AudioContext;
    audioNode: GainNode;
    currentTime: number;
    duration: number;
    hub: EventEmitter;
    paused: boolean;
    playbackRate: number;
    playingFrom: number;
    seeking: boolean;

    pause(): void;
    play(): Promise<void>;
    seek(t: number | string): void;
  }

  class Script {
    hub: EventEmitter;
    loadTasks: Promise<any>[];
    slideIndex: number;
    slideName: string;
    slides: [string, number, number][];

    constructor(slides: Array<[string, string | number] | [string, string | number, string | number]>);
    slideByName(name: string): [string, number, number];
    slideNumberOf(name: string): number;
  }

  // Player
  interface VideoHighlight {
    time: number;
    title: string;
  }

  interface ThumbData {
    cols: number;
    rows: number;
    width: number;
    height: number;
    frequency: number;
    path: string;
    highlights?: VideoHighlight[];
  }

  interface HookMap {
    canvasClick: boolean;
    classNames: string;
    controls: React.ReactChild;
  }

  type HookFunction<T extends keyof HookMap> = (name: T, listener: () => HookMap[T]) => void;
  interface Plugin {
    setup(hook: HookFunction<keyof HookMap>): void;
  }

  interface PlayerProps {
    map?: object;
    plugins?: Plugin[];
    script: Script;
    thumbs?: ThumbData;
  }

  class Player extends React.PureComponent<PlayerProps, {}> {
    static CONTROLS_HEIGHT: number;
    static ignoreCanvasClick: Symbol;

    static Context: React.Context<Player>;
    static Receiver: {new<P = {}, S = {}>(props: P): React.Component<P & {player?: Player}, S>};
    static PureReceiver: {new<P = {}, S = {}>(props: P): React.PureComponent<P & {player?: Player}, S>};
    static Broadcaster: {new(): React.PureComponent<{}, {}>};

    $controls: any;
    canvas: HTMLDivElement;
    hub: EventEmitter;
    playback: Playback;
    script: Script;

    suspendKeyCapture(): void;
    resumeKeyCapture(): void;
    obstruct(event: 'canplay' | 'canplaythrough', task: Promise<any>): void;

    /** Call this method when the ractive is ready to begin playing. */
    ready(): void;
  }

  interface StyleBlock {
    style?: any;
  }

  interface ReplayArgs<K> {
    playback: Playback;
    data: ReplayData<K>;
    start?: number;
    end?: number;
    callback: (current: K) => void;
  }

  const Utils: {
    animation: {
      animate(options: {
        startValue?: number,
        endValue?: number,
        startTime: number,
        duration: number,
        easing?: (x: number) => number
      }): (t: number) => number;

      replay<K>({data, start, end, callback}: ReplayArgs<K>): (t: number) => void;

      easings: {
        easeInSine:     [number, number, number, number],
        easeOutSine:    [number, number, number, number],
        easeInOutSine:  [number, number, number, number],
        easeInQuad:     [number, number, number, number],
        easeOutQuad:    [number, number, number, number],
        easeInOutQuad:  [number, number, number, number],
        easeInCubic:    [number, number, number, number],
        easeOutCubic:   [number, number, number, number],
        easeInOutCubic: [number, number, number, number],
        easeInQuart:    [number, number, number, number],
        easeOutQuart:   [number, number, number, number],
        easeInOutQuart: [number, number, number, number],
        easeInQuint:    [number, number, number, number],
        easeOutQuint:   [number, number, number, number],
        easeInOutQuint: [number, number, number, number],
        easeInExpo:     [number, number, number, number],
        easeOutExpo:    [number, number, number, number],
        easeInOutExpo:  [number, number, number, number],
        easeInCirc:     [number, number, number, number],
        easeOutCirc:    [number, number, number, number],
        easeInOutCirc:  [number, number, number, number],
        easeInBack:     [number, number, number, number],
        easeOutBack:    [number, number, number, number],
        easeInOutBack:  [number, number, number, number]
      }
    }

    authoring: {
      during: (prefix: string) => any;
      from: (first: string, last?: string) => any;
      pos(args: {x?: number, y?: number, w?: number, h?: number}): StyleBlock;
      pos(x?: number, y?: number, w?: number, h?: number): StyleBlock;
      showIf(cond: boolean): StyleBlock;
    }

    graphics: {
      extendThree(): void;
      screenToSVG: (svg: SVGElement, x: number, y: number) => [number, number];
      screenToSVGVector: (svg: SVGElement, dx: number, dy: number) => [number, number];    
    }

    interactivity: {
      dragHelper: any;
      dragHelperReact: any;
    }

    media: {
      awaitMedia(media: HTMLMediaElement): Promise<Event>;
      awaitMediaCanPlay(media: HTMLMediaElement): Promise<Event>;
      awaitMediaCanPlayThrough(media: HTMLMediaElement): Promise<Event>;
    }

    misc: {
      bind<T extends {[P in K]: Function}, K extends keyof T>(o: T, methods: K[]): void;
      constrain: (min: number, val: number, max: number) => number;    
      range: (n: number) => number[];

      wait(time: number): Promise<void>;
      waitFor(callback: () => boolean, interval?: number): Promise<void>;

      whitelist<T, K extends keyof T>(o: T, keysToInclude: K[]): Pick<T, K>;
    }

    react: {
      createContextBroadcaster
        <C, K extends React.PureComponent, R extends React.PureComponent>
        (Context: React.Context<C>, Receiver: {new(): K}, name: string)
        : {new(): React.PureComponent};

      recursiveMap
        (children: React.ReactNode, fn: (child: React.ReactElement<any>) => React.ReactElement<any>)
        : React.ReactChild[];
    }

    time: {
      parseTime(str: string): number;
      formatTime(time: number): string;
      formatTimeMs(time: number): string;    
    }
  }
}
