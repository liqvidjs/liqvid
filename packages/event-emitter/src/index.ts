import type { TypedEventTarget } from "./types.ts";

export type { EventsOn, TypedEventTarget } from "./types.ts";

export class EventEmitter<Events> implements TypedEventTarget<Events> {
  // @ts-expect-error this is type-only
  readonly __events: Events;

  private __subscribers: {
    [key in keyof Events]?: Set<(this: this, event: Events[key]) => unknown>;
  };

  constructor() {
    this.__subscribers = {};
  }

  protected emit<K extends string & keyof Events>(
    eventName: K,
    event: Events[K],
  ): void {
    const subscribers = this.__subscribers[eventName];
    if (!subscribers) return;

    for (const callback of subscribers) {
      callback.call(this, event);
    }
  }

  addEventListener<K extends string & keyof Events>(
    eventName: K,
    callback: (this: this, event: Events[K]) => unknown,
  ) {
    this.__subscribers[eventName] ??= new Set();
    this.__subscribers[eventName].add(callback);
  }

  removeEventListener<K extends string & keyof Events>(
    eventName: K,
    callback: (this: this, event: Events[K]) => unknown,
  ) {
    this.__subscribers[eventName]?.delete(callback);
  }

  getEventListeners<K extends keyof Events>(
    eventName: K,
  ): Set<(this: this, event: Events[K]) => unknown> {
    return this.__subscribers[eventName] ?? new Set();
  }

  protected clearEventListeners<K extends keyof Events>(eventName?: K): void {
    if (eventName) {
      this.__subscribers[eventName]?.clear();
    } else {
      this.__subscribers = {};
    }
  }
}
