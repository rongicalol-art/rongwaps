import { cleanVocabText } from '../../src/utils/vocabulary/vocabCleaner';
import { buildCourseVocabLookupMap } from '../../src/utils/vocabulary/courseLookup';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import type { Plugin } from 'vite';
import { prepareVocabulary } from '../../src/utils/vocabulary/vocabularyMapping';
import { lessonExamples, flashcardExtrasKey, type FlashcardExtrasRow } from '../../src/utils/vocabulary/flashcardExtrasPack';
import { studyPartKey, type StudyPack, type StudyPart } from '../../src/utils/vocabulary/studyPack';
import { extractCedictReference, sanitizeDictionaryDefinitions } from '../../shared/dictionaryDefinitions';
import type { GenericContentManifest } from '../../src/utils/packValidators';
import type { DBDictionaryRow } from '../../src/types/database';
import { buildCharacterCourseIndex } from '../../src/features/character-breakdown/utils/rankParentCharacters';
import { runtimeNodeChildren, type RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';
import type { RuntimePackManifest, RuntimePackRecord } from '../../src/features/character-decomposition/runtimeDerivations';

/** Every record a course word's breakdown can need, so it opens with one request instead of ~8 shards. */
async function buildHotDecomposition(root: string, courseText: string): Promise<Buffer> {
  const manifest = JSON.parse(await readFile(resolve(root, 'public/data/decomposition-runtime/manifest.json'), 'utf8')) as RuntimePackManifest;
  const records = new Map<string, RuntimePackRecord>();
  for (const shard of await Promise.all(manifest.recordShards.map(async ({ path }) => JSON.parse(await readFile(resolve(root, 'public/data/decomposition-runtime', path), 'utf8')) as { records: Record<string, RuntimePackRecord> }))) {
    for (const [character, record] of Object.entries(shard.records)) records.set(character, record);
  }
  const glyphs = (node: RuntimeTreeNode): string[] => [...(node[0] === 'g' ? [node[1]] : []), ...runtimeNodeChildren(node).flatMap(glyphs)];
  const hot: Record<string, RuntimePackRecord> = {};
  const queue = [...new Set(Array.from(courseText))];
  for (let character = queue.pop(); character !== undefined; character = queue.pop()) {
    const record = records.get(character);
    if (!record || hot[character]) continue;
    hot[character] = record;
    queue.push(...glyphs(record.t));
  }
  return Buffer.from(JSON.stringify({ schemaVersion: 1, version: manifest.version, records: hot }));
}

const HOT_DECOMPOSITION = '/data/decomposition-runtime/hot.json';
const COURSE_CHARS = '/data/search/course-chars.json';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
/** Build artifacts only: source packs remain canonical and are never modified here. */
export async function buildStudyPacks(root: string): Promise<Map<string, Buffer>> {
  const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(root, `public${path}`), 'utf8')) as T;
  const readParts = async <T>(kind: string) => {
    const manifest = await json<GenericContentManifest>(`/data/${kind}/manifest.json`);
    return Promise.all([...(manifest.books ?? []), ...(manifest.shards ?? [])].map(part => json<T>(part.path)));
  };
  const [vocabulary, extrasPacks, dictionaries] = await Promise.all([
    readParts<{ items: unknown[] }>('vocabulary'), readParts<{ items: FlashcardExtrasRow[] }>('flashcard-extras'),
    readParts<{ schemaVersion: number; items: unknown[] }>('dictionary'),
  ]);
  const cards = prepareVocabulary(vocabulary.flatMap(pack => pack.items));
  const extras = new Map(extrasPacks.flatMap(pack => pack.items).map(row => [row.key, row]));
  const dictionary = new Map<string, DBDictionaryRow[]>();
  for (const pack of dictionaries) for (const item of pack.items) {
    const [id, simplified, traditional, pinyin_accented, definitions] = (Array.isArray(item) ? item : []) as [number, string, string, string, unknown];
    const row = pack.schemaVersion === 2 ? { id, simplified, traditional: traditional || simplified, pinyin_accented, pinyin_flat: null, definitions } as DBDictionaryRow : item as DBDictionaryRow;
    for (const word of new Set([row.traditional, row.simplified])) {
      const rows = dictionary.get(word) ?? []; rows.push(row); dictionary.set(word, rows);
    }
  }
  const groups = new Map<number, typeof cards>();
  for (const card of cards) {
    const key = studyPartKey(card.bookId, card.lessonId, card.partId ?? 1);
    const group = groups.get(key) ?? []; group.push(card); groups.set(key, group);
  }
  const assets = new Map<string, Buffer>();
  assets.set('/data/decomposition-runtime/hot.json', await buildHotDecomposition(root, cards.map(card => `${card.front}${card.traditional ?? ''}${card.simplified ?? ''}`).join('')));
  const parts: StudyPart[] = [];
  const cardIds = new Map(cards.map((card, id) => [card, id]));
  // Earliest course lesson per character (~30 kB): breakdowns rank "built with" by it, without downloading every vocabulary book.
  assets.set(COURSE_CHARS, Buffer.from(JSON.stringify(Object.fromEntries([...buildCharacterCourseIndex(cards)].map(([character, { bookId, lessonId }]) => [character, [bookId, lessonId]])))));
  assets.set('/data/search/course-lookup.json', Buffer.from(JSON.stringify({ cards, entries: [...buildCourseVocabLookupMap(cards)].map(([key, card]) => [key, cardIds.get(card)]) })));

  for (const [key, group] of groups) {
    const pack: StudyPack = { schemaVersion: 1, key, count: group.length, cards: group, sentences: [], extras: [], dictionary: [] };
    const sentenceIds = new Map<string, number>();
    for (const card of group) for (const front of new Set([card.front, cleanVocabText(card.traditional ?? ''), cleanVocabText(card.simplified ?? '')].filter(Boolean))) {
      const signature = flashcardExtrasKey({ ...card, front });
      const row = extras.get(signature);
      if (!row) throw new Error(`Regenerate flashcard extras before building: ${card.id}`);
      pack.extras.push({ key: signature, wordHook: row.wordHook, more: row.examples.length - lessonExamples(row.examples).length || undefined, examples: lessonExamples(row.examples).map(({ rank, ...sentence }) => {
        const text = JSON.stringify(sentence);
        let id = sentenceIds.get(text);
        if (id === undefined) { id = pack.sentences.length; sentenceIds.set(text, id); pack.sentences.push(sentence); }
        return [id, rank];
      }) });
    }
    const rows = new Map<number, DBDictionaryRow>();
    const addWords = (words: string[], depth: number) => {
      for (const word of words) for (const row of dictionary.get(word) ?? []) {
        if (rows.has(row.id)) continue;
        rows.set(row.id, row);
        if (depth < 2) {
          const ref = extractCedictReference(sanitizeDictionaryDefinitions(row.definitions).definitions[0] ?? '');
          if (ref) addWords([ref.simplified || ref.traditional], depth + 1);
        }
      }
    };
    addWords(group.flatMap(card => [card.front, card.traditional, card.simplified].filter((word): word is string => Boolean(word))), 0);
    pack.dictionary = [...rows.values()];
    const text = JSON.stringify(pack);
    const sha256 = hash(text);
    const path = `/data/study/${key}-${sha256.slice(0, 12)}.json`;
    assets.set(path, Buffer.from(text));
    const { bookId, lessonId, partId = 1 } = group[0];
    parts.push({ key, bookId, lessonId, partId, count: group.length, ids: group.map(card => card.id), path, sha256, bytes: Buffer.byteLength(text) });
  }
  const version = hash(JSON.stringify(parts)).slice(0, 16);
  assets.set('/data/study/manifest.json', Buffer.from(JSON.stringify({ schemaVersion: 1, version, totalCount: cards.length, parts })));
  for (const [path, bytes] of [...assets]) {
    assets.set(`${path}.br`, brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }));
    assets.set(`${path}.gz`, gzipSync(bytes));
  }
  return assets;
}

export function studyPacksPlugin(): Plugin {
  let root: string;
  let pending: ReturnType<typeof buildStudyPacks> | undefined;
  const getAssets = () => pending ??= buildStudyPacks(root).catch(error => { pending = undefined; throw error; });
  return {
    name: 'rongwaps-study-packs',
    configResolved(config) { root = config.root; },
    async configureServer(server) {
      const prepareDevAssets = async () => {
        for (const [path, bytes] of await getAssets()) {
          if (!path.endsWith('.json')) continue;
          const target = resolve(root, `.vite/study${path}`);
          await mkdir(resolve(target, '..'), { recursive: true });
          await writeFile(target, bytes);
        }
      };
      await prepareDevAssets();
      server.watcher.on('change', file => { if (file.includes('/public/data/') && file.endsWith('/manifest.json')) { pending = undefined; void prepareDevAssets().catch(error => server.config.logger.error(String(error))); } });
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0];
        if (!path?.startsWith('/data/study/') && path !== '/data/search/course-lookup.json' && path !== HOT_DECOMPOSITION && path !== COURSE_CHARS) return next();
        try {
          const bytes = (await getAssets()).get(path);
          if (!bytes) { response.statusCode = 404; response.end(); return; }
          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(bytes);
        } catch (error) { next(error); }
      });
    },
    async generateBundle() {
      for (const [path, source] of await getAssets()) this.emitFile({ type: 'asset', fileName: path.slice(1), source });
    },
  };
}
