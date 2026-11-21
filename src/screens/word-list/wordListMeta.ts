import { wordListPath, type WordListLevel } from '../../app/routes';
import type { PageMeta } from '../../hooks/usePageMeta';
import { tocflLabel } from '../../utils/lesson/levels';
import { WORD_COUNTS } from './data/counts';

/** The exam's own Chinese name for each level, as test takers see it on the registration form. */
const EXAM_NAME: Record<number, string> = { 1: '準備級', 2: '入門級', 3: '基礎級' };

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
}

export function wordListInfo({ slug, level }: WordListLevel): WordListInfo {
  const label = tocflLabel(level);
  return {
    label,
    place: level === 1 ? 'TOCFL Novice' : `TOCFL Band A · Level ${level - 1}`,
    examName: EXAM_NAME[level],
    count: WORD_COUNTS[level],
    folderName: `TOCFL ${label} words`,
    pdfPath: `/downloads/tocfl-${slug}-word-list.pdf`,
  };
}

/** Search title leads with what people type: TOCFL, the level, "vocabulary list". */
export function wordListMeta(entry: WordListLevel): PageMeta {
  const { label, count } = wordListInfo(entry);
  return {
    title: `TOCFL ${label} Vocabulary List: ${count} Words + PDF · Ron's Mandarin`,
    description: `All ${count} official TOCFL ${label} words with pinyin and English, plus a free PDF. Tap the words you know, then study the rest free.`,
    socialDescription: `All ${count} TOCFL ${label} words with pinyin, English and a free PDF. Tap the ones you know.`,
    path: wordListPath(entry.slug),
  };
}
