/** Deterministic book coverage. --r2 validates referenced objects; never edits shipped content. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { fetchVocabulary } from '../../src/services/vocabularyService';
import { getCourseVocabLookupMap, findCharacterCourseContext } from '../../src/services/courseVocabLookup';
import { characterReadings } from '../../src/utils/pinyin/characterReadings';
import { findReadingMatch } from '../../src/utils/pinyin/pronunciationMatching';
import { canBuildWord } from '../../src/utils/vocabulary/quizDirector';
import { resolveWordBuildTileAudio } from '../../src/screens/quiz/utils/wordBuildAudio';

const cards = await fetchVocabulary();
const books = await getCourseVocabLookupMap();
const manifest = JSON.parse(await readFile('public/data/pronunciation-audio/manifest.json', 'utf8'));
const pack = JSON.parse(await readFile(`public${manifest.path}`, 'utf8'));
const sounds = new Map<string, string>(Object.entries<string>(pack.items).map(([key, file]) => [key, pack.prefix + file]));
const objects = new Map<string, number>();
const checkR2 = process.argv.includes('--r2');
if (checkR2) {
  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  if (!endpoint || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2 audit configuration unavailable.');
  const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
  for (const prefix of ['modernchinese-', 'vocabulary-trimmed/v1/', 'pronunciation/cns-', 'book-supplement/']) {
    let token: string | undefined;
    do {
      const result = await client.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME || 'rongwaps-audio', Prefix: prefix, ContinuationToken: token }));
      for (const object of result.Contents ?? []) if (object.Key) objects.set(object.Key, object.Size ?? 0);
      token = result.NextContinuationToken;
    } while (token);
  }
}
const exists = (audio?: string) => Boolean(audio && (!checkR2 || (objects.get(audio) ?? 0) > 0));
const reports = [];
const allPairs = new Set<string>(), standalonePairs = new Set<string>(), contextPairs = new Set<string>();
for (const bookId of [1, 2, 3, 4]) {
  const bookCards = cards.filter((card) => card.bookId === bookId);
  const pairs = new Map<string, { character: string; reading: string; examples: string[] }>();
  const alignmentIssues: Array<{ id: string; form: string; pinyin: string }> = [];
  let positions = 0, audibleTiles = 0, contextualTiles = 0;
  for (const card of bookCards) {
    for (const raw of [card.traditional || card.front, card.simplified || card.front]) {
      for (const source of raw.split('/')) {
        const form = source.replace(/[()（）]/g, '');
        const aligned = characterReadings(form, card.pinyin, raw);
        if (!aligned) { alignmentIssues.push({ id: card.id, form, pinyin: card.pinyin ?? '' }); continue; }
        for (let i = 0; i < aligned.characters.length; i++) for (const reading of aligned.readings[i]) {
          const char = aligned.characters[i], key = `${char}|${reading}`;
          const pair = pairs.get(key) ?? { character: char, reading, examples: [] };
          if (pair.examples.length < 2 && !pair.examples.includes(card.front)) pair.examples.push(card.front);
          pairs.set(key, pair);
          allPairs.add(key);
        }
      }
    }
    if (canBuildWord(card)) for (const char of Array.from(card.front)) {
      positions++;
      const audio = resolveWordBuildTileAudio(card, char, books, sounds);
      if (exists(audio)) audibleTiles++; else contextualTiles++;
    }
  }
  let standalone = 0, context = 0;
  const missing: Array<{ character: string; reading: string; examples: string[] }> = [];
  const contextOnly: Array<{ character: string; reading: string; word: string }> = [];
  for (const pair of pairs.values()) {
    const recording = findReadingMatch(books, [pair.character], pair.reading);
    if (exists(recording?.audio) || exists(sounds.get(pair.reading))) { standalone++; standalonePairs.add(`${pair.character}|${pair.reading}`); continue; }
    const fullWord = await findCharacterCourseContext(pair.character, pair.reading);
    if (exists(fullWord?.audio)) { context++; contextPairs.add(`${pair.character}|${pair.reading}`); contextOnly.push({ character: pair.character, reading: pair.reading, word: fullWord!.front }); }
    else missing.push(pair);
  }
  reports.push({ bookId, cards: bookCards.length, recordedWords: bookCards.filter((card) => exists(card.audio)).length,
    missingWordRecordings: bookCards.filter((card) => !exists(card.audio)).map((card) => ({ id: card.id, word: card.front, pinyin: card.pinyin })),
    characterReadingPairs: pairs.size, standalone, context, missing, contextOnly, alignmentIssues,
    wordBuild: { positions, audibleTiles, contextualTiles } });
}
const report = { r2Verified: checkR2, dictionaryScope: 'Single-character sounds share the same library; dictionary compounds were not imported.',
  totals: { uniqueCharacterReadingPairs: allPairs.size, uniqueStandalone: standalonePairs.size, uniqueContext: contextPairs.size, uniqueMissing: allPairs.size - standalonePairs.size - contextPairs.size, cards: cards.length, recordedWords: reports.reduce((n, r) => n + r.recordedWords, 0),
    evaluatedBookCharacterReadingPairs: reports.reduce((n, r) => n + r.characterReadingPairs, 0),
    standalone: reports.reduce((n, r) => n + r.standalone, 0), context: reports.reduce((n, r) => n + r.context, 0),
    missing: reports.reduce((n, r) => n + r.missing.length, 0), alignmentIssues: reports.reduce((n, r) => n + r.alignmentIssues.length, 0) }, books: reports };
await mkdir('output/audio', { recursive: true });
await writeFile('output/audio/book-coverage.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ r2Verified: checkR2, ...report.totals, books: reports.map(({ bookId, cards, recordedWords, characterReadingPairs, standalone, context, missing, alignmentIssues, wordBuild }) => ({ bookId, cards, recordedWords, characterReadingPairs, standalone, context, missing: missing.length, alignmentIssues: alignmentIssues.length, wordBuild })) }, null, 2));
