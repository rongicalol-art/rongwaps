/**
 * Reader vocabulary matching: the one owner of "does this word occur in this
 * text".
 *
 * The vocabulary pack stores whole words (`珍珠奶茶`, `你好/妳好`,
 * `（一）點（兒）`), while the reader segments text on the authored pinyin's
 * word boundaries, so a term can appear as several consecutive word chunks.
 * Matching therefore runs on the reader's own segmentation as a span of whole
 * chunks — never a substring — so 愛 can never be marked from 可愛. Slash
 * alternates and optional （…） parts expand to every spelling the text may use.
 */
import type { ReadingRecord } from '../types/models';
import { getWordChunks } from './rubyPinyin';

export interface VocabularyTermSource {
  traditional?: string | null;
  simplified?: string | null;
}

export type ReadingScript = 'traditional' | 'simplified';

/** Every spelling a pack row may appear as: slash alternates, optional parts, both scripts. */
export function vocabularyTermVariants(row: VocabularyTermSource): string[] {
  const raw = row.traditional ?? '';
  const withoutOptionals = raw.replace(/[（(][^）)]*[）)]/g, '');
  const parts = [raw, withoutOptionals, ...raw.split('/'), ...withoutOptionals.split('/')];
  const variants = new Set<string>();
  const add = (candidate: string) => {
    const cleaned = candidate.replace(/[（(）)]/g, '').trim();
    // The raw slash form is not a spelling any text can use; the split parts are.
    if (cleaned && !cleaned.includes('/')) variants.add(cleaned);
  };
  for (const part of parts) add(part);
  if (row.simplified) {
    add(row.simplified);
    for (const part of row.simplified.split('/')) add(part);
  }
  return [...variants];
}

interface WordSpan {
  text: string;
  charStart: number;
  charEnd: number;
}

/** Word chunks of one paragraph in one script, split at every punctuation break. */
export interface ReadingWordRun {
  paragraphIndex: number;
  script: ReadingScript;
  spans: WordSpan[];
}

export interface VocabularyOccurrence {
  paragraphIndex: number;
  script: ReadingScript;
  charStart: number;
  charEnd: number;
  text: string;
}

/** Segments a reading once so many pack rows can be matched against it. */
export function tokenizeReading(
  reading: ReadingRecord,
  script?: ReadingScript,
): ReadingWordRun[] {
  const scripts: ReadingScript[] = script ? [script] : ['traditional', 'simplified'];
  const runs: ReadingWordRun[] = [];

  reading.paragraphs.forEach((paragraph, paragraphIndex) => {
    for (const current of scripts) {
      const text = current === 'simplified' ? paragraph.simplified : paragraph.traditional;
      if (!text) continue;

      const spans: WordSpan[] = [];
      let offset = 0;
      for (const chunk of getWordChunks(text, paragraph.pinyin)) {
        const charStart = offset;
        offset += chunk.text.length;
        if (chunk.isPunctuation) {
          if (spans.length > 0) {
            runs.push({ paragraphIndex, script: current, spans: spans.slice() });
            spans.length = 0;
          }
          continue;
        }
        spans.push({ text: chunk.text, charStart, charEnd: offset });
      }
      if (spans.length > 0) runs.push({ paragraphIndex, script: current, spans });
    }
  });

  return runs;
}

/** Every occurrence of any variant as a span of consecutive whole chunks. */
export function findVocabularyOccurrences(
  runs: readonly ReadingWordRun[],
  variants: readonly string[],
): VocabularyOccurrence[] {
  if (variants.length === 0) return [];
  const variantSet = new Set(variants);
  const maxWindow = Math.max(...variants.map((variant) => [...variant].length));
  const occurrences: VocabularyOccurrence[] = [];

  for (const run of runs) {
    for (let end = 0; end < run.spans.length; end += 1) {
      const limit = Math.min(end + 1, maxWindow);
      for (let size = limit; size >= 1; size -= 1) {
        const first = run.spans[end - size + 1];
        const joined = run.spans
          .slice(end - size + 1, end + 1)
          .map((span) => span.text)
          .join('');
        if (!variantSet.has(joined)) continue;
        occurrences.push({
          paragraphIndex: run.paragraphIndex,
          script: run.script,
          charStart: first.charStart,
          charEnd: run.spans[end].charEnd,
          text: joined,
        });
        break;
      }
    }
  }

  return occurrences;
}

/** The rendered chunks overlapping an occurrence's character range, in order. */
export function chunksForOccurrence<T extends { text: string; isPunctuation?: boolean }>(
  chunks: readonly T[],
  occurrence: VocabularyOccurrence,
): T[] {
  const covered: T[] = [];
  let offset = 0;
  for (const chunk of chunks) {
    const charStart = offset;
    offset += chunk.text.length;
    if (chunk.isPunctuation) continue;
    if (charStart < occurrence.charEnd && offset > occurrence.charStart) {
      covered.push(chunk);
    }
  }
  return covered;
}
