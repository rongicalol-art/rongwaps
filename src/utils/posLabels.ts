/**
 * Pure lookup helpers over the part-of-speech content in
 * `src/data/posInfo.ts`. Compound tags (`N/M`, `Vst/Prep`) resolve from
 * their first part. Explanations with `{zh:key}` tokens follow the
 * learner's script preference (traditional by default, matching the app).
 */
import { POS_FALLBACK, POS_INFO, type PosCategory } from '../data/posInfo';

export type ScriptPreference = 'traditional' | 'simplified';

/** First code of a compound tag, trimmed; empty string when none. */
function firstPosCode(pos: string): string {
  const trimmed = pos.trim();
  if (!trimmed) return '';
  return trimmed.split('/').map((part) => part.trim()).filter(Boolean)[0] ?? '';
}

/** Resolves the info for one tag code, falling back to the generic entry. */
function resolveInfo(pos: string | null | undefined) {
  const code = firstPosCode(pos ?? '');
  return (code && POS_INFO[code]) || POS_FALLBACK;
}

const ZH_TOKEN_PATTERN = /\{zh:([A-Za-z0-9-]+)\}/g;

/**
 * Expands a raw POS tag into a learner-facing label, or null when the card
 * has no tag. Compound tags (`N/M`, `Vst/Prep`) become joined labels such
 * as "Noun / Measure word"; unknown codes pass through as-is.
 */
export function formatPosLabel(pos: string | null | undefined): string | null {
  if (!pos) return null;
  const trimmed = pos.trim();
  if (!trimmed) return null;
  return trimmed
    .split('/')
    .map((part) => {
      const code = part.trim();
      return (code && POS_INFO[code]?.label) || code;
    })
    .filter(Boolean)
    .join(' / ');
}

/** Color category for a tag, used by the badge tint. */
export function getPosCategory(pos: string | null | undefined): PosCategory {
  return resolveInfo(pos).category;
}

/**
 * Learner-friendly explanation shown in the badge tooltip. Chinese example
 * tokens are rendered in the requested script; unknown codes fall back to
 * their simplified form.
 */
export function getPosExplanation(
  pos: string | null | undefined,
  script: ScriptPreference = 'traditional',
): string {
  const info = resolveInfo(pos);
  if (!info.zhTokens) return info.explanation;
  const variant = script === 'traditional' ? 't' : 's';
  return info.explanation.replace(
    ZH_TOKEN_PATTERN,
    (match, key: string) => info.zhTokens?.[key]?.[variant] ?? info.zhTokens?.[key]?.s ?? match,
  );
}

/** Chinese term (e.g. 名词) for the tooltip, when one exists. */
export function getPosChineseTerm(pos: string | null | undefined): string | null {
  return resolveInfo(pos).zh ?? null;
}
