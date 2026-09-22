/**
 * Reader curriculum audit (Book 1).
 *
 * Reproducible checks behind the reading curriculum audit in
 * `docs/OFFICIAL_AUDIO_SOURCES.md`:
 *  1. Grammar: every course part maps to exactly one reading, every page has a
 *     reviewed usage rule, and the per-reading "used here" detections still
 *     match the reviewed snapshot.
 *  2. Vocabulary: for each reading, word tokens that no lesson up to and
 *     including its own teaches (proper nouns, numerals, and the pack's
 *     slash/optional alternates are normalised away first).
 *
 * Advisory checks (untaught tokens) print findings but do not fail the run;
 * structural problems exit non-zero.
 *
 * Usage: npx tsx scripts/auditReaderCurriculum.ts [--book 1]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INTERACTIVE_GRAMMAR_PARTS } from '../src/data/interactiveGrammarPages';
import { ALL_READINGS } from '../src/data/readings';
import type { ReadingRecord } from '../src/types/models';
import { GRAMMAR_USAGE_RULES } from '../src/data/grammarUsageRules';
import { segmentReadingSentences } from '../src/utils/grammarUsage';
import { parseVocabularyId } from '../src/utils/vocabularyId';
import { vocabularyTermVariants } from '../src/utils/vocabularyMatching';
import { findGrammarPartForReading } from '../src/utils/readingContext';

interface VocabularyRow {
  id: string;
  traditional: string | null;
  simplified: string | null;
}

const BOOK_ID = Number(process.argv[process.argv.indexOf('--book') + 1]) || 1;
const CJK_TOKEN = /^[\u3400-\u9fff]+$/;
const NUMERAL_CHARS = new Set('一二三四五六七八九十百千萬万兩两幾几半零第號号點点'.split(''));
/** Grammar words: tracked by the grammar rules, not by the vocabulary list. */
const FUNCTION_WORDS = new Set(
  ['不', '沒', '的', '了', '是', '有', '在', '也', '都', '和', '跟', '給', '對', '就', '還', '很', '太', '才', '再', '吧', '嗎', '呢', '啊', '個', '們', '之', '而', '又', '把', '讓', '被', '得', '過', '著'].map((word) => word),
);
const ASPECT_SUFFIXES = ['了', '著', '過', '得', '的', '們'];
const NOUN_SUFFIXES = ['店', '人', '會', '票', '部', '節', '時', '課', '家', '員', '機', '車', '房', '山', '潭', '路', '線'];

function isNameToken(token: string, names: Set<string>): boolean {
  if (names.has(token)) return true;
  for (const name of names) {
    if (name.length > token.length && name.includes(token)) return true;
  }
  return false;
}

function isNumeralToken(token: string): boolean {
  return [...token].every((char) => NUMERAL_CHARS.has(char));
}

function loadVocabulary(bookId: number): VocabularyRow[] {
  const path = resolve(process.cwd(), `public/data/vocabulary/book-${bookId}.json`);
  const pack = JSON.parse(readFileSync(path, 'utf8')) as { items: VocabularyRow[] };
  return pack.items;
}

function auditGrammar(parts: typeof INTERACTIVE_GRAMMAR_PARTS, readings: ReadingRecord[]): string[] {
  const problems: string[] = [];

  for (const part of parts) {
    const matches = readings.filter(
      (reading) => reading.audioReference === part.dialogue.audioReference,
    );
    if (matches.length !== 1) {
      problems.push(`${part.id}: audio ${part.dialogue.audioReference} matches ${matches.length} readings`);
      continue;
    }
    if (matches[0].dialogueNumber !== part.partId) {
      problems.push(`${part.id}: reading ${matches[0].id} sits on dialogue ${matches[0].dialogueNumber}`);
    }
  }

  for (const part of parts) {
    for (const page of part.grammarPages) {
      const entry = GRAMMAR_USAGE_RULES[page.id];
      if (!entry) problems.push(`${page.id}: no usage rule and no undetectable note`);
      else if (entry.detected && entry.detected.anyOf.length === 0) {
        problems.push(`${page.id}: detected rule without evidence`);
      }
    }
  }

  for (const reading of readings) {
    const part = findGrammarPartForReading(reading, parts);
    if (!part && !reading.title.includes('短文')) {
      problems.push(`${reading.id}: no grammar part and not a short essay`);
    }
  }

  return problems;
}

/**
 * True when a token is a transparent derivation of a taught word: an aspect or
 * plural suffix on a known stem (看看 / 拿著 / 同學們), a verb reduplication
 * (穿穿), or a known stem plus a noun suffix (麵包店, 外國人, 音樂會).
 */
function derivedFromTaught(token: string, terms: Set<string>): boolean {
  if (token.length < 2) return false;
  if (token[0] === token[1] && terms.has(token[0])) return true;
  if (token.length === 3 && token[1] === '一' && token[0] === token[2] && terms.has(token[0])) {
    return true;
  }
  for (const suffix of ASPECT_SUFFIXES) {
    if (token.endsWith(suffix) && terms.has(token.slice(0, -1))) return true;
  }
  for (const suffix of NOUN_SUFFIXES) {
    if (token.endsWith(suffix) && terms.has(token.slice(0, -1))) return true;
  }
  return false;
}

function auditVocabulary(
  rows: VocabularyRow[],
  readings: ReadingRecord[],
  names: Set<string>,
): Map<string, string[]> {
  const termsByLesson = new Map<number, Set<string>>();
  for (const row of rows) {
    const lessonId = parseVocabularyId(row.id)?.lessonId ?? 0;
    const bucket = termsByLesson.get(lessonId) ?? new Set<string>();
    for (const variant of vocabularyTermVariants(row)) bucket.add(variant);
    termsByLesson.set(lessonId, bucket);
  }
  const taughtTerms = (lessonId: number) => {
    const terms = new Set<string>();
    for (let lesson = 0; lesson <= lessonId; lesson += 1) {
      for (const term of termsByLesson.get(lesson) ?? []) terms.add(term);
    }
    return terms;
  };

  const untaught = new Map<string, string[]>();
  for (const reading of readings) {
    // The reading is segmented into tokens while the pack lists whole words, so
    // cover each sentence greedily with the longest taught term that matches a
    // token span; only the uncovered tokens are genuinely untaught.
    const terms = taughtTerms(reading.lessonId);
    const found = new Set<string>();
    for (const sentence of segmentReadingSentences(reading)) {
      let index = 0;
      while (index < sentence.length) {
        let matched = 0;
        for (let span = Math.min(4, sentence.length - index); span >= 1; span -= 1) {
          const candidate = sentence.slice(index, index + span).join('');
          if (terms.has(candidate)) {
            matched = span;
            break;
          }
        }
        if (matched > 0) {
          index += matched;
          continue;
        }
        const token = sentence[index];
        index += 1;
        if (!CJK_TOKEN.test(token)) continue;
        if (isNameToken(token, names)) continue;
        if (isNumeralToken(token)) continue;
        if (FUNCTION_WORDS.has(token)) continue;
        if (derivedFromTaught(token, terms)) continue;
        found.add(token);
      }
    }
    if (found.size > 0) untaught.set(reading.id, [...found].sort());
  }
  return untaught;
}

const parts = INTERACTIVE_GRAMMAR_PARTS.filter((part) => part.bookId === BOOK_ID);
const readings = ALL_READINGS.filter((reading) => reading.bookId === BOOK_ID);
const rows = loadVocabulary(BOOK_ID);

const names = new Set<string>();
for (const reading of readings) {
  for (const paragraph of reading.paragraphs) {
    if (paragraph.speaker && paragraph.speaker !== 'narrator') names.add(paragraph.speaker);
  }
}

const grammarProblems = auditGrammar(parts, readings);
const untaught = auditVocabulary(rows, readings, names);

console.log(`Book ${BOOK_ID}: ${readings.length} readings, ${parts.length} grammar parts, ${rows.length} vocabulary rows.`);
console.log(`Grammar problems: ${grammarProblems.length}`);
for (const problem of grammarProblems) console.log(`  - ${problem}`);

console.log(`Readings with tokens outside the taught vocabulary: ${untaught.size}`);
for (const [readingId, tokens] of untaught) console.log(`  ${readingId}: ${tokens.join(' ')}`);

if (grammarProblems.length > 0) process.exitCode = 1;
