import { useEffect, useState } from 'react';
import { fetchLessonTestPacks } from '../services/contentPacks';
import type { LessonTestItem, LessonTestSounds } from '../types/lessonTest';
import { poolEntryIndex } from '../utils/mockTest/mockRun';
import { poolItemIndex, type PoolEntry } from '../utils/mockTest/pool';
import { lessonPoolEntries } from '../utils/mockTest/poolLabels';

/** The mock test's questions: every lesson test of every book, labelled, with each book's shared sounds. */
export interface MockTestPool {
  pool: PoolEntry[];
  items: Map<string, LessonTestItem>;
  entries: Map<string, PoolEntry>;
  /** The ding and the narrator's letters, by book. */
  sounds: Map<number, LessonTestSounds>;
}

export function useMockTestPool() {
  const [state, setState] = useState<{ attempt: number; data: MockTestPool | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    void fetchLessonTestPacks().then(
      (packs) => {
        if (!current) return;
        const pool = packs.flatMap((pack) => pack.items.flatMap(lessonPoolEntries));
        setState({ attempt, data: { pool, items: poolItemIndex(pool), entries: poolEntryIndex(pool), sounds: new Map(packs.map((pack) => [pack.bookId, pack.sounds])) }, error: false });
      },
      () => { if (current) setState({ attempt, data: null, error: true }); },
    );
    return () => { current = false; };
  }, [attempt]);

  const loaded = state?.attempt === attempt ? state : null;
  return {
    data: loaded?.data ?? null,
    isLoading: !loaded,
    error: loaded?.error ?? false,
    retry: () => setAttempt((value) => value + 1),
  };
}
