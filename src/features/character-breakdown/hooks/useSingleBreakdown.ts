import { debugLogger } from '../../../utils/debugLogger';
import { useState, useEffect, useMemo } from 'react';
import { useCharBreakdown } from '../../../hooks/useCharBreakdown';
import { getMultipleBreakdowns } from '../../../services/breakdownService';
import { searchVocabulary, fetchVocabulary } from '../../../services/vocabularyService';
import type { Flashcard } from '../../../data/flashcards';
import { getDecompositionRuntimeService } from '../../character-decomposition';
import { buildCharacterCourseIndex } from '../utils/rankParentCharacters';
import type { BuiltWithMember, RankedSoundFamily } from '../utils/rankBuiltWith';
import { searchDictionaryWordsContaining, type DictionaryContainingWord } from '../../../services/dictionaryService';
import { mergeBreakdownWords } from '../utils/mergeBreakdownWords';
import { builtWith, soundFamily as resolveSoundFamily } from '../../../utils/parts';
import { useParts } from '../../../hooks/useParts';
import { useLevels } from '../../../hooks/useLevels';
import { officialLevel, resolveLevel } from '../../../utils/levels';
import { sortWords } from '../../../utils/wordOrdering';

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

  const [allWords, setAllWords] = useState<Flashcard[]>([]);
  const [dictionaryWords, setDictionaryWords] = useState<DictionaryContainingWord[]>([]);
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

  // "Built with": every pool character made from the active one, sound-alikes
  // first (parts index), each tagged with its earliest course lesson.
  const parts = useParts();
  const courseRank = useMemo(() => buildCharacterCourseIndex(courseVocab), [courseVocab]);
  const builtWithMembers = useMemo<BuiltWithMember[]>(() => {
    if (!parts || !activeChar) return [];
    return builtWith(activeChar, parts).map((member) => ({ ...member, ...courseRank.get(member.character) }));
  }, [parts, activeChar, courseRank]);
  const usedAsComponents = useMemo(() => builtWithMembers.map((member) => member.character), [builtWithMembers]);
  const isUsedAsLoading = parts === null;

  // Bounded background prefetch for the top visible items only (never hundreds).
  useEffect(() => {
    const topSlice = usedAsComponents.slice(0, 12);
    if (topSlice.length === 0) return;
    if (decompositionRuntime.runtime === 'v3') void decompositionRuntime.prefetch(topSlice);
    else void getMultipleBreakdowns(topSlice);
  }, [usedAsComponents, decompositionRuntime]);

  useEffect(() => {
    let active = true;
    if (word && activeChar) {
      setIsRelatedLoading(true);
      setAllWords([]);
      setDictionaryWords([]);
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
      });
    } else {
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
          debugLogger.error('Supabase', "Error prefetching sub components:", err);
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

  // Sound family: the part this character borrows its sound from, and/or the
  // characters that borrow its own sound — members tagged by course lesson.
  const soundFamily = useMemo<RankedSoundFamily | null>(() => {
    if (!parts || !activeChar) return null;
    const family = resolveSoundFamily(activeChar, parts);
    if (!family) return null;
    const tag = (member: { character: string; grade: BuiltWithMember['grade'] }) => ({ ...member, ...courseRank.get(member.character) });
    return {
      from: family.from && { part: family.from.part, partRank: courseRank.get(family.from.part), grade: family.from.grade, siblings: family.from.siblings.map(tag) },
      lends: family.lends.map(tag),
    };
  }, [parts, activeChar, courseRank]);

  const charCardsInfo = useMemo(() => {
    if (!activeChar) return [];
    return allWords.filter((c) => c.front === activeChar);
  }, [activeChar, allWords]);

  const levels = useLevels();
  const relatedWords = useMemo(() => {
    if (!activeChar) return [];
    const allMatches = allWords.filter(
      (card) => card.front.includes(activeChar) && card.front !== activeChar,
    );

    const sortedCourseWords = sortWords(allMatches, { activeBookId: activeBook?.id, levels });
    return mergeBreakdownWords(sortedCourseWords, dictionaryWords, levels ? (w) => officialLevel(resolveLevel(w, levels)) : undefined);
  }, [activeChar, allWords, dictionaryWords, activeBook?.id, levels]);

  return {
    activeChar,
    charData,
    charCardsInfo,
    components,
    usedAsComponents,
    builtWithMembers,
    soundFamily,
    relatedWords,
    isUsedAsLoading,
    isRelatedLoading,
    breakdownCharIndex,
    setBreakdownCharIndex,
    chars,
  };
}
