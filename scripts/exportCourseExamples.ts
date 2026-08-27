import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
  CourseExampleManifestBook,
  CourseExamplePack,
  CourseExampleRecord,
} from '../src/types/models';
import { parseVocabularyId } from '../src/utils/vocabularyId';

const SCHEMA_VERSION = 1;
const BOOK_ID = 1;
const OCR_ROOT = resolve(process.cwd(), 'output/ocr/modern_chinese_1');
const VOCABULARY_PACK_PATH = resolve(process.cwd(), 'public/data/vocabulary/book-1.json');
const OUTPUT_DIRECTORY = resolve(process.cwd(), 'public/data/course-examples');
const REPORT_DIRECTORY = resolve(process.cwd(), 'output/course-examples');

interface OcrExample {
  traditional?: string;
  simplified?: string;
  pinyin?: string;
  english?: string;
}

interface OcrVocabularyEntry {
  id: string;
  traditional: string;
  english?: string;
  examples?: OcrExample[];
  printedPage?: number;
  confidence?: string;
}

interface OcrLesson {
  lessonId: number;
  vocabulary?: OcrVocabularyEntry[];
  dialogues?: OcrDialogue[];
  otherImportantContent?: OcrReading[];
  verification?: {
    checklist?: {
      pinyinToneMarksPreservedAsPrinted?: boolean;
      dialogueAndReadingPinyinVerified?: boolean;
    };
  };
}

interface OcrDialogueLine {
  id: string;
  traditional?: string;
  simplified?: string;
  pinyin?: string;
  english?: string;
  printedPage?: number;
  confidence?: string;
}

interface OcrDialogue {
  id: string;
  lines?: OcrDialogueLine[];
}

interface OcrReading {
  id: string;
  type: string;
  traditional?: string;
  simplified?: string;
  pinyin?: string;
  english?: string;
  printedPages?: number[];
  confidence?: string;
}

interface VocabularyPackRow {
  id: string;
  traditional: string | null;
  meaning: string | null;
  examples: string | null;
}

interface VocabularyPack {
  items: VocabularyPackRow[];
}

interface RejectedEntry {
  ocrId: string;
  lessonId: number;
  traditional: string;
  reason: string;
  candidateCardIds: string[];
}

const READING_ENGLISH_GROUPS: Record<string, number[]> = {
  'B1L07-RDG01': [1, 2, 2, 2, 1],
  'B1L08-RDG01': [1, 2, 2],
  'B1L09-RDG01': [2, 2, 2, 3],
  'B1L10-RDG01': [3, 1, 2, 2, 1, 1],
};

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[：:]/g, ':')
    .replace(/[，,]/g, ',')
    .replace(/[。｡]/g, '.')
    .replace(/[？?]/g, '?')
    .replace(/[！!]/g, '!')
    .trim();
}

function termVariants(value: string): string[] {
  const variants = new Set<string>();
  value.normalize('NFKC').split('/').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    variants.add(part);
    variants.add(part.replace(/\([^)]*\)/g, ''));
    variants.add(part.replace(/[()]/g, ''));
  });
  return [...variants].map(normalizeText).filter(Boolean);
}

function explicitTerms(value: string): string[] {
  return value.normalize('NFKC').split('/').map(normalizeText).filter(Boolean);
}

function normalizeMeaning(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function loadOcrLessons(): Promise<OcrLesson[]> {
  const directories = (await readdir(OCR_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^lesson-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const lessons: OcrLesson[] = [];

  for (const directory of directories) {
    try {
      const content = await readFile(resolve(OCR_ROOT, directory, 'lesson.json'), 'utf8');
      lessons.push(JSON.parse(content) as OcrLesson);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  return lessons;
}

function matchVocabularyCard(
  lessonId: number,
  ocrEntry: OcrVocabularyEntry,
  vocabularyRows: VocabularyPackRow[],
) {
  const ocrTerms = termVariants(ocrEntry.traditional);
  const ocrExplicitTerms = explicitTerms(ocrEntry.traditional);
  const candidates = vocabularyRows.filter((row) => {
    const location = parseVocabularyId(row.id);
    if (!location || location.bookId !== BOOK_ID || location.lessonId !== lessonId) return false;
    const rowTerms = termVariants(row.traditional || '');
    return ocrTerms.some((term) => rowTerms.includes(term));
  });

  const ranked = candidates.map((row) => {
    const rowExplicitTerms = explicitTerms(row.traditional || '');
    let score = 0;
    if (ocrExplicitTerms.some((term) => rowExplicitTerms.includes(term))) score += 100;
    if (normalizeMeaning(ocrEntry.english) === normalizeMeaning(row.meaning)) score += 50;
    const sourceExamples = (ocrEntry.examples || []).map((example) => example.traditional || '').join('');
    if (normalizeText(row.examples || '') === normalizeText(sourceExamples)) score += 25;
    return { row, score };
  }).sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return { match: null, candidates: [] };
  const best = ranked[0];
  const isUniqueBest = ranked.length === 1 || best.score > ranked[1].score;
  return {
    match: isUniqueBest ? best.row : null,
    candidates: ranked.map(({ row }) => row),
  };
}

function firstSentence(value: string | undefined, punctuation: RegExp): string | null {
  if (!value) return null;
  return value.trim().match(punctuation)?.[0]?.trim() || null;
}

function splitChineseSentences(value: string | undefined): string[] {
  return value?.match(/[^。！？]+[。！？]/g)?.map((sentence) => sentence.trim()) || [];
}

function splitLatinSentences(value: string | undefined): string[] {
  if (!value) return [];
  const protectedValue = value
    .replace(/a\.m\./gi, (match) => match.replaceAll('.', '∯'))
    .replace(/p\.m\./gi, (match) => match.replaceAll('.', '∯'));
  return (protectedValue.match(/[^.!?]+[.!?]+/g) || [])
    .map((sentence) => sentence.replaceAll('∯', '.').trim());
}

function findPartAnchor(
  vocabularyRows: VocabularyPackRow[],
  lessonId: number,
  partId: number,
): VocabularyPackRow | null {
  return vocabularyRows.find((row) => {
    const location = parseVocabularyId(row.id);
    return location?.bookId === BOOK_ID
      && location.lessonId === lessonId
      && location.partId === partId;
  }) || null;
}

function buildContextRecord(
  sourceCard: VocabularyPackRow,
  sourceOcrId: string,
  suffix: string,
  traditional: string,
  simplified: string | undefined,
  pinyin: string,
  english: string,
  printedPage: number | undefined,
  confidence: string | undefined,
): CourseExampleRecord | null {
  const location = parseVocabularyId(sourceCard.id);
  if (!location) return null;
  return {
    id: `${sourceCard.id}-${suffix}`,
    sourceCardId: sourceCard.id,
    sourceFront: sourceCard.traditional || '',
    sourceMeaning: sourceCard.meaning || '',
    bookId: location.bookId,
    lessonId: location.lessonId,
    partId: location.partId,
    traditional: traditional.trim(),
    ...(simplified?.trim() ? { simplified: simplified.trim() } : {}),
    pinyin: pinyin.trim(),
    english: english.trim(),
    ...(printedPage ? { printedPage } : {}),
    sourceOcrId,
    provenance: 'textbook-ocr',
    confidence: confidence === 'medium' ? 'medium' : 'high',
  };
}

function createLaterLessonContextExamples(
  lessons: OcrLesson[],
  vocabularyRows: VocabularyPackRow[],
): CourseExampleRecord[] {
  const records: CourseExampleRecord[] = [];

  lessons.filter((lesson) => (
    lesson.lessonId >= 7
    && lesson.lessonId <= 14
    && (
      lesson.verification?.checklist?.pinyinToneMarksPreservedAsPrinted === true
      || lesson.verification?.checklist?.dialogueAndReadingPinyinVerified === true
    )
  )).forEach((lesson) => {
    (lesson.dialogues || []).forEach((dialogue, dialogueIndex) => {
      const partId = dialogueIndex + 1;
      const anchor = findPartAnchor(vocabularyRows, lesson.lessonId, partId);
      if (!anchor) return;
      (dialogue.lines || []).forEach((line, lineIndex) => {
        if (
          !line.traditional?.trim()
          || !line.pinyin?.trim()
          || !line.english?.trim()
          || line.confidence === 'needs-review'
        ) return;
        const record = buildContextRecord(
          anchor,
          line.id,
          `D${String(dialogueIndex + 1).padStart(2, '0')}L${String(lineIndex + 1).padStart(2, '0')}`,
          line.traditional,
          line.simplified,
          line.pinyin,
          line.english,
          line.printedPage,
          line.confidence,
        );
        if (record) records.push(record);
      });
    });

    (lesson.otherImportantContent || []).filter((item) => item.type === 'reading').forEach((reading) => {
      const groupSizes = READING_ENGLISH_GROUPS[reading.id];
      const anchor = findPartAnchor(vocabularyRows, lesson.lessonId, 3);
      if (!groupSizes || !anchor || reading.confidence === 'needs-review') return;

      const traditional = splitChineseSentences(reading.traditional);
      const simplified = splitChineseSentences(reading.simplified);
      const pinyin = splitLatinSentences(reading.pinyin);
      const english = splitLatinSentences(reading.english);
      if (
        traditional.length !== pinyin.length
        || simplified.length !== traditional.length
        || groupSizes.length !== traditional.length
        || groupSizes.reduce((total, size) => total + size, 0) !== english.length
      ) return;

      let englishIndex = 0;
      traditional.forEach((sentence, sentenceIndex) => {
        const groupSize = groupSizes[sentenceIndex];
        const englishSentence = english.slice(englishIndex, englishIndex + groupSize).join(' ');
        englishIndex += groupSize;
        const record = buildContextRecord(
          anchor,
          reading.id,
          `RDG01S${String(sentenceIndex + 1).padStart(2, '0')}`,
          sentence,
          simplified[sentenceIndex],
          pinyin[sentenceIndex],
          englishSentence,
          reading.printedPages?.[0],
          reading.confidence,
        );
        if (record) records.push(record);
      });
    });
  });

  return records;
}

function createReadingExample(
  lessons: OcrLesson[],
  vocabularyRows: VocabularyPackRow[],
): CourseExampleRecord | null {
  const lesson = lessons.find((item) => item.lessonId === 4);
  const reading = lesson?.otherImportantContent?.find((item) => item.id === 'B1L04-RDG01');
  const sourceCard = vocabularyRows.find((row) => row.id === 'B1L04-3-01');
  const location = sourceCard ? parseVocabularyId(sourceCard.id) : null;
  if (!reading || !sourceCard || !location) return null;

  const traditional = firstSentence(reading.traditional, /^[^。！？]+[。！？]/);
  const simplified = firstSentence(reading.simplified, /^[^。！？]+[。！？]/);
  const pinyin = firstSentence(reading.pinyin, /^[^.!?]+[.!?]/);
  const english = firstSentence(reading.english, /^[^.!?]+[.!?]/);
  if (!traditional || !pinyin || !english || !traditional.includes('夏天')) return null;

  return {
    id: `${sourceCard.id}-R01`,
    sourceCardId: sourceCard.id,
    sourceFront: sourceCard.traditional || '夏天',
    sourceMeaning: sourceCard.meaning || 'summer',
    bookId: location.bookId,
    lessonId: location.lessonId,
    partId: location.partId,
    traditional,
    ...(simplified ? { simplified } : {}),
    pinyin,
    english,
    printedPage: reading.printedPages?.[0],
    sourceOcrId: reading.id,
    provenance: 'textbook-ocr',
    confidence: reading.confidence === 'medium' ? 'medium' : 'high',
  };
}

async function main() {
  const [lessons, vocabularyPackContent] = await Promise.all([
    loadOcrLessons(),
    readFile(VOCABULARY_PACK_PATH, 'utf8'),
  ]);
  const vocabularyPack = JSON.parse(vocabularyPackContent) as VocabularyPack;
  const records: CourseExampleRecord[] = [];
  const rejected: RejectedEntry[] = [];

  lessons.forEach((lesson) => {
    (lesson.vocabulary || []).forEach((entry) => {
      const examples = (entry.examples || []).filter((example) => (
        example.traditional?.trim() && example.pinyin?.trim() && example.english?.trim()
      ));
      if (examples.length === 0) return;

      const { match: sourceCard, candidates } = matchVocabularyCard(
        lesson.lessonId,
        entry,
        vocabularyPack.items,
      );

      if (!sourceCard || entry.confidence === 'needs-review') {
        rejected.push({
          ocrId: entry.id,
          lessonId: lesson.lessonId,
          traditional: entry.traditional,
          reason: entry.confidence === 'needs-review'
            ? 'The OCR entry is explicitly marked needs-review.'
            : candidates.length === 0
              ? 'No production card matched the vocabulary term and curriculum location.'
              : 'Multiple production cards matched with the same confidence.',
          candidateCardIds: candidates.map((candidate) => candidate.id),
        });
        return;
      }

      const location = parseVocabularyId(sourceCard.id);
      if (!location) return;

      examples.forEach((example, exampleIndex) => {
        records.push({
          id: `${sourceCard.id}-E${String(exampleIndex + 1).padStart(2, '0')}`,
          sourceCardId: sourceCard.id,
          sourceFront: sourceCard.traditional || entry.traditional,
          sourceMeaning: sourceCard.meaning || entry.english || '',
          bookId: location.bookId,
          lessonId: location.lessonId,
          partId: location.partId,
          traditional: example.traditional!.trim(),
          ...(example.simplified?.trim() ? { simplified: example.simplified.trim() } : {}),
          pinyin: example.pinyin!.trim(),
          english: example.english!.trim(),
          ...(entry.printedPage ? { printedPage: entry.printedPage } : {}),
          sourceOcrId: entry.id,
          provenance: 'textbook-ocr',
          confidence: entry.confidence === 'medium' ? 'medium' : 'high',
        });
      });
    });
  });

  const readingExample = createReadingExample(lessons, vocabularyPack.items);
  if (readingExample) records.push(readingExample);
  records.push(...createLaterLessonContextExamples(lessons, vocabularyPack.items));

  records.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  const pack: CourseExamplePack = {
    schemaVersion: SCHEMA_VERSION,
    bookId: BOOK_ID,
    count: records.length,
    records,
  };
  const packContent = `${JSON.stringify(pack, null, 2)}\n`;
  const filename = `book-${BOOK_ID}.json`;
  const manifestBooks: CourseExampleManifestBook[] = [{
    bookId: BOOK_ID,
    count: records.length,
    path: `/data/course-examples/${filename}`,
    sha256: hash(packContent),
    bytes: Buffer.byteLength(packContent),
  }];
  const version = hash(manifestBooks.map((book) => book.sha256).join(':')).slice(0, 16);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    version,
    generatedAt: new Date().toISOString(),
    totalCount: records.length,
    books: manifestBooks,
  };
  const report = {
    generatedAt: manifest.generatedAt,
    source: OCR_ROOT,
    bookId: BOOK_ID,
    lessonCount: lessons.length,
    publishedRecordCount: records.length,
    publishedCardCount: new Set(records.map((record) => record.sourceCardId)).size,
    rejectedEntryCount: rejected.length,
    rejected,
  };

  await Promise.all([
    mkdir(OUTPUT_DIRECTORY, { recursive: true }),
    mkdir(REPORT_DIRECTORY, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(resolve(OUTPUT_DIRECTORY, filename), packContent, 'utf8'),
    writeFile(resolve(OUTPUT_DIRECTORY, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    writeFile(resolve(REPORT_DIRECTORY, 'book-1-import-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  ]);

  console.log(`Published ${records.length} Book 1 course examples from ${report.publishedCardCount} cards.`);
  console.log(`Rejected ${rejected.length} OCR vocabulary entries; see ${resolve(REPORT_DIRECTORY, 'book-1-import-report.json')}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
