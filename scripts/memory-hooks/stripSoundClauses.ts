/**
 * Mechanical removal of sound-cue language from hooks (meaning-only era).
 *
 * Handles the observed corpus phrasings only. Trailing clauses are removed
 * cleanly; mid-sentence sound phrases are removed and the hook is marked
 * `needsRewrite` so the repair loop regenerates it. Clean hooks pass through
 * untouched.
 */

export interface StripResult {
  hook: string;
  changed: boolean;
  needsRewrite: boolean;
  removed: string[];
}

const TRAILING_CLAUSE = /\s*[;—]\s*[^;—.!?]*\b(?:lends?\s+the\s+sound|sound\s+(?:cue|component|rolls|rises|rising|softening|shifts)|is\s+the\s+sound)\b[^.!?]*[.!?]?/gi;
const AND_IS_THE_SOUND = /\s*,\s*and\s+[a-züāáǎàēéěèīíǐìōóǒòūúǔù]+\s+is\s+the\s+sound:\s*/gi;
const AS_SOUND_PHRASE = /\s+as\s+the\s+sound\s+(?:component|cue)\s*\([^)]*\)/gi;
const THE_SOUND_OF = /\s+the\s+(\S+\([^)]*\))\s+sound\b/gi;
const SOUND_CARRIES = /\bthe\s+(\S+\([^)]*\))\s+sound\s+carries\s+/gi;
const PINYIN_SHIFT = /\s*[a-züāáǎàēéěèīíǐìōóǒòūúǔù]+\s+(?:deepening|softening|rising|rolling)\s+to\s+[a-züāáǎàēéěèīíǐìōóǒòūúǔù]+/gi;
const PINYIN_MARKS = /\s*[a-züāáǎàēéěèīíǐìōóǒòūúǔù]+\s+marks\s+/gi;

export function stripSoundClauses(hook: string): StripResult {
  let text = hook;
  const removed: string[] = [];
  let midSentence = false;

  const replace = (pattern: RegExp, replacement: string | ((...groups: string[]) => string)): boolean => {
    let matched = false;
    text = text.replace(pattern, (...args: unknown[]) => {
      matched = true;
      const whole = String(args[0]);
      removed.push(whole.trim());
      if (typeof replacement === 'function') return replacement(...(args.slice(1, -2).map(String)));
      return replacement;
    });
    return matched;
  };

  replace(TRAILING_CLAUSE, '');
  replace(AND_IS_THE_SOUND, '→ ');
  if (replace(AS_SOUND_PHRASE, '')) midSentence = true;
  if (replace(THE_SOUND_OF, (token) => ` ${token} `)) midSentence = true;
  if (replace(SOUND_CARRIES, (token) => `${token} carries `)) midSentence = true;
  if (replace(PINYIN_SHIFT, '')) midSentence = true;
  if (replace(PINYIN_MARKS, '')) midSentence = true;

  text = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/—\s*→/g, '→')
    .replace(/→\s*→/g, '→')
    .replace(/([a-z)\]])(→)/gi, '$1 $2')
    .replace(/([^.!?])(\s*)$/, '$1.')
    .replace(/→\s*([^\s])/g, '→ $1')
    .replace(/\s+→/g, ' →')
    .trim();

  const changed = text !== hook;
  const leftover = /\bsound\b|->|deepening|softening|rising|rolling|\bmarks\b/i.test(text);
  return { hook: text, changed, needsRewrite: changed && (midSentence || leftover), removed };
}

const isMain = process.argv[1]?.endsWith('stripSoundClauses.ts');
if (isMain) {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const path = resolve(import.meta.dirname, '../../output/memory-hooks/review/char-sound-scan-v1.json');
  const items = JSON.parse(readFileSync(path, 'utf8')).items as Array<{ character: string; hook: string; soundFree: boolean }>;
  for (const item of items.filter((entry) => !entry.soundFree)) {
    const result = stripSoundClauses(item.hook);
    console.log(`${item.character} [${result.needsRewrite ? 'REWRITE' : 'strip'}]`);
    console.log(`  after:  ${result.hook}`);
  }
}
