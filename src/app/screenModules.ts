import { preloadedModule } from '../utils/browser/preloadAssets';

// The study windows' screens are code-split. Loading them through these (not React.lazy) means a
// window renders on the frame it is ready: lazy always suspends once, which flashes the loader.

/** The grammar lesson screen and its first study page. */
export const grammarScreenModule = preloadedModule(() => import('../screens/grammar-lesson').then(async (module) => {
  await module.prepareGrammarLesson();
  return module;
}));

/** The reader screen and both reading views. */
export const readerScreenModule = preloadedModule(() => import('../screens/reader').then(async (module) => {
  await module.prepareReader();
  return module;
}));
