export type SpeakerGender = 'female' | 'male' | 'unknown';

const FEMALE_NAMES = new Set(['宜文', '友美', '元真', '媽媽', '女店員', '老師']);
const MALE_NAMES = new Set(['中明', '國安', '家樂', '醫生']);

// High-contrast, easily distinguishable hues for females in the same dialogue
const FEMALE_PALETTE = ['bg-rose-500', 'bg-purple-500', 'bg-amber-500', 'bg-fuchsia-500'];

// High-contrast, easily distinguishable hues for males in the same dialogue
const MALE_PALETTE = ['bg-sky-500', 'bg-emerald-500', 'bg-indigo-600', 'bg-teal-500'];

// Vibrant neutral fallbacks for other characters
const NEUTRAL_PALETTE = ['bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-pink-400'];

/**
 * Builds a distinct speaker-to-color map for a dialogue so that
 * no two speakers in the same conversation share the same or similar colors.
 */
export function getDialogueSpeakerColorMap(
  paragraphs: Array<{ speaker?: string }>,
): Map<string, string> {
  const speakers = Array.from(
    new Set(paragraphs.map((p) => p.speaker).filter(Boolean)),
  ) as string[];
  const colorMap = new Map<string, string>();

  let femaleIdx = 0;
  let maleIdx = 0;
  let neutralIdx = 0;

  for (const speaker of speakers) {
    if (FEMALE_NAMES.has(speaker) || /[女媽妹姐娘]/.test(speaker)) {
      colorMap.set(speaker, FEMALE_PALETTE[femaleIdx % FEMALE_PALETTE.length]);
      femaleIdx++;
    } else if (MALE_NAMES.has(speaker) || /[男爸弟哥叔爺伯公]/.test(speaker)) {
      colorMap.set(speaker, MALE_PALETTE[maleIdx % MALE_PALETTE.length]);
      maleIdx++;
    } else {
      colorMap.set(speaker, NEUTRAL_PALETTE[neutralIdx % NEUTRAL_PALETTE.length]);
      neutralIdx++;
    }
  }

  return colorMap;
}

export function getSpeakerDotColor(
  speaker: string,
  colorMap?: Map<string, string>,
): string {
  if (colorMap?.has(speaker)) {
    return colorMap.get(speaker)!;
  }

  if (FEMALE_NAMES.has(speaker) || /[女媽妹姐娘]/.test(speaker)) {
    return 'bg-rose-500';
  }
  if (MALE_NAMES.has(speaker) || /[男爸弟哥叔爺伯公]/.test(speaker)) {
    return 'bg-sky-500';
  }

  return 'bg-ui-muted';
}

