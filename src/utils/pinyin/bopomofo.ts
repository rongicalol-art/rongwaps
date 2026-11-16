import { stripTones } from '../../data/pinyinTables';
import { splitPinyinToSyllables } from './pinyinSyllables';
import { getPinyinTone } from './pinyinTones';
import { numberToToneMarks } from './pinyin';

const INITIALS: Record<string, string> = {
  b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ', d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ', g: 'ㄍ', k: 'ㄎ', h: 'ㄏ',
  j: 'ㄐ', q: 'ㄑ', x: 'ㄒ', zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
};
// `v` stands for ü.
const FINALS: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ', an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', er: 'ㄦ',
  i: 'ㄧ', ia: 'ㄧㄚ', io: 'ㄧㄛ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ', ian: 'ㄧㄢ', in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
  u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ', uan: 'ㄨㄢ', un: 'ㄨㄣ', uang: 'ㄨㄤ', ong: 'ㄨㄥ', ueng: 'ㄨㄥ',
  v: 'ㄩ', ve: 'ㄩㄝ', van: 'ㄩㄢ', vn: 'ㄩㄣ',
};
/** Spellings that hide their final: y/w syllables and the buzzing ones. */
const WHOLE: Record<string, string> = {
  zhi: 'ㄓ', chi: 'ㄔ', shi: 'ㄕ', ri: 'ㄖ', zi: 'ㄗ', ci: 'ㄘ', si: 'ㄙ',
  yi: 'ㄧ', ya: 'ㄧㄚ', yo: 'ㄧㄛ', ye: 'ㄧㄝ', yao: 'ㄧㄠ', you: 'ㄧㄡ', yan: 'ㄧㄢ', yin: 'ㄧㄣ', yang: 'ㄧㄤ', ying: 'ㄧㄥ', yong: 'ㄩㄥ',
  yu: 'ㄩ', yue: 'ㄩㄝ', yuan: 'ㄩㄢ', yun: 'ㄩㄣ',
  wu: 'ㄨ', wa: 'ㄨㄚ', wo: 'ㄨㄛ', wai: 'ㄨㄞ', wei: 'ㄨㄟ', wan: 'ㄨㄢ', wen: 'ㄨㄣ', wang: 'ㄨㄤ', weng: 'ㄨㄥ',
};
const TONES = ['', '', 'ˊ', 'ˇ', 'ˋ', '˙'];

function syllableToBopomofo(syllable: string): string | null {
  const base = stripTones(syllable).toLowerCase().replace(/ü/g, 'v').replace(/u:/g, 'v');
  const tone = TONES[getPinyinTone(syllable)];
  if (WHOLE[base]) return WHOLE[base] + tone;
  const initial = /^(zh|ch|sh)/.exec(base)?.[0] ?? (INITIALS[base[0]] ? base[0] : '');
  let final = base.slice(initial.length);
  // After j, q and x the letter u is always ü; lüe and nüe are often typed "ue".
  if ('jqx'.includes(initial) && initial) final = final.replace(/^u/, 'v');
  if (final === 'ue') final = 've';
  if (!final || !FINALS[final]) return null;
  return (initial ? INITIALS[initial] : '') + FINALS[final] + tone;
}

/**
 * A word's pinyin as Bopomofo, one space-separated syllable per character, for a voice that must be told the
 * reading. Null when the pinyin doesn't give exactly one known syllable per character (erhua, letters, digits):
 * the caller must then stay silent or use a recording, never guess.
 */
export function wordBopomofo(word: string, pinyin: string | null | undefined): string | null {
  if (!pinyin || !/^[\u3400-\u9fff]+$/u.test(word)) return null;
  const syllables = splitPinyinToSyllables(numberToToneMarks(pinyin));
  if (syllables.length !== Array.from(word).length) return null;
  const parts = syllables.map(syllableToBopomofo);
  return parts.every((part): part is string => part !== null) ? parts.join(' ') : null;
}
