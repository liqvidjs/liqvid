(async () => {
  const POLYFILL_URL = "https://cdnjs.cloudflare.com/ajax/libs/web-animations/2.3.2/web-animations-next.min.js";

  /** Polyfill the Web Animations API */
  if (typeof DocumentTimeline !== "undefined")
    return;

  document.write(`<script src="${POLYFILL_URL}"></script>`);
  
  const script = document.querySelector(`script[src="${POLYFILL_URL}"]`);

  await new Promise((resolve, reject) => {
    script.addEventListener("load", resolve);
  });

  // DocumentTimeline
  window.DocumentTimeline = function() {
    const self = Object.assign(Object.create(Object.getPrototypeOf(document.timeline)), document.timeline);
    self.currentTime = 0;
    return self;
  }
  // Animation.persist()
  Animation.prototype.persist = () => {};

  // add to document.timeline
  const pause = Animation.prototype.pause;
  Animation.prototype.pause = function() {
    pause.call(this);
    if (!document.timeline._animations.includes(this))
      document.timeline._animations.push(this);
  };

  // getAnimations()
  document.getAnimations = () => document.timeline._animations;

  // KeyframeEffect.getTiming()
  const timingProps = ["delay", "direction", "duration", "easing", "endDelay", "fill", "iterationStart", "iterations"];
  KeyframeEffect.prototype.getTiming = function() {
    const proxy = {};
    for (const prop of timingProps) {
      Object.defineProperty(proxy, prop, { get: () => { return this._timing["_" + prop]; } });
    }
    return proxy;
  };

  // KeyframeEffect.updateTiming()
  KeyframeEffect.prototype.updateTiming = function(o) {
    for (const prop of timingProps) {
      if (o.hasOwnProperty(prop)) {
        this._timing["_" + prop] = o[prop];
      }
    }
  };

  // Animation.startTime
  Object.defineProperty(Animation.prototype, "startTime", {
    set: function(v) {
      this.currentTime = -v;
    }
  });
})();
