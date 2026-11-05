/**
 * Display names other learners see, and the words chat masks. Short word lists in English and Chinese
 * (traditional and simplified), matched after one clean-up step: width, case and accents folded, invisible
 * characters dropped, look-alike Cyrillic and Greek letters and common symbol swaps (sh1t, $hit) mapped to
 * letters. Words that hide inside ordinary names ("Dickson", "Scunthorpe") only match as a whole word;
 * single letters split by dots or spaces ("s.h.i.t") are joined first. The games Worker refuses these names
 * and masks chat; the profile editor says so before saving.
 */
export const NAME_NOT_ALLOWED = 'Pick a different name. Other learners see it.';
export const NAME_RESERVED = 'That name belongs to the app. Pick a different one.';
/** What a masked word becomes in chat. */
export const CHAT_MASK = '＊＊';

/** Refused anywhere inside the name, spaces and symbols removed. */
const ANYWHERE = ['fuck', 'nigger', 'nigga', 'faggot', 'whore', 'bitch', 'asshole', 'motherf', 'porn', 'pussy', 'retard',
  'blowjob', 'handjob', 'onlyfans', 'pedophil', 'paedophil', 'molest', 'killyourself', 'cocksuck', 'dickhead', 'shithead'];
/** Refused only as a whole word. */
const WHOLE_WORD = ['cunt', 'cunts', 'dick', 'dicks', 'cock', 'cocks', 'shit', 'slut', 'sluts', 'fag', 'fags', 'rape', 'rapist',
  'sex', 'sexy', 'nazi', 'hitler', 'kys', 'twat', 'wank', 'wanker', 'cum', 'tits', 'boobs', 'anal', 'dildo', 'penis', 'vagina',
  'nude', 'nudes', 'xxx', 'hentai', 'horny', 'milf', 'nsfw', 'jizz', 'pedo', 'paedo', 'kike', 'chink', 'spic', 'tranny',
  'bastard', 'incest', 'whores', 'bitches', 'fck', 'fuk', 'fk', 'stfu', 'wtf'];
/** Chinese phrases, refused anywhere, spaces between characters ignored (single characters like 幹 are common in ordinary words). */
const CHINESE = ['幹你', '干你', '操你', '他媽', '他妈', '婊子', '雞巴', '鸡巴', '雞掰', '機掰', '机掰', '傻逼', '傻屄', '賤人', '贱人',
  '王八蛋', '屌', '肏', '屄', '去死', '靠北', '靠杯', '色情', '做愛', '做爱', '妓女', '屁眼', '陰莖', '阴茎', '陰道', '阴道', '強姦',
  '强奸', '智障', '腦殘', '脑残', '支那'];
/** Names that would look like the app or its operator (the owner's own account may use them). */
const RESERVED_WORDS = ['ron', 'admin', 'administrator', 'moderator', 'mod', 'official', 'staff', 'support', 'operator', 'system', 'ronsmandarin'];
const RESERVED_CHINESE = ['官方', '老師', '老师', '管理員', '管理员', '客服', '版主'];

/** Invisible and direction-changing characters: never shown, often used to hide a word. */
const INVISIBLE = /[\u00ad\u061c\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/gu;
const DIRECTION = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const LOOKALIKE: Record<string, string> = {
  а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ԛ: 'q', ԝ: 'w',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ω: 'w',
  ı: 'i', ł: 'l', ø: 'o', đ: 'd', ß: 'ss',
};
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

/** The one clean-up step every check uses. */
export function foldForFilter(text: string): string {
  const plain = text.normalize('NFKC').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(INVISIBLE, '');
  return Array.from(plain, char => LOOKALIKE[char] ?? LEET[char] ?? char).join('');
}

/** Latin words, with runs of single letters ("s.h.i.t", "f u c k") joined into one. */
function words(folded: string): string[] {
  const out: string[] = [];
  let run = '';
  for (const word of folded.split(/[^a-z]+/).filter(Boolean)) {
    if (word.length === 1) { run += word; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(word);
  }
  if (run) out.push(run);
  return out;
}

const hanOnly = (folded: string) => folded.replace(/[^\p{Script=Han}]/gu, '');
function rude(folded: string): boolean {
  if (CHINESE.some(phrase => hanOnly(folded).includes(phrase))) return true;
  if (ANYWHERE.some(word => folded.replace(/[^a-z]/g, '').includes(word))) return true;
  return words(folded).some(word => WHOLE_WORD.includes(word));
}

/** A web address, an email or a phone number: never a name. */
function contact(name: string): boolean {
  const wide = name.normalize('NFKC').toLowerCase();
  if (/https?:|www\.|@|\b[a-z0-9-]+\.(?:com|net|org|io|me|tw|cn|ly|gg|xyz|app|link|site|info|biz|co|cc|tv)\b/.test(wide)) return true;
  return (wide.match(/\d/g)?.length ?? 0) >= 7;
}

export function isNameReserved(name: string): boolean {
  const folded = foldForFilter(name);
  return RESERVED_CHINESE.some(word => hanOnly(folded).includes(word))
    || folded.replace(/[^a-z]/g, '').includes('ronsmandarin')
    || words(folded).some(word => RESERVED_WORDS.includes(word));
}

/** `owner`: the app's own account may use the reserved names. */
export function isNameAllowed(name: string, { owner = false }: { owner?: boolean } = {}): boolean {
  if (DIRECTION.test(name) || contact(name)) return false;
  if (!owner && isNameReserved(name)) return false;
  return !rude(foldForFilter(name));
}

/** Why a name is refused (null when it is fine), in words a learner can act on. */
export function nameProblem(name: string, options?: { owner?: boolean }): string | null {
  if (isNameAllowed(name, options)) return null;
  return !options?.owner && isNameReserved(name) && isNameAllowed(name, { owner: true }) ? NAME_RESERVED : NAME_NOT_ALLOWED;
}

const CHINESE_PATTERNS = CHINESE.map(phrase => new RegExp(Array.from(phrase).join('[\\s\\p{P}\\p{S}]*'), 'gu'));

/** Chat: listed words become ＊＊ (decision 9); the rest of the line is unchanged. */
export function maskChat(text: string): string {
  let masked = text.replace(/[\p{L}\p{N}\p{M}@$!\u200b-\u200f\u2060-\u206f]+/gu, (token) => {
    const folded = foldForFilter(token);
    if (/\p{Script=Han}/u.test(folded) && !/[a-z]/.test(folded)) return token;
    return rude(folded) ? CHAT_MASK : token;
  });
  for (const pattern of CHINESE_PATTERNS) masked = masked.replace(pattern, CHAT_MASK);
  return masked;
}
