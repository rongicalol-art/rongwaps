/**
 * Character pronunciation (public/data/pronunciation/pronunciation.json): the single owner of
 * "which pinyin does the app show for a character". Taiwan-first — the course
 * reading leads, then CC-CEDICT's "Taiwan pr." over the mainland one.
 *
 * Pack value per character: readings joined by "|", in display order.
 *   "shéi|shuí~"     — "~" marks a same-meaning variant (also read shuí)
 *   "xíng|háng:銀行" — an unmarked extra is a different-meaning reading,
 *                      with its most common example word after ":"
 */
export type ReadingKind = 'primary' | 'variant' | 'other';

export interface Reading {
  pinyin: string;
  kind: ReadingKind;
  /** A common word using this reading (different-meaning readings only). */
  example?: string;
}

export type ReadingsIndex = Map<string, Reading[]>;

export function parseReadings(value: string): Reading[] {
  return value.split('|').filter(Boolean).map((part, index) => {
    const [head, example] = part.split(':');
    const variant = head.endsWith('~');
    const pinyin = variant ? head.slice(0, -1) : head;
    return { pinyin, kind: index === 0 ? 'primary' : variant ? 'variant' : 'other', ...(example ? { example } : {}) };
  });
}

export function formatReadings(readings: readonly Reading[]): string {
  return readings
    .map((reading) => `${reading.pinyin}${reading.kind === 'variant' ? '~' : ''}${reading.example ? `:${reading.example}` : ''}`)
    .join('|');
}

/** Every reading of a character, primary first; [] when unknown. */
export function allReadings(char: string | undefined, index: ReadingsIndex | null): Reading[] {
  return (char && index?.get(char)) || [];
}

/** The reading to show for a character, else `fallback` (e.g. breakdown pinyin) while unknown. */
export function primaryReading(char: string | undefined, index: ReadingsIndex | null, fallback?: string | null): string | undefined {
  return allReadings(char, index)[0]?.pinyin ?? (fallback?.trim() || undefined);
}

const toneless = (pinyin: string) => pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const INITIAL_RE = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(.*)$/;

/** How close two readings sound: same syllable 3, same rhyme 2, same initial 1, else 0. */
function closeness(a: string, b: string): number {
  const x = toneless(a);
  const y = toneless(b);
  if (x === y) return 3;
  const [, initialX = '', finalX = ''] = INITIAL_RE.exec(x) ?? [];
  const [, initialY = '', finalY = ''] = INITIAL_RE.exec(y) ?? [];
  if (finalX && finalX === finalY) return 2;
  return initialX && initialX === initialY ? 1 : 0;
}

/**
 * The pair of readings that explains a sound clue: of every character reading
 * × part reading, the closest sounding (誰 shéi/shuí × 隹 zhuī → shuí, zhuī).
 * Ties keep the primary readings. Undefined members when a side is unknown.
 */
export function soundPair(
  charReadings: readonly string[],
  partReadings: readonly string[],
): { char?: string; part?: string } {
  let best = { char: charReadings[0], part: partReadings[0], score: -1 };
  for (const char of charReadings) {
    for (const part of partReadings) {
      const score = closeness(char, part);
      if (score > best.score) best = { char, part, score };
    }
  }
  return { char: best.char, part: best.part };
}
