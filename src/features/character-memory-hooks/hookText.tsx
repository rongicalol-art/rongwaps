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
  | { kind: 'glyphRef'; glyphs: string[] };

/**
 * One bold tone for every emphasis in a hook: darker than body ink (`ui-ink`)
 * but softer than the near-black heading tone. 85% opacity would cross lighter
 * than the body text over the cream card, so 90% is the floor for "darker than
 * normal".
 */
const EMPHASIS_CLASS = 'font-black text-ui-ink-strong/90';

/**
 * Component tokens are stored as `字(label)` (older generators wrote
 * `字 (label)`), and legacy word hooks carry glyph references as `(字)` or
 * glyph groups as `(字 + 字)`. Pure-English parentheticals — e.g. the
 * sanctioned "as the sound component (qīng -> qǐng)" — never match because
 * every alternative requires a Han glyph next to the parenthesis.
 */
function hookTokenPattern(): RegExp {
  return /([\p{Script=Han}]+)\s*\(([^()]+)\)|\(([\p{Script=Han}]+(?:\s*\+\s*[\p{Script=Han}]+)+)\)|\(([\p{Script=Han}]+)\)/gu;
}

/** Splits a hook into plain-text runs, `字(label)` glosses and `(字)` references. */
export function tokenizeHookText(text: string): HookTextSegment[] {
  const segments: HookTextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(hookTokenPattern())) {
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ kind: 'text', text: text.slice(lastIndex, index) });
    if (match[1]) {
      segments.push({ kind: 'token', glyph: match[1], label: match[2].trim() });
    } else if (match[3]) {
      segments.push({ kind: 'glyphRef', glyphs: match[3].split(/\s*\+\s*/) });
    } else if (match[4]) {
      segments.push({ kind: 'glyphRef', glyphs: [match[4]] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ kind: 'text', text: text.slice(lastIndex) });
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
 * bold the label (`口 mouth`), legacy `(字)` / `(字 + 字)` references bold the
 * glyphs instead, and `**emphasis**` stays supported.
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
    if (segment.kind === 'glyphRef') {
      return (
        <span key={index}>
          {segment.glyphs.flatMap((glyph, glyphIndex) =>
            glyphIndex === 0
              ? [<strong key={glyphIndex} className={EMPHASIS_CLASS}>{glyph}</strong>]
              : [' + ', <strong key={glyphIndex} className={EMPHASIS_CLASS}>{glyph}</strong>],
          )}
        </span>
      );
    }
    return <span key={index}>{renderEmphasis(segment.text)}</span>;
  });
}
