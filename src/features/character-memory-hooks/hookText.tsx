import type { ReactNode } from 'react';

/** Mnemonics may be stored as plain text or a JSONB object with a text field. */
export function normalizeMnemonic(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text.length > 0 ? text : null;
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const key of ['hook', 'mnemonic', 'story']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
  }
  return null;
}

export type HookTextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'token'; glyph: string; label: string }
  | { kind: 'glyphRef'; glyphs: string[] }
  | { kind: 'gloss'; word: string };

/**
 * One bold tone for every emphasis in a hook: darker than body ink (`ui-ink`)
 * but softer than the near-black heading tone. 85% opacity would cross lighter
 * than the body text over the cream card, so 90% is the floor for "darker than
 * normal".
 */
const EMPHASIS_CLASS = 'font-black text-ui-ink-strong/90';

/** Glue words that are never the gloss a `(字)` reference stands for. */
const GLOSS_SKIP = new Set([
  'of', 'to', 'a', 'an', 'the', 'and', 'in', 'on', 'at', 'its', 'that', 'this',
  'you', 'your', 'my', 'me', 'so', 'but', 'or', 'as', 'by', 'from', 'with',
]);

/**
 * The last word of `text` that can be the English gloss of a following `(字)`
 * reference — quote marks and apostrophes around it stay outside the bold span
 * (`'day'` → bold `day`, `household'` → bold `household`), and glue words are
 * skipped (`…hear of (聽說)` → bold `hear`).
 */
function splitTrailingGloss(text: string): { head: string; word: string; tail: string } | null {
  const tokens: Array<{ value: string; index: number }> = [];
  for (const match of text.matchAll(/\S+/gu)) tokens.push({ value: match[0], index: match.index ?? 0 });
  for (let index = tokens.length - 1, checked = 0; index >= 0 && checked < 4; index -= 1, checked += 1) {
    const token = tokens[index];
    const coreMatch = token.value.match(/[\p{L}][\p{L}'-’]*/u);
    if (!coreMatch || coreMatch.index === undefined) return null;
    // A trailing apostrophe is a closing quote, not part of the gloss.
    const word = coreMatch[0].replace(/['’]+$/u, '');
    if (!word) return null;
    if (GLOSS_SKIP.has(word.toLowerCase())) continue;
    const wordStart = token.index + coreMatch.index;
    return {
      head: text.slice(0, wordStart),
      word,
      tail: text.slice(wordStart + word.length),
    };
  }
  return null;
}

/**
 * Component tokens are stored as `字(label)` (older generators wrote
 * `字 (label)`), and legacy word hooks carry glyph references as `(字)` or
 * glyph groups as `(字 + 字)` — there the English gloss sits just before the
 * parenthesis and carries the emphasis. Pure-English parentheticals — e.g.
 * the sanctioned "as the sound component (qīng -> qǐng)" — never match
 * because every alternative requires a Han glyph next to the parenthesis.
 */
function hookTokenPattern(): RegExp {
  return /([\p{Script=Han}]+)\s*\(([^()]+)\)|\(([\p{Script=Han}]+(?:\s*\+\s*[\p{Script=Han}]+)+)\)|\(([\p{Script=Han}]+)\)/gu;
}

/** Splits a hook into plain-text runs, `字(label)` glosses and `(字)` references. */
export function tokenizeHookText(text: string): HookTextSegment[] {
  const raw: HookTextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(hookTokenPattern())) {
    const index = match.index ?? 0;
    if (index > lastIndex) raw.push({ kind: 'text', text: text.slice(lastIndex, index) });
    if (match[1]) {
      raw.push({ kind: 'token', glyph: match[1], label: match[2].trim() });
    } else if (match[3]) {
      raw.push({ kind: 'glyphRef', glyphs: match[3].split(/\s*\+\s*/) });
    } else if (match[4]) {
      raw.push({ kind: 'glyphRef', glyphs: [match[4]] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) raw.push({ kind: 'text', text: text.slice(lastIndex) });

  // A glyph reference takes its emphasis from the English gloss just before it.
  const segments: HookTextSegment[] = [];
  for (const segment of raw) {
    if (segment.kind === 'glyphRef') {
      const previous = segments[segments.length - 1];
      if (previous && previous.kind === 'text') {
        const split = splitTrailingGloss(previous.text);
        if (split) {
          segments[segments.length - 1] = { kind: 'text', text: split.head };
          segments.push({ kind: 'gloss', word: split.word });
          if (split.tail) segments.push({ kind: 'text', text: split.tail });
        }
      }
    }
    segments.push(segment);
  }
  return segments;
}

/** Generated hooks use `**emphasis**`; render it as real bold instead of raw asterisks. */
function renderEmphasis(text: string): ReactNode {
  const parts = text.split('**');
  if (parts.length < 3) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className={EMPHASIS_CLASS}>
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/**
 * Renders a hook for display: `字(label)` glosses drop the parentheses and
 * bold the English label (`口 mouth`); legacy `(字)` / `(字 + 字)` references
 * bold the English word they gloss (`Knowing the **way** 道`) with the glyph
 * left plain; `**emphasis**` stays supported.
 */
export function renderHookText(text: string): ReactNode {
  return tokenizeHookText(text).map((segment, index) => {
    if (segment.kind === 'token') {
      return (
        <span key={index}>
          {segment.glyph}
          {' '}
          <strong className={EMPHASIS_CLASS}>{segment.label}</strong>
        </span>
      );
    }
    if (segment.kind === 'gloss') {
      return <strong key={index} className={EMPHASIS_CLASS}>{segment.word}</strong>;
    }
    if (segment.kind === 'glyphRef') {
      return (
        <span key={index}>
          {segment.glyphs.flatMap((glyph, glyphIndex) =>
            glyphIndex === 0 ? [glyph] : [' + ', glyph],
          )}
        </span>
      );
    }
    return <span key={index}>{renderEmphasis(segment.text)}</span>;
  });
}
