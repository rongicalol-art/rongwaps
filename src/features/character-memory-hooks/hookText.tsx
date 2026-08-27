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

/** Generated hooks use `**emphasis**`; render it as real bold instead of raw asterisks. */
export function renderHookText(text: string): ReactNode {
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
