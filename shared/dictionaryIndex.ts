import { searchInIndex, type CompactSearchEntry } from './dictionarySearch';
import { stripPinyinTones } from './pinyinNormalize';
import { stemEnglishWord, getSemanticSynonymStems } from './englishStem';

/** Postings narrow the candidates; the existing engine still owns ranking and matching. */
export function createDictionaryIndex(items: CompactSearchEntry[]) {
  const hanzi = new Map<string, number[]>();
  const grams = new Map<string, number[]>();
  const add = (map: Map<string, number[]>, key: string, id: number) => {
    const list = map.get(key); if (list) list.push(id); else map.set(key, [id]);
  };
  items.forEach((entry, id) => {
    for (const character of new Set(entry[1] + entry[2])) add(hanzi, character, id);
    const keys = new Set<string>();
    for (const text of [entry[3], entry[4], ...entry[5]]) {
      const lower = text.toLowerCase();
      for (let length = 1; length <= 3; length++) for (let start = 0; start <= lower.length - length; start++) {
        const gram = lower.slice(start, start + length);
        if (/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/.test(gram)) keys.add(gram);
      }
    }
    for (const key of keys) add(grams, key, id);
  });
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
    const ids = new Set(keys.flatMap(key => grams.get(key) ?? []));
    return [...ids].sort((a, b) => a - b).map(id => items[id]);
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
