/**
 * Karaoke sync helpers over the Whisper-generated dialogue alignments.
 * Pure functions so playback/UI code (and tests) can rely on them.
 * Alignments are best-effort: lines the recording never spoke are marked
 * `unmatched` (zero-length) and are skipped everywhere.
 */
import type { DialogueAlignment } from '../data/dialogueAlignment';

export interface WordCharRange {
  /** Character offsets into the rendered line text (inclusive start, exclusive end). */
  start: number;
  end: number;
}

function validLines(alignment: DialogueAlignment) {
  return alignment.lines.filter((line) => !line.unmatched && line.end > line.start);
}

/** Index of the alignment line containing `time`, or null outside all lines. */
export function lineIndexForTime(
  alignment: DialogueAlignment,
  time: number,
): number | null {
  const lines = validLines(alignment);
  if (lines.length === 0) return null;
  if (time < lines[0].start) return null;
  for (let i = 0; i < lines.length; i += 1) {
    if (time <= lines[i].end) return lines[i].index;
  }
  return lines[lines.length - 1].index;
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

/** Duration of the aligned dialogue audio (end of the last matched line). */
export function alignmentDuration(alignment: DialogueAlignment): number {
  const lines = validLines(alignment);
  if (lines.length === 0) return 0;
  return lines[lines.length - 1].end;
}
