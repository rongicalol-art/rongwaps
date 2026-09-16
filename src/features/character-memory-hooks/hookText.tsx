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
  | { kind: 'token'; glyph: string; label: string };

/**
 * Component tokens are stored as `字(label)`; the artifacts carry occasional
 * spaced variants (`字 (label)`) from older generators. Pure-English
 * parentheticals (e.g. the sanctioned "as the sound component (qīng -> qǐng)")
 * never match because the gloss needs a Han glyph immediately before the `(`.
 */
const HOOK_TOKEN = /([\p{Script=Han}]+)\s*\(([^()]+)\)/gu;

/** Splits a hook into plain-text runs and `字(label)` gloss segments. */
export function tokenizeHookText(text: string): HookTextSegment[] {
  const segments: HookTextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(HOOK_TOKEN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ kind: 'text', text: text.slice(lastIndex, index) });
    segments.push({ kind: 'token', glyph: match[1], label: match[2].trim() });
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
      <strong key={index} className="font-black text-ui-ink-strong">
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/**
 * Renders a hook for display: `字(label)` glosses drop the parentheses and
 * bold the label (`口 mouth`) so the Chinese glyph can never be confused with
 * the `→` separator or punctuation, and `**emphasis**` stays supported.
 */
export function renderHookText(text: string): ReactNode {
  return tokenizeHookText(text).map((segment, index) =>
    segment.kind === 'token' ? (
      <span key={index}>
        {segment.glyph}
        {' '}
        <strong className="font-black text-ui-ink-strong">{segment.label}</strong>
      </span>
    ) : (
      <span key={index}>{renderEmphasis(segment.text)}</span>
    ),
  );
}
