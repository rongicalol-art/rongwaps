import type { Flashcard } from '../data/flashcards';
import type {
  CourseExampleManifest,
  CourseExamplePack,
  CourseExampleRecord,
} from '../types/models';
import { fetchStaticJson, pruneStaticJsonCache } from './staticContentService';

let recordsPromise: Promise<CourseExampleRecord[]> | null = null;

async function loadCourseExampleRecords(): Promise<CourseExampleRecord[]> {
  const manifest = await fetchStaticJson<CourseExampleManifest>(
    '/data/course-examples/manifest.json',
    'course example manifest',
    { revalidate: true },
  );
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.books)) {
    throw new Error('Unsupported course example manifest');
  }

  void pruneStaticJsonCache('course-examples', manifest.version);
  const packs = await Promise.all(manifest.books.map(async (book) => {
    const pack = await fetchStaticJson<CourseExamplePack>(
      book.path,
      `course examples book ${book.bookId}`,
      { persistentKey: `course-examples:${manifest.version}:book:${book.bookId}` },
    );
    if (
      pack.schemaVersion !== manifest.schemaVersion
      || pack.bookId !== book.bookId
      || pack.count !== pack.records.length
      || pack.count !== book.count
    ) {
      throw new Error(`Course example pack for book ${book.bookId} failed validation`);
    }
    return pack.records;
  }));

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
    recordsPromise ||= loadCourseExampleRecords();
    return recordsToExampleCards(await recordsPromise, searchTerms);
  } catch (error) {
    recordsPromise = null;
    console.warn('Static course examples unavailable; using vocabulary examples.', error);
    return [];
  }
}
