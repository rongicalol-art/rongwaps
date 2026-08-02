import { useEffect, useMemo, useState } from 'react';
import {
  BEGINNER_DICTIONARY_TERMS,
  FEATURED_DICTIONARY_TERMS,
} from '../../../data/dictionaryHome';
import { getDictionaryEntriesBatch } from '../../../services/dictionaryService';
import type { DictionarySavedPreview } from '../../../types/models';

const fallbackTerms = [...BEGINNER_DICTIONARY_TERMS, ...FEATURED_DICTIONARY_TERMS];

function buildFallbackPreview(word: string): DictionarySavedPreview {
  const fallback = fallbackTerms.find((term) => term.traditional === word);
  return {
    word,
    traditional: word,
    pinyin: fallback?.pinyin || '',
    meaning: fallback?.meaning || '',
  };
}

export function useSavedDictionaryPreview(favorites: string[]) {
  const recentFavorites = useMemo(() => [...favorites].reverse().slice(0, 6), [favorites]);
  const [items, setItems] = useState<DictionarySavedPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (recentFavorites.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setItems(recentFavorites.map(buildFallbackPreview));
    setIsLoading(true);

    getDictionaryEntriesBatch(recentFavorites)
      .then((entries) => {
        if (cancelled) return;

        setItems(recentFavorites.map((word) => {
          const entry = entries.get(word);
          const fallback = buildFallbackPreview(word);
          const meaning = entry?.definitions
            ? Object.values(entry.definitions).find(Boolean) || ''
            : '';

          return {
            word,
            traditional: entry?.traditional || fallback.traditional,
            pinyin: entry?.pinyin?.[0] || fallback.pinyin,
            meaning: meaning || fallback.meaning,
          };
        }));
      })
      .catch((error) => {
        console.error('Could not load saved dictionary previews:', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recentFavorites]);

  return { items, isLoading };
}
