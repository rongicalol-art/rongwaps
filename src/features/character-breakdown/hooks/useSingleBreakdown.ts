import { useState, useEffect, useMemo } from 'react';
import { useCharBreakdown } from '../../../hooks/useCharBreakdown';
import { getCharactersUsingComponent, getMultipleBreakdowns } from '../../../services/breakdownService';
import { searchVocabulary, fetchVocabulary } from '../../../services/vocabularyService';
import type { Flashcard } from '../../../data/flashcards';
import { getDecompositionRuntimeService } from '../../character-decomposition/decompositionService';
import { rankParentCharacters, partitionRankedParents, type UsedAsGroups } from '../utils/rankParentCharacters';
import { searchDictionaryWordsContaining, type DictionaryContainingWord } from '../../../services/dictionaryService';
import { mergeBreakdownWords } from '../utils/mergeBreakdownWords';

const HANZI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u;
const NON_CHAR_RE = /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻\s！？?]/;

export function useSingleBreakdown(word: string, initialCharIndex: number, activeBook: { id: number }) {
  const [breakdownCharIndex, setBreakdownCharIndex] = useState(initialCharIndex);

  useEffect(() => {
    setBreakdownCharIndex(initialCharIndex);
  }, [initialCharIndex, word]);

  const chars = useMemo(
    () => Array.from(word || "").filter((c) => HANZI_RE.test(c)),
    [word],
  );
  
  const activeChar = chars[breakdownCharIndex] || chars[0];
  const charData = useCharBreakdown(activeChar);
  const decompositionRuntime = useMemo(() => getDecompositionRuntimeService(), []);

  const [usedAsComponents, setUsedAsComponents] = useState<string[]>([]);
  const [allWords, setAllWords] = useState<Flashcard[]>([]);
  const [dictionaryWords, setDictionaryWords] = useState<DictionaryContainingWord[]>([]);
  const [isUsedAsLoading, setIsUsedAsLoading] = useState(false);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);

  // Real course catalog (all books, cached) for ranking parent characters.
  // Dictionary-sourced entries are excluded so they never outrank course books.
  const [courseVocab, setCourseVocab] = useState<Flashcard[]>([]);
  useEffect(() => {
    let active = true;
    fetchVocabulary()
      .then((cards) => {
        if (active) setCourseVocab(cards.filter((card) => card.source !== 'dictionary'));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Active book first, then later books by number; non-course characters last.
  const usedAsGroups = useMemo<UsedAsGroups>(() => {
    if (usedAsComponents.length === 0 || courseVocab.length === 0) {
      return { courseParents: [], otherParents: usedAsComponents };
    }
    const ranked = rankParentCharacters(usedAsComponents, courseVocab, activeBook.id);
    return partitionRankedParents(ranked, courseVocab);
  }, [usedAsComponents, courseVocab, activeBook.id]);

  useEffect(() => {
    let active = true;
    if (word && activeChar) {
      setIsUsedAsLoading(true);
      setIsRelatedLoading(true);
      setUsedAsComponents([]);
      setAllWords([]);
      setDictionaryWords([]);

      const parentsRequest = decompositionRuntime.runtime === 'v3'
        ? decompositionRuntime.getParents(`g:${activeChar}`).then((result) => {
            if (result.status === 'error') throw result.error ?? new Error(`Could not load characters containing ${activeChar}.`);
            return result.status === 'found' ? result.parents : [];
          })
        : getCharactersUsingComponent(activeChar);

      Promise.allSettled([
        parentsRequest.then(async (charsList) => {
          if (!active) return;
          try {
            if (decompositionRuntime.runtime === 'v3') {
              await decompositionRuntime.prefetch(charsList.slice(0, 6));
            } else {
              await getMultipleBreakdowns(charsList);
            }
          } catch (e) {
            console.error("Error prefetching breakdowns in bulk:", e);
          }
          if (active) {
            setUsedAsComponents(charsList);
            setIsUsedAsLoading(false);
          }
        }).catch(err => {
          console.error("Error fetching used as components:", err);
          if (active) setIsUsedAsLoading(false);
        }),
        Promise.allSettled([
          searchVocabulary(activeChar),
          decompositionRuntime.runtime === 'v3'
            ? searchDictionaryWordsContaining(activeChar)
            : Promise.resolve([]),
        ]).then(([courseResult, dictionaryResult]) => {
          if (!active) return;
          setAllWords(courseResult.status === 'fulfilled' ? courseResult.value : []);
          setDictionaryWords(dictionaryResult.status === 'fulfilled' ? dictionaryResult.value : []);
          setIsRelatedLoading(false);
        })
      ]);
    } else {
      setUsedAsComponents([]);
      setAllWords([]);
      setDictionaryWords([]);
    }
    return () => {
      active = false;
    };
  }, [word, activeChar, decompositionRuntime, activeBook.id]);

  // Pre-fetch sub-components
  useEffect(() => {
    if (charData?.decomposition) {
      const subChars = Array.from(charData.decomposition).filter(
        (c) => !NON_CHAR_RE.test(c) && c !== activeChar
      );
      if (subChars.length > 0) {
        getMultipleBreakdowns(subChars).catch(err => {
          console.error("Error prefetching sub components:", err);
        });
      }
    }
  }, [charData, activeChar]);

  const components = useMemo(() => {
    if (!charData?.decomposition) return [];
    return Array.from(charData.decomposition).filter(
      (c) => !NON_CHAR_RE.test(c) && c !== activeChar,
    );
  }, [charData, activeChar]);

  const charCardsInfo = useMemo(() => {
    if (!activeChar) return [];
    return allWords.filter((c) => c.front === activeChar);
  }, [activeChar, allWords]);

  const relatedWords = useMemo(() => {
    if (!activeChar) return [];
    const allMatches = allWords.filter(
      (card) => card.front.includes(activeChar) && card.front !== activeChar,
    );

    const bookId = activeBook?.id;
    const sortedCourseWords = allMatches.sort((a, b) => {
      if (bookId !== undefined && bookId !== null) {
        if (a.bookId === bookId && b.bookId !== bookId) return -1;
        if (a.bookId !== bookId && b.bookId === bookId) return 1;
      }
      if (a.bookId !== b.bookId) return a.bookId - b.bookId;
      return a.lessonId - b.lessonId;
    });
    return mergeBreakdownWords(sortedCourseWords, dictionaryWords);
  }, [activeChar, allWords, dictionaryWords, activeBook?.id]);

  return {
    activeChar,
    charData,
    charCardsInfo,
    components,
    usedAsComponents,
    usedAsGroups,
    relatedWords,
    isUsedAsLoading,
    isRelatedLoading,
    breakdownCharIndex,
    setBreakdownCharIndex,
    chars
  };
}
