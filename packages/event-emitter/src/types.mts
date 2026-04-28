export interface TypedEventTarget<Events> {
  readonly __events: Events;

  addEventListener<K extends string & keyof Events>(
    eventName: K,
    callback: (event: Events[K]) => void,
  ): void;

  removeEventListener<K extends string & keyof Events>(
    eventName: K,
    callback: (event: Events[K]) => void,
  ): void;
}

export type EventsOn<T> = T extends TypedEventTarget<infer E> ? E : never;
