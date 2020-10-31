import {constrain} from "./misc";
import {ReplayData} from "./replay-data";

// animation
export function animate(options: {
  startValue?: number;
  endValue?: number;
  startTime: number;
  duration: number;
  easing?: (x: number) => number;
}) {
  if (!("startValue" in options)) options.startValue = 0;
  if (!("endValue" in options)) options.endValue = 1;
  if (!("easing" in options)) options.easing = (x: number) => x;
  const {startValue, endValue, startTime, duration, easing} = options;
  return (t: number) => startValue + easing(constrain(0, (t - startTime) / duration, 1)) * (endValue - startValue);
}

interface ReplayArgs<K> {
  data: ReplayData<K>;
  start?: number;
  end?: number;
  compressed?: boolean;
  active: (current: K, index: number) => void;
  inactive: () => void;
}

export function replay<K>({data, start, end, active, inactive, compressed}: ReplayArgs<K>): (t: number) => void {
  if (typeof compressed === "undefined") compressed = false;

  const times = data.map(d => d[0]);
  if (compressed) {
    for (let i = 1; i < times.length; ++i) {
      times[i] += times[i-1];
    }
  }

  if (typeof start === "undefined") start = 0;
  if (typeof end === "undefined") end = start + times[times.length - 1];

  let lastTime = 0,
      i = 0,
      isActive = true;

  function listener(t: number) {
    // don't call inactive() repeatedly
    if (t < start || t >= end) {
      if (isActive) {
        isActive = false;
        return inactive();
      }
      return;
    }
    isActive = true;

    if (t < lastTime) i = 0;
    lastTime = t;

    let maxI = Math.min(i, times.length - 1);

    for (; i < times.length; i++) {
      if (start + times[i] < t) maxI = i;
      else break;
    }
    
    const [, current] = data[maxI];

    active(current, maxI);
  }
  
  return listener;
}
