/**
 * Display names other learners see. A short word list in English and Chinese (traditional and simplified),
 * matched after folding case, spacing and common letter swaps (f.u.c.k, sh1t). Words that hide inside
 * ordinary names ("Dickson", "Sexton") only match as a whole word. The games Worker refuses these names;
 * the profile editor says so before saving.
 */
export const NAME_NOT_ALLOWED = 'Pick a different name. Other learners see it.';

/** Refused anywhere inside the name, spaces and symbols removed. */
const ANYWHERE = ['fuck', 'nigger', 'nigga', 'faggot', 'whore', 'bitch', 'asshole', 'motherf', 'porn', 'pussy', 'retard'];
/** Refused only as a whole word. */
const WHOLE_WORD = ['cunt', 'cunts', 'dick', 'cock', 'shit', 'slut', 'fag', 'rape', 'rapist', 'sex', 'nazi', 'hitler', 'kys', 'twat', 'wank', 'cum'];
/** Chinese phrases, refused anywhere (single characters like 幹 are common in ordinary words). */
const CHINESE = ['幹你', '干你', '操你', '他媽', '他妈', '婊子', '雞巴', '鸡巴', '雞掰', '機掰', '机掰', '傻逼', '傻屄', '賤人', '贱人', '王八蛋', '屌', '肏', '屄', '去死'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

export function isNameAllowed(name: string): boolean {
  const lower = name.toLowerCase().normalize('NFKC');
  if (CHINESE.some(phrase => lower.includes(phrase))) return false;
  const folded = Array.from(lower, char => LEET[char] ?? char).join('');
  const letters = folded.replace(/[^a-z]/g, '');
  if (ANYWHERE.some(word => letters.includes(word))) return false;
  const words = folded.split(/[^a-z]+/).filter(Boolean);
  return !words.some(word => WHOLE_WORD.includes(word));
}
