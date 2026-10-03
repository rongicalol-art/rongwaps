/**
 * Pure mapping and preparation of vocabulary rows into Flashcard models.
 */

import { debugLogger } from './debugLogger';
import type { DBVocabularyRow } from '../types/database';
import type { Flashcard } from '../data/flashcards';
import { cleanVocabText } from './vocabCleaner';
import { parseVocabularyId } from './vocabularyId';

export interface VocabularySourceRow extends Partial<Omit<DBVocabularyRow, 'examples'>> {
  examples?: unknown;
  book_id?: number;
  book?: number;
  lesson_id?: number;
  lesson?: number;
  part_id?: number;
  partId?: number;
  character?: string;
  hanzi?: string;
  word?: string;
  english?: string;
  definition?: string;
  pronunciation?: string;
  audio_url?: string;
  notes?: string;
  note?: string;
  pos?: string;
}

export function parseExamples(value: unknown): Flashcard['examples'] {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parseExamples(parsed)
        : [{ chinese: value, pinyin: '', english: '' }];
    } catch (error) {
      // Intentional fallback: plain text example string not formatted as JSON array
      debugLogger.warn('App', 'Vocabulary example unparseable as JSON; treated as plain text', error);
      return value.trim() ? [{ chinese: value, pinyin: '', english: '' }] : [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((example) => {
    if (typeof example !== 'object' || example === null) return [];
    const record = example as Record<string, unknown>;
    const chinese = typeof record.chinese === 'string' ? record.chinese : '';
    if (!chinese) return [];
    return [{
      chinese,
      pinyin: typeof record.pinyin === 'string' ? record.pinyin : '',
      english: typeof record.english === 'string' ? record.english : '',
    }];
  });
}

export function mapVocabularyRows(items: readonly unknown[]): Flashcard[] {
  return items.map((rawItem) => {
    const item = rawItem as VocabularySourceRow;
    const rawId = item.id?.toString() || '';
    const location = parseVocabularyId(rawId);

    return {
      id: rawId || Math.random().toString(),
      bookId: location?.bookId || item.book_id || item.book || 0,
      lessonId: location?.lessonId ?? item.lesson_id ?? item.lesson ?? 0,
      partId: location?.partId || item.part_id || item.partId || 1,
      front: cleanVocabText(item.traditional || item.simplified || item.character || item.hanzi || item.word || ''),
      back: (item.meaning || item.english || item.definition || '').trim(),
      traditional: item.traditional?.trim() || undefined,
      simplified: item.simplified?.trim() || undefined,
      pinyin: (item.pinyin || item.pronunciation || '').trim(),
      pos: (item.pos || '').trim(),
      audio: item.audio !== undefined
        ? (item.audio || '')
        : (item.audio_url || (rawId ? `modernchinese-${rawId}.mp3` : '')),
      notes: item.notes || item.note || '',
      examples: parseExamples(item.examples),
    };
  });
}

/** Map + optional lesson filter + canonical id sort. */
export function prepareVocabulary(items: readonly unknown[], lessonId?: number): Flashcard[] {
  const mapped = mapVocabularyRows(items);
  const filtered = lessonId ? mapped.filter((card) => card.lessonId === lessonId) : mapped;
  return filtered.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
}
