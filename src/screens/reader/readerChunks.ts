import { preloadedModule } from '../../utils/browser/preloadAssets';

// Code-split reading views, loaded before the reader shows so the text never pops in under its header.
export const readingCanvasModule = preloadedModule(() => import('./components/ReadingCanvas'));
export const readingNarrativeModule = preloadedModule(() => import('./components/ReadingNarrativeView'));

/** Resolves once both reading views can draw; the reader window keeps its loader up until then. */
export function prepareReader(): Promise<void> {
  return Promise.all([readingCanvasModule.load(), readingNarrativeModule.load()]).then(() => undefined, () => undefined);
}
