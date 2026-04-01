import type { EventEmitter } from "./index.mts";

export interface TypedEventTarget<Events> {
  addEventListener<K extends string & keyof Events>(
    eventName: K,
    callback: (event: Events[K]) => void,
  ): void;

  removeEventListener<K extends string & keyof Events>(
    eventName: K,
    callback: (event: Events[K]) => void,
  ): void;
}

export type EventsOn<T> = T extends EventEmitter<infer E> ? E : never;
