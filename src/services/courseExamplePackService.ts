import type { Flashcard } from '../data/flashcards';
import type {
  CourseExampleManifest,
  CourseExamplePack,
  CourseExampleRecord,
} from '../types/models';
import { createPackLoader } from './packLoader';

const courseExamplePackLoader = createPackLoader<CourseExampleManifest, CourseExamplePack, CourseExampleRecord[]>({
  namespace: 'course-examples',
  manifestPath: '/data/course-examples/manifest.json',
  manifestLabel: 'course example manifest',
  partPathPrefix: '/data/course-examples/',
  partCacheKeyKind: 'book',
  partLabel: (bookId) => `course examples book ${bookId}`,
  validateManifest: (manifest) => (
    manifest.schemaVersion === 1
    && typeof manifest.version === 'string'
    && Array.isArray(manifest.books)
  ),
  getParts: (manifest) => manifest.books.map((book) => ({
    key: book.bookId,
    path: book.path,
    count: book.count,
  })),
  validatePack: (pack, part, manifest) => (
    pack.schemaVersion === manifest.schemaVersion
    && pack.bookId === part.key
    && pack.count === pack.records.length
    && pack.count === part.count
  ),
  transform: (pack) => pack.records,
});

async function loadCourseExampleRecords(): Promise<CourseExampleRecord[]> {
  const manifest = await courseExamplePackLoader.manifest();
  const packs = await courseExamplePackLoader.loadAllParts();

  const records = packs.flat();
  if (records.length !== manifest.totalCount) {
    throw new Error('Course example manifest count does not match its packs');
  }
  return records;
}

export function recordsToExampleCards(
  records: CourseExampleRecord[],
  searchTerms: string[],
): Flashcard[] {
  const terms = Array.from(new Set(searchTerms.map((term) => term.trim()).filter(Boolean)));
  if (terms.length === 0) return [];

  const matching = records.filter((record) => (
    terms.some((term) => record.traditional.includes(term) || record.simplified?.includes(term))
  ));
  const cards = new Map<string, Flashcard>();

  matching.forEach((record) => {
    const existing = cards.get(record.sourceCardId);
    const example = {
      chinese: record.traditional,
      pinyin: record.pinyin,
      english: record.english,
    };
    if (existing) {
      if (!existing.examples?.some((item) => item.chinese === example.chinese)) {
        existing.examples?.push(example);
      }
      return;
    }

    cards.set(record.sourceCardId, {
      id: record.sourceCardId,
      bookId: record.bookId,
      lessonId: record.lessonId,
      partId: record.partId,
      front: record.sourceFront,
      back: record.sourceMeaning,
      examples: [example],
    });
  });

  return [...cards.values()];
}

export async function fetchCourseExampleCards(searchTerms: string[]): Promise<Flashcard[]> {
  try {
    return recordsToExampleCards(await loadCourseExampleRecords(), searchTerms);
  } catch (error) {
    console.warn('Static course examples unavailable; using vocabulary examples.', error);
    return [];
  }
}
