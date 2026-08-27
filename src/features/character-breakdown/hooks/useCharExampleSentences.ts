import { useEffect, useState } from 'react';
import { fetchExamples as fetchExampleSentences, type WordExample } from '../../dictionary/hooks/useWordExtras';
import { rankExampleSentences } from '../utils/rankExampleSentences';

/** Deep pool for the breakdown example-sentence block so a Show more toggle has
 * something to reveal beyond the initial rows. */
const EXAMPLE_POOL_LIMIT = 10;

/** Course example sentences containing the given single character, for the
 * breakdown example-sentence block. Reuses the shared dictionary example
 * fetcher and ranks the pool by character usefulness. */
export function useCharExampleSentences(character: string): { sentences: WordExample[]; isLoading: boolean } {
  const [sentences, setSentences] = useState<WordExample[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setSentences([]);
    if (!character) {
      setIsLoading(false);
      return undefined;
    }
    fetchExampleSentences(character, EXAMPLE_POOL_LIMIT)
      .then((result) => {
        if (!active) return;
        setSentences(rankExampleSentences(result, character));
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSentences([]);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [character]);

  return { sentences, isLoading };
}
