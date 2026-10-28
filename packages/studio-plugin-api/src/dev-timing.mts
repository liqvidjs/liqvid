const STORAGE_KEY = "liqvid.devTiming.enabled";
const isDevBuild =
  (import.meta as ImportMeta & { env: { DEV?: boolean } }).env.DEV === true;

let enabled = readInitialEnabled();
const listeners = new Set<() => void>();

/** Whether development timing instrumentation is enabled in this browser. */
export function isDevTimingEnabled(): boolean {
  return isDevBuild && enabled;
}

/** Enable or disable development timing instrumentation and persist the choice. */
export function setDevTimingEnabled(value: boolean): void {
  if (!isDevBuild) {
    return;
  }

  enabled = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Storage can be unavailable in private browsing or restricted contexts.
    }
  }

  for (const listener of [...listeners]) {
    listener();
  }
}

/** Subscribe to changes in the development timing toggle. */
export function subscribeDevTiming(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Start a timer only when timing instrumentation is enabled. */
export function startDevTiming(): number | undefined {
  if (!isDevTimingEnabled() || typeof performance === "undefined") {
    return;
  }
  return performance.now();
}

/** Log the elapsed time for a task that started while timing was enabled. */
export function endDevTiming(
  label: string,
  startedAt: number | undefined,
  details?: Record<string, unknown>,
): void {
  if (startedAt === undefined) {
    return;
  }

  const elapsed = performance.now() - startedAt;
  console.info(`[Liqvid timing] ${label}: ${elapsed.toFixed(1)} ms`, details);
}

function readInitialEnabled(): boolean {
  if (!isDevBuild || typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
