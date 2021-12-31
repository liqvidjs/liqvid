const results: Record<string, unknown> = {};

export interface GetJSONMap {

}

/**
 * Preload all JSON resources.
 */
export function loadAllJSON() {
  return Promise.all(
    (Array.from(document.querySelectorAll("link[rel='preload'][type='application/json']")) as HTMLLinkElement[])
    .map(link =>
      fetch(link.href)
      .then(res => res.json())
      .then(json => results[link.dataset.name] = json)
    )
  ).then();
}

/**
 * Load a JSON record asynchronously.
 */
export function loadJSON<K extends keyof GetJSONMap>(key: K): Promise<GetJSONMap[K]> {
  return new Promise((resolve, reject) => {
    // check for cached result
    if (results[key]) {
      return resolve(results[key] as GetJSONMap[K]);
    }
    const link = document.querySelector(`link[data-name="${key}"][rel='preload'][type='application/json']`) as HTMLLinkElement;
    if (!link) {
      return reject(`JSON record "${key}" not found`);
    }
    return fetch(link.href).then(res => res.json()).then(data => {
      // cache result
      results[key] = data;
      resolve(data);
    }).catch(reject);
  });
}

/**
 * Access a preloaded JSON record synchronously.
 */
export function getJSON<K extends keyof GetJSONMap>(key: K) {
  if (!results[key]) {
    throw new Error(`JSON record "${key}" not loaded`);
  }
  return results[key] as GetJSONMap[K];
}
