import { EventEmitter } from "@liqvid/event-emitter";

/**
 * A synthetic implementation of TextTrack that mimics the browser's TextTrack API.
 * Used with SyntheticPlayback to support captions without a real media element.
 */

export type TextTrackMode = "disabled" | "hidden" | "showing";
export type TextTrackKind =
  | "captions"
  | "chapters"
  | "descriptions"
  | "metadata"
  | "subtitles";

export interface TextTrackCueEventMap {
  enter: Event;
  exit: Event;
}

export interface TextTrackEventMap {
  cuechange: Event;
}

export interface TextTrackListEventMap {
  addtrack: { track: SyntheticTextTrack };
  change: Event;
  removetrack: { track: SyntheticTextTrack };
}

/**
 * A synthetic implementation of VTTCue.
 */
export class SyntheticVTTCue extends EventEmitter<TextTrackCueEventMap> {
  /** The cue identifier */
  id: string;

  /** Start time in seconds */
  startTime: number;

  /** End time in seconds */
  endTime: number;

  /** The cue text content */
  text: string;

  /** Whether the cue is currently active */
  private __active = false;

  /** The track this cue belongs to */
  track: SyntheticTextTrack | null = null;

  constructor(startTime: number, endTime: number, text: string) {
    super();
    this.id = "";
    this.startTime = startTime;
    this.endTime = endTime;
    this.text = text;
  }

  /** Check if the cue is active at the given time */
  isActive(time: number): boolean {
    return time >= this.startTime && time < this.endTime;
  }

  /** Internal method to set active state and emit events */
  __setActive(active: boolean): void {
    if (active === this.__active) return;
    this.__active = active;

    if (active) {
      this.emit("enter", new Event("enter"));
    } else {
      this.emit("exit", new Event("exit"));
    }
  }

  get active(): boolean {
    return this.__active;
  }
}

/**
 * A list of VTTCues, implementing array-like behavior.
 */
export class SyntheticTextTrackCueList {
  private __cues: SyntheticVTTCue[] = [];

  get length(): number {
    return this.__cues.length;
  }

  /**
   * Get cue by index
   */
  [index: number]: SyntheticVTTCue | undefined;

  getCueById(id: string): SyntheticVTTCue | null {
    return this.__cues.find((cue) => cue.id === id) ?? null;
  }

  /** Internal method to add a cue */
  __add(cue: SyntheticVTTCue): void {
    this.__cues.push(cue);
    // Sort by start time
    this.__cues.sort((a, b) => a.startTime - b.startTime);
    this.__updateIndices();
  }

  /** Internal method to remove a cue */
  __remove(cue: SyntheticVTTCue): void {
    const index = this.__cues.indexOf(cue);
    if (index !== -1) {
      this.__cues.splice(index, 1);
      this.__updateIndices();
    }
  }

  /** Update numeric indices to match array positions */
  private __updateIndices(): void {
    // Clear old indices
    for (let i = 0; i < this.length + 10; i++) {
      delete (this as Record<number, unknown>)[i];
    }
    // Set new indices
    for (let i = 0; i < this.__cues.length; i++) {
      (this as Record<number, SyntheticVTTCue>)[i] = this.__cues[i]!;
    }
  }

  /** Get all cues as an array (for iteration) */
  __toArray(): SyntheticVTTCue[] {
    return [...this.__cues];
  }

  /** Make it iterable */
  [Symbol.iterator](): Iterator<SyntheticVTTCue> {
    return this.__cues[Symbol.iterator]();
  }
}

/**
 * A synthetic implementation of TextTrack.
 */
export class SyntheticTextTrack extends EventEmitter<TextTrackEventMap> {
  /** The kind of track */
  readonly kind: TextTrackKind;

  /** The label for the track */
  readonly label: string;

  /** The language of the track */
  readonly language: string;

  /** The unique identifier for the track */
  readonly id: string;

  /** The list of cues */
  readonly cues: SyntheticTextTrackCueList;

  /** The list of active cues */
  readonly activeCues: SyntheticTextTrackCueList;

  /** The track mode */
  #mode: TextTrackMode = "disabled";

  /** Reference to parent list for emitting change events */
  #list: SyntheticTextTrackList | null = null;

  constructor(
    kind: TextTrackKind = "subtitles",
    label = "",
    language = "",
    id = "",
  ) {
    super();
    this.kind = kind;
    this.label = label;
    this.language = language;
    this.id = id || `track-${Math.random().toString(36).slice(2, 9)}`;
    this.cues = new SyntheticTextTrackCueList();
    this.activeCues = new SyntheticTextTrackCueList();
  }

  get mode(): TextTrackMode {
    return this.#mode;
  }

  set mode(value: TextTrackMode) {
    if (value === this.#mode) return;
    this.#mode = value;
    this.#list?.__emitChange();
  }

  /**
   * Add a cue to the track
   */
  addCue(cue: SyntheticVTTCue): void {
    cue.track = this;
    this.cues.__add(cue);
  }

  /**
   * Remove a cue from the track
   */
  removeCue(cue: SyntheticVTTCue): void {
    cue.track = null;
    this.cues.__remove(cue);
    this.activeCues.__remove(cue);
  }

  /**
   * Internal: Set the parent list reference
   */
  __setList(list: SyntheticTextTrackList | null): void {
    this.#list = list;
  }

  /**
   * Internal: Update active cues based on current time
   * @returns true if activeCues changed
   */
  __updateActiveCues(currentTime: number): boolean {
    let changed = false;

    for (const cue of this.cues) {
      const wasActive = cue.active;
      const isActive = cue.isActive(currentTime);

      if (isActive !== wasActive) {
        cue.__setActive(isActive);
        changed = true;

        if (isActive) {
          this.activeCues.__add(cue);
        } else {
          this.activeCues.__remove(cue);
        }
      }
    }

    if (changed) {
      this.emit("cuechange", new Event("cuechange"));
    }

    return changed;
  }
}

/**
 * A list of TextTracks, implementing array-like behavior.
 */
export class SyntheticTextTrackList extends EventEmitter<TextTrackListEventMap> {
  private __tracks: SyntheticTextTrack[] = [];

  get length(): number {
    return this.__tracks.length;
  }

  /**
   * Get track by index
   */
  [index: number]: SyntheticTextTrack | undefined;

  getTrackById(id: string): SyntheticTextTrack | null {
    return this.__tracks.find((track) => track.id === id) ?? null;
  }

  /**
   * Internal method to add a track
   */
  __add(track: SyntheticTextTrack): void {
    track.__setList(this);
    this.__tracks.push(track);
    this.__updateIndices();
    this.emit("addtrack", { track });
  }

  /**
   * Internal method to remove a track
   */
  __remove(track: SyntheticTextTrack): void {
    const index = this.__tracks.indexOf(track);
    if (index !== -1) {
      track.__setList(null);
      this.__tracks.splice(index, 1);
      this.__updateIndices();
      this.emit("removetrack", { track });
    }
  }

  /**
   * Internal method to emit change event
   */
  __emitChange(): void {
    this.emit("change", new Event("change"));
  }

  /** Update numeric indices to match array positions */
  private __updateIndices(): void {
    // Clear old indices
    for (let i = 0; i < this.length + 10; i++) {
      delete (this as Record<number, unknown>)[i];
    }
    // Set new indices
    for (let i = 0; i < this.__tracks.length; i++) {
      (this as Record<number, SyntheticTextTrack>)[i] = this.__tracks[i]!;
    }
  }

  /** Get all tracks as an array (for iteration) */
  __toArray(): SyntheticTextTrack[] {
    return [...this.__tracks];
  }

  /** Make it iterable */
  [Symbol.iterator](): Iterator<SyntheticTextTrack> {
    return this.__tracks[Symbol.iterator]();
  }
}
