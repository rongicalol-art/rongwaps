/**
 * Karaoke sync helpers over the Whisper-generated dialogue alignments.
 * Pure functions so playback/UI code (and tests) can rely on them.
 * Alignments are best-effort: lines the recording never spoke are marked
 * `unmatched` (zero-length) and are skipped everywhere.
 */
import type { DialogueAlignment } from '../types/models';
import type { PhraseChunk } from './rubyPinyin';

export interface WordCharRange {
  /** Character offsets into the rendered line text (inclusive start, exclusive end). */
  start: number;
  end: number;
}

function validLines(alignment: DialogueAlignment) {
  return alignment.lines.filter((line) => !line.unmatched && line.end > line.start);
}

/**
 * Index of the alignment line containing `time`, or null outside all lines.
 * During pauses between lines the previously spoken line stays active, so
 * the UI doesn't flag the *next* bubble as playing before its audio starts.
 */
export function lineIndexForTime(
  alignment: DialogueAlignment,
  time: number,
): number | null {
  const lines = validLines(alignment);
  if (lines.length === 0) return null;
  if (time < lines[0].start) return null;
  let current: { index: number } | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    if (time < lines[i].start) break; // gap: keep the previous line
    current = lines[i];
    if (time < lines[i].end) return lines[i].index;
  }
  return current?.index ?? null; // past the last line end: clamp to last
}

/**
 * Character range of the word being spoken at `time` inside `lineIndex`, or
 * null when the time is between words or the word has no usable mapping.
 * Character offsets are precomputed by the alignment generator against the
 * traditional line text; when the rendered text (simplified/traditional)
 * differs in length the word highlight degrades to nothing rather than
 * highlighting the wrong characters.
 */
export function wordRangeForTime(
  alignment: DialogueAlignment,
  lineIndex: number,
  time: number,
  renderedLineText: string,
): WordCharRange | null {
  const line = alignment.lines[lineIndex];
  if (!line || line.unmatched || line.words.length === 0) return null;

  const word = line.words.find((candidate) => (
    time >= candidate.start && time < candidate.end
  ));
  if (!word || typeof word.charStart !== 'number' || typeof word.charEnd !== 'number') {
    return null;
  }

  // Offsets are relative to the traditional line text; only apply them when
  // the rendered text has the same length (simplified is 1:1 here, but be
  // safe against any future divergence).
  if (renderedLineText.length !== line.text.length) return null;
  if (word.charStart < 0 || word.charEnd > line.text.length || word.charEnd <= word.charStart) {
    return null;
  }
  return { start: word.charStart, end: word.charEnd };
}

/**
 * Character range of the syllable being spoken at `time` inside `lineIndex`,
 * from character-level forced-alignment data (`line.chars`). Returns null when
 * the time is between characters or the rendered text length differs from the
 * aligned (traditional) text. Prefer this over `wordRangeForTime` for the new
 * MMS alignments; the renderer groups characters into words via `getWordChunks`.
 */
export function charRangeForTime(
  alignment: DialogueAlignment,
  lineIndex: number,
  time: number,
  renderedLineText: string,
): WordCharRange | null {
  const line = alignment.lines[lineIndex];
  if (!line || line.unmatched || !line.chars || line.chars.length === 0) return null;

  const ch = line.chars.find((candidate) => (
    time >= candidate.start && time < candidate.end
  ));
  if (!ch) return null;

  if (renderedLineText.length !== line.text.length) return null;
  if (ch.charStart < 0 || ch.charEnd > line.text.length || ch.charEnd <= ch.charStart) {
    return null;
  }
  return { start: ch.charStart, end: ch.charEnd };
}

/** Duration of the aligned dialogue audio (end of the last matched line). */
export function alignmentDuration(alignment: DialogueAlignment): number {
  const lines = validLines(alignment);
  if (lines.length === 0) return 0;
  return lines[lines.length - 1].end;
}

export interface DialogueSentenceItem {
  id: string;
  text: string;
  chunks: PhraseChunk[];
  start?: number;
  end?: number;
}

/**
 * Splits a line's word chunks into bite-sized clause-level units at punctuation boundaries
 * (including commas, enumerations, semicolons, colons, ellipses, em-dashes, and full sentence stops).
 * Derives start and end timestamps from aligned chunks so each clause can play and highlight independently.
 */
export function splitChunksIntoSentences(
  chunks: PhraseChunk[],
  lineIndex: number,
  lineStart?: number,
  lineEnd?: number,
): DialogueSentenceItem[] {
  const sentences: DialogueSentenceItem[] = [];
  let currentChunks: PhraseChunk[] = [];
  let sentenceIdx = 0;

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    currentChunks.push(chunk);

    // Split on clauses at commas, pauses, semicolons, colons, dashes, and sentence closers
    const isClauseCloser = chunk.isPunctuation && /[，、；：。！？!?…—,]/.test(chunk.text);
    const isLast = i === chunks.length - 1;

    if (isClauseCloser || isLast) {
      const spokenChunks = currentChunks.filter(
        (c) => !c.isPunctuation && typeof c.start === 'number' && typeof c.end === 'number',
      );
      const start = spokenChunks.length > 0 ? spokenChunks[0].start : lineStart;
      const end = spokenChunks.length > 0 ? spokenChunks[spokenChunks.length - 1].end : lineEnd;

      sentences.push({
        id: `${lineIndex}-${sentenceIdx}`,
        text: currentChunks.map((c) => c.text).join(''),
        chunks: currentChunks,
        start,
        end,
      });

      sentenceIdx += 1;
      currentChunks = [];
    }
  }

  // Extend clause end to next clause start so karaoke transitions seamlessly without gaps
  for (let i = 0; i < sentences.length - 1; i += 1) {
    if (typeof sentences[i].end === 'number' && typeof sentences[i + 1].start === 'number') {
      if (sentences[i].end! < sentences[i + 1].start!) {
        sentences[i].end = sentences[i + 1].start;
      }
    }
  }

  return sentences;
}

