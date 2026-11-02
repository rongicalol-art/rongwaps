import { debugLogger } from '../utils/debug/debugLogger';
import { useState, useEffect } from 'react';
import { searchVocabulary } from '../services/vocabularyService';
import type { Flashcard } from '../data/flashcards';

export interface ComponentVocabRelation {
  exactVocab: Flashcard | null;
  usedInVocabs: Flashcard[];
  /** The lesson that teaches the character: its own card, else the first word containing it. */
  firstLesson: Flashcard | null;
  loading: boolean;
}

const NO_RELATION: ComponentVocabRelation = { exactVocab: null, usedInVocabs: [], firstLesson: null, loading: false };

function calculateRelation(vocab: Flashcard[], char: string) {
  // 1. Find if the character is an exact vocabulary word
  const exact = vocab.find(card => card.front === char) || null;

  // 2. Find if the character is a sub-component of other vocabulary words
  const containing = vocab.filter(card => card.front.includes(char) && card.front !== char);

  // Deduplicate containing matches by front text to keep clean
  const uniqueContaining: Flashcard[] = [];
  const seen = new Set<string>();
  for (const card of containing) {
    if (!seen.has(card.front)) {
      seen.add(card.front);
      uniqueContaining.push(card);
    }
  }

  // Sort containing vocabs by book index and lesson index
  uniqueContaining.sort((a, b) => {
    if (a.bookId !== b.bookId) return a.bookId - b.bookId;
    return a.lessonId - b.lessonId;
  });

  return {
    exactVocab: exact,
    usedInVocabs: uniqueContaining,
    firstLesson: exact ?? uniqueContaining[0] ?? null,
    loading: false,
  };
}

export function useComponentVocabRelation(char: string): ComponentVocabRelation {
  const [relation, setRelation] = useState<ComponentVocabRelation>(() => {
    const isInvalid = !char || char === '？' || char === '?';
    return { ...NO_RELATION, loading: !isInvalid };
  });

  useEffect(() => {
    if (!char || char === '？' || char === '?') {
      setRelation(NO_RELATION);
      return;
    }

    let active = true;
    setRelation(prev => ({ ...prev, loading: true }));

    searchVocabulary(char)
      .then((vocab) => {
        if (!active) return;
        setRelation(calculateRelation(vocab, char));
      })
      .catch((err) => {
        debugLogger.error('Supabase', 'Error in useComponentVocabRelation:', err);
        if (active) setRelation(NO_RELATION);
      });

    return () => {
      active = false;
    };
  }, [char]);

  return relation;
}
