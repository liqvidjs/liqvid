/** Pending debounced calls to generateProjectTypes, keyed by assetsDir */
const pendingCalls = new Map<string, NodeJS.Timeout>();

/**
 * Debounce function calls, grouped by a key.
 */
export function debounce(callback: () => void, key: string, debounceMs = 100) {
  const pendingTimeout = pendingCalls.get(key);
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
  }

  pendingCalls.set(
    key,
    setTimeout(() => {
      pendingCalls.delete(key);
      callback();
    }, debounceMs),
  );
}
