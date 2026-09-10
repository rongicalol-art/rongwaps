import { DBVocabularyRow } from '../types/database';
import { createPackLoader } from './packLoader';

interface VocabularyManifestBook {
  bookId: number;
  count: number;
  path: string;
}

interface VocabularyManifest {
  schemaVersion: number;
  version: string;
  totalCount: number;
  books: VocabularyManifestBook[];
}

interface VocabularyPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: DBVocabularyRow[];
}

const vocabularyPackLoader = createPackLoader<VocabularyManifest, VocabularyPack, DBVocabularyRow[]>({
  namespace: 'vocabulary',
  manifestPath: '/data/vocabulary/manifest.json',
  manifestLabel: 'vocabulary manifest',
  partPathPrefix: '/data/vocabulary/',
  partCacheKeyKind: 'book',
  partLabel: (bookId) => `vocabulary pack book ${bookId}`,
  validateManifest: (manifest) => (
    manifest.schemaVersion === 1
    && typeof manifest.version === 'string'
    && Number.isInteger(manifest.totalCount)
    && manifest.totalCount > 0
    && Array.isArray(manifest.books)
    && manifest.books.reduce((total, book) => total + book.count, 0) === manifest.totalCount
  ),
  getParts: (manifest) => manifest.books.map((book) => ({
    key: book.bookId,
    path: book.path,
    count: book.count,
  })),
  validatePack: (pack, part) => {
    if (pack.schemaVersion !== 1 || pack.bookId !== part.key) return false;
    if (!Array.isArray(pack.items) || pack.count !== pack.items.length) return false;
    if (pack.count !== part.count) return false;

    return pack.items.every((item) => {
      if (!item || typeof item.id !== 'string') return false;
      const match = item.id.match(/^b(\d+)[-_]?l\d+/i);
      return Boolean(match && Number(match[1]) === pack.bookId);
    });
  },
  transform: (pack) => pack.items,
});

export async function fetchVocabularyPack(bookId: number): Promise<DBVocabularyRow[] | null> {
  try {
    return await vocabularyPackLoader.loadPart(bookId);
  } catch (error) {
    console.warn(`Static vocabulary pack unavailable for book ${bookId}; using Supabase.`, error);
    return null;
  }
}

let allRowsCache: DBVocabularyRow[] | null = null;
let allRowsPromise: Promise<DBVocabularyRow[] | null> | null = null;

export function fetchAllVocabularyPacks(): Promise<DBVocabularyRow[] | null> {
  if (allRowsCache) return Promise.resolve(allRowsCache);
  if (allRowsPromise) return allRowsPromise;

  allRowsPromise = (async () => {
    try {
      const manifest = await vocabularyPackLoader.manifest();
      const packs = await Promise.all(
        [...manifest.books]
          .sort((a, b) => a.bookId - b.bookId)
          .map((book) => fetchVocabularyPack(book.bookId)),
      );

      if (packs.some((pack) => pack === null)) return null;

      const rows = packs.flatMap((pack) => pack || []);
      if (rows.length !== manifest.totalCount) {
        throw new Error('Combined vocabulary packs failed count validation');
      }

      allRowsCache = rows;
      return rows;
    } catch (error) {
      console.warn('Complete static vocabulary dataset unavailable; using Supabase.', error);
      return null;
    } finally {
      allRowsPromise = null;
    }
  })();

  return allRowsPromise;
}
