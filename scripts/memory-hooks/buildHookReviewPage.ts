import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';
import { tokenizeHookText, type HookTextSegment } from '../../src/features/character-memory-hooks/hookText';
import { getDictionaryShard } from '../../src/utils/dictionaryShard';
import {
  buildTaughtSenses,
  findAlignmentFindings,
  labelAlignsWithMeaning,
  type InventoryEntry,
} from './checkComponentLabelAlignment';
import { findOrderMismatches, type OrderFinding } from './checkComponentOrder';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');
const PHASE4_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');
const BREAKDOWNS_DIR = resolve(ROOT, 'public/data/breakdowns');
const DICTIONARY_DIR = resolve(ROOT, 'public/data/dictionary');
const PACK_DIR = resolve(ROOT, 'public/data/memory-hooks');

const MAX_TREE_DEPTH = 6;
const MAX_TREE_NODES = 100;

interface WordDecision {
  word: string;
  action: string | null;
  hook: string | null;
  note?: string | null;
}

interface CharacterDecision {
  character: string;
  action: string | null;
  hook: string | null;
  note?: string | null;
}

interface WordRecord {
  word: string;
  pinyin: string;
  meaning: string;
  hook: string | null;
  characters: Array<{ char: string; meaning: string | null }>;
}

interface BeforeWord {
  word: string;
  meaning: string;
  hook: string;
}

interface HookRecord {
  character: string;
  meaning: string | null;
  pinyin: string | null;
  hook: string | null;
  acceptance: string;
}

interface BreakdownItem {
  character: string;
  pinyin: string[] | null;
  definition: string | null;
  decomposition: string | null;
  components_historical: string[] | null;
}

interface DictionaryItem {
  traditional: string;
  simplified: string;
  pinyin_accented: string | null;
  definitions: unknown;
}

interface RuntimeRecord {
  r: string;
  s: number;
  t: RuntimeTreeNode;
}

interface Tag {
  level: string;
  why: string;
}

interface TagsFile {
  levels: Record<string, string>;
  items: Record<string, Tag>;
  decisions: Record<string, Tag & { recommendation?: string }>;
}

interface DisplayNode {
  kind: 'glyph' | 'unencoded' | 'unknown' | 'entity';
  glyph?: string;
  strokes?: number;
  pinyin?: string;
  meaning?: string;
  children: DisplayNode[];
}

interface PartDiagnostic {
  glyph: string;
  appPinyin?: string;
  appMeaning?: string;
  hookLabel?: string;
  named: boolean;
  aligned?: boolean;
}

interface BreakdownSection {
  char: string;
  primary: boolean;
  pinyin?: string;
  meaning?: string;
  tree: DisplayNode[];
  legacy?: { decomposition: string; components: string[] };
  parts: PartDiagnostic[];
  coverage: { named: number; total: number };
}

interface ReviewItem {
  id: string;
  kind: 'word' | 'character';
  text: string;
  pinyin?: string;
  meaning?: string;
  level: string;
  why: string;
  changed: boolean;
  orderIssue?: { expected: string[]; actual: string[] } | null;
  note?: string | null;
  beforeText: string;
  afterText: string;
  before: HookTextSegment[];
  after: HookTextSegment[];
  wordParts?: PartDiagnostic[];
  sections: BreakdownSection[];
}

interface DecisionItem {
  key: string;
  glyph: string;
  label: string;
  taughtMeaning: string;
  why: string;
  recommendation?: string;
  affected: Array<{ id: string; text: HookTextSegment[]; raw: string }>;
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shardName(shard: number): string {
  return `shard-${String(shard).padStart(2, '0')}.json`;
}

function createShardStore<T>(dir: string, pick: (pack: unknown, shard: number) => T) {
  const cache = new Map<number, T>();
  return (shard: number): T => {
    const cached = cache.get(shard);
    if (cached !== undefined) return cached;
    const pack = JSON.parse(readFileSync(resolve(dir, shardName(shard)), 'utf8')) as unknown;
    const value = pick(pack, shard);
    cache.set(shard, value);
    return value;
  };
}

function main(): void {
  const runtimeManifest = readJson<{ recordShards: Array<{ count: number }> }>(resolve(PHASE4_DIR, 'manifest.json'));
  const runtimeShardCount = runtimeManifest.recordShards.length;
  const loadRuntimeShard = createShardStore<Record<string, RuntimeRecord>>(
    resolve(PHASE4_DIR, 'records'),
    (pack) => (pack as { records: Record<string, RuntimeRecord> }).records,
  );
  const runtimeRecord = (glyph: string): RuntimeRecord | null => {
    const shard = (glyph.codePointAt(0) ?? 0) % runtimeShardCount;
    return loadRuntimeShard(shard)[glyph] ?? null;
  };

  const breakdownManifest = readJson<{ shardCount: number }>(resolve(BREAKDOWNS_DIR, 'manifest.json'));
  const loadBreakdownShard = createShardStore<Map<string, BreakdownItem>>(
    BREAKDOWNS_DIR,
    (pack) => new Map((pack as { items: BreakdownItem[] }).items.map((item) => [item.character, item])),
  );
  const breakdownItem = (glyph: string): BreakdownItem | null => {
    const shard = (glyph.codePointAt(0) ?? 0) % breakdownManifest.shardCount;
    return loadBreakdownShard(shard).get(glyph) ?? null;
  };

  const loadDictionaryShard = createShardStore<Map<string, DictionaryItem>>(
    DICTIONARY_DIR,
    (pack) => {
      const map = new Map<string, DictionaryItem>();
      for (const item of (pack as { items: DictionaryItem[] }).items) {
        if (!map.has(item.traditional)) map.set(item.traditional, item);
        if (!map.has(item.simplified)) map.set(item.simplified, item);
      }
      return map;
    },
  );
  const dictionaryItem = (glyph: string): DictionaryItem | null => (
    loadDictionaryShard(getDictionaryShard(glyph)).get(glyph) ?? null
  );

  const glyphMeta = (glyph: string): { pinyin?: string; meaning?: string } => {
    const breakdown = breakdownItem(glyph);
    const pinyin = breakdown?.pinyin?.[0]?.trim();
    const meaning = breakdown?.definition?.trim();
    if (pinyin || meaning) return { pinyin, meaning };
    const dictionary = dictionaryItem(glyph);
    const definitions = dictionary?.definitions;
    const first = Array.isArray(definitions)
      ? definitions.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : undefined;
    return {
      pinyin: dictionary?.pinyin_accented?.trim() || undefined,
      meaning: first?.trim(),
    };
  };

  const directComponents = (node: RuntimeTreeNode): RuntimeTreeNode[] => (
    node[0] === 's' ? node[2].flatMap(directComponents) : [node]
  );

  const recordChildren = (glyph: string): RuntimeTreeNode[] => {
    const record = runtimeRecord(glyph);
    if (!record) return [];
    const root = record.t;
    if (root[0] === 'g' && root[1] === glyph) return [];
    return directComponents(root).filter((child) => !(child[0] === 'g' && child[1] === glyph));
  };

  const flatten = (
    node: RuntimeTreeNode,
    depth: number,
    budget: { count: number },
    ancestry: Set<string>,
  ): DisplayNode[] => {
    if (budget.count >= MAX_TREE_NODES) return [];
    if (node[0] === 's') return node[2].flatMap((child) => flatten(child, depth, budget, ancestry));
    budget.count += 1;
    if (node[0] === 'g') {
      const glyph = node[1];
      const inline = node.length === 3 ? node[2] : null;
      let children: DisplayNode[] = [];
      if (depth < MAX_TREE_DEPTH && !ancestry.has(glyph)) {
        const nextAncestry = new Set(ancestry);
        nextAncestry.add(glyph);
        const sources = inline ?? recordChildren(glyph);
        children = sources.flatMap((child) => flatten(child, depth + 1, budget, nextAncestry));
      }
      return [{ kind: 'glyph', glyph, ...glyphMeta(glyph), children }];
    }
    if (node[0] === 'u') return [{ kind: 'unencoded', strokes: node.length === 3 ? node[2] : undefined, children: [] }];
    if (node[0] === '?') return [{ kind: 'unknown', children: [] }];
    return [{ kind: 'entity', children: [] }];
  };

  const hookedLabel = (hookText: string, glyph: string): string | undefined => {
    const match = hookText.match(new RegExp(`${escapeRegExp(glyph)}\\s*\\(([^()]+)\\)`, 'u'));
    return match?.[1].trim();
  };

  const inventory = readJson<{ entries: InventoryEntry[] }>(resolve(OUTPUT_DIR, 'book-1-inventory.json'));
  const taughtSenses = buildTaughtSenses(inventory.entries);

  const buildSection = (char: string, primary: boolean, hookText: string, includeParts: boolean): BreakdownSection => {
    const record = runtimeRecord(char);
    const breakdown = breakdownItem(char);
    const meta = glyphMeta(char);
    const tree = record ? flatten(record.t, 0, { count: 0 }, new Set([char])) : [];
    const parts: PartDiagnostic[] = [];
    if (record && includeParts) {
      for (const component of directComponents(record.t)) {
        if (component[0] !== 'g') continue;
        const glyph = component[1];
        const componentMeta = glyphMeta(glyph);
        const hookLabel = hookedLabel(hookText, glyph);
        const taught = taughtSenses.meanings.get(glyph)
          ?? breakdownItem(glyph)?.definition?.trim()
          ?? glyphMeta(glyph).meaning
          ?? '';
        const readings = taughtSenses.readings.get(glyph) ?? breakdownItem(glyph)?.pinyin ?? [];
        parts.push({
          glyph,
          appPinyin: componentMeta.pinyin,
          appMeaning: componentMeta.meaning,
          hookLabel,
          named: Boolean(hookLabel) || hookText.includes(`${glyph}(`),
          aligned: hookLabel && taught ? labelAlignsWithMeaning(hookLabel, taught, readings) : undefined,
        });
      }
    }
    return {
      char,
      primary,
      pinyin: meta.pinyin,
      meaning: meta.meaning,
      tree,
      legacy: breakdown?.decomposition
        ? { decomposition: breakdown.decomposition, components: breakdown.components_historical ?? [] }
        : undefined,
      parts,
      coverage: { named: parts.filter((part) => part.named).length, total: parts.length },
    };
  };

  const tags = readJson<TagsFile>(resolve(REVIEW_DIR, 'hook-review-tags-v1.json'));

  let alignmentHooks = new Set<string>();
  const triageUnchanged = (hook: string, id: string, kind: 'word' | 'character', wordConflict: boolean): Tag => {
    if (kind === 'character' && alignmentHooks.has(id)) {
      return { level: 'low', why: 'Component gloss differs from the taught meaning — check the label.' };
    }
    if (wordConflict) {
      return { level: 'medium', why: 'A character gloss differs from the card meaning — contextual sense, worth a look.' };
    }
    if (/sound component|sound cue|serves as the sound|calls in/i.test(hook)) {
      return { level: 'medium', why: 'Phonetic-template wording.' };
    }
    if (/\b(originally|historically|ancient|history|comes from|come from|legend)\b/i.test(hook)) {
      return { level: 'medium', why: 'Makes an origin claim.' };
    }
    if (/transliteration|sound-match|sounds like|spelling of/i.test(hook)) {
      return { level: 'medium', why: 'Transliteration phrasing.' };
    }
    if (!/[\p{Script=Han}]\s*\(/u.test(hook) && !hook.includes('**') && !/\([\p{Script=Han}\s+]+\)/u.test(hook)) {
      return { level: 'medium', why: 'No gloss tokens — plain narrative.' };
    }
    return { level: 'high', why: 'Pattern-checked: scene with matched glosses.' };
  };
  const wordHasConflict = (record: WordRecord, hook: string): boolean => {
    const glosses = new Map(record.characters.map((entry) => [entry.char, entry.meaning ?? '']));
    const tokenPattern = /([\p{Script=Han}]+)\s*\(([^()]+)\)/gu;
    for (const match of hook.matchAll(tokenPattern)) {
      if ([...match[1]].length > 1) continue;
      const gloss = glosses.get(match[1]);
      if (gloss && !labelAlignsWithMeaning(match[2].trim(), gloss)) return true;
    }
    return false;
  };
  const tagFor = (id: string, changed: boolean, triage: Tag): Tag => {
    const tag = tags.items[id];
    if (tag) return tag;
    if (changed) throw new Error(`No confidence tag for changed hook ${id}`);
    return triage;
  };

  const wordArtifact = readJson<{ records: WordRecord[] }>(resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json'));
  const beforeWords = readJson<BeforeWord[]>(resolve(REVIEW_DIR, 'word-hooks-before-v3.json'));
  const beforeByWord = new Map(beforeWords.map((record) => [record.word, record]));
  const wordDecisions = new Map(
    readJson<{ decisions: WordDecision[] }>(resolve(OUTPUT_DIR, 'book-1-word-review-decisions-v3.json'))
      .decisions
      .filter((decision) => decision.action && decision.hook)
      .map((decision) => [decision.word, decision]),
  );

  const wordPartsFor = (word: string, hookText: string): PartDiagnostic[] => [...word].map((glyph) => {
    const meta = glyphMeta(glyph);
    const hookLabel = hookedLabel(hookText, glyph);
    const taught = taughtSenses.meanings.get(glyph)
      ?? breakdownItem(glyph)?.definition?.trim()
      ?? meta.meaning
      ?? '';
    const readings = taughtSenses.readings.get(glyph) ?? breakdownItem(glyph)?.pinyin ?? [];
    return {
      glyph,
      appPinyin: meta.pinyin,
      appMeaning: meta.meaning,
      hookLabel,
      named: Boolean(hookLabel) || hookText.includes(`${glyph}(`),
      aligned: hookLabel && taught ? labelAlignsWithMeaning(hookLabel, taught, readings) : undefined,
    };
  });

  const items: ReviewItem[] = [];
  const wordRecords = [...wordArtifact.records].sort((left, right) => left.word.localeCompare(right.word, 'zh-Hant'));
  for (const record of wordRecords) {
    const afterHook = record.hook;
    if (!afterHook) continue;
    const decision = wordDecisions.get(record.word);
    const beforeHook = beforeByWord.get(record.word)?.hook ?? afterHook;
    const changed = beforeHook !== afterHook;
    const triage = triageUnchanged(afterHook, `word_${record.word}`, 'word', wordHasConflict(record, afterHook));
    const tag = tagFor(`word_${record.word}`, changed, triage);
    items.push({
      id: `word_${record.word}`,
      kind: 'word',
      text: record.word,
      pinyin: record.pinyin,
      meaning: record.meaning,
      level: tag.level,
      why: tag.why,
      changed,
      note: decision?.note ?? null,
      beforeText: beforeHook,
      afterText: afterHook,
      before: tokenizeHookText(beforeHook),
      after: tokenizeHookText(afterHook),
      wordParts: wordPartsFor(record.word, afterHook),
      sections: [...record.word].map((char, index) => buildSection(char, index === 0, afterHook, false)),
    });
  }

  const charArtifact = readJson<{ records: HookRecord[] }>(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'));
  const charByChar = new Map(charArtifact.records.map((record) => [record.character, record]));
  const beforeChars = readJson<{ records: HookRecord[] }>(
    resolve(OUTPUT_DIR, 'book-1-hooks-v3.pre-character-review.json'),
  );
  const beforeByChar = new Map(beforeChars.records.map((record) => [record.character, record]));

  const findings = findAlignmentFindings(charArtifact.records, taughtSenses.meanings, taughtSenses.readings);
  alignmentHooks = new Set(findings.flatMap((finding) => finding.hooks));

  const charDecisionFiles = [
    readJson<{ decisions: CharacterDecision[] }>(resolve(OUTPUT_DIR, 'book-1-character-review-decisions-v1.json')),
    readJson<{ decisions: CharacterDecision[] }>(resolve(OUTPUT_DIR, 'book-1-character-review-decisions-v2.json')),
    readJson<{ decisions: CharacterDecision[] }>(resolve(OUTPUT_DIR, 'book-1-character-review-decisions-v3.json')),
  ];
  const charDecisions = new Map<string, CharacterDecision>();
  for (const file of charDecisionFiles) {
    for (const decision of file.decisions) charDecisions.set(decision.character, decision);
  }

  const charRecords = [...charArtifact.records]
    .filter((record) => record.acceptance === 'clean' && record.hook)
    .sort((left, right) => left.character.localeCompare(right.character, 'zh-Hant'));
  const orderIssueByCharacter = new Map<string, OrderFinding>(
    findOrderMismatches(charRecords, (glyph) => runtimeRecord(glyph)?.t ?? null)
      .map((finding) => [finding.character, finding]),
  );
  for (const record of charRecords) {
    const afterHook = record.hook;
    if (!afterHook) continue;
    const decision = charDecisions.get(record.character);
    const beforeHook = beforeByChar.get(record.character)?.hook ?? afterHook;
    const changed = beforeHook !== afterHook;
    const triage = triageUnchanged(afterHook, record.character, 'character', false);
    const tag = tagFor(record.character, changed, triage);
    const orderIssue = orderIssueByCharacter.get(record.character);
    items.push({
      id: record.character,
      kind: 'character',
      text: record.character,
      pinyin: record.pinyin ?? undefined,
      meaning: record.meaning ?? undefined,
      level: tag.level,
      why: tag.why,
      changed,
      orderIssue: orderIssue ? { expected: orderIssue.expected, actual: orderIssue.actual } : null,
      note: decision?.note ?? null,
      beforeText: beforeHook,
      afterText: afterHook,
      before: tokenizeHookText(beforeHook),
      after: tokenizeHookText(afterHook),
      sections: [buildSection(record.character, true, afterHook, true)],
    });
  }

  const levelOrder = ['high', 'medium', 'low'];
  items.sort((left, right) => {
    const levelDelta = levelOrder.indexOf(left.level) - levelOrder.indexOf(right.level);
    if (levelDelta !== 0) return levelDelta;
    if (left.kind !== right.kind) return left.kind === 'word' ? -1 : 1;
    return left.text.localeCompare(right.text, 'zh-Hant');
  });

  const decisions: DecisionItem[] = [];
  for (const finding of findings) {
    const key = `${finding.glyph}|${finding.label}`;
    const tag = tags.decisions[key];
    if (!tag) continue;
    decisions.push({
      key,
      glyph: finding.glyph,
      label: finding.label,
      taughtMeaning: finding.taughtMeaning,
      why: tag.why,
      recommendation: tag.recommendation,
      affected: finding.hooks.flatMap((character) => {
        const record = charByChar.get(character);
        if (!record?.hook) return [];
        return [{ id: character, text: tokenizeHookText(record.hook), raw: record.hook }];
      }),
    });
  }
  const untaggedFindings = findings.filter((finding) => !tags.decisions[`${finding.glyph}|${finding.label}`]);
  if (untaggedFindings.length > 0) {
    console.warn(`Untagged alignment findings: ${untaggedFindings.map((f) => `${f.glyph}(${f.label})`).join(', ')}`);
  }

  const manifest = readJson<{ version: string }>(resolve(PACK_DIR, 'manifest.json'));
  const dataset = {
    generatedAt: new Date().toISOString(),
    packVersion: manifest.version,
    levels: tags.levels,
    counts: {
      items: items.length,
      decisions: decisions.length,
      byLevel: levelOrder.reduce<Record<string, number>>((counts, level) => {
        counts[level] = items.filter((item) => item.level === level).length;
        return counts;
      }, {}),
    },
    items,
    decisions,
  };

  mkdirSync(REVIEW_DIR, { recursive: true });
  writeFileSync(resolve(REVIEW_DIR, 'hook-review-v1.json'), `${JSON.stringify(dataset, null, 2)}\n`);
  const html = renderHtml(JSON.stringify(dataset).replace(/</g, '\\u003c'), dataset.generatedAt);
  writeFileSync(resolve(REVIEW_DIR, 'hook-review.html'), html);
  console.log(JSON.stringify({
    items: items.length,
    decisions: decisions.length,
    byLevel: dataset.counts.byLevel,
    html: resolve(REVIEW_DIR, 'hook-review.html'),
    bytes: Buffer.byteLength(html),
  }, null, 2));
}

function renderHtml(datasetJson: string, generatedAt: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RongWaps memory-hook review</title>
<style>
:root {
  --canvas: #f2f3f4;
  --surface: #ffffff;
  --ink: #2f3237;
  --ink-body: #4b4b4b;
  --muted: #8c959b;
  --muted-strong: #777777;
  --border: #c3c8cc;
  --divider: #d6dade;
  --brand: #1cb0f6;
  --brand-deep: #117cad;
  --brand-soft: #f1f8fb;
  --warn: #ffc800;
  --warn-edge: #e0a900;
  --warn-surface: #fff9e8;
  --good: #58cc02;
  --good-soft: #f3fbe8;
  --danger: #ff4b4b;
  --radius: 18px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--canvas);
  color: var(--ink-body);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "PingFang TC", "Noto Sans TC", sans-serif;
  font-size: 15px;
  line-height: 1.5;
}
.zh { font-family: "PingFang TC", "Noto Sans TC", "Heiti TC", "Microsoft JhengHei", sans-serif; }
header.top {
  position: sticky; top: 0; z-index: 20;
  background: linear-gradient(to bottom, var(--canvas) 75%, rgba(242,243,244,0));
  padding: 18px 20px 10px;
}
.wrap { max-width: 980px; margin: 0 auto; padding: 0 20px 140px; }
h1 { font-size: 22px; margin: 0 0 2px; color: var(--ink); }
.sub { color: var(--muted-strong); font-size: 13px; margin-bottom: 12px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.chip {
  border: 2px solid var(--border); background: var(--surface); color: var(--ink);
  border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 800; cursor: pointer;
}
.chip.on { border-color: var(--brand); color: var(--brand-deep); background: var(--brand-soft); }
input.search {
  flex: 1 1 180px; min-width: 160px; border: 2px solid var(--border); border-radius: 12px;
  padding: 7px 12px; font-size: 14px; background: var(--surface); color: var(--ink);
}
input.search:focus { outline: none; border-color: var(--brand); }
section.group { margin-top: 26px; }
h2.group-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-strong); margin: 0 0 4px; }
p.group-hint { margin: 0 0 12px; color: var(--muted); font-size: 13px; }
section.category { margin-top: 34px; }
h2.cat-title { font-size: 20px; color: var(--ink); margin: 0 0 2px; }
.stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 4px; }
.stat-card {
  background: var(--surface); border: 2px solid var(--divider); border-radius: 12px;
  padding: 6px 10px; font-size: 12px; color: var(--muted-strong);
  display: inline-flex; gap: 8px; align-items: baseline; flex-wrap: wrap;
}
.stat-strong { color: var(--ink); font-weight: 800; }
.agreed-section h2.cat-title { color: #3f9400; }
.agreed-section .card { border-color: #d6ecc0; }
article.card {
  background: var(--surface); border: 2px solid var(--border); border-bottom-width: 5px;
  border-radius: var(--radius); padding: 16px 18px; margin-bottom: 16px;
}
.card-head { display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline; }
.card-toggle {
  display: flex; gap: 10px; align-items: baseline; width: 100%; text-align: left;
  background: none; border: none; padding: 0; font: inherit; cursor: pointer; color: inherit;
}
.card-toggle .chevron { color: var(--muted); font-weight: 800; flex: none; }
.card-status { margin-left: auto; color: var(--muted-strong); font-size: 12px; font-weight: 800; text-align: right; max-width: 48%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-body.hidden { display: none; }
.card .hook.card-hook { margin-top: 10px; }
.card:not(.open) { cursor: pointer; }
.glyph-title { font-size: 30px; font-weight: 700; color: var(--ink); }
.word-title { font-size: 24px; font-weight: 700; color: var(--ink); }
.pinyin { color: var(--brand-deep); font-weight: 800; }
.meaning { color: var(--muted-strong); font-weight: 600; }
.badge { border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
.badge.high { background: var(--good-soft); color: #3f9400; border: 1px solid #b8e986; }
.badge.medium { background: var(--warn-surface); color: var(--warn-edge); border: 1px solid #f0d98a; }
.badge.low { background: #fff1f1; color: #d63636; border: 1px solid #f7b6b6; }
.badge.existing { background: var(--canvas); color: var(--muted-strong); border: 1px solid var(--divider); }
.badge.stale { background: var(--warn-surface); color: var(--warn-edge); border: 1px solid #f0d98a; }
.badge.kind { background: var(--canvas); color: var(--muted-strong); border: 1px solid var(--divider); }
.why { margin: 8px 0 0; color: var(--muted-strong); font-size: 13px; }
.note { margin: 4px 0 0; color: var(--muted); font-size: 12px; font-style: italic; }
.hook { border-radius: 14px; padding: 12px 14px; margin-top: 12px; border: 2px solid #f0d98a; background: var(--warn-surface); }
.hook.after strong { color: var(--ink); font-weight: 800; }
.hook-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--warn-edge); margin-bottom: 4px; }
.hook.before { border-color: var(--divider); background: var(--canvas); }
.hook.before .hook-label { color: var(--muted-strong); }
.hook p { margin: 0; color: var(--ink-body); }
details.before-toggle { margin-top: 10px; }
details.before-toggle summary { cursor: pointer; color: var(--muted-strong); font-size: 13px; font-weight: 700; }
details.before-toggle .hook { margin-top: 8px; }
.panel-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted-strong); margin: 16px 0 8px; }
.section { border: 2px solid var(--divider); border-radius: 14px; padding: 12px 14px; margin-top: 10px; background: #fcfcfc; }
.section-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.section-head .zh { font-size: 22px; font-weight: 700; color: var(--ink); }
.legacy { margin-top: 8px; color: var(--muted); font-size: 12px; }
.legacy .zh { font-size: 14px; color: var(--muted-strong); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.part {
  border: 1px solid var(--divider); border-radius: 10px; padding: 4px 8px; font-size: 12px;
  background: var(--surface); color: var(--ink-body); display: inline-flex; gap: 6px; align-items: baseline;
}
.part .zh { font-size: 16px; color: var(--ink); font-weight: 700; }
.part .part-align.mismatch { color: #b58500; font-weight: 800; }
.part .part-align.match { color: #3f9400; font-weight: 800; }
.part .part-align.none { color: var(--muted); }
.coverage { font-size: 12px; color: var(--muted); margin-top: 6px; }
.tree { margin-top: 10px; }
.node { margin-top: 8px; }
.node-card {
  display: inline-flex; flex-direction: column; gap: 2px; border: 2px solid var(--divider);
  border-radius: 12px; padding: 8px 12px; background: var(--surface); min-width: 96px;
}
.node-card .zh { font-size: 26px; line-height: 1.1; color: var(--ink); font-weight: 700; }
.node-card .node-pinyin { color: var(--brand-deep); font-weight: 800; font-size: 12px; }
.node-card .node-meaning { color: var(--muted-strong); font-size: 12px; }
.children { margin-left: 22px; border-left: 2px dashed var(--divider); padding-left: 12px; }
.expand { border: none; background: none; color: var(--brand-deep); font-weight: 800; font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px; }
.hidden { display: none; }
.controls { margin-top: 16px; border-top: 2px solid var(--divider); padding-top: 12px; }
.quick-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.quick-btn {
  border: 2px solid var(--border); background: var(--surface); border-radius: 999px;
  padding: 4px 11px; font-size: 12px; font-weight: 800; cursor: pointer; color: var(--ink-body);
}
.quick-btn.on.keep { border-color: var(--good); background: var(--good-soft); color: #3f9400; }
.quick-btn.on.change { border-color: var(--warn-edge); background: var(--warn-surface); color: var(--warn-edge); }
.quick-btn.on.revert { border-color: var(--danger); background: #fff1f1; color: var(--danger); }
.quick-btn.comment { border-style: dashed; color: var(--muted-strong); }
textarea, input.suggested {
  width: 100%; border: 2px solid var(--border); border-radius: 12px; padding: 8px 12px;
  font: inherit; color: var(--ink); background: var(--surface); margin-top: 8px; resize: vertical;
}
textarea:focus, input.suggested:focus { outline: none; border-color: var(--brand); }
.progress-hint { font-size: 12px; color: var(--muted-strong); margin-left: auto; }
footer.bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  background: var(--surface); border-top: 2px solid var(--divider);
  padding: 10px 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
}
.bar .count { font-weight: 800; color: var(--ink); }
.bar .spacer { flex: 1; }
.btn {
  border: 2px solid var(--brand); border-bottom-width: 5px; border-radius: 14px; background: var(--brand);
  color: #fff; font-weight: 800; font-size: 14px; padding: 9px 16px; cursor: pointer;
}
.btn.ghost { background: var(--surface); color: var(--brand-deep); border-bottom-width: 2px; }
.btn:active { transform: translateY(1px); }
.toast {
  position: fixed; bottom: 76px; left: 50%; transform: translateX(-50%);
  background: var(--ink); color: #fff; padding: 8px 16px; border-radius: 999px; font-size: 13px;
  opacity: 0; pointer-events: none; transition: opacity 0.2s;
}
.toast.on { opacity: 1; }
</style>
</head>
<body>
<header class="top">
  <div class="wrap" style="padding-bottom:0">
    <h1>Memory-hook review</h1>
    <div class="sub">Every Book 1 hook — all 656 characters and 511 words, split into Words and Characters and triaged into high/medium/low confidence (each card shows why). Cards changed on 2026-09-16 carry a <em>changed 09-16</em> chip; the rest are <em>shipped</em>. Each collapsed card shows the hook plus ✅ Agree / ✏️ Change / ❌ Decline / 💬 Comment — <strong>Agree moves a card to the Agreed section at the bottom</strong>. Expand a card for before/after text, hook-vs-component diagnosis, and the app-style component breakdown (every part expands further). Finish with <strong>Export JSON</strong> or <strong>Copy for agent</strong> and paste it back. Generated ${generatedAt}.</div>
    <div class="toolbar">
      <button class="chip on" data-level="all">All</button>
      <button class="chip" data-level="high">High</button>
      <button class="chip" data-level="medium">Medium</button>
      <button class="chip" data-level="low">Low</button>
      <button class="chip" data-level="decision">Open decisions</button>
      <button class="chip" data-status="unreviewed">Unreviewed</button>
      <button class="chip" data-status="reviewed">Reviewed</button>
      <input class="search" id="search" type="search" placeholder="Search word, character, hook text…" />
    </div>
    <div class="stats" id="stats"></div>
  </div>
</header>
<div class="wrap" id="list"></div>
<footer class="bar">
  <span class="count" id="progress">0 / 0 reviewed</span>
  <span class="spacer"></span>
  <button class="btn ghost" id="reset">Reset</button>
  <button class="btn ghost" id="copy">Copy for agent</button>
  <button class="btn" id="export">Export JSON</button>
</footer>
<div class="toast" id="toast"></div>
<script id="dataset" type="application/json">${datasetJson}</script>
<script>
(function () {
  'use strict';
  var dataset = JSON.parse(document.getElementById('dataset').textContent);
  var STORAGE_KEY = 'rongwaps.hookReview.v1';
  var state = loadState();
  var openCards = {};
  var hookTextByKey = {};
  var groupsById = {};
  var agreedSection = null;
  var agreedGrid = null;
  var agreedCounter = null;
  var placementSync = null;
  var filters = { level: 'all', status: 'all', search: '' };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (error) { return {}; }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function entry(key) {
    return state[key] || { status: '', comment: '', suggested: '' };
  }
  function setEntry(key, patch) {
    state[key] = Object.assign(entry(key), patch);
    if (hookTextByKey[key] !== undefined) state[key].hook = hookTextByKey[key];
    state[key].stale = false;
    saveState();
    updateStats();
  }
  function isStale(key) {
    var value = entry(key);
    if (value.stale) return true;
    var current = hookTextByKey[key];
    return Boolean(value.hook && current && value.hook !== current);
  }
  var META_KEY = 'rongwaps.hookReview.meta';
  function syncPackVersion() {
    var meta = {};
    try { meta = JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; } catch (error) { meta = {}; }
    if (meta.packVersion === dataset.packVersion) return;
    Object.keys(state).forEach(function (key) {
      var value = state[key];
      if (!value || (!value.status && !value.comment && !value.suggested)) return;
      var actionable = Boolean(value.comment) || Boolean(value.suggested)
        || value.status === 'change' || value.status === 'revert';
      if (value.hook) return;
      if (actionable) value.stale = true;
      else value.hook = hookTextByKey[key] || '';
    });
    localStorage.setItem(META_KEY, JSON.stringify({ packVersion: dataset.packVersion }));
    saveState();
  }
  function toast(message) {
    var node = document.getElementById('toast');
    node.textContent = message;
    node.classList.add('on');
    window.setTimeout(function () { node.classList.remove('on'); }, 1800);
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function hookSegments(segments) {
    var fragment = document.createDocumentFragment();
    segments.forEach(function (segment) {
      if (segment.kind === 'token') {
        fragment.appendChild(el('span', 'zh', segment.glyph));
        fragment.appendChild(document.createTextNode(' '));
        fragment.appendChild(el('strong', null, segment.label));
      } else if (segment.kind === 'gloss') {
        fragment.appendChild(el('strong', null, segment.word));
      } else if (segment.kind === 'glyphRef') {
        fragment.appendChild(el('span', 'zh', segment.glyphs.join(' + ')));
      } else {
        var parts = String(segment.text).split('**');
        parts.forEach(function (part, index) {
          if (index % 2 === 1) fragment.appendChild(el('strong', null, part));
          else fragment.appendChild(document.createTextNode(part));
        });
      }
    });
    return fragment;
  }
  function hookBlock(label, segments, extraClass) {
    var block = el('div', 'hook ' + (extraClass || ''));
    if (label) block.appendChild(el('div', 'hook-label', label));
    var line = document.createElement('p');
    line.appendChild(hookSegments(segments));
    block.appendChild(line);
    return block;
  }
  function renderNode(node, depth) {
    var wrapNode = el('div', 'node');
    if (node.kind === 'glyph') {
      var card = el('div', 'node-card');
      card.appendChild(el('span', 'zh', node.glyph));
      if (node.pinyin) card.appendChild(el('div', 'node-pinyin', node.pinyin));
      if (node.meaning) card.appendChild(el('div', 'node-meaning', node.meaning));
      wrapNode.appendChild(card);
      if (node.children && node.children.length) {
        var children = el('div', 'children');
        var count = node.children.length;
        var built = false;
        var expanded = depth < 1;
        var toggle = el('button', 'expand', '');
        toggle.type = 'button';
        var ensureChildren = function () {
          if (built) return;
          built = true;
          node.children.forEach(function (child) { children.appendChild(renderNode(child, depth + 1)); });
        };
        var applyToggle = function () {
          if (expanded) {
            ensureChildren();
            children.classList.remove('hidden');
            toggle.textContent = 'Hide ' + count + ' part' + (count === 1 ? '' : 's') + ' ▴';
          } else {
            children.classList.add('hidden');
            toggle.textContent = 'Show ' + count + ' part' + (count === 1 ? '' : 's') + ' ▾';
          }
        };
        toggle.addEventListener('click', function () { expanded = !expanded; applyToggle(); });
        applyToggle();
        wrapNode.appendChild(toggle);
        wrapNode.appendChild(children);
      }
      return wrapNode;
    }
    var chip = el('div', 'node-card');
    if (node.kind === 'unencoded') chip.appendChild(el('span', 'node-meaning', 'Unencoded part' + (node.strokes ? ' · ' + node.strokes + ' stroke' + (node.strokes === 1 ? '' : 's') : '')));
    else if (node.kind === 'unknown') chip.appendChild(el('span', 'node-meaning', 'Unknown part'));
    else chip.appendChild(el('span', 'node-meaning', 'Source-only part'));
    wrapNode.appendChild(chip);
    return wrapNode;
  }
  function partChips(parts) {
    var chips = el('div', 'chips');
    parts.forEach(function (part) {
      var chip = el('span', 'part');
      chip.appendChild(el('span', 'zh', part.glyph));
      var label = part.hookLabel ? part.hookLabel : 'not glossed';
      var alignClass = part.aligned === false ? 'part-align mismatch' : part.aligned === true ? 'part-align match' : 'part-align none';
      var align = el('span', alignClass, label);
      if (part.aligned === false) align.title = 'Hook label sense differs from the taught/app meaning of ' + part.glyph;
      chip.appendChild(align);
      if (part.appMeaning) chip.appendChild(el('span', null, '· app: ' + part.appMeaning));
      chips.appendChild(chip);
    });
    return chips;
  }
  function renderSection(section) {
    var box = el('div', 'section');
    var head = el('div', 'section-head');
    head.appendChild(el('span', 'zh', section.char));
    if (section.pinyin) head.appendChild(el('span', 'pinyin', section.pinyin));
    if (section.meaning) head.appendChild(el('span', 'meaning', section.meaning));
    box.appendChild(head);
    if (section.parts.length) {
      box.appendChild(partChips(section.parts));
      box.appendChild(el('div', 'coverage', 'Hook surfaces ' + section.coverage.named + '/' + section.coverage.total + ' direct parts.'));
    }
    if (section.tree.length) {
      var tree = el('div', 'tree');
      section.tree.forEach(function (node) { tree.appendChild(renderNode(node, 0)); });
      box.appendChild(tree);
    }
    if (section.legacy) {
      var legacy = el('div', 'legacy');
      legacy.appendChild(document.createTextNode('Production breakdown: '));
      legacy.appendChild(el('span', 'zh', section.legacy.decomposition));
      var components = section.legacy.components.filter(Boolean).join(' ');
      legacy.appendChild(document.createTextNode(components ? '  (' + components + ')' : '  (no components)'));
      box.appendChild(legacy);
    }
    return box;
  }
  function renderFields(key, onChange) {
    var box = el('div', 'controls');
    var suggested = el('input', 'suggested');
    suggested.type = 'text';
    suggested.placeholder = 'Suggested rewrite (optional)';
    suggested.addEventListener('input', function () {
      setEntry(key, { suggested: suggested.value });
      onChange();
    });
    box.appendChild(suggested);
    var comment = document.createElement('textarea');
    comment.rows = 2;
    comment.placeholder = 'Comment for the agent (why agree/change/decline, what to fix)';
    comment.addEventListener('input', function () {
      setEntry(key, { comment: comment.value });
      onChange();
    });
    box.appendChild(comment);
    return {
      box: box,
      sync: function () {
        var value = entry(key);
        suggested.classList.toggle('hidden', value.status !== 'change');
        if (suggested.value !== (value.suggested || '')) suggested.value = value.suggested || '';
        if (comment.value !== (value.comment || '')) comment.value = value.comment || '';
      },
      focusComment: function () {
        comment.focus();
        comment.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
    };
  }
  function renderQuickActions(key, refresh, openForComment) {
    var row = el('div', 'quick-row');
    var buttons = {};
    [['keep', '✅ Agree'], ['change', '✏️ Change'], ['revert', '❌ Decline']].forEach(function (pair) {
      var button = el('button', 'quick-btn ' + pair[0], pair[1]);
      button.type = 'button';
      button.addEventListener('click', function () {
        var next = entry(key).status === pair[0] ? '' : pair[0];
        setEntry(key, { status: next });
        refresh();
      });
      buttons[pair[0]] = button;
      row.appendChild(button);
    });
    var comment = el('button', 'quick-btn comment', '💬 Comment');
    comment.type = 'button';
    comment.addEventListener('click', function () { openForComment(); });
    row.appendChild(comment);
    return {
      row: row,
      sync: function () {
        var value = entry(key);
        Object.keys(buttons).forEach(function (name) {
          buttons[name].classList.toggle('on', value.status === name);
        });
      },
    };
  }
  function commentPreview(key) {
    var value = entry(key);
    var text = value.comment || value.suggested || '';
    if (text.length > 70) text = text.slice(0, 69) + '…';
    return text;
  }
  function renderCard(key, headBuilder, bodyBuilder, hookSegments, hookText) {
    hookTextByKey[key] = hookText || '';
    var open = Boolean(openCards[key]);
    var card = el('article', 'card' + (open ? ' open' : ''));
    var toggle = el('button', 'card-toggle');
    toggle.type = 'button';
    var chevron = el('span', 'chevron', open ? '▾' : '▸');
    toggle.appendChild(chevron);
    var head = el('span', 'card-head');
    headBuilder(head);
    toggle.appendChild(head);
    var staleBadge = el('span', 'badge stale hidden', '⚠ updated');
    staleBadge.title = 'The hook text changed since this mark was made — the note may be stale.';
    toggle.appendChild(staleBadge);
    var preview = el('span', 'card-status');
    toggle.appendChild(preview);
    card.appendChild(toggle);
    if (hookSegments) card.appendChild(hookBlock('', hookSegments, 'after card-hook'));
    var body = el('div', 'card-body hidden');
    var fields = null;
    var quick = null;
    var built = false;
    var refresh = function () {
      preview.textContent = commentPreview(key);
      staleBadge.classList.toggle('hidden', !isStale(key));
      if (quick) quick.sync();
      if (fields) fields.sync();
      if (placementSync) placementSync(card, key);
    };
    var buildBody = function () {
      if (built) return;
      built = true;
      bodyBuilder(body);
      fields = renderFields(key, function () {
        preview.textContent = commentPreview(key);
      });
      body.appendChild(fields.box);
      fields.sync();
    };
    var applyOpen = function () {
      card.classList.toggle('open', open);
      chevron.textContent = open ? '▾' : '▸';
      if (open) {
        buildBody();
        body.classList.remove('hidden');
      } else {
        body.classList.add('hidden');
      }
    };
    quick = renderQuickActions(key, refresh, function () {
      if (!open) {
        open = true;
        openCards[key] = true;
        applyOpen();
      }
      if (fields) fields.focusComment();
    });
    card.appendChild(quick.row);
    toggle.addEventListener('click', function () {
      open = !open;
      if (open) openCards[key] = true; else delete openCards[key];
      applyOpen();
    });
    applyOpen();
    card.appendChild(body);
    refresh();
    return card;
  }
  function renderItem(item) {
    return renderCard(
      item.id,
      function (head) {
        head.appendChild(el('span', item.kind === 'word' ? 'word-title zh' : 'glyph-title zh', item.text));
        if (item.pinyin) head.appendChild(el('span', 'pinyin', item.pinyin));
        if (item.meaning) head.appendChild(el('span', 'meaning', item.meaning));
        head.appendChild(el('span', 'badge ' + item.level, item.level));
        head.appendChild(el('span', 'badge kind', item.changed ? 'changed 09-16' : 'shipped'));
        if (item.orderIssue) {
          var orderBadge = el('span', 'badge stale', '⚠ order');
          orderBadge.title = 'Hook mentions parts as ' + item.orderIssue.actual.join('→')
            + ' but the breakdown shows ' + item.orderIssue.expected.join('→');
          head.appendChild(orderBadge);
        }
      },
      function (body) {
        body.appendChild(el('p', 'why', item.why));
        if (item.note) body.appendChild(el('p', 'note', 'Review note: ' + item.note));
        if (item.beforeText !== item.afterText) {
          var details = document.createElement('details');
          details.className = 'before-toggle';
          details.appendChild(el('summary', null, 'Show previous hook'));
          details.appendChild(hookBlock('Before', item.before, 'before'));
          body.appendChild(details);
        }
        if (item.wordParts && item.wordParts.length) {
          body.appendChild(el('div', 'panel-title', 'Hook vs word characters'));
          body.appendChild(partChips(item.wordParts));
          var namedCount = item.wordParts.filter(function (part) { return part.named; }).length;
          body.appendChild(el('div', 'coverage', 'Hook names ' + namedCount + '/' + item.wordParts.length + ' characters of the word.'));
        }
        body.appendChild(el('div', 'panel-title', 'Components (app breakdown)'));
        item.sections.forEach(function (section) { body.appendChild(renderSection(section)); });
      },
      item.after,
      item.afterText,
    );
  }
  function renderDecision(decision) {
    return renderCard(
      'decision:' + decision.key,
      function (head) {
        head.appendChild(el('span', 'glyph-title zh', decision.glyph));
        head.appendChild(el('span', 'badge low', 'decision'));
        head.appendChild(el('span', 'meaning', 'hook labels it "' + decision.label + '" · taught: ' + decision.taughtMeaning));
      },
      function (body) {
        body.appendChild(el('p', 'why', decision.why));
        if (decision.recommendation) body.appendChild(el('p', 'note', 'Recommendation: ' + decision.recommendation));
        body.appendChild(el('div', 'panel-title', 'Affected hooks (' + decision.affected.length + ')'));
        decision.affected.forEach(function (affected) {
          body.appendChild(hookBlock(affected.id, affected.text, 'after'));
        });
      },
      null,
      decision.affected.map(function (affected) { return affected.raw; }).join('|'),
    );
  }
  function matches(item) {
    if (filters.level !== 'all' && item.level !== filters.level) return false;
    var value = entry(item.id);
    if (filters.status === 'unreviewed' && value.status) return false;
    if (filters.status === 'reviewed' && !value.status) return false;
    if (filters.search) {
      var haystack = (item.text + ' ' + (item.pinyin || '') + ' ' + (item.meaning || '') + ' ' + item.afterText + ' ' + (item.why || '')).toLowerCase();
      if (haystack.indexOf(filters.search.toLowerCase()) === -1) return false;
    }
    return true;
  }
  function ensureAgreedSection() {
    if (agreedSection) return;
    agreedSection = el('section', 'category agreed-section');
    var title = el('h2', 'cat-title');
    title.appendChild(el('span', null, '✅ Agreed'));
    agreedCounter = el('span', null, ' · 0');
    title.appendChild(agreedCounter);
    agreedSection.appendChild(title);
    agreedSection.appendChild(el('p', 'group-hint', 'Marked agree — kept out of the main list. Click ✅ Agree again to bring a card back.'));
    agreedGrid = el('div', 'cards');
    agreedSection.appendChild(agreedGrid);
    document.getElementById('list').appendChild(agreedSection);
  }
  function updateCounts() {
    Object.keys(groupsById).forEach(function (id) {
      var group = groupsById[id];
      var count = group.container.children.length;
      group.counter.textContent = ' · ' + count;
      group.section.classList.toggle('hidden', count === 0);
    });
    if (agreedGrid && agreedSection) {
      var keptCount = agreedGrid.children.length;
      agreedCounter.textContent = ' · ' + keptCount;
      agreedSection.classList.toggle('hidden', keptCount === 0);
    }
  }
  function syncPlacement(card, key) {
    var kept = entry(key).status === 'keep';
    if (kept) {
      if (card.parentElement !== agreedGrid) {
        ensureAgreedSection();
        agreedGrid.appendChild(card);
        updateCounts();
      }
      return;
    }
    if (agreedGrid && card.parentElement === agreedGrid) {
      var group = groupsById[card.dataset.group];
      if (group) {
        group.container.appendChild(card);
        updateCounts();
      } else {
        render();
      }
    }
  }
  function render() {
    var list = document.getElementById('list');
    list.textContent = '';
    groupsById = {};
    agreedSection = null;
    agreedGrid = null;
    agreedCounter = null;
    placementSync = null;
    var levelGroups = [
      { level: 'high', title: 'High confidence', hint: dataset.levels.high },
      { level: 'medium', title: 'Medium confidence', hint: dataset.levels.medium },
      { level: 'low', title: 'Low confidence — review closely', hint: dataset.levels.low },
    ];
    [['word', 'Words'], ['character', 'Characters']].forEach(function (category) {
      var kindItems = dataset.items.filter(function (item) { return item.kind === category[0]; });
      if (!kindItems.length) return;
      var cat = el('section', 'category');
      cat.appendChild(el('h2', 'cat-title', category[1] + ' · ' + kindItems.length));
      var rendered = 0;
      levelGroups.forEach(function (group) {
        var items = kindItems.filter(function (item) {
          return item.level === group.level && matches(item) && entry(item.id).status !== 'keep';
        });
        if (!items.length) return;
        rendered += items.length;
        var groupId = category[0] + ':' + group.level;
        var section = el('section', 'group');
        var title = el('h2', 'group-title');
        title.appendChild(el('span', null, group.title));
        var counter = el('span', null, ' · ' + items.length);
        title.appendChild(counter);
        section.appendChild(title);
        section.appendChild(el('p', 'group-hint', group.hint));
        var grid = el('div', 'cards');
        items.forEach(function (item) {
          var card = renderItem(item);
          card.dataset.group = groupId;
          grid.appendChild(card);
        });
        section.appendChild(grid);
        cat.appendChild(section);
        groupsById[groupId] = { section: section, container: grid, counter: counter };
      });
      if (rendered > 0) list.appendChild(cat);
    });
    if (filters.level === 'all' || filters.level === 'decision') {
      var decisions = dataset.decisions.filter(function (decision) {
        if (entry('decision:' + decision.key).status === 'keep') return false;
        if (filters.status === 'unreviewed') {
          if (entry('decision:' + decision.key).status) return false;
        } else if (filters.status === 'reviewed') {
          if (!entry('decision:' + decision.key).status) return false;
        }
        if (filters.search) {
          var haystack = (decision.glyph + ' ' + decision.label + ' ' + decision.taughtMeaning + ' ' + decision.why).toLowerCase();
          if (haystack.indexOf(filters.search.toLowerCase()) === -1) return false;
        }
        return true;
      });
      if (decisions.length) {
        var section = el('section', 'category');
        var title = el('h2', 'cat-title');
        title.appendChild(el('span', null, 'Open component-label decisions'));
        var counter = el('span', null, ' · ' + decisions.length);
        title.appendChild(counter);
        section.appendChild(title);
        section.appendChild(el('p', 'group-hint', dataset.levels.decision));
        var grid = el('div', 'cards');
        decisions.forEach(function (decision) {
          var card = renderDecision(decision);
          card.dataset.group = 'decisions';
          grid.appendChild(card);
        });
        section.appendChild(grid);
        list.appendChild(section);
        groupsById.decisions = { section: section, container: grid, counter: counter };
      }
    }
    var keptCards = [];
    dataset.items.forEach(function (item) {
      if (entry(item.id).status === 'keep' && matches(item)) {
        var card = renderItem(item);
        card.dataset.group = item.kind + ':' + item.level;
        keptCards.push(card);
      }
    });
    if (filters.level === 'all' || filters.level === 'decision') {
      dataset.decisions.forEach(function (decision) {
        var key = 'decision:' + decision.key;
        if (entry(key).status !== 'keep') return;
        if (filters.status === 'unreviewed') return;
        if (filters.search) {
          var haystack = (decision.glyph + ' ' + decision.label + ' ' + decision.taughtMeaning + ' ' + decision.why).toLowerCase();
          if (haystack.indexOf(filters.search.toLowerCase()) === -1) return;
        }
        var card = renderDecision(decision);
        card.dataset.group = 'decisions';
        keptCards.push(card);
      });
    }
    if (keptCards.length) {
      ensureAgreedSection();
      keptCards.forEach(function (card) { agreedGrid.appendChild(card); });
    }
    placementSync = syncPlacement;
    updateCounts();
    updateStats();
  }
  function allKeys() {
    return dataset.items.map(function (item) { return item.id; })
      .concat(dataset.decisions.map(function (decision) { return 'decision:' + decision.key; }));
  }
  function statsFor(keys) {
    var stats = { reviewed: 0, keep: 0, change: 0, revert: 0, comment: 0, pending: 0 };
    keys.forEach(function (key) {
      var value = entry(key);
      if (value.status === 'keep') { stats.keep += 1; stats.reviewed += 1; }
      else if (value.status === 'change') { stats.change += 1; stats.reviewed += 1; }
      else if (value.status === 'revert') { stats.revert += 1; stats.reviewed += 1; }
      else if (value.comment || value.suggested) { stats.comment += 1; stats.reviewed += 1; }
      else stats.pending += 1;
    });
    return stats;
  }
  function updateStats() {
    var keysFor = function (kind) {
      return dataset.items.filter(function (item) { return item.kind === kind; }).map(function (item) { return item.id; });
    };
    var rows = [
      { label: 'Words', keys: keysFor('word') },
      { label: 'Characters', keys: keysFor('character') },
      { label: 'Decisions', keys: dataset.decisions.map(function (decision) { return 'decision:' + decision.key; }) },
    ];
    var node = document.getElementById('stats');
    node.textContent = '';
    var totalReviewed = 0;
    var totalCount = 0;
    rows.forEach(function (row) {
      var stats = statsFor(row.keys);
      totalReviewed += stats.reviewed;
      totalCount += row.keys.length;
      var card = el('span', 'stat-card');
      card.appendChild(el('strong', 'stat-strong', row.label + ' ' + stats.reviewed + '/' + row.keys.length));
      card.appendChild(el('span', null, '✅ ' + stats.keep));
      card.appendChild(el('span', null, '✏️ ' + stats.change));
      card.appendChild(el('span', null, '❌ ' + stats.revert));
      card.appendChild(el('span', null, '💬 ' + stats.comment));
      card.appendChild(el('span', null, '⏳ ' + stats.pending));
      node.appendChild(card);
    });
    var overall = el('span', 'stat-card');
    overall.appendChild(el('strong', 'stat-strong', 'Reviewed ' + totalReviewed + '/' + totalCount));
    node.appendChild(overall);
    document.getElementById('progress').textContent = totalReviewed + ' / ' + totalCount + ' reviewed';
  }
  function feedbackPayload() {
    return {
      reviewer: 'user',
      exportedAt: new Date().toISOString(),
      packVersion: dataset.packVersion,
      entries: allKeys().flatMap(function (key) {
        var value = entry(key);
        if (!value.status && !value.comment && !value.suggested) return [];
        return [{
          key: key,
          status: value.status || null,
          comment: value.comment || null,
          suggested: value.suggested || null,
          stale: isStale(key),
        }];
      }),
    };
  }
  function feedbackMarkdown() {
    var lines = ['## Memory-hook review feedback', 'pack: ' + dataset.packVersion, ''];
    allKeys().forEach(function (key) {
      var value = entry(key);
      if (!value.status && !value.comment) return;
      var icon = value.status === 'keep' ? '✅ keep' : value.status === 'change' ? '✏️ change' : value.status === 'revert' ? '❌ revert' : '💬';
      var line = '- \`' + key + '\` ' + icon + (isStale(key) ? ' ⚠ stale' : '');
      if (value.suggested) line += ' → "' + value.suggested + '"';
      if (value.comment) line += ' — ' + value.comment;
      lines.push(line);
    });
    return lines.join('\\n');
  }
  document.querySelectorAll('.chip[data-level]').forEach(function (button) {
    button.addEventListener('click', function () {
      filters.level = button.dataset.level;
      document.querySelectorAll('.chip[data-level]').forEach(function (node) { node.classList.toggle('on', node === button); });
      render();
    });
  });
  document.querySelectorAll('.chip[data-status]').forEach(function (button) {
    button.addEventListener('click', function () {
      filters.status = filters.status === button.dataset.status ? 'all' : button.dataset.status;
      document.querySelectorAll('.chip[data-status]').forEach(function (node) { node.classList.toggle('on', node.dataset.status === filters.status); });
      render();
    });
  });
  document.getElementById('search').addEventListener('input', function (event) {
    filters.search = event.target.value.trim();
    render();
  });
  document.getElementById('export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(feedbackPayload(), null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'hook-review-feedback.json';
    link.click();
    URL.revokeObjectURL(link.href);
    toast('Exported hook-review-feedback.json');
  });
  document.getElementById('copy').addEventListener('click', function () {
    var text = feedbackMarkdown();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied feedback'); }, function () { toast('Copy failed'); });
    } else {
      var area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      toast('Copied feedback');
    }
  });
  document.getElementById('reset').addEventListener('click', function () {
    if (!window.confirm('Clear all review marks and comments?')) return;
    state = {};
    saveState();
    render();
    toast('Review cleared');
  });
  dataset.items.forEach(function (item) { hookTextByKey[item.id] = item.afterText; });
  dataset.decisions.forEach(function (decision) {
    hookTextByKey['decision:' + decision.key] = decision.affected.map(function (affected) { return affected.raw; }).join('|');
  });
  syncPackVersion();
  render();
})();
</script>
</body>
</html>
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
