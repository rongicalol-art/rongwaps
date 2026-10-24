import type { Flashcard } from '../../../data/flashcards';
import type { CourseExampleRecord, DialogueAlignment, ReadingRecord, SentenceAudio } from '../../../types/models';
import type { FlashcardExtras } from '../../../utils/vocabulary/flashcardExtrasPack';
import { officialAudioFileName } from '../../../utils/lesson/officialAudio';

/**
 * Sentences for a book without course-example records (Book 3): its dialogue lines and its words'
 * own textbook examples, in the same record shape. Ids end in the source block (`D01L03`, `E02`) so
 * they sort and group like Book 1's.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Dialogue lines; a dialogue's number is its part. Audio is the book track's aligned line when the
 * track is hosted, else the line's own studio recording.
 */
export function readingSentenceRecords(
  readings: readonly ReadingRecord[],
  alignments: Readonly<Record<string, DialogueAlignment>> | null,
): CourseExampleRecord[] {
  return readings.flatMap((reading) => {
    const track = officialAudioFileName(reading.bookId, reading.audioReference);
    const lines = alignments?.[reading.id]?.lines ?? [];
    return reading.paragraphs.map((paragraph, index): CourseExampleRecord => {
      const line = lines[index];
      const bookAudio: SentenceAudio | undefined = track && line && !line.unmatched && line.end > line.start && line.text === paragraph.traditional
        ? { voice: 'book', file: track, start: line.start, end: line.end }
        : undefined;
      return {
        id: `${reading.id}-D${pad(reading.dialogueNumber)}L${pad(index + 1)}`,
        sourceCardId: '',
        sourceFront: '',
        sourceMeaning: '',
        bookId: reading.bookId,
        lessonId: reading.lessonId,
        partId: reading.dialogueNumber,
        traditional: paragraph.traditional,
        simplified: paragraph.simplified || undefined,
        pinyin: paragraph.pinyin,
        english: paragraph.english,
        audio: bookAudio ?? paragraph.audio,
        sourceOcrId: reading.id,
        provenance: 'textbook-ocr',
        confidence: 'high',
      };
    });
  });
}

/** Each word's own examples (the ones the textbook gives it), with the recording the pack chose. */
export function exampleSentenceRecords(cards: readonly Flashcard[], extras: readonly (FlashcardExtras | null | undefined)[]): CourseExampleRecord[] {
  return cards.flatMap((card, cardIndex) => (extras[cardIndex]?.examples ?? [])
    .filter((example) => example.sourceCardId === card.id)
    .map((example, index): CourseExampleRecord => ({
      id: `${card.id}-E${pad(index + 1)}`,
      sourceCardId: card.id,
      sourceFront: card.front,
      sourceMeaning: card.back,
      bookId: card.bookId,
      lessonId: card.lessonId,
      partId: card.partId ?? 1,
      traditional: example.chinese,
      pinyin: example.pinyin,
      english: example.english,
      audio: example.audio,
      sourceOcrId: card.id,
      provenance: 'textbook-ocr',
      confidence: 'high',
    })));
}
