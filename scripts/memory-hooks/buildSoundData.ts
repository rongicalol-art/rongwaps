/**
 * Builds the Sound block data for Book 1: pinyin, the phonetic piece with its
 * reading, the tone shift, and the sound family (Book 1 characters sharing the
 * same phonetic piece).
 *
 * The phonetic piece comes from Jev's `phonetic_component` answer (one of the
 * review questions); readings come from the component ledger only. Pieces
 * without a ledger reading are flagged for human review, never invented.
 *
 * Output (gitignored scratch only):
 *   output/memory-hooks/book-1-sound-v1.json
 *
 * The runtime Sound clue no longer ships from here: the app reads the parts
 * index (public/data/relations/parts.json, `npm run relations:build`).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

interface V3Record {
  character: string;
  meaning: string;
  pinyin: string | null;
  targetDisplayLabel?: string;
  componentsUsed: Array<{ glyph: string; label: string }>;
}

interface LedgerEntry {
  glyph: string;
  senses: Array<{ label: string }>;
  readings: string[];
}

interface SoundEntry {
  id: string;
  character: string;
  meaning: string;
  pinyin: string;
  phonetic: { glyph: string; reading: string; shift: string } | null;
  family: Array<{ character: string; pinyin: string; reading: string }>;
  needsHuman: boolean;
  confidence: number | null;
  loose: boolean;
}

interface SoundDecision {
  character: string;
  glyph: string | null;
  reading: string | null;
  confidence: number | null;
  source: string;
  loose: boolean;
  needsHuman: boolean;
}

function cleanReading(reading: string | undefined): string | null {
  if (!reading) return null;
  const cleaned = reading.replace(/[[\]]/g, '').split(':')[0].trim();
  return cleaned.length > 0 ? cleaned : null;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const records = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8'),
  ).records as V3Record[];
  const cache = JSON.parse(
    readFileSync(resolve(REVIEW_DIR, 'sound-choice-cache-v1.json'), 'utf8'),
  ).entries as Record<string, SoundDecision>;
  const ledger = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'component-ledger-v1.json'), 'utf8'),
  ).entries as LedgerEntry[];
  const ledgerByGlyph = new Map(ledger.map((entry) => [entry.glyph, entry]));
  const decisionByCharacter = new Map(Object.values(cache).map((decision) => [decision.character, decision]));

  const entries: SoundEntry[] = records.map((record) => {
    const decision = decisionByCharacter.get(record.character);
    const ledgerReading = cleanReading(ledgerByGlyph.get(record.character)?.readings.find((value) => cleanReading(value)));
    const pinyin = record.pinyin ?? ledgerReading ?? '';
    let phonetic: SoundEntry['phonetic'] = null;
    let needsHuman: boolean;

    if (decision?.glyph && decision.reading && record.componentsUsed.some((component) => component.glyph === decision.glyph)) {
      const reading = cleanReading(decision.reading) ?? decision.reading;
      phonetic = {
        glyph: decision.glyph,
        reading,
        shift: reading === pinyin ? reading : `${reading} → ${pinyin}`,
      };
      needsHuman = decision.needsHuman;
    } else {
      needsHuman = decision?.needsHuman ?? true;
    }

    return {
      id: record.character,
      character: record.character,
      meaning: record.targetDisplayLabel ?? record.meaning,
      pinyin,
      phonetic,
      family: [],
      needsHuman,
      confidence: decision?.confidence ?? null,
      loose: decision?.loose ?? false,
    };
  });

  const byPhonetic = new Map<string, SoundEntry[]>();
  for (const entry of entries) {
    if (!entry.phonetic) continue;
    const list = byPhonetic.get(entry.phonetic.glyph) ?? [];
    list.push(entry);
    byPhonetic.set(entry.phonetic.glyph, list);
  }
  for (const entry of entries) {
    if (!entry.phonetic) continue;
    const members = byPhonetic.get(entry.phonetic.glyph) ?? [];
    if (members.length < 2) continue;
    entry.family = members
      .filter((member) => member.character !== entry.character)
      .map((member) => ({ character: member.character, pinyin: member.pinyin, reading: member.phonetic!.reading }))
      .sort((a, b) => a.pinyin.localeCompare(b.pinyin))
      .slice(0, 8);
  }

  const pack = {
    schemaVersion: 1,
    bookId: 1,
    generatedAt: new Date().toISOString(),
    count: entries.length,
    items: entries,
  };
  const packText = `${JSON.stringify(pack, null, 2)}\n`;
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-sound-v1.json'), packText);

  const withPhonetic = entries.filter((entry) => entry.phonetic).length;
  const needsHuman = entries.filter((entry) => entry.needsHuman).map((entry) => entry.character);
  const families = [...byPhonetic.values()].filter((members) => members.length >= 2);
  console.log(`Sound data: ${entries.length} characters`);
  console.log(`  phonetic piece: ${withPhonetic} · pinyin only: ${entries.length - withPhonetic - needsHuman.length} · needs human: ${needsHuman.length}`);
  console.log(`  sound families: ${families.length} (${families.map((members) => members.map((member) => `${member.character}/${member.phonetic!.reading}`).join(' ')).slice(0, 6).join(' · ')}${families.length > 6 ? ' …' : ''})`);
  if (needsHuman.length > 0) console.log(`  needs-human: ${needsHuman.join(' ')}`);
  console.log('Wrote output/memory-hooks/book-1-sound-v1.json');
}

main();
