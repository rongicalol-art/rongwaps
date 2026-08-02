import { DBVocabularyRow } from '../types/database';
import { fetchStaticJson, pruneStaticJsonCache, removeStaticJsonCache } from './staticContentService';

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

const packCache = new Map<number, DBVocabularyRow[]>();
const pendingPacks = new Map<number, Promise<DBVocabularyRow[] | null>>();
let manifestPromise: Promise<VocabularyManifest> | null = null;
let allRowsCache: DBVocabularyRow[] | null = null;
let allRowsPromise: Promise<DBVocabularyRow[] | null> | null = null;

async function getManifest(): Promise<VocabularyManifest> {
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetchStaticJson<VocabularyManifest>(
    '/data/vocabulary/manifest.json',
    'vocabulary manifest',
    { revalidate: true },
  ).then((manifest) => {
    const valid = manifest.schemaVersion === 1
      && typeof manifest.version === 'string'
      && Number.isInteger(manifest.totalCount)
      && manifest.totalCount > 0
      && Array.isArray(manifest.books)
      && manifest.books.reduce((total, book) => total + book.count, 0) === manifest.totalCount;
    if (!valid) {
      throw new Error('Unsupported vocabulary manifest');
    }
    void pruneStaticJsonCache('vocabulary', manifest.version);
    return manifest;
  }).catch((error) => {
    manifestPromise = null;
    throw error;
  });

  return manifestPromise;
}

function isValidPack(pack: VocabularyPack, manifestBook: VocabularyManifestBook): boolean {
  if (pack.schemaVersion !== 1 || pack.bookId !== manifestBook.bookId) return false;
  if (!Array.isArray(pack.items) || pack.count !== pack.items.length) return false;
  if (pack.count !== manifestBook.count) return false;

  return pack.items.every((item) => {
    if (!item || typeof item.id !== 'string') return false;
    const match = item.id.match(/^b(\d+)[-_]?l\d+/i);
    return Boolean(match && Number(match[1]) === pack.bookId);
  });
}

async function loadVocabularyPack(bookId: number): Promise<DBVocabularyRow[] | null> {
  try {
    const manifest = await getManifest();
    const manifestBook = manifest.books.find((book) => book.bookId === bookId);

    if (!manifestBook || !manifestBook.path.startsWith('/data/vocabulary/')) return null;

    const persistentKey = `vocabulary:${manifest.version}:book:${bookId}`;
    const pack = await fetchStaticJson<VocabularyPack>(
      manifestBook.path,
      `vocabulary pack book ${bookId}`,
      { persistentKey },
    );
    if (!isValidPack(pack, manifestBook)) {
      await removeStaticJsonCache(persistentKey);
      throw new Error(`Vocabulary pack for book ${bookId} failed validation`);
    }

    packCache.set(bookId, pack.items);
    return pack.items;
  } catch (error) {
    console.warn(`Static vocabulary pack unavailable for book ${bookId}; using Supabase.`, error);
    return null;
  } finally {
    pendingPacks.delete(bookId);
  }
}

export function fetchVocabularyPack(bookId: number): Promise<DBVocabularyRow[] | null> {
  const cached = packCache.get(bookId);
  if (cached) return Promise.resolve(cached);

  const pending = pendingPacks.get(bookId);
  if (pending) return pending;

  const request = loadVocabularyPack(bookId);
  pendingPacks.set(bookId, request);
  return request;
}

export function fetchAllVocabularyPacks(): Promise<DBVocabularyRow[] | null> {
  if (allRowsCache) return Promise.resolve(allRowsCache);
  if (allRowsPromise) return allRowsPromise;

  allRowsPromise = (async () => {
    try {
      const manifest = await getManifest();
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
