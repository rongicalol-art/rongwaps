import { useState, useEffect } from 'react';
import { searchVocabulary } from '../services/vocabularyService';
import { vocabularyCache } from '../utils/cache';
import type { Flashcard } from '../data/flashcards';

export interface ComponentVocabRelation {
  exactVocab: Flashcard | null;
  usedInVocabs: Flashcard[];
  hasRelation: boolean;
  firstBookId: number | null;
  loading: boolean;
}

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

  // Determine which book introduced this first
  let minBookId: number | null = null;
  if (exact) {
    minBookId = exact.bookId > 0 ? exact.bookId : null;
  }
  
  uniqueContaining.forEach(card => {
    if (card.bookId > 0 && (minBookId === null || card.bookId < minBookId)) {
      minBookId = card.bookId;
    }
  });

  // Sort containing vocabs by book index and lesson index
  uniqueContaining.sort((a, b) => {
    if (a.bookId !== b.bookId) return a.bookId - b.bookId;
    return a.lessonId - b.lessonId;
  });

  return {
    exactVocab: exact,
    usedInVocabs: uniqueContaining,
    hasRelation: exact !== null || uniqueContaining.length > 0,
    firstBookId: minBookId,
    loading: false,
  };
}

export function useComponentVocabRelation(char: string): ComponentVocabRelation {
  const [relation, setRelation] = useState<ComponentVocabRelation>(() => {
    const isInvalid = !char || char === '？' || char === '?';
    return {
      exactVocab: null,
      usedInVocabs: [],
      hasRelation: false,
      firstBookId: null,
      loading: !isInvalid,
    };
  });

  useEffect(() => {
    if (!char || char === '？' || char === '?') {
      setRelation({
        exactVocab: null,
        usedInVocabs: [],
        hasRelation: false,
        firstBookId: null,
        loading: false,
      });
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
        console.error('Error in useComponentVocabRelation:', err);
        if (active) {
          setRelation({
            exactVocab: null,
            usedInVocabs: [],
            hasRelation: false,
            firstBookId: null,
            loading: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [char]);

  return relation;
}
