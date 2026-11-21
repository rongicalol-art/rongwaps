import { wordListPath, type WordListLevel } from '../../app/routes';
import type { PageMeta } from '../../hooks/usePageMeta';
import { tocflBand, tocflLabel } from '../../utils/lesson/levels';
import { WORD_COUNTS } from './data/counts';
import type { ListWord } from './wordListTypes';

/** The exam's own Chinese name for each level, as test takers see it on the registration form. */
const EXAM_NAME: Record<number, string> = { 1: '準備級', 2: '入門級', 3: '基礎級', 4: '進階級', 5: '高階級', 6: '流利級', 7: '精通級' };
/** A page a visitor can tap through and a folder they can study: longer levels are shown in parts of about this many words. */
const PART_SIZE = 500;

export interface WordListInfo {
  /** Novice, A1, A2. */
  label: string;
  /** "TOCFL Novice", "TOCFL Band A · Level 1". */
  place: string;
  examName: string;
  count: number;
  /** A folder a learner's words are saved into, and the PDF's file name. */
  folderName: string;
  pdfPath: string;
  /** How many pages the level is shown in. */
  parts: number;
}

/** The words of one part: equal shares of the level, in the list's pinyin order. */
export function wordListPart(words: readonly ListWord[], part: number, parts: number): readonly ListWord[] {
  const size = Math.ceil(words.length / parts);
  return words.slice((part - 1) * size, part * size);
}

/** The pinyin letters a part runs between: "A–F". */
export function wordListRange(words: readonly ListWord[]): string {
  const initial = (word: ListWord) => word[1].normalize('NFD').replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase();
  const [from, to] = [initial(words[0]), initial(words[words.length - 1])];
  return from === to ? from : `${from}–${to}`;
}

/** What a part is remembered under, on the device and through sign-in: `a1`, or `b1/2`. */
export const wordListPartKey = (slug: string, part: number, parts: number) => (parts > 1 ? `${slug}/${part}` : slug);

export function wordListInfo({ slug, level }: WordListLevel): WordListInfo {
  const label = tocflLabel(level);
  return {
    label,
    place: level === 1 ? 'TOCFL Novice' : `TOCFL Band ${tocflBand(level)} · Level ${level - 1}`,
    examName: EXAM_NAME[level],
    count: WORD_COUNTS[level],
    folderName: `TOCFL ${label} words`,
    pdfPath: `/downloads/tocfl-${slug}-word-list.pdf`,
    parts: Math.max(1, Math.ceil(WORD_COUNTS[level] / PART_SIZE)),
  };
}

/** Search title leads with what people type: TOCFL, the level, "vocabulary list". */
export function wordListMeta(entry: WordListLevel, part = 1): PageMeta {
  const { label, count, parts } = wordListInfo(entry);
  const formatted = count.toLocaleString('en-US');
  if (parts > 1) {
    return {
      title: part === 1
        ? `TOCFL ${label} Vocabulary List: ${formatted} Words + PDF · Ron's Mandarin`
        : `TOCFL ${label} Vocabulary List, Part ${part} of ${parts} · Ron's Mandarin`,
      description: `${part === 1 ? `All ${formatted}` : `Part ${part} of the ${formatted}`} official TOCFL ${label} words with pinyin and English, in ${parts} parts, plus a free PDF. Tap the words you know.`,
      socialDescription: `The ${formatted} TOCFL ${label} words with pinyin, English and a free PDF. Part ${part} of ${parts}.`,
      path: wordListPath(entry.slug, part),
    };
  }
  return {
    title: `TOCFL ${label} Vocabulary List: ${count} Words + PDF · Ron's Mandarin`,
    description: `All ${count} official TOCFL ${label} words with pinyin and English, plus a free PDF. Tap the words you know, then study the rest free.`,
    socialDescription: `All ${count} TOCFL ${label} words with pinyin, English and a free PDF. Tap the ones you know.`,
    path: wordListPath(entry.slug),
  };
}
