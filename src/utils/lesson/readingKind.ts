/**
 * Dialogue (對話) or essay (短文): the one rule for telling them apart. Books number their parts
 * differently (Book 1: dialogues 1–2, essay 3; Book 3: dialogue 1, essay 2), so the book's own
 * heading decides, not the part number.
 */
interface ReadingShape {
  title?: string;
  setting?: string;
  paragraphs?: Array<{ speaker?: string }>;
}

/** Narration lines: no speaker, or the books' narrator label (旁白 / narrator). */
export function isNarratorSpeaker(speaker?: string | null): boolean {
  const name = speaker?.trim().toLowerCase() ?? '';
  return name === '' || name === 'narrator' || name === '旁白';
}

const heading = (text?: string) => text?.split(' · ')[0].trim() ?? '';

export function isEssayReading(reading?: ReadingShape | null): boolean {
  if (!reading) return false;
  if (heading(reading.title).startsWith('對話')) return false;
  if (heading(reading.title).startsWith('短文') || heading(reading.setting).startsWith('短文')) return true;
  const paragraphs = reading.paragraphs ?? [];
  return paragraphs.length > 0 && paragraphs.every((paragraph) => isNarratorSpeaker(paragraph.speaker));
}
