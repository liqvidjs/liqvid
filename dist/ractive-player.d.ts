import {EventEmitter} from "events";
import * as React from "react";

export = RactivePlayer;
export as namespace RactivePlayer;

declare namespace RactivePlayer {
  type ReplayData<K> = [number, K][];

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
    markerIndex: number;
    markerName: string;
    markers: [string, number, number][];

    constructor(markers: Array<[string, string | number] | [string, string | number, string | number]>);
    markerByName(name: string): [string, number, number];
    markerNumberOf(name: string): number;
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

    static Context: React.Context<Player>;

    $controls: any;
    canvas: HTMLDivElement;
    hub: EventEmitter;
    playback: Playback;
    script: Script;

    static preventCanvasClick(e: React.SyntheticEvent): void;
    suspendKeyCapture(): void;
    resumeKeyCapture(): void;
    obstruct(event: "canplay" | "canplaythrough", task: Promise<any>): void;

    /** Call this method when the ractive is ready to begin playing. */
    ready(): void;
  }
  
  interface StyleBlock {
    style?: React.CSSProperties;
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
        easeInSine:     [number, number, number, number];
        easeOutSine:    [number, number, number, number];
        easeInOutSine:  [number, number, number, number];
        easeInQuad:     [number, number, number, number];
        easeOutQuad:    [number, number, number, number];
        easeInOutQuad:  [number, number, number, number];
        easeInCubic:    [number, number, number, number];
        easeOutCubic:   [number, number, number, number];
        easeInOutCubic: [number, number, number, number];
        easeInQuart:    [number, number, number, number];
        easeOutQuart:   [number, number, number, number];
        easeInOutQuart: [number, number, number, number];
        easeInQuint:    [number, number, number, number];
        easeOutQuint:   [number, number, number, number];
        easeInOutQuint: [number, number, number, number];
        easeInExpo:     [number, number, number, number];
        easeOutExpo:    [number, number, number, number];
        easeInOutExpo:  [number, number, number, number];
        easeInCirc:     [number, number, number, number];
        easeOutCirc:    [number, number, number, number];
        easeInOutCirc:  [number, number, number, number];
        easeInBack:     [number, number, number, number];
        easeOutBack:    [number, number, number, number];
        easeInOutBack:  [number, number, number, number];
      }
    }
    
    authoring: {
      during: (prefix: string) => {"data-during": string;};
      from: (first: string, last?: string) => {"data-from-first": string; "data-from-last"?: string;};
      showIf(cond: boolean): StyleBlock;
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

      dragHelperReact<T>(
        move: (e: MouseEvent | TouchEvent, o: {x: number; y: number; dx: number; dy: number}) => void,
        down?: (
          e: React.MouseEvent<T> | React.TouchEvent<T>,
          o: {x: number; y: number},
          upHandler: (e: MouseEvent | TouchEvent) => void,
          moveHandler: (e: MouseEvent | TouchEvent) => void
        ) => void,
        up?: (e: MouseEvent | TouchEvent) => void
      ): {
        onMouseDown: (e: React.MouseEvent<T>) => void;
        onMouseUp: (e: React.MouseEvent<T>) => void;
        onTouchStart: (e: React.TouchEvent<T>) => void;
      };
    }
    
    media: {
      awaitMedia(media: HTMLMediaElement): Promise<Event>;
      awaitMediaCanPlay(media: HTMLMediaElement): Promise<Event>;
      awaitMediaCanPlayThrough(media: HTMLMediaElement): Promise<Event>;
    }
    
    misc: {
      between(min: number, val: number, max: number): boolean;
      bind<T extends {[P in K]: Function}, K extends keyof T>(o: T, methods: K[]): void;
      constrain: (min: number, val: number, max: number) => number;    
      range: (n: number) => number[];

      wait(time: number): Promise<void>;
      waitFor(callback: () => boolean, interval?: number): Promise<void>;
    }

    mobile: {
      /** Whether any available input mechanism can hover over elements. This is used as a standin for desktop/mobile. */
      anyHover: boolean;

      /** Drop-in replacement for onClick handlers which works better on mobile. */
      onClick: <T extends Node>(callback: (e: React.MouseEvent<T, MouseEvent> | React.TouchEvent<T>) => void) => {
          onClick: (e: React.MouseEvent<T, MouseEvent> | React.TouchEvent<T>) => void;
      } | {
          onTouchStart: (e: React.TouchEvent<T>) => void;
          onTouchEnd: (e: React.TouchEvent<T>) => void;
      };
    }
    
    react: {
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
