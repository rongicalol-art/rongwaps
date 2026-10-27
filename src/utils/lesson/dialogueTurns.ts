/**
 * Course examples write two-person dialogues inline: "A：現在幾點？ B：現在十點。"
 * (ASCII or full-width colon, sometimes with a short Han prefix like 室友A).
 * A label only counts at the start or after a non-letter, so "PM:" or "好A:" never split.
 */
const SPEAKER_LABEL = /(^|[^\p{L}\p{N}])(\p{Script=Han}{0,3}[A-Z])[:：]\s*/gu;

export interface DialogueTurn {
  /** Null for any lead-in text before the first label. */
  speaker: string | null;
  /** String offsets of the turn's text, label excluded. */
  start: number;
  end: number;
}

/** One entry per speaker turn, or null when the text has no speaker labels. */
export function splitDialogueTurns(text: string): DialogueTurn[] | null {
  const labels = [...text.matchAll(SPEAKER_LABEL)].map((match) => ({
    speaker: match[2],
    labelStart: match.index + match[1].length,
    textStart: match.index + match[0].length,
  }));
  if (labels.length === 0) return null;
  const turns: DialogueTurn[] = [];
  if (text.slice(0, labels[0].labelStart).trim()) {
    turns.push({ speaker: null, start: 0, end: labels[0].labelStart });
  }
  labels.forEach((label, index) => {
    turns.push({ speaker: label.speaker, start: label.textStart, end: labels[index + 1]?.labelStart ?? text.length });
  });
  return turns;
}

/** A dialogue translation without its "A:"/"B:" labels; the Chinese lines above already carry them. */
export function dialogueTranslation(text: string): string {
  const turns = splitDialogueTurns(text);
  if (!turns) return text;
  return turns.map((turn) => text.slice(turn.start, turn.end).trim()).filter(Boolean).join(' · ');
}
