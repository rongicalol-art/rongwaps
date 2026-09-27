import type { Flashcard } from '../data/flashcards';
import type { DBDictionaryEntry } from '../types/database';
import type { LessonPartSelectionMap, UserFlashcard } from '../types/models';
import { isCardInPartSelection } from '../utils/lessonPartSelection';
import type { SRSData } from '../utils/srsEngine';
import { isSrsDue } from '../utils/reviewOverview';

export function isSameCards(a: Flashcard[], b: Flashcard[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((card, idx) => card.id === b[idx].id);
}

export function mapStarredEntriesToFlashcards(
  favorites: string[],
  batchResults: Map<string, DBDictionaryEntry>,
  vocabMap: Map<string, Flashcard>,
): { cards: Flashcard[]; knownIds: Set<string> } {
  const results: Flashcard[] = [];
  const knownIds = new Set<string>();

  for (const word of favorites) {
    if (batchResults.has(word)) {
      const entry = batchResults.get(word)!;
      const id = `star-${entry.traditional}`;
      knownIds.add(id);
      const courseMatch =
        vocabMap.get(entry.traditional) ||
        vocabMap.get(entry.simplified) ||
        vocabMap.get(word);

      results.push({
        id,
        bookId: courseMatch?.bookId || 0,
        lessonId: courseMatch?.lessonId || 0,
        front: entry.traditional || entry.simplified,
        back: entry.definitions
          ? Array.isArray(entry.definitions)
            ? entry.definitions.join(' • ')
            : Object.values(entry.definitions).join(' • ')
          : '',
        pinyin: entry.pinyin ? entry.pinyin.join(', ') : (courseMatch?.pinyin || ''),
        audio: courseMatch?.audio || '',
        notes: '',
      });
    }
  }

  return { cards: results, knownIds };
}

export function mapCustomCardsToFlashcards(
  customCards: UserFlashcard[],
  vocabMap: Map<string, Flashcard>,
  libraryActiveFolder: string,
): { cards: Flashcard[]; knownIds: Set<string> } {
  let filtered = customCards;
  if (libraryActiveFolder !== 'custom') {
    filtered = customCards.filter((c) => c.folderId === libraryActiveFolder);
  } else if (libraryActiveFolder === 'custom') {
    filtered = customCards.filter((c) => !c.folderId || c.folderId === 'custom');
  }

  const results: Flashcard[] = filtered.map((c) => {
    const courseMatch =
      vocabMap.get(c.traditional || '') ||
      vocabMap.get(c.simplified || '');
    return {
      id: `custom-${c.id}`,
      bookId: courseMatch?.bookId || 0,
      lessonId: courseMatch?.lessonId || 0,
      front: c.traditional || c.simplified,
      back: c.translation,
      pinyin: c.pinyin || courseMatch?.pinyin || '',
      audio: courseMatch?.audio || '',
      notes: c.notes || '',
    };
  });

  const knownIds = new Set(results.map((c) => c.id));
  return { cards: results, knownIds };
}

export function filterCurriculumCards(
  cards: Flashcard[],
  selectedLessons: number[],
  selectedLessonParts: LessonPartSelectionMap,
): { cards: Flashcard[]; knownIds: Set<string> } {
  if (!selectedLessons || selectedLessons.length === 0) {
    return { cards, knownIds: new Set(cards.map((c) => c.id)) };
  }
  const filtered = cards.filter(
    (card) =>
      selectedLessons.includes(card.lessonId) &&
      isCardInPartSelection(card, selectedLessonParts),
  );
  return { cards: filtered, knownIds: new Set(filtered.map((c) => c.id)) };
}

export function deriveLocalDueCardIds(
  srsData: Record<string, SRSData>,
  now: number = Date.now(),
): string[] {
  return Object.keys(srsData).filter((id) => {
    const record = srsData[id];
    return record ? isSrsDue(record, now) : false;
  });
}
