import { searchByCharacterComponents, searchInIndex, segmentChineseQuery, segmentPinyinQuery, type CompactSearchEntry } from '../utils/vocabulary/dictionarySearch';
import type { PartsIndex } from '../utils/characters/parts';

let index: CompactSearchEntry[] | null = null;
self.onmessage = ({ data }: MessageEvent<{ id: number; buffer?: ArrayBuffer; query?: string; limit: number; parts?: PartsIndex }>) => {
  try {
    if (data.buffer) {
      const payload = JSON.parse(new TextDecoder().decode(data.buffer));
      if (!Array.isArray(payload.items)) throw new Error('Invalid dictionary index');
      index = payload.items;
      self.postMessage({ id: data.id, result: [] });
      return;
    }
    const query = data.query ?? '';
    let result = data.parts ? searchByCharacterComponents(index, data.parts, query, data.limit) : [];
    if (!result.length) result = searchInIndex(index, query, data.limit);
    if (!result.length) result = /\p{Script=Han}/u.test(query)
      ? segmentChineseQuery(index, query, data.limit) : segmentPinyinQuery(index, query, data.limit);
    self.postMessage({ id: data.id, result });
  } catch { self.postMessage({ id: data.id, error: 'Dictionary search failed' }); }
};
