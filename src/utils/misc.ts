// bind functions
export function bind<T extends {[P in K]: Function}, K extends keyof T>(o: T, methods: K[]) {
  for (const method of methods)
    o[method] = (o[method] as Function).bind(o);
}

// wait
export function wait(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

// await some condition to be true
export function waitFor(callback: () => boolean, interval: number = 10): Promise<void> {
  return new Promise((resolve) => {
    const checkCondition = () => {
      if (callback()) {
        resolve();
      } else {
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
}

// range of numbers
export function range(n: number) {
  return new Array(n).fill(null).map((_, i) => i);
};

// force number between two vals
export function constrain(min: number, val: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function between(min: number, val: number, max: number) {
  return (min <= val) && (val < max);
}
