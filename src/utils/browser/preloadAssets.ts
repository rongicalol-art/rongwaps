/**
 * Ready-before-open helpers: a screen opens only once its code and pictures are in memory,
 * so nothing pops in after it appears.
 */

const decoded = new Map<string, Promise<void>>();

/** Downloads and decodes images; resolves when all are ready (a failed image never blocks). */
export function preloadImages(urls: readonly (string | null | undefined)[]): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return Promise.all([...new Set(urls)].flatMap((url) => {
    if (!url) return [];
    let ready = decoded.get(url);
    if (!ready) {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      ready = image.decode().catch(() => { decoded.delete(url); });
      decoded.set(url, ready);
    }
    return [ready];
  })).then(() => undefined);
}

export interface PreloadedModule<T> {
  /** Starts (or joins) the download; resolves once `get` returns the module. */
  load: () => Promise<T>;
  /** The module if it has arrived, so it renders on the same frame (React.lazy always suspends once). */
  get: () => T | undefined;
}

/** A code-split module that can be fetched ahead and then rendered synchronously. */
export function preloadedModule<T>(importer: () => Promise<T>): PreloadedModule<T> {
  let value: T | undefined;
  let pending: Promise<T> | undefined;
  return {
    load: () => {
      pending ??= importer().then((module) => { value = module; return module; }).catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
      return pending;
    },
    get: () => value,
  };
}

/** Runs `task` when the browser is idle; returns a cancel function. */
export function whenIdle(task: () => void, timeout = 2000): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.requestIdleCallback && window.cancelIdleCallback) {
    const id = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 200);
  return () => window.clearTimeout(id);
}
