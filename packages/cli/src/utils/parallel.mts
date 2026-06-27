import cliProgress from "cli-progress";

export interface ParallelMapOptions {
  /** Maximum number of concurrent operations (default: 50) */
  concurrency?: number;

  /** Whether to show a progress bar (default: false) */
  progress?: boolean;

  /** Label for the progress bar */
  progressLabel?: string;
}

/**
 * Process items in parallel with a concurrency limit.
 *
 * @param items - Array of items to process
 * @param fn - Async function to apply to each item
 * @param options - Options for concurrency and progress display
 * @returns Array of results in the same order as inputs
 */
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: ParallelMapOptions | number = {},
): Promise<R[]> {
  // Support legacy number argument for concurrency
  const opts: ParallelMapOptions =
    typeof options === "number" ? { concurrency: options } : options;

  const {
    concurrency = 50,
    progress = false,
    progressLabel = "Progress",
  } = opts;

  const results: R[] = new Array(items.length);
  let index = 0;
  let completed = 0;

  // Set up progress bar if enabled
  let progressBar: cliProgress.SingleBar | null = null;
  if (progress && items.length > 0) {
    progressBar = new cliProgress.SingleBar(
      {
        format: `${progressLabel} |{bar}| {percentage}% | {value}/{total}`,
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic,
    );
    progressBar.start(items.length, 0);
  }

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]!);
      completed++;
      progressBar?.update(completed);
    }
  }

  // Start workers up to concurrency limit or item count, whichever is smaller
  const workerCount = Math.min(concurrency, items.length);
  const workers: Promise<void>[] = [];

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  progressBar?.stop();

  return results;
}
