/**
 * The memory-hook formula, prompt-ready — meaning-only era.
 *
 * Every generation, critic, and repair prompt embeds these rules. Sound work
 * lives in the Sound block (`public/data/sound-hooks/`), never in a hook.
 * See STYLE.md for the human version.
 */
export const HOOK_FORMULA_RULES: string[] = [
  'Use 字(label) tokens for every component you mention — the app bolds the label. Never write a component as bare English.',
  'End the hook on the target itself as 字(meaning), exactly once, as the final token.',
  'Keep it short and simple: one sentence, one action, 25–170 characters of hook text, at most 15 words of prose, at most two commas.',
  'A taught character keeps its taught meaning. Never invent a shape or etymology sense for it.',
  'Use only labels from the component ledger. Never claim a meaning for a sound-only piece; use its reading instead.',
  'Walk the components in breakdown order: top/left/outer first, then bottom/right/inner.',
  'Every prop and action must come from the character\'s own parts. No dangling props.',
  'The chain parts → action → meaning must be retellable without inventing anything.',
  'No sound content at all: no pinyin, no "lends the sound", no sound shifts, no pronunciation notes.',
  'No variant/etymology framing: never write variant, archaic, ancient, old form, old version, or "the name of".',
  'No history or origin claims unless the origin is real and checkable (馬上, 東西). Never invent a story.',
  'Keep the same label for the same glyph across hooks.',
  'Characters of a multi-character word are named in word order, each with its own gloss.',
  'For a doubled word (弟弟, 謝謝) mention the character once and say "said twice".',
  'No grammar metalanguage in prose: no "particle", "measure word", "classifier", "possessive".',
  'Use only Han characters that appear in the target character/word; never borrow another character for the story.',
  'One "→" before the target meaning is enough (or ":"). No dangling or repeated arrows.',
  'Match articles to the label sound: "An 矢(arrow)", "A 口(mouth)".',
];

/** Exact phrases retired by review; the acceptance suite fails if any ship. */
export const BANNED_PHRASES: RegExp[] = [
  /calls with/i,
  /hand\s*[—-]\s*also/i,
  /is the sound component\s*\([^)]*\)\s*:/i,
  /\b(?:lends? the sound|sound component|sound cue|sound shifts?)\b/i,
  /\b(?:variant|archaic|ancient)\b|old\s+(?:form|version)|the\s+name\s+of/i,
];

/** One compact paragraph for prompt headers. */
export function formulaSummary(): string {
  return [
    'Write one meaning-only memory hook. Bold comes from 字(label) tokens only.',
    'Taught meanings win, ledger labels only, readings for sound-only pieces.',
    'Parts in breakdown order, no dangling props, real origins only, no sound content.',
    'Short and simple: parts → one action → meaning, ending on 字(meaning).',
  ].join(' ');
}
