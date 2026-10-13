/**
 * lintSimpleDefinitions.ts
 *
 * Gate for authored simple definitions in `content/vocabulary/simpleDefinitions.json`.
 * Errors: coverage, banned words, slash between senses, degenerate values.
 * Warnings: duplicate/colliding glosses, length/word caps, casing, punctuation.
 * Run: `npm run vocab:simple:lint`
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const VOCAB_DIR = resolve(ROOT, 'public/data/vocabulary');
const SIMPLE_DEFS_PATH = resolve(ROOT, 'content/vocabulary/simpleDefinitions.json');

interface VocabItem {
  id: string;
  simplified?: string;
  meaning?: string;
  pos?: string;
  simple?: string;
}

interface VocabPack {
  bookId: number;
  items: VocabItem[];
}

const BANNED_WORDS = [
  'abide',
  'abundant',
  'accomplish',
  'accord',
  'acquire',
  'aching',
  'agitated',
  'alter',
  'applaud',
  'aromatic',
  'aspiration',
  'attire',
  'await',
  'bask',
  'bldg',
  'chronological',
  'colloq',
  'compel',
  'compensate',
  'comprehend',
  'commend',
  'conv',
  'cumbersome',
  'daikon',
  'dashing',
  'deduct',
  'defecate',
  'dept',
  'discerning',
  'dismantle',
  'doze',
  'drizzle',
  'eloquence',
  'emcee',
  'encompass',
  'err',
  'evade',
  'exhale',
  'fickle',
  'filial',
  'flunk',
  'forfeit',
  'frugal',
  'glutinous',
  'heft',
  'ignite',
  'imperative',
  'indemnify',
  'inhale',
  'inquire',
  'lang',
  'lest',
  'maternal',
  'merely',
  'monarch',
  'municipal',
  'municipality',
  'obese',
  'obtain',
  'occident',
  'oneself',
  'oppress',
  'orient',
  'passable',
  'paternal',
  'pluck',
  'ponder',
  'postpartum',
  'procure',
  'purchase',
  'recollections',
  'reconcile',
  'remit',
  'reminisce',
  'renowned',
  'repast',
  'replenish',
  'reside',
  'revere',
  'sb',
  'scalding',
  'scoldings',
  'seemingly',
  'signboard',
  'solely',
  'stature',
  'strive',
  'submerge',
  'supersede',
  'surpass',
  'thereupon',
  'topple',
  'transit',
  'trustworthiness',
  'unceasingly',
  'undergo',
  'unwelcoming',
  'uphold',
  'urinate',
  'utensils',
  'utilize',
  'vexed',
  'vicinity',
  'vivacious',
  'voyage',
  'yearn',
];

const MAX_WORDS = 6;
const WARN_WORDS = 5;

function exitWith(code: number): never {
  process.exit(code);
}

function normalizeRuntime(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function stripParentheses(value: string): string {
  return value.replace(/\([^)]*\)/g, '');
}

function lessonOf(id: string): string {
  return id.split('-')[0];
}

function wordCount(value: string): number {
  return stripParentheses(value).trim().split(/\s+/).filter(Boolean).length;
}

const defs = JSON.parse(readFileSync(SIMPLE_DEFS_PATH, 'utf8')) as Record<string, string>;
const items = new Map<string, VocabItem>();

for (let b = 1; b <= 4; b++) {
  const pack = JSON.parse(readFileSync(resolve(VOCAB_DIR, `book-${b}.json`), 'utf8')) as VocabPack;
  for (const item of pack.items) items.set(item.id, item);
}

const errors: string[] = [];
const warnings: string[] = [];
const noopIds: string[] = [];

const bannedPattern = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'i');

for (const id of Object.keys(defs)) {
  if (!items.has(id)) errors.push(`orphan: ${id} has no card in packs`);
}

const valueToIds = new Map<string, string[]>();
const lessonNormToIds = new Map<string, string[]>();
const bookNormToIds = new Map<string, string[]>();

for (const [id, item] of items) {
  const value = defs[id];
  if (value === undefined) {
    errors.push(`missing: ${id} has no simple definition`);
    continue;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    errors.push(`degenerate: ${id} is empty`);
    continue;
  }

  const banned = bannedPattern.exec(trimmed);
  if (banned) errors.push(`banned word "${banned[1]}": ${id} "${trimmed}"`);

  if (/\//.test(stripParentheses(trimmed))) {
    errors.push(`slash between senses: ${id} "${trimmed}"`);
  }

  if (/^M:/.test(trimmed)) {
    errors.push(`M: shorthand: ${id} "${trimmed}"`);
  }

  if (/^[-–—]/.test(trimmed) || (trimmed.length < 2 && !/^[A-Za-z]$/.test(trimmed))) {
    errors.push(`degenerate value: ${id} "${trimmed}"`);
  }

  if (item.meaning && trimmed.length > item.meaning.length) {
    warnings.push(`longer than meaning: ${id} "${trimmed}" vs "${item.meaning}"`);
  }

  const words = wordCount(trimmed);
  if (words > MAX_WORDS) warnings.push(`> ${MAX_WORDS} words: ${id} "${trimmed}"`);
  else if (words >= WARN_WORDS) warnings.push(`>= ${WARN_WORDS} words: ${id} "${trimmed}"`);

  if (item.meaning && normalizeRuntime(trimmed) === normalizeRuntime(item.meaning)) {
    noopIds.push(id);
  }

  if (/(^|[^A-Za-z])god([^A-Za-z]|$)/.test(trimmed)) warnings.push(`lowercase god: ${id} "${trimmed}"`);
  if ((trimmed.match(/;/g) ?? []).length >= 2) warnings.push(`multiple semicolons: ${id} "${trimmed}"`);
  if (/["“”]/.test(trimmed)) warnings.push(`quotes: ${id} "${trimmed}"`);
  if (/[a-z]\.$/.test(trimmed)) warnings.push(`trailing period: ${id} "${trimmed}"`);
  if (trimmed.length > 60) warnings.push(`very long: ${id} "${trimmed}"`);

  const rtKey = normalizeRuntime(trimmed);
  valueToIds.set(trimmed, [...(valueToIds.get(trimmed) ?? []), id]);
  lessonNormToIds.set(`${lessonOf(id)}|${rtKey}`, [...(lessonNormToIds.get(`${lessonOf(id)}|${rtKey}`) ?? []), id]);
  const book = id.slice(1, 2);
  bookNormToIds.set(`${book}|${rtKey}`, [...(bookNormToIds.get(`${book}|${rtKey}`) ?? []), id]);
}

for (const [value, ids] of valueToIds) {
  if (ids.length > 1) warnings.push(`duplicate gloss "${value}": ${ids.join(', ')}`);
}

for (const [key, ids] of lessonNormToIds) {
  if (ids.length > 1) warnings.push(`same-lesson collision "${key.split('|')[1]}": ${ids.join(', ')}`);
}

for (const [key, ids] of bookNormToIds) {
  if (ids.length > 1 && new Set(ids.map(lessonOf)).size > 1) {
    const books = new Set(ids.map((id) => id.slice(0, 2)));
    if (books.size === 1) warnings.push(`same-book collision "${key.split('|')[1]}": ${ids.join(', ')}`);
  }
}

function printGroup(title: string, entries: string[], cap = 15): void {
  if (entries.length === 0) return;
  console.log(`\n${title} (${entries.length}):`);
  for (const entry of entries.slice(0, cap)) console.log(`  - ${entry}`);
  if (entries.length > cap) console.log(`  ...and ${entries.length - cap} more`);
}

console.log(`Simple definitions: ${Object.keys(defs).length} authored, ${items.size} cards`);
console.log(`No-op entries (simple === meaning): ${noopIds.length}`);

printGroup('ERRORS', errors, errors.length);
printGroup('WARNINGS', warnings, 50);

if (errors.length > 0) {
  console.log(`\nFailed with ${errors.length} errors, ${warnings.length} warnings.`);
  exitWith(1);
}

console.log(`\nOK: 0 errors, ${warnings.length} warnings.`);
