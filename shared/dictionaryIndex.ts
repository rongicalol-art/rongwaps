import { searchInIndex, type CompactSearchEntry } from './dictionarySearch';
import { stripPinyinTones } from './pinyinNormalize';
import { stemEnglishWord, getSemanticSynonymStems } from './englishStem';

// Gram keys are 1–3 of these letters, packed into one integer (letters 1..51, 0 = none).
const LETTERS = 'abcdefghijklmnopqrstuvwxyzüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
const BASE = LETTERS.length + 1;
const letterCode = new Uint8Array(0x200);
for (let i = 0; i < LETTERS.length; i++) letterCode[LETTERS.charCodeAt(i)] = i + 1;
const codeOf = (text: string, i: number) => { const c = text.charCodeAt(i); return c < 0x200 ? letterCode[c] : 0; };
function gramKey(gram: string): number {
  let key = 0;
  for (let i = 0; i < 3; i++) {
    const code = i < gram.length ? codeOf(gram, i) : 0;
    if (i < gram.length && !code) return -1;
    key = key * BASE + code;
  }
  return key;
}

/**
 * Postings narrow the candidates; the existing engine still owns ranking and matching.
 * Built once per server start on a small shared CPU, so it avoids strings and per-entry sets:
 * two passes (count, then fill) over integer gram keys into one flat id array (~8M ids).
 */
export function createDictionaryIndex(items: CompactSearchEntry[]) {
  const hanzi = new Map<string, number[]>();
  for (let id = 0; id < items.length; id++) for (const character of new Set(items[id][1] + items[id][2])) {
    const list = hanzi.get(character); if (list) list.push(id); else hanzi.set(character, [id]);
  }

  const lastSeen = new Uint32Array(BASE ** 3);
  const counts = new Uint32Array(BASE ** 3 + 1);
  const eachGram = (visit: (key: number, id: number) => void) => {
    lastSeen.fill(0);
    for (let id = 0; id < items.length; id++) {
      const entry = items[id];
      for (const text of [entry[3], entry[4], ...entry[5]]) {
        const lower = text.toLowerCase();
        for (let start = 0; start < lower.length; start++) {
          let key = 0;
          for (let length = 1; length <= 3 && start + length <= lower.length; length++) {
            const code = codeOf(lower, start + length - 1);
            if (!code) break;
            key += code * BASE ** (3 - length);
            if (lastSeen[key] !== id + 1) { lastSeen[key] = id + 1; visit(key, id); }
          }
        }
      }
    }
  };
  eachGram(key => { counts[key + 1]++; });
  for (let key = 1; key < counts.length; key++) counts[key] += counts[key - 1];
  const offsets = counts; // offsets[key]..offsets[key + 1] once filled
  const ids = new Uint32Array(offsets[offsets.length - 1]);
  const cursor = offsets.slice(0, -1);
  eachGram((key, id) => { ids[cursor[key]++] = id; });
  const gramIds = (gram: string) => { const key = gramKey(gram); return key < 0 ? [] : ids.subarray(offsets[key], offsets[key + 1]); };

  function candidates(query: string): CompactSearchEntry[] {
    // Component and mixed queries have their own intersection semantics.
    if (/\p{Script=Han}/u.test(query)) {
      if (/[\s+＋]/.test(query)) return items;
      const lists = [...query].filter(char => /\p{Script=Han}/u.test(char)).map(char => hanzi.get(char) ?? []);
      const rarest = lists.sort((a, b) => a.length - b.length)[0];
      return rarest ? rarest.map(id => items[id]) : items;
    }
    if (/[*?＊？]/.test(query)) return items;
    if (/[^a-z]/i.test(query.trim().slice(0, 3))) return items;
    const lower = query.toLowerCase().replace(/\s+/g, ' ').replace(/^(?:to |an? |the )/, '');
    const stem = !lower.includes(' ') ? stemEnglishWord(lower) : '';
    const flat = stripPinyinTones(query);
    const keys = [lower, stem.length >= 2 ? stem : lower, ...getSemanticSynonymStems(lower), flat].filter(Boolean).map(key => key.slice(0, 3));
    // Initialisms and numbered pinyin both start with the first pinyin letter.
    if ((flat.length >= 2 && flat.length <= 4 && !lower.includes(' ')) || /[1-5]/.test(query)) keys.push(flat[0]);
    const matches = new Set(keys.flatMap(key => [...gramIds(key)]));
    return [...matches].sort((a, b) => a - b).map(id => items[id]);
  }
  return {
    candidates,
    search(query: string, limit = 30) {
      const selected = candidates(query);
      const results = searchInIndex(selected, query, limit, false);
      // Typo fallback must see the entire corpus; it runs off the HTTP thread.
      return results.length ? results : searchInIndex(items, query, limit);
    },
  };
}
