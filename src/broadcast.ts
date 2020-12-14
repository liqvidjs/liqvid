import {EventEmitter} from "events";
import type StrictEventEmitter from "strict-event-emitter-types";
import type {ReplayData} from "./utils/replay-data";

interface Options {
  id: string;
  headers?: {
    [key: string]: string;
  };
  url: string;
}

interface Update {
  duration: number;
  [key: string]: unknown[];
}

export default class Broadcast {
  headers: {
    [key: string]: string;
  };
  hub: EventEmitter;
  id: string;
  url: string;
  lastIndex: {
    [key: string]: number;
  };

  constructor(opts: Options) {
    this.url = opts.url;
    this.headers = opts.headers ?? {};
    this.lastIndex = {};
    this.id = opts.id;

    this.hub = new EventEmitter();

    // hub will have lots of listeners, turn off warning
    this.hub.setMaxListeners(0);
  }

  async initialize() {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({
        action: "connect",
        id: this.id,
        timestamp: Date.now()
      })
    }).then(_ => _.json());

    if (res.id) {
      this.id = res.id;
    }
  }

  async poll(duration: number) {
    const qs = `${this.url}?` + new URLSearchParams({
      duration: duration.toString()
    }).toString();

    const res = await fetch(qs, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...this.headers
      }
    }).then(_ => _.json());

    for (const key in res) {
      this.hub.emit(key, res[key]);
    }
    
    return res.duration;
  }

  async finalize(key: string) {
    if (typeof this.id === "undefined")
      return;

    await fetch(this.url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({
        action: "finalize",
        id: this.id,
        key,
        timestamp: Date.now()
      })
    }).then(_ => _.json());
  }

  async push(duration: number, data: Update) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({
        action: "push",
        duration,
        id: this.id,
        data
      })
    }).then(_ => _.json());

    return res.duration;
  }

  /**
    Begin broadcast.
  */
  async start() {
    await fetch(this.url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({
        action: "start",
        id: this.id
      })
    }).then(_ => _.json());
  }
}
