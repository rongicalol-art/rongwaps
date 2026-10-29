const RELOAD_KEY = 'rongwaps-stale-build-reload';

/** One automatic recovery per 30 s, so a broken deploy shows the error screen instead of looping. */
function claimReload(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOAD_KEY)) < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* storage blocked: still recover */ }
  return true;
}

function untilInstalled(worker: ServiceWorker | null | undefined): Promise<void> {
  if (!worker || worker.state !== 'installing') return Promise.resolve();
  return new Promise((resolve) => {
    worker.addEventListener('statechange', () => { if (worker.state !== 'installing') resolve(); });
    setTimeout(resolve, 5000);
  });
}

/** Swap to the newest deployed version (activating a waiting service worker first), then reload. */
async function reloadToLatest(): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  await reg?.update().catch(() => {});
  await untilInstalled(reg?.installing);
  const waiting = reg?.waiting;
  if (!waiting) { window.location.reload(); return; }
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
  setTimeout(() => window.location.reload(), 3000);
}

/**
 * A deploy deletes the previous build's code files, so an open tab that opens a
 * not-yet-loaded screen gets a missing file. Vite reports it as `vite:preloadError`.
 */
export function startStaleBuildRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (!claimReload()) return;
    event.preventDefault();
    void reloadToLatest();
  });
}
