/**
 * Course examples write two-person dialogues inline: "A：現在幾點？ B：現在十點。"
 * (ASCII or full-width colon, sometimes with a short Han prefix like 室友A or a role like 老師/學生).
 * A label only counts at the start or after a non-letter, so "PM:" or "好A:" never split.
 */
const SPEAKER_LABEL = /(^|[^\p{L}\p{N}])(\p{Script=Han}{0,3}[A-Z]|老師|學生|妹妹|姊姊|姐姐|哥哥|弟弟|太太|先生|老婆|老公|媽媽|爸爸|孩子|小偷|警察|店員|客人|員工|主管|老闆|顧客|醫生|病人|[甲乙丙丁])[:：]\s*/gu;

export interface DialogueTurn {
  /** Null for any lead-in text before the first label. */
  speaker: string | null;
  /** String offsets of the turn's text, label excluded. */
  start: number;
  end: number;
}

function splitLineDialogueTurns(text: string, offset = 0): DialogueTurn[] | null {
  const rawMatches = [...text.matchAll(SPEAKER_LABEL)];
  // Chinese role words (e.g. 老師：) only count as dialogue turns when at least two turns appear,
  // whereas single-letter labels (A:, 室友A:) count even on a single turn.
  const hasLetterLabel = rawMatches.some((m) => /[A-Z甲乙丙丁]$/.test(m[2]));
  if (rawMatches.length === 0 || (!hasLetterLabel && rawMatches.length < 2)) return null;

  const labels = rawMatches.map((match) => ({
    speaker: match[2],
    labelStart: offset + match.index + match[1].length,
    textStart: offset + match.index + match[0].length,
  }));
  const turns: DialogueTurn[] = [];
  if (text.slice(0, rawMatches[0].index + rawMatches[0][1].length).trim()) {
    turns.push({ speaker: null, start: offset, end: labels[0].labelStart });
  }
  labels.forEach((label, index) => {
    turns.push({ speaker: label.speaker, start: label.textStart, end: labels[index + 1]?.labelStart ?? offset + text.length });
  });
  return turns;
}

/**
 * One entry per speaker turn or numbered multi-example line (`\n`-separated),
 * or null when the text is a single plain sentence.
 */
export function splitDialogueTurns(text: string): DialogueTurn[] | null {
  if (text.includes('\n')) {
    const turns: DialogueTurn[] = [];
    let pos = 0;
    let exampleNum = 0;
    for (const line of text.split('\n')) {
      const lineStart = pos;
      const lineEnd = pos + line.length;
      pos = lineEnd + 1;
      if (!line.trim()) continue;
      exampleNum += 1;
      const numLabel = String(exampleNum);
      const subTurns = splitLineDialogueTurns(line, lineStart);
      if (subTurns) {
        subTurns.forEach((turn, idx) => {
          turns.push({
            speaker: idx === 0 ? (turn.speaker ? `${numLabel} · ${turn.speaker}` : numLabel) : turn.speaker,
            start: turn.start,
            end: turn.end,
          });
        });
      } else {
        turns.push({ speaker: numLabel, start: lineStart, end: lineEnd });
      }
    }
    return turns.length > 0 ? turns : null;
  }
  return splitLineDialogueTurns(text, 0);
}

const ENGLISH_SPEAKER_LABEL = /(^|[^\p{L}\p{N}])([A-Z]|Teacher|Student|(?:(?:Little|Younger|Older|Big)\s+)?(?:Sister|sister|Brother|brother)|Wife|Husband|Mom|Mother|Dad|Father|Child|Thief|Police|Clerk|Customer|Employee|Supervisor|Boss|Doctor|Patient)[:：]\s*/gu;

function stripEnglishDialogueLabels(line: string): string {
  const turns = splitLineDialogueTurns(line, 0);
  if (turns) {
    return turns.map((turn) => line.slice(turn.start, turn.end).trim()).filter(Boolean).join(' · ');
  }
  const matches = [...line.matchAll(ENGLISH_SPEAKER_LABEL)];
  const hasSingleLetter = matches.some((m) => m[2].length === 1);
  if (matches.length === 0 || (!hasSingleLetter && matches.length < 2)) return line.trim();
  const parts: string[] = [];
  if (line.slice(0, matches[0].index + matches[0][1].length).trim()) {
    parts.push(line.slice(0, matches[0].index + matches[0][1].length).trim());
  }
  matches.forEach((match, idx) => {
    const start = match.index + match[0].length;
    const end = matches[idx + 1] ? matches[idx + 1].index + matches[idx + 1][1].length : line.length;
    const slice = line.slice(start, end).trim();
    if (slice) parts.push(slice);
  });
  return parts.join(' · ');
}

/** A dialogue translation without its "A:"/"B:" labels; the Chinese lines above already carry them. */
export function dialogueTranslation(text: string): string {
  if (text.includes('\n')) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines.map((line, idx) => `${idx + 1}. ${stripEnglishDialogueLabels(line)}`).join('\n');
  }
  return stripEnglishDialogueLabels(text);
}

/** Structured English lines for rendering multi-example (`1`, `2`) or single translations cleanly. */
export function splitTranslationLines(text: string): Array<{ label: string | null; text: string }> {
  if (text.includes('\n')) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.map((line, idx) => ({
        label: String(idx + 1),
        text: stripEnglishDialogueLabels(line),
      }));
    }
  }
  return [{ label: null, text: stripEnglishDialogueLabels(text) }];
}
