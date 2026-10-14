/** Shared subscription lifecycle for the parts, level and pronunciation indexes. */
export function createStaticIndex<T>(load: () => Promise<T | null>) {
  let index: T | null = null;
  let requested = false;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => index,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!requested) {
        requested = true;
        void load().then((loaded) => {
          if (!loaded) return;
          index = loaded;
          listeners.forEach((notify) => notify());
        });
      }
      return () => { listeners.delete(listener); };
    },
  };
}
