import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateJson, resolveProvider } from './provider';
import { extractJsonObject } from './jsonExtract';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PROMPT_VERSION = 'meaning-audit-v1';

interface Occurrence {
  vocabularyId: string;
  word: string;
  pinyin: string;
  meaning: string;
  standalone: boolean;
}

interface InventoryEntry {
  character: string;
  occurrences: Occurrence[];
  meaningDecision: {
    selectedMeaning: string | null;
    selectedPinyin: string | null;
    dictionaryDefinition: string | null;
    confidence: string;
    reviewReasons: string[];
  };
}

interface AuditRecord {
  character: string;
  currentMeaning: string | null;
  currentPinyin: string | null;
  verdict: 'keep' | 'change' | 'unclear';
  suggestedMeaning: string | null;
  suggestedPinyin: string | null;
  reason: string;
  lessonEvidence: string[];
  confidence: string;
}

function buildPrompt(entry: InventoryEntry, hook: string | null): string {
  return JSON.stringify({
    task: 'Verify the learner meaning of one Chinese character against how it is actually used in this course.',
    character: entry.character,
    proposedMeaning: entry.meaningDecision.selectedMeaning,
    proposedPinyin: entry.meaningDecision.selectedPinyin,
    dictionaryDefinition: entry.meaningDecision.dictionaryDefinition,
    lessonOccurrences: entry.occurrences.map((occurrence) => ({
      word: occurrence.word,
      pinyin: occurrence.pinyin,
      meaning: occurrence.meaning,
      standalone: occurrence.standalone,
    })),
    currentMemoryHook: hook,
    rules: [
      'Return JSON only: { "verdict", "meaning", "pinyin", "reason" }.',
      'The course usages are the ground truth: the meaning must fit every occurrence and match how a beginner would meet the character.',
      'verdict "keep" when the proposed meaning is right or close enough.',
      'verdict "change" when it is wrong, awkward, too abstract, or a different sense is clearly the one taught; then give "meaning" as 1-3 simple English words a beginner knows.',
      'verdict "unclear" when the evidence is too thin to decide; then explain what is missing.',
      'For "change", also give "pinyin" (the reading taught) when it differs from the proposed one.',
      'Do not invent etymology or historical senses. Do not use dictionary jargon such as measure word unless it is the honest core sense.',
      'Keep "reason" under 30 words.',
    ],
  });
}

function parseAudit(content: string): Omit<AuditRecord, 'character' | 'currentMeaning' | 'currentPinyin' | 'lessonEvidence' | 'confidence'> {
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const verdict = parsed.verdict === 'change' || parsed.verdict === 'unclear' ? parsed.verdict : 'keep';
  return {
    verdict,
    suggestedMeaning: typeof parsed.meaning === 'string' ? parsed.meaning.trim() : null,
    suggestedPinyin: typeof parsed.pinyin === 'string' ? parsed.pinyin.trim() : null,
    reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : '',
  };
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  const execute = flags.has('--execute');
  const onlyFailed = flags.has('--only-failed');
  const limitIndex = process.argv.indexOf('--limit');
  const limit = limitIndex > -1 ? Number(process.argv[limitIndex + 1]) : Infinity;

  const inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), 'utf8')) as {
    entries: InventoryEntry[];
  };
  const hooks = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8')) as {
    records: Array<{ character: string; hook: string | null }>;
  };
  const hookByCharacter = new Map(hooks.records.map((record) => [record.character, record.hook]));

  const priorAudit = onlyFailed && existsSync(resolve(OUTPUT_DIR, 'book-1-meaning-audit-v1.json'))
    ? JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-meaning-audit-v1.json'), 'utf8')) as {
        records: AuditRecord[];
      }
    : null;
  const retryCharacters = priorAudit
    ? new Set(priorAudit.records
        .filter((record) => record.verdict === 'unclear' && record.reason.startsWith('audit failed'))
        .map((record) => record.character))
    : null;

  const entries = (retryCharacters
    ? inventory.entries.filter((entry) => retryCharacters.has(entry.character))
    : inventory.entries).slice(0, limit);
  if (!execute) {
    const sample = entries[0];
    console.log(JSON.stringify({
      dryRun: true,
      characters: entries.length,
      samplePrompt: JSON.parse(buildPrompt(sample, hookByCharacter.get(sample.character) ?? null)),
    }, null, 2));
    return;
  }

  const provider = resolveProvider();
  const concurrency = Math.max(1, Number(process.env.MEMORY_HOOK_CONCURRENCY || 8));
  const results: Array<AuditRecord | null> = new Array(entries.length).fill(null);
  const queue = entries.map((_, index) => index);
  let completed = 0;

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const index = queue.shift()!;
      const entry = entries[index];
      try {
        const content = await generateJson(
          provider,
          'You verify learner meanings for a Chinese course. Return valid JSON only.',
          buildPrompt(entry, hookByCharacter.get(entry.character) ?? null),
          600,
        );
        const parsed = parseAudit(content);
        results[index] = {
          character: entry.character,
          currentMeaning: entry.meaningDecision.selectedMeaning,
          currentPinyin: entry.meaningDecision.selectedPinyin,
          lessonEvidence: entry.occurrences.slice(0, 4).map((occurrence) => (
            `${occurrence.word}=${occurrence.meaning}${occurrence.standalone ? ' (standalone)' : ''}`
          )),
          confidence: entry.meaningDecision.confidence,
          ...parsed,
        };
      } catch (error: unknown) {
        results[index] = {
          character: entry.character,
          currentMeaning: entry.meaningDecision.selectedMeaning,
          currentPinyin: entry.meaningDecision.selectedPinyin,
          verdict: 'unclear',
          suggestedMeaning: null,
          suggestedPinyin: null,
          reason: `audit failed: ${error instanceof Error ? error.message.slice(0, 80) : String(error)}`,
          lessonEvidence: [],
          confidence: entry.meaningDecision.confidence,
        };
      }
      completed += 1;
      if (completed % 25 === 0 || completed === entries.length) {
        console.log(`[${completed}/${entries.length}] audited`);
      }
    }
  });
  await Promise.all(workers);

  const records = results.filter((record): record is AuditRecord => record !== null);
  const merged = priorAudit && retryCharacters
    ? [
        ...priorAudit.records.filter((record) => !retryCharacters.has(record.character)),
        ...records,
      ].sort((left, right) => inventory.entries.findIndex((entry) => entry.character === left.character)
        - inventory.entries.findIndex((entry) => entry.character === right.character))
    : records;
  const changes = merged.filter((record) => record.verdict === 'change');
  const unclear = merged.filter((record) => record.verdict === 'unclear');

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-meaning-audit-v1.json'), `${JSON.stringify({
    schemaVersion: 1,
    distribution: 'development-only-candidate',
    publishable: false,
    model: provider.model,
    promptVersion: PROMPT_VERSION,
    records: merged,
  }, null, 2)}\n`);

  const lines = [
    '# Meaning audit — proposed changes',
    '',
    `> ${changes.length} of ${merged.length} meanings proposed for change; ${unclear.length} unclear.`,
    '> Reply with corrections; unmentioned proposals are accepted as-is.',
    '',
    '| Char | Current | Proposed | Lesson evidence | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...changes.map((record) => (
      `| ${record.character} | ${record.currentMeaning ?? ''} | ${record.suggestedMeaning ?? ''} | ${record.lessonEvidence.join('; ')} | ${record.reason} |`
    )),
    '',
    '## Unclear',
    '',
    ...unclear.map((record) => `- **${record.character}** (${record.currentMeaning ?? 'none'}): ${record.reason}`),
    '',
  ];
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-meaning-audit-v1.md'), lines.join('\n'));

  console.log(JSON.stringify({
    model: provider.model,
    audited: merged.length,
    keep: records.length - changes.length - unclear.length,
    change: changes.length,
    unclear: unclear.length,
    jsonPath: resolve(OUTPUT_DIR, 'book-1-meaning-audit-v1.json'),
    mdPath: resolve(OUTPUT_DIR, 'book-1-meaning-audit-v1.md'),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
