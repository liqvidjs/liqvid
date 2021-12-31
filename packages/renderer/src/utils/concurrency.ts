import os from "os";

/**
Restrict concurrency to allowable values and avoid warnings.
*/
export function validateConcurrency(concurrency: number) {
  // constrain
  concurrency = Math.max(1, Math.min(os.cpus().length, concurrency));

  // force integer values
  concurrency = Math.floor(concurrency);

  // avoid EventEmitter warnings
  if (concurrency > 10) {
    process.setMaxListeners(0);
  }

  return concurrency;
}