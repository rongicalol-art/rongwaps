/**
 * Frozen review rubric for Book 1 character hooks in the meaning-only era.
 *
 * The policy split (2026-09-22): a memory hook carries only meaning work —
 * parts → scene → meaning. Everything phonetic lives in the Sound block and is
 * never part of a hook. Labels must come from the component ledger; archaic
 * pieces get a documented sense with a sourceRef or stay reading-only.
 *
 * This module is the single source for scan patterns, strip logic, the
 * TypeSafe question set, and the review page. STYLE.md is updated from it once
 * the review round settles.
 */

export const RUBRIC_VERSION = 'book-1-meaning-only-v1';

export const MEANING_HOOK_RULES: string[] = [
  'A memory hook carries meaning work only: parts → one concrete scene → the target meaning.',
  'Use 字(label) tokens for every component you mention — the app bolds the label. Never write a component as bare English.',
  'Walk the components in breakdown order, using only ledger labels or readings.',
  'Never invent a meaning for a piece, and never present a reading as a meaning.',
  'Every prop and action must trace to one of the character\'s own parts.',
  'No sound content: no pinyin, no "lends the sound", no sound shifts, no pronunciation notes.',
  'End on the target as 字(meaning); exactly one arrow; the target appears once, at the very end.',
  'Keep it short and simple: one sentence, one action, 25–170 characters of hook text, at most 15 words of prose, at most two commas.',
  'Use each component\'s ledger label as-is (one to three words); never re-describe a piece in your own words.',
  'No grammar metalanguage; no invented history; never write variant, archaic, ancient, old form, old version, or "the name of".',
];

export const SOUND_BLOCK_RULES: string[] = [
  'The Sound block is purely phonetic: pinyin, phonetic piece, its reading, the shift, and the sound family.',
  'It never carries a mnemonic, scene, or story.',
  'Readings come from the ledger or the dictionary; ambiguous pieces route to human review.',
];

export const LABEL_RULES: string[] = [
  'Labels come from the component ledger: a reviewed label, a documented dictionary sense, or a reading.',
  'Archaic pieces get their documented sense with a sourceRef (啚 → 鄙: mean, low, rustic), otherwise a reading.',
  'Legacy raw glosses are placeholders until confirmed; they are listed as gaps for human review.',
];

/** Sound-cue phrasings a meaning-only hook must not contain. */
export const SOUND_LANGUAGE_PATTERNS: RegExp[] = [
  /lends?\s+the\s+sound/i,
  /as\s+the\s+sound\s+(?:component|cue)/i,
  /\bis\s+the\s+sound\b/i,
  /\bsound\s+(?:component|cue|shifts?|rising|softening|rolls|carries)\b/i,
  /\)\s*sound\s*(?:→|->|:)/i,
  /\bsound\s*(?:→|->)/i,
  /\b(?:deepening|softening|rising)\s+to\s+[a-züāáǎàēéěèīíǐìōóǒòūúǔù]/i,
  /\bcalls?\s+with\b/i,
  /\(\s*[a-züāáǎàēéěèīíǐìōóǒòūúǔù]+\s*(?:->|→)\s*[a-züāáǎàēéěèīíǐìōóǒòūúǔù]+\s*\)/,
  /\bpronounced\b/i,
  /\bhomophone\b/i,
  /\bthe\s+reading\b/i,
];

/** Returns the sound-language snippets found in a hook, empty when clean. */
export function findSoundLanguage(hook: string): string[] {
  const matches: string[] = [];
  for (const pattern of SOUND_LANGUAGE_PATTERNS) {
    const match = hook.match(pattern);
    if (match) matches.push(match[0]);
  }
  return matches;
}

/** Words a meaning hook must never contain (variant/etymology framing). */
export const BANNED_HOOK_WORDS = /\b(?:variant|archaic|ancient)\b|old\s+(?:form|version|variant)|the\s+name\s+of/i;

/** Template declaration language that reads like a database row, not a memory. */
export const TEMPLATE_PATTERNS: RegExp[] = [
  /\brests\s+(?:with|on)\s+the\s+[^,.;→]*\bsound\b/i,
  /\bstands\s+as\s+the\s+sound\b/i,
  /\bas\s+the\s+sound\s+component\b/i,
];

export interface HookShape {
  soundSnippets: string[];
  templateSnippets: string[];
}

/** Mechanical shape classification used by the scan and the gold-set builder. */
export function classifyHookShape(hook: string): HookShape {
  return {
    soundSnippets: findSoundLanguage(hook),
    templateSnippets: TEMPLATE_PATTERNS.flatMap((pattern) => {
      const match = hook.match(pattern);
      return match ? [match[0]] : [];
    }),
  };
}
