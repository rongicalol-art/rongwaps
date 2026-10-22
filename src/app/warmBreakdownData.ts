/**
 * Once signed in and idle, load the small shared files every breakdown needs (parts,
 * levels, readings, course ranks, the one-file decomposition bundle) so the first
 * breakdown opens instantly. Skipped on Data Saver; failures are silent.
 */
export function warmBreakdownData(): void {
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData || document.hidden) return;
  void import('../services/contentPacks').then((packs) => Promise.allSettled([
    packs.fetchCourseCharRanks(), packs.fetchPartsIndex(), packs.fetchLevelIndex(), packs.fetchPronunciationIndex(),
  ]));
  void import('../features/character-decomposition').then(({ getDecompositionRuntimeService }) => {
    const runtime = getDecompositionRuntimeService();
    if (runtime.runtime === 'v3') void runtime.prefetch(['的']);
  }).catch(() => {});
}
