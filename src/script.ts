import * as EventEmitter from "events";
import {bind} from "./utils/misc";
import {parseTime} from "./utils/time";

import Playback from "./playback";

type SlideType = [string, number, number];

export default class Script {
  hub: EventEmitter;
  playback: Playback;
  slides: SlideType[];
  slideIndex: number;
  loadTasks: Promise<any>[];

  constructor(slides: Array<[string, string | number] | [string, string | number, string | number]>) {
    this.hub = new EventEmitter();
    this.hub.setMaxListeners(0);

    // bind methods
    bind(this, ["slideByName", "slideNumberOf"]);

    // parse times
    let time = 0;
    for (const slide of slides) {
      if (slide.length === 2) {
        const [, duration] = <[string, string]>slide;
        slide[1] = time;
        slide[2] = time + parseTime(duration);
      } else {
        const [, begin, end] = <[string, string, string]>slide;
        slide[1] = parseTime(begin);
        slide[2] = parseTime(end);
      }

      time = <number>(slide[2]);
    }
    this.slides = <SlideType[]>slides;

    this.slideIndex = 0;

    this.__updateSlide = this.__updateSlide.bind(this);

    this.loadTasks = [];

    // create playback object
    this.playback = new Playback({
      duration: this.slides[this.slides.length - 1][2]
    });

    this.playback.hub.on("seek", this.__updateSlide);
    this.playback.hub.on("timeupdate", this.__updateSlide);
  }

  // getter
  get slideName() : string {
    return this.slides[this.slideIndex][0];
  }

  // public methods
  back() {
    this.playback.seek(this.slides[Math.max(0, this.slideIndex - 1)][1]);
  }

  forward() {
    this.playback.seek(this.slides[Math.min(this.slides.length - 1, this.slideIndex + 1)][1]);
  }
  
  slideByName(name: string) {
    return this.slides[this.slideNumberOf(name)];
  }

  slideNumberOf(name: string) {
    for (let i = 0; i < this.slides.length; ++i) {
      if (this.slides[i][0] === name) return i;
    }
    throw new Error(`Slide ${name} does not exist`);
  }

  // update slide
  __updateSlide(t: number) {
    let newSlideIndex;
    for (let i = 0; i < this.slides.length; ++i) {
      const [, begin, end] = this.slides[i];
      if (begin <= t && t < end) {
        newSlideIndex = i;
        break;
      }
    }

    if (newSlideIndex === undefined)
      newSlideIndex = this.slides.length - 1;

    const prevSlideIndex = this.slideIndex;

    if (newSlideIndex !== prevSlideIndex) {
      this.slideIndex = newSlideIndex;
      this.hub.emit("slideupdate", prevSlideIndex);
    }
  }
}
