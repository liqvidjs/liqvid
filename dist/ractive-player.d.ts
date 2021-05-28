import {EventEmitter} from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import * as React from "react";

export = RactivePlayer;
export as namespace RactivePlayer;

declare namespace RactivePlayer {
  type ReplayData<K> = [number, K][];
  
  // KeyMap
  class KeyMap {
    static normalize(seq: string): string;
    static identify(e: KeyboardEvent | React.KeyboardEvent<unknown>): string;
    bind(seq: string, cb: (e: KeyboardEvent) => void): void;
    unbind(seq: string, cb: (e: KeyboardEvent) => void): void;
    getKeys(): string[];
    getHandlers(seq: string): ((e: KeyboardEvent) => void)[];
    handle(e: KeyboardEvent): void;
  }
  
  // IdMap
  class IdMap extends React.PureComponent<{map?: object}, {}> {
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
  
  /** RP equivalent of <audio>. */
  class Audio extends Media {
    /** The underlying <audio> element. */
    domElement: HTMLAudioElement;
  }

  const Controls: {
    FullScreen: () => JSX.Element;
    PlayPause: () => JSX.Element;
    Settings: () => JSX.Element;
    TimeDisplay: () => JSX.Element;
    Volume: () => JSX.Element;
  };
  
  /** RP equivalent of <video>. */
  class Video extends Media {
    /** The underlying <video> element. */
    domElement: HTMLVideoElement;
  }
  
  // Playback
  interface PlaybackOptions {
    duration: number;
  }

  class Playback
    extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, {
      "bufferupdate": void;
      "cuechange": void;
      "pause": void;
      "play": void;
      "seek": number;
      "seeked": void;
      "seeking": void;
      "stop": void;
      "ratechange": void;
      "timeupdate": number;
      "volumechange": void;
  }>) {
    audioContext: AudioContext;
    audioNode: GainNode;

    /**
      The current playback time in milliseconds.
      Warning: the HTMLMediaElement interface measures this property in seconds.
    */
    currentTime: number;

    /**
      The length of the playback in milliseconds.
      Warning: the HTMLMediaElement interface measures this property in seconds.
    */
    duration: number;
    muted: boolean;
    paused: boolean;
    playbackRate: number;
    playingFrom: number;
    seeking: boolean;
    volume: number;

    constructor(options: PlaybackOptions);
    
    /** Pause playback. */
    pause(): void;

    /** Resume playback. */
    play(): void;

    /** Seek playback to a specific time. */
    seek(t: number | string): void;
  }
  
  class Script
    extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, {
    "markerupdate": number;
  }>) {
    loadTasks: Promise<unknown>[];
    markerIndex: number;
    markerName: string;
    markers: [string, number, number][];
    playback: Playback;

    constructor(markers: Array<[string, string | number] | [string, string | number, string | number]>);
    back(): void;
    forward(): void;
    markerByName(name: string): [string, number, number];
    markerNumberOf(name: string): number;
    parseStart(start: number | string): number;
    parseEnd(end: number | string): number;
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

  interface PlayerProps {
    controls?: JSX.Element;
    script: Script;
    thumbs?: ThumbData;
  }
  
  class Player extends React.PureComponent<PlayerProps, {}> {
    static readonly Context: React.Context<Player>;

    static readonly defaultControlsLeft: JSX.Element;
    static readonly defaultControlsRight: JSX.Element;

    canPlay: Promise<void[]>;
    canPlayThrough: Promise<void[]>;
    canvas: HTMLDivElement;
    captureKeys: boolean;
    hub: StrictEventEmitter<EventEmitter, {
      "canplay": void;
      "canplaythrough": void;
      "canvasClick": void;
    }>;
    keymap: KeyMap;
    playback: Playback;
    script: Script;
    
    /** Prevents intercepting of scroll on mobile. */
    static allowScroll(e: React.TouchEvent | TouchEvent): void;

    /** Prevents a click from pausing/playing the video. */
    static preventCanvasClick(e: React.MouseEvent | MouseEvent): void;

    /** Suspends keyboard controls so that components can receive keyboard input. */
    suspendKeyCapture(): void;

    /** Resumes keyboard controls. */
    resumeKeyCapture(): void;

    obstruct(event: "canplay" | "canplaythrough", task: Promise<unknown>): void;

    /** Call this method when the ractive is ready to begin playing. */
    ready(): void;
  }
  
  interface ReplayArgs<K> {
    data: ReplayData<K>;
    start?: number;
    end?: number;
    compressed?: boolean;
    active: (current: K, index: number) => void;
    inactive: () => void;
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
      
      replay<K>({data, start, end, active, inactive, compressed}: ReplayArgs<K>): (t: number) => void;
    }
    
    authoring: {
      /** Returns a CSS block to show the element only when marker name begins with `prefix` */
      during: (prefix: string) => {"data-during": string;};

      /** Returns a CSS block to show the element when marker is in [first, last) */
      from: (first: string, last?: string) => {"data-from-first": string; "data-from-last"?: string;};

      
      showIf(cond: boolean): {
        style?: React.CSSProperties;
      };
    }
    
    interactivity: {
      dragHelper<T extends Node, E extends MouseEvent | React.MouseEvent<T> | TouchEvent | React.TouchEvent<T>>(
        move: (e: MouseEvent | TouchEvent, o: {x: number; y: number; dx: number; dy: number}) => void,
        down?: (
          e: E,
          o: {x: number; y: number},
          upHandler: (e: MouseEvent | TouchEvent) => void,
          moveHandler: (e: MouseEvent | TouchEvent) => void
        ) => void,
        up?: (e: MouseEvent | TouchEvent) => void
      ): (e: E) => void;

      dragHelperReact<T extends Node>(
        move: (e: MouseEvent | TouchEvent, o: {x: number; y: number; dx: number; dy: number}) => void,
        down?: (
          e: React.MouseEvent<T> | React.TouchEvent<T>,
          o: {x: number; y: number},
          upHandler: (e: MouseEvent | TouchEvent) => void,
          moveHandler: (e: MouseEvent | TouchEvent) => void
        ) => void,
        up?: (e: MouseEvent | TouchEvent) => void,
        innerRef?: React.Ref<T>
      ): {
        onMouseDown: (e: React.MouseEvent<T>) => void;
        onMouseUp: (e: React.MouseEvent<T>) => void;
        ref: (_: T) => void;
      };
    }
    
    media: {
      awaitMediaCanPlay(media: HTMLMediaElement): Promise<Event>;
      awaitMediaCanPlayThrough(media: HTMLMediaElement): Promise<Event>;
    }
    
    /** Miscellaneous utilities to polyfill basic functions that don't exist in Javascript. */
    misc: {
      /** Equivalent to `(min <= val) && (val < max)`. */
      between(min: number, val: number, max: number): boolean;

      /** Bind methods on o. */
      bind<T extends {[P in K]: Function}, K extends keyof T>(o: T, methods: K[]): void;

      /** Equivalent to `Math.min(max, Math.max(min, val))` */
      constrain: (min: number, val: number, max: number) => number;    

      /** Returns [a, b). For backwards compatibility, returns [0, a) if passed a single argument. */
      range: (n: number) => number[];

      /** Returns a Promise that resolves in `time` milliseconds. */
      wait(time: number): Promise<void>;

      /** Returns a Promise that resolves once `callback` returns true. */
      waitFor(callback: () => boolean, interval?: number): Promise<void>;
    }

    mobile: {
      /** Whether any available input mechanism can hover over elements. This is used as a standin for desktop/mobile. */
      anyHover: boolean;

      /** Drop-in replacement for onClick handlers which works better on mobile. */
      onClick: <T extends Node>(
        callback: (e: React.MouseEvent<T, MouseEvent> | React.TouchEvent<T>) => void,
        innerRef?: React.Ref<T>
      ) => {
        onClick: (e: React.MouseEvent<T, MouseEvent> | React.TouchEvent<T>) => void;
      } | {
        ref: (_: T) => void;
      };

      /**
        Replacement for addEventListener("click") which works better on mobile.
        Returns a function to remove the event listener.
      */
      attachClickHandler(node: Node, callback: (e: MouseEvent| TouchEvent) => void): () => void;
    }
    
    react: {
      captureRef<T>(callback: (ref: T) => void, innerRef?: React.Ref<T>): (ref: T) => void;
      useForceUpdate(): React.DispatchWithoutAction;
      recursiveMap
        (children: React.ReactNode, fn: (child: React.ReactElement<any>) => React.ReactElement<any>)
        : React.ReactChild[];
    }

    replayData: {
      concat<T>(...args: [ReplayData<T>, number][]): ReplayData<T>;
      length<T>(data: ReplayData<T>): number;
    }
    
    time: {
      timeRegexp: RegExp;
      parseTime(str: string): number;
      formatTime(time: number): string;
      formatTimeMs(time: number): string;    
    }
  }

  function useMarkerUpdate(callback: (prevIndex: number) => void, deps?: React.DependencyList): void;
  function usePlayer(): Player;
  function useTimeUpdate(callback: (t: number) => void, deps?: React.DependencyList): void;
}
