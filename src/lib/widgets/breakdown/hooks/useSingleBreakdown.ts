import { useState, useEffect, useMemo } from 'react';
import { useCharBreakdown } from '../../../../hooks/useCharBreakdown';
import { getCharactersUsingComponent, getMultipleBreakdowns } from '../../../../services/breakdownService';
import { searchVocabulary } from '../../../../services/vocabularyService';
import type { Flashcard } from '../../../../data/flashcards';

const HANZI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u;
const NON_CHAR_RE = /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻\s！？?]/;

export function useSingleBreakdown(word: string, initialCharIndex: number, activeBook: any) {
  const [breakdownCharIndex, setBreakdownCharIndex] = useState(initialCharIndex);

  useEffect(() => {
    setBreakdownCharIndex(initialCharIndex);
  }, [initialCharIndex, word]);

  const chars = useMemo(
    () => Array.from(word || "").filter((c) => HANZI_RE.test(c as string)),
    [word],
  );
  
  const activeChar = chars[breakdownCharIndex] || chars[0];
  const charData = useCharBreakdown(activeChar);

  const [usedAsComponents, setUsedAsComponents] = useState<string[]>([]);
  const [allWords, setAllWords] = useState<Flashcard[]>([]);
  const [isUsedAsLoading, setIsUsedAsLoading] = useState(false);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (word && activeChar) {
      setIsUsedAsLoading(true);
      setIsRelatedLoading(true);
      setUsedAsComponents([]);
      setAllWords([]);

      Promise.allSettled([
        getCharactersUsingComponent(activeChar).then(async (charsList) => {
          if (!active) return;
          try {
            await getMultipleBreakdowns(charsList);
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
        searchVocabulary(activeChar).then((words) => {
          if (!active) return;
          setAllWords(words);
          setIsRelatedLoading(false);
        }).catch((err) => {
          console.error("Error loading vocabulary for breakdown:", err);
          if (active) setIsRelatedLoading(false);
        })
      ]);
    } else {
      setUsedAsComponents([]);
      setAllWords([]);
    }
    return () => {
      active = false;
    };
  }, [word, activeChar]);

  // Pre-fetch sub-components
  useEffect(() => {
    if (charData?.decomposition) {
      const subChars = Array.from(charData.decomposition).filter(
        (c: any) => !NON_CHAR_RE.test(c as string) && c !== activeChar
      ) as string[];
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
      (c: any) => !NON_CHAR_RE.test(c as string) && c !== activeChar,
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
    return allMatches.sort((a, b) => {
      if (bookId !== undefined && bookId !== null) {
        if (a.bookId === bookId && b.bookId !== bookId) return -1;
        if (a.bookId !== bookId && b.bookId === bookId) return 1;
      }
      if (a.bookId !== b.bookId) return a.bookId - b.bookId;
      return a.lessonId - b.lessonId;
    });
  }, [activeChar, allWords, activeBook?.id]);

  return {
    activeChar,
    charData,
    charCardsInfo,
    components,
    usedAsComponents,
    relatedWords,
    isUsedAsLoading,
    isRelatedLoading,
    breakdownCharIndex,
    setBreakdownCharIndex,
    chars
  };
}
