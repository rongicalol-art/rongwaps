/**
 * Modern-Mandarin sound grading for phonetic components.
 *
 * Pure pinyin helpers shared by the parts-index build (scripts/relations/buildParts.ts)
 * and the phonetic source refresh (scripts/phonetic/soundMap.ts). A part's sound
 * "predicts" a character when the two read the same (same / tone), or share an
 * audible anchor a beginner can hear (close). Historical-only links grade "far".
 */

export function cleanPinyinStr(raw: string): string {
  if (!raw) return '';
  const noParens = raw.replace(/\([^)]*\)/g, '');
  const first = noParens.split('/')[0].trim();
  return first.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

function normalizePinyin(initial: string, final: string, raw: string): { initial: string; final: string; raw: string } {
  let normInitial = initial;
  let normFinal = final;

  if (initial === 'w') {
    normInitial = '';
    if (final === 'u') normFinal = 'u';
    else if (final === 'o') normFinal = 'uo';
    else if (final === 'ei') normFinal = 'uei';
    else if (final === 'en') normFinal = 'uen';
    else normFinal = 'u' + final;
  } else if (initial === 'y') {
    normInitial = '';
    if (final === 'i') normFinal = 'i';
    else if (final === 'in') normFinal = 'in';
    else if (final === 'ing') normFinal = 'ing';
    else if (final === 'u') normFinal = 'v';
    else if (final === 'ue') normFinal = 've';
    else if (final === 'uan') normFinal = 'van';
    else if (final === 'un') normFinal = 'vn';
    else normFinal = 'i' + final;
  }

  if (normFinal === 'iu') normFinal = 'iou';
  if (normFinal === 'ui') normFinal = 'uei';
  if (normFinal === 'un') normFinal = 'uen';

  return { initial: normInitial, final: normFinal, raw };
}

export function parsePinyin(raw: string): { initial: string; final: string; raw: string } {
  const p = cleanPinyinStr(raw);
  if (!p) return { initial: '', final: '', raw: '' };
  const m = p.match(/^(zh|ch|sh|[bcdfghjklmnpqrstwxyz])/);
  const initial = m ? m[1] : '';
  const final = p.slice(initial.length);
  return normalizePinyin(initial, final, p);
}

const COGNATE_INITIAL_GROUPS: Array<Set<string>> = [
  new Set(['b', 'p', 'm', 'f']),
  new Set(['d', 't', 'n', 'l']),
  new Set(['d', 't', 'zh', 'ch']),
  new Set(['g', 'k', 'h']),
  new Set(['j', 'q', 'x', 'g', 'k', 'h']),
  new Set(['j', 'q', 'x', 'z', 'c', 's', 'zh', 'ch', 'sh']),
  new Set(['z', 'c', 's', 'zh', 'ch', 'sh', 'r']),
];

function areInitialsCognate(i1: string, i2: string): boolean {
  if (i1 === i2) return true;
  if (!i1 || !i2) {
    const other = i1 || i2;
    return other === 'y' || other === 'w' || other === 'h';
  }
  for (const group of COGNATE_INITIAL_GROUPS) {
    if (group.has(i1) && group.has(i2)) return true;
  }
  return false;
}

function getRhymeCore(final: string): string {
  let core = final;
  if (core.length > 1 && (core.startsWith('i') || core.startsWith('u') || core.startsWith('v'))) {
    const rest = core.slice(1);
    if (rest === 'a' || rest === 'o' || rest === 'e' || rest.startsWith('a') || rest.startsWith('e') || rest.startsWith('o') || rest.startsWith('n') || rest.startsWith('ng')) {
      core = rest;
    }
  }
  return core;
}

function areFinalsCompatible(f1: string, f2: string): boolean {
  if (f1 === f2) return true;
  if (!f1 || !f2) return false;

  const c1 = getRhymeCore(f1);
  const c2 = getRhymeCore(f2);
  if (c1 === c2) return true;

  if (f1.endsWith('ng') && f2.endsWith('ng')) return true;
  if (f1.endsWith('n') && f2.endsWith('n') && !f1.endsWith('ng') && !f2.endsWith('ng')) return true;

  if ((f1.includes('uo') || f1 === 'o') && f2.includes('a')) return true;
  if ((f2.includes('uo') || f2 === 'o') && f1.includes('a')) return true;
  if (f1.includes('ai') && f2.includes('ei')) return true;
  if (f2.includes('ai') && f1.includes('ei')) return true;
  if (f1.includes('e') && (f2.includes('uo') || f2 === 'o')) return true;
  if (f2.includes('e') && (f1.includes('uo') || f1 === 'o')) return true;
  if ((f1 === 'e' || f1 === 'i' || f1 === 'ie') && (f2 === 'e' || f2 === 'i' || f2 === 'ie')) return true;
  if ((f1 === 'a' || f1 === 'e') && (f2 === 'a' || f2 === 'e')) return true;

  return false;
}

export function isModernPhoneticallyPlausible(charPinyin: string, soundPinyin: string): boolean {
  const c = parsePinyin(charPinyin);
  const s = parsePinyin(soundPinyin);
  if (!c.raw || !s.raw) return false;
  if (c.raw === s.raw) return true;

  return areInitialsCognate(c.initial, s.initial) && areFinalsCompatible(c.final, s.final);
}

export type SoundMatch = 'same' | 'tone' | 'close' | 'far';
export const MATCH_ORDER: Record<SoundMatch, number> = { same: 0, tone: 1, close: 2, far: 3 };

export function toneOf(raw: string): number {
  const first = raw.replace(/\([^)]*\)/g, '').split('/')[0].trim().normalize('NFD');
  if (first.includes('̄')) return 1;
  if (first.includes('́')) return 2;
  if (first.includes('̌')) return 3;
  if (first.includes('̀')) return 4;
  const digit = /([1-5])$/.exec(first);
  return digit ? Number(digit[1]) % 5 : 0;
}

/** Rhyme without the i/u/ü glide, folding the -ing/-eng and -in/-en pairs. */
function rhymeKey(final: string): string {
  const core = /^[iuv][aeo]/.test(final) ? final.slice(1) : final;
  if (core === 'ing') return 'eng';
  if (core === 'in') return 'en';
  return core;
}

/**
 * How well `soundPinyin` predicts `charPinyin` for a modern learner.
 * "close" needs an audible anchor a beginner can hear: the same initial
 * consonant or the same rhyme. Historical-only links grade "far".
 */
export function gradeSound(charPinyin: string, soundPinyin: string): SoundMatch {
  const c = cleanPinyinStr(charPinyin);
  const s = cleanPinyinStr(soundPinyin);
  if (!c || !s) return 'far';
  if (c === s) return toneOf(charPinyin) === toneOf(soundPinyin) ? 'same' : 'tone';
  if (!isModernPhoneticallyPlausible(charPinyin, soundPinyin)) return 'far';
  const a = parsePinyin(charPinyin);
  const b = parsePinyin(soundPinyin);
  const sameInitial = a.initial !== '' && a.initial === b.initial;
  return sameInitial || rhymeKey(a.final) === rhymeKey(b.final) ? 'close' : 'far';
}
