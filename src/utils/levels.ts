import type { LevelIndex } from './packValidators';

/**
 * TOCFL level resolution. Levels live on the TBCL 1–7 scale. `tbcl` is the
 * official list, `hsk` fills gaps (converted to the TBCL scale at build time),
 * `estimate` is computed here from a word's characters and never stored;
 * `rare` marks hanzi on neither list (beyond C2), and words containing one.
 */
export type LevelSource = 'tbcl' | 'hsk' | 'estimate' | 'rare';

/** Level for hanzi outside both lists — past the top TBCL level (7). */
export const RARE_LEVEL = 8;

export interface ResolvedLevel {
  level: number;
  source: LevelSource;
}

const LABELS = ['Novice', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Rare'];

/** TOCFL label for a TBCL level (1–7): Novice A1 A2 B1 B2 C1 C2; 8 = Rare. */
export function tocflLabel(level: number): string {
  return LABELS[Math.min(Math.max(level, 1), RARE_LEVEL) - 1];
}

/** Coarse TOCFL band: Novice/A1/A2 → A, B1/B2 → B, C1/C2 → C. */
export function tocflBand(level: number): 'A' | 'B' | 'C' {
  return level <= 3 ? 'A' : level <= 5 ? 'B' : 'C';
}

/** The level when it comes from an official list (TBCL or New HSK); undefined for estimates and rare. */
export function officialLevel(resolved: ResolvedLevel | null | undefined): number | undefined {
  return resolved && (resolved.source === 'tbcl' || resolved.source === 'hsk') ? resolved.level : undefined;
}

const HAN = /\p{Script=Han}/u;
/** Radical combining forms (亻 氵 宀 …): parts, not vocabulary, so never "rare". */
const COMBINING_FORMS = new Set(Array.from('亻氵扌忄宀艹讠钅饣纟刂阝辶廴礻衤犭灬罒癶疒冖亠彳攵夂丬爫忄⺈⺊⺌⺍⺗⻊⻏⻖⺮⺶⺼⻌⻍⻎⺆⺄⺧⺈乚亅丿丶丨'));
const PAREN_CONTENT = /[（(][^）)]*[）)]/g;
const PAREN_MARKS = /[（()）]/g;
const TRAILING = /[…。.,，、！？!?；;：:\s]+$/u;

function lookup(text: string, index: LevelIndex): ResolvedLevel | null {
  const tbcl = index.tbcl.words.get(text);
  if (tbcl !== undefined) return { level: tbcl, source: 'tbcl' };
  const hsk = index.hsk.words.get(text);
  if (hsk !== undefined) return { level: hsk, source: 'hsk' };
  return null;
}

function charLookup(char: string, index: LevelIndex): ResolvedLevel | null {
  const tbcl = index.tbcl.chars.get(char);
  if (tbcl !== undefined) return { level: tbcl, source: 'tbcl' };
  const hsk = index.hsk.chars.get(char);
  if (hsk !== undefined) return { level: hsk, source: 'hsk' };
  return null;
}

/** Candidate forms of a dictionary-style headword: "/" alternatives, optional parts with and without. */
function normalizedForms(text: string): string[] {
  const forms: string[] = [];
  for (const part of text.split('/')) {
    for (const form of [part.replace(PAREN_CONTENT, ''), part.replace(PAREN_MARKS, '')]) {
      const trimmed = form.trim().replace(TRAILING, '');
      if (trimmed && !forms.includes(trimmed)) forms.push(trimmed);
    }
  }
  return forms;
}

export function resolveLevel(text: string | undefined, index: LevelIndex | null): ResolvedLevel | null {
  if (!text || !index) return null;
  // A single character's official TBCL level beats any HSK gap-fill entry.
  if (Array.from(text).length === 1) {
    const official = index.tbcl.words.get(text) ?? index.tbcl.chars.get(text);
    if (official !== undefined) return { level: official, source: 'tbcl' };
  }
  const exact = lookup(text, index);
  if (exact) return exact;

  const forms = normalizedForms(text);
  for (const form of forms) {
    const found = lookup(form, index);
    if (found) return found;
  }

  if (Array.from(text).length === 1) {
    const single = charLookup(text, index);
    if (single) return single;
  }
  for (const form of forms) {
    if (Array.from(form).length === 1) {
      const single = charLookup(form, index);
      if (single) return single;
    }
  }

  const han = forms.map((form) => Array.from(form).filter((char) => HAN.test(char))).find((chars) => chars.length > 0);
  if (!han) return null;
  const rare: ResolvedLevel = { level: RARE_LEVEL, source: 'rare' };
  if (han.length === 1) return charLookup(han[0], index) ?? (COMBINING_FORMS.has(han[0]) ? null : rare);
  let max = 0;
  for (const char of han) {
    const resolved = charLookup(char, index);
    if (!resolved) return rare;
    max = Math.max(max, resolved.level);
  }
  return { level: Math.min(7, max + 1), source: 'estimate' };
}
