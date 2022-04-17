export class Pool<T> {
  private instances: T[];
  private queue: ((free: T) => void)[];

  constructor(instances: T[]) {
    this.instances = instances;
    this.queue = [];
  }

  acquire() {
    const instance = this.instances.shift();
    if (undefined !== instance) {
      return Promise.resolve(instance);
    }
    return new Promise<T>((resolve) => {
      this.queue.push((free: T) => resolve(free));
    });
  }

  release(instance: T) {
    const next = this.queue.shift();
    if (undefined === next) {
      this.instances.push(instance);
    } else {
      next(instance);
    }
  }
}
