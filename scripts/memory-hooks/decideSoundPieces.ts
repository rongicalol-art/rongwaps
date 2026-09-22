/**
 * Sound pass v2 — decides each character's phonetic piece with a Jev-lean flow.
 *
 * Code triage first: a unique full match (initial + final, tone ignored) is
 * accepted without any API call. Everything else is asked in one batched Jev
 * pass (20 characters per request, one Choice per character). Code then
 * verifies the pick against the ledger readings and routes low confidence to
 * human review. Decisions are cached by input hash, so reruns and later books
 * only pay for genuine deltas.
 *
 * Stability: a previously accepted pick is kept unless the new pass is
 * confident (>= 0.6) about a different glyph.
 *
 * Output: output/memory-hooks/review/sound-choice-cache-v1.json
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { choice, type Questions } from '@typesafe-ai/sdk';
import { askJev } from './typesafeClient';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');
const CACHE_PATH = resolve(REVIEW_DIR, 'sound-choice-cache-v1.json');
const LEGACY_PACK_PATH = resolve(ROOT, 'public/data/sound-hooks/book-1.json');

const CONFIDENCE_FLOOR = 0.6;

interface V3Record {
  character: string;
  pinyin: string | null;
  componentsUsed: Array<{ glyph: string; label: string }>;
}

interface LedgerEntry {
  glyph: string;
  senses: Array<{ label: string }>;
  readings: string[];
}

interface Decision {
  character: string;
  glyph: string | null;
  reading: string | null;
  confidence: number | null;
  source: 'code' | 'jev' | 'jev-focused' | 'legacy-kept' | 'none';
  loose: boolean;
  needsHuman: boolean;
  at: string;
}

interface CacheFile {
  schemaVersion: number;
  model: string;
  entries: Record<string, Decision>;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (flag: string): string | null => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? null : null;
  };
  return {
    noJev: args.includes('--no-jev'),
    focused: args.includes('--focused'),
    limit: Number(value('--limit') ?? 0),
    batchSize: Number(value('--batch') ?? 20),
    model: process.env.MEMORY_HOOK_JEV_MODEL ?? 'jev-1.13.0',
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Tone-stripped shape with sibilant/nasal equivalence for historical sound links. */
function pinyinShape(pinyin: string | null | undefined): { initial: string; final: string } {
  const cleaned = (pinyin ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const match = cleaned.match(/^([zcs]h|[bpmfdtnlgkhjqxrzcsyw])?(.*)$/);
  let initial = match?.[1] ?? '';
  if (initial === 'zh' || initial === 'j') initial = 'z';
  else if (initial === 'ch' || initial === 'q') initial = 'c';
  else if (initial === 'sh' || initial === 'x') initial = 's';
  let final = match?.[2] ?? cleaned;
  final = final
    .replace(/^ü/, 'u')
    .replace(/ing$/, 'eng')
    .replace(/in$/, 'en')
    .replace(/iang$/, 'ang')
    .replace(/iong$/, 'ong');
  return { initial, final };
}

function cleanReading(reading: string | undefined): string | null {
  if (!reading) return null;
  const cleaned = reading.replace(/[[\]]/g, '').split(':')[0].trim();
  return cleaned.length > 0 ? cleaned : null;
}

function componentReadings(entry: LedgerEntry | undefined): string[] {
  const readings = (entry?.readings ?? [])
    .map((reading) => cleanReading(reading))
    .filter((reading): reading is string => Boolean(reading))
    .filter((reading) => reading.length <= 8)
    .map((reading) => reading.toLowerCase());
  return [...new Set(readings)];
}

function hashKey(record: V3Record, readingsByGlyph: Map<string, string[]>): string {
  const components = record.componentsUsed
    .map((component) => `${component.glyph}:${(readingsByGlyph.get(component.glyph) ?? []).join('|')}`)
    .sort();
  return createHash('sha1').update(JSON.stringify({ pinyin: record.pinyin, components })).digest('hex');
}

function loadLegacy(): Map<string, { glyph: string; reading: string }> {
  const legacy = new Map<string, { glyph: string; reading: string }>();
  if (!existsSync(LEGACY_PACK_PATH)) return legacy;
  const pack = readJson<{ items: Array<{ character: string; phonetic: { glyph: string; reading: string } | null }> }>(LEGACY_PACK_PATH);
  for (const item of pack.items) {
    if (item.phonetic) legacy.set(item.character, { glyph: item.phonetic.glyph, reading: item.phonetic.reading });
  }
  return legacy;
}

interface Triaged {
  record: V3Record;
  key: string;
  readingsByGlyph: Map<string, string[]>;
  auto: { glyph: string; reading: string; loose: boolean } | null;
  candidates: Array<{ glyph: string; readings: string[] }>;
}

function triage(record: V3Record, ledgerByGlyph: Map<string, LedgerEntry>): Triaged {
  const target = pinyinShape(record.pinyin);
  const readingsByGlyph = new Map<string, string[]>();
  const candidates: Array<{ glyph: string; readings: string[] }> = [];
  for (const component of record.componentsUsed) {
    const readings = componentReadings(ledgerByGlyph.get(component.glyph));
    if (readings.length > 0) readingsByGlyph.set(component.glyph, readings);
    candidates.push({ glyph: component.glyph, readings });
  }
  const matches = candidates
    .map((candidate) => {
      const full = candidate.readings.find((reading) => {
        const shape = pinyinShape(reading);
        return shape.final === target.final && shape.initial === target.initial && target.final.length > 0;
      });
      const loose = candidate.readings.find((reading) => {
        const shape = pinyinShape(reading);
        return shape.final === target.final && target.final.length > 0;
      });
      return { ...candidate, full, loose };
    })
    .filter((candidate) => candidate.full || candidate.loose);

  const fullMatches = matches.filter((candidate) => candidate.full);
  const auto = fullMatches.length === 1
    ? { glyph: fullMatches[0].glyph, reading: fullMatches[0].full!, loose: false }
    : null;

  return {
    record,
    key: hashKey(record, readingsByGlyph),
    readingsByGlyph,
    auto,
    candidates: candidates.filter((candidate) => candidate.readings.length > 0),
  };
}

function buildBatchQuestions(batch: Triaged[]): Questions {
  const questions: Record<string, unknown> = {};
  batch.forEach((item, index) => {
    const criteria: Record<string, string> = {
      none: `No component in \`items[${index}].components\` carries the sound of \`items[${index}].target.pinyin\`.`,
    };
    for (const candidate of item.candidates) {
      criteria[candidate.glyph] = `${candidate.glyph} (readings: ${candidate.readings.join(', ')}) carries the sound.`;
    }
    questions[`sound_${index}`] = choice(
      `Which component in \`items[${index}].components\` carries the sound of the character in \`items[${index}].target\`? Choose the component whose reading shares the final or the initial with \`items[${index}].target.pinyin\`; choose none when no component does.`,
      criteria,
    );
  });
  return questions as Questions;
}

function verifyPick(item: Triaged, glyph: string | null, confidence = 0): { accepted: { glyph: string; reading: string; loose: boolean } | null } {
  if (!glyph || glyph === 'none') return { accepted: null };
  const candidate = item.candidates.find((entry) => entry.glyph === glyph);
  if (!candidate) return { accepted: null };
  const target = pinyinShape(item.record.pinyin);
  const exact = candidate.readings.find((reading) => {
    const shape = pinyinShape(reading);
    return shape.final === target.final && shape.initial === target.initial;
  });
  if (exact) return { accepted: { glyph, reading: exact, loose: false } };
  const finalMatch = candidate.readings.find((reading) => pinyinShape(reading).final === target.final);
  if (finalMatch) return { accepted: { glyph, reading: finalMatch, loose: true } };
  const initialMatch = candidate.readings.find((reading) => pinyinShape(reading).initial === target.initial && target.initial.length > 0);
  if (initialMatch) return { accepted: { glyph, reading: initialMatch, loose: true } };
  // No modern-pinyin link: trust a confident structural judgment (historical
  // phonetics like 尔/你 or 生/姓 do not match in modern Mandarin).
  if (confidence >= 0.7) return { accepted: { glyph, reading: candidate.readings[0], loose: true } };
  return { accepted: null };
}

async function main() {
  const options = parseArgs();
  mkdirSync(REVIEW_DIR, { recursive: true });

  const records = readJson<{ records: V3Record[] }>(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json')).records;
  const ledger = readJson<{ entries: LedgerEntry[] }>(resolve(OUTPUT_DIR, 'component-ledger-v1.json')).entries;
  const ledgerByGlyph = new Map(ledger.map((entry) => [entry.glyph, entry]));
  const legacy = loadLegacy();
  const cache: CacheFile = existsSync(CACHE_PATH)
    ? readJson<CacheFile>(CACHE_PATH)
    : { schemaVersion: 1, model: options.model, entries: {} };

  const items = records.map((record) => triage(record, ledgerByGlyph));
  const pending = items.filter((item) => !cache.entries[item.key]);
  const jevQueue = pending.filter((item) => !item.auto);
  const limited = options.limit > 0 ? jevQueue.slice(0, options.limit) : jevQueue;
  console.log(`Sound pass: ${items.length} characters · ${items.filter((item) => item.auto).length} code-auto · ${jevQueue.length} for Jev · ${pending.length - jevQueue.length} cached deltas · model ${options.model}`);

  let requests = 0;
  const now = () => new Date().toISOString();

  const record = (item: Triaged, decision: Decision) => {
    cache.entries[item.key] = decision;
  };

  for (const item of pending) {
    if (!item.auto) continue;
    record(item, {
      character: item.record.character,
      glyph: item.auto.glyph,
      reading: item.auto.reading,
      confidence: null,
      source: 'code',
      loose: item.auto.loose,
      needsHuman: false,
      at: now(),
    });
  }

  if (!options.noJev) {
    for (let offset = 0; offset < limited.length; offset += options.batchSize) {
      const batch = limited.slice(offset, offset + options.batchSize);
      const state = {
        items: batch.map((item) => ({
          target: { character: item.record.character, pinyin: item.record.pinyin ?? '' },
          components: item.candidates.map((candidate) => ({ glyph: candidate.glyph, readings: candidate.readings })),
        })),
      };
      const result = await askJev(state, buildBatchQuestions(batch), options.model);
      requests += 1;
      const answers = result.answers as unknown as Record<string, { choice?: string; confidence?: number }>;
      batch.forEach((item, index) => {
        const answer = answers[`sound_${index}`];
        const confidence = answer?.confidence ?? 0;
        const verified = verifyPick(item, answer?.choice ?? 'none', confidence);
        const legacyPick = legacy.get(item.record.character) ?? null;
        const confidentNew = verified.accepted && confidence >= CONFIDENCE_FLOOR && verified.accepted.glyph !== legacyPick?.glyph;
        if (legacyPick && !confidentNew) {
          record(item, {
            character: item.record.character,
            glyph: legacyPick.glyph,
            reading: legacyPick.reading,
            confidence,
            source: 'legacy-kept',
            loose: false,
            needsHuman: false,
            at: now(),
          });
          return;
        }
        record(item, {
          character: item.record.character,
          glyph: verified.accepted?.glyph ?? null,
          reading: verified.accepted?.reading ?? null,
          confidence,
          source: verified.accepted ? 'jev' : 'none',
          loose: verified.accepted?.loose ?? false,
          needsHuman: !verified.accepted && Boolean(answer?.choice) && answer?.choice !== 'none',
          at: now(),
        });
      });
      writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
      console.log(`  batch ${Math.floor(offset / options.batchSize) + 1}: ${batch.length} characters (${requests} requests)`);
    }
  }

  if (options.focused) {
    const byKey = new Map(items.map((item) => [item.key, item]));
    const targets = Object.entries(cache.entries).filter(([, decision]) => decision.needsHuman);
    console.log(`Focused pass: ${targets.length} flagged characters, one request each`);
    let accepted = 0;
    for (const [key, decision] of targets) {
      const item = byKey.get(key);
      if (!item) continue;
      const state = {
        items: [{
          target: { character: item.record.character, pinyin: item.record.pinyin ?? '' },
          components: item.candidates.map((candidate) => ({ glyph: candidate.glyph, readings: candidate.readings })),
        }],
      };
      const result = await askJev(state, buildBatchQuestions([item]), options.model);
      requests += 1;
      const answer = (result.answers as unknown as Record<string, { choice?: string; confidence?: number }>).sound_0;
      const confidence = answer?.confidence ?? 0;
      const verified = verifyPick(item, answer?.choice ?? 'none', confidence);
      if (verified.accepted && confidence >= CONFIDENCE_FLOOR) {
        accepted += 1;
        cache.entries[key] = {
          character: decision.character,
          glyph: verified.accepted.glyph,
          reading: verified.accepted.reading,
          confidence,
          source: 'jev-focused',
          loose: verified.accepted.loose,
          needsHuman: false,
          at: now(),
        };
      } else {
        cache.entries[key] = { ...decision, confidence, at: now() };
      }
      writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
    }
    console.log(`Focused pass: ${accepted}/${targets.length} resolved (${requests} requests)`);
  }

  if (options.limit === 0 && !options.noJev && !options.focused) {
    for (const item of pending) {
      if (!cache.entries[item.key]) {
        record(item, {
          character: item.record.character,
          glyph: null,
          reading: null,
          confidence: null,
          source: 'none',
          loose: false,
          needsHuman: true,
          at: now(),
        });
      }
    }
  }

  writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
  const decisions = Object.values(cache.entries);
  const withGlyph = decisions.filter((decision) => decision.glyph).length;
  const needsHuman = decisions.filter((decision) => decision.needsHuman).length;
  console.log(`Decisions: ${decisions.length} (${withGlyph} with a phonetic piece, ${needsHuman} need human review) · ${requests} Jev requests`);
  console.log(`Wrote ${CACHE_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
