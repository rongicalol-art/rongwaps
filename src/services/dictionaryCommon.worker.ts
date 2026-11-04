import { createDictionaryIndex } from '../../shared/dictionaryIndex';
import type { CompactSearchEntry, CourseFields } from '../../shared/dictionarySearch';

// Same ranking engine as the server, over the most common words only.
let index: ReturnType<typeof createDictionaryIndex> | null = null;
let course = new Map<number, CourseFields>();
self.onmessage = ({ data }: MessageEvent<{ id: number; buffer?: ArrayBuffer; query?: string; limit?: number }>) => {
  try {
    if (data.buffer) {
      const pack = JSON.parse(new TextDecoder().decode(data.buffer)) as { items: CompactSearchEntry[]; course: [number, CourseFields][] };
      if (!Array.isArray(pack.items)) throw new Error('Invalid common words pack');
      index = createDictionaryIndex(pack.items);
      course = new Map(pack.course);
      self.postMessage({ id: data.id, result: [] });
      return;
    }
    const rows = index?.search(data.query ?? '', data.limit ?? 30) ?? [];
    self.postMessage({ id: data.id, result: rows.map(row => ({ ...row, ...course.get(row.id) })) });
  } catch { self.postMessage({ id: data.id, error: 'Common words search failed' }); }
};
