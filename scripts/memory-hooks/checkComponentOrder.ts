import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PHASE4_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');

interface HookRecord {
  character: string;
  hook: string | null;
  acceptance: string;
}

interface WordRecord {
  word: string;
  hook: string | null;
}

interface RuntimeRecord {
  t: RuntimeTreeNode;
}

export interface OrderFinding {
  character: string;
  expected: string[];
  actual: string[];
}

export type RuntimeLookup = (glyph: string) => RuntimeTreeNode | null;

const TOKEN_PATTERN = /([\p{Script=Han}]+)\s*\(([^()]+)\)/gu;

export function singleGlyphTokens(text: string, exclude: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const glyph = match[1];
    if ([...glyph].length !== 1 || glyph === exclude || seen.has(glyph)) continue;
    seen.add(glyph);
    tokens.push(glyph);
  }
  return tokens;
}

function nodeChildren(node: RuntimeTreeNode): RuntimeTreeNode[] {
  if (node[0] === 's') return node[2];
  if (node[0] === 'g' && node.length === 3) return node[2];
  return [];
}

function flatComponents(node: RuntimeTreeNode): RuntimeTreeNode[] {
  return nodeChildren(node).flatMap((child) => (
    child[0] === 's' ? flatComponents(child) : [child]
  ));
}

/**
 * The order the breakdown shows a hook's components in: walk the tree in
 * display order (top/left/outer first); a glyph mentioned by the hook stops
 * the descent, otherwise its own parts are walked (child echo).
 */
export function expectedMentionOrder(character: string, mention: Set<string>, lookup: RuntimeLookup): string[] {
  const order: string[] = [];
  const visit = (glyph: string): void => {
    if (glyph !== character && mention.has(glyph)) {
      if (!order.includes(glyph)) order.push(glyph);
      return;
    }
    const root = lookup(glyph);
    if (!root) return;
    for (const child of flatComponents(root)) {
      if (child[0] === 'g') visit(child[1]);
    }
  };
  const root = lookup(character);
  if (!root) return [];
  for (const child of flatComponents(root)) {
    if (child[0] === 'g') visit(child[1]);
  }
  return order;
}

/** Full display order of single-glyph parts (deduped, first occurrence wins). */
export function componentDisplayOrder(character: string, lookup: RuntimeLookup): string[] {
  const order: string[] = [];
  const visit = (glyph: string): void => {
    if (!order.includes(glyph)) order.push(glyph);
    const root = lookup(glyph);
    if (!root) return;
    for (const child of flatComponents(root)) {
      if (child[0] === 'g') visit(child[1]);
    }
  };
  const root = lookup(character);
  if (!root) return [];
  for (const child of flatComponents(root)) {
    if (child[0] === 'g') visit(child[1]);
  }
  return order.filter((glyph) => glyph !== character);
}

export function findOrderMismatches(records: HookRecord[], lookup: RuntimeLookup): OrderFinding[] {
  const findings: OrderFinding[] = [];
  for (const record of records) {
    if (record.acceptance !== 'clean' || !record.hook) continue;
    const tokens = singleGlyphTokens(record.hook, record.character);
    if (tokens.length < 2) continue;
    const expected = expectedMentionOrder(record.character, new Set(tokens), lookup);
    const reachable = new Set(expected);
    const actual = tokens.filter((glyph) => reachable.has(glyph));
    if (actual.length < 2) continue;
    if (actual.join('\u0000') !== expected.join('\u0000')) {
      findings.push({ character: record.character, expected, actual });
    }
  }
  return findings;
}

export function findWordOrderMismatches(records: WordRecord[]): OrderFinding[] {
  const findings: OrderFinding[] = [];
  for (const record of records) {
    const chars = [...record.word];
    if (chars.length < 2 || chars.every((char) => char === chars[0])) continue;
    if (!record.hook) continue;
    const tokens = singleGlyphTokens(record.hook, '');
    const seen: string[] = [];
    for (const token of tokens) {
      if (chars.includes(token) && !seen.includes(token)) seen.push(token);
    }
    const expected = chars.filter((char, index) => chars.indexOf(char) === index && seen.includes(char));
    if (seen.length >= 2 && seen.join('\u0000') !== expected.join('\u0000')) {
      findings.push({ character: record.word, expected, actual: seen });
    }
  }
  return findings;
}

function main(): void {
  const strict = process.argv.includes('--strict');
  const manifest = JSON.parse(readFileSync(resolve(PHASE4_DIR, 'manifest.json'), 'utf8')) as {
    recordShards: unknown[];
  };
  const shardCount = manifest.recordShards.length;
  const shardCache = new Map<number, Record<string, RuntimeRecord>>();
  const lookup: RuntimeLookup = (glyph) => {
    const shard = (glyph.codePointAt(0) ?? 0) % shardCount;
    if (!shardCache.has(shard)) {
      shardCache.set(
        shard,
        JSON.parse(
          readFileSync(resolve(PHASE4_DIR, 'records', `shard-${String(shard).padStart(2, '0')}.json`), 'utf8'),
        ).records as Record<string, RuntimeRecord>,
      );
    }
    return shardCache.get(shard)?.[glyph]?.t ?? null;
  };

  const charRecords = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8'),
  ).records as HookRecord[];
  const wordRecords = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json'), 'utf8'),
  ).records as WordRecord[];

  const charFindings = findOrderMismatches(charRecords, lookup);
  for (const finding of charFindings) {
    console.log(`${finding.character} | expected ${finding.expected.join('→')} | actual ${finding.actual.join('→')}`);
  }
  console.log(`${charFindings.length} character hooks mention parts out of breakdown order.`);

  const wordFindings = findWordOrderMismatches(wordRecords);
  for (const finding of wordFindings) {
    console.log(`${finding.character} | expected ${finding.expected.join('→')} | actual ${finding.actual.join('→')}`);
  }
  console.log(`${wordFindings.length} word hooks mention characters out of word order.`);

  if (strict && (charFindings.length > 0 || wordFindings.length > 0)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
