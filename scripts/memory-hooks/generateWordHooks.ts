import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { generateJson, resolveProvider, type ProviderConfig } from './provider';
import { extractJsonObject } from './jsonExtract';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PROMPT_VERSION = 'book1-words-v1';

interface Occurrence {
  word: string;
  pinyin: string;
  meaning: string;
}

interface InventoryEntry {
  character: string;
  occurrences: Occurrence[];
  meaningDecision: { selectedMeaning: string | null };
}

interface WordEntry {
  word: string;
  pinyin: string;
  meaning: string;
  characters: Array<{ char: string; meaning: string | null }>;
}

interface WordRecord {
  word: string;
  pinyin: string;
  meaning: string;
  characters: Array<{ char: string; meaning: string | null }>;
  strategy: string;
  hook: string | null;
  issues: Array<{ code: string; severity: 'error' | 'flag'; message: string }>;
  attempts: number;
  acceptance: 'clean' | 'flagged' | 'failed' | 'none' | 'mapped';
  model: string;
  promptVersion: string;
}

/** Mirrors `cleanVocabText` in src/utils/vocabCleaner.ts. */
function cleanVocabText(text: string): string {
  let cleaned = text.trim().replace(/\(.*?\)/g, '').replace(/[（）]/g, '');
  const slashIndex = cleaned.indexOf('/');
  if (slashIndex !== -1) cleaned = cleaned.substring(0, slashIndex);
  return cleaned.trim();
}

function shortGloss(meaning: string | null): string | null {
  if (!meaning) return null;
  return meaning.split(/[;,/]/)[0].replace(/^to\s+/i, '').trim() || null;
}

function loadWords(): WordEntry[] {
  const inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), 'utf8')) as {
    entries: InventoryEntry[];
  };
  const charMeaning = new Map(inventory.entries.map((entry) => [entry.character, entry.meaningDecision.selectedMeaning]));
  const byWord = new Map<string, { pinyin: string; meanings: string[]; raw: string }>();
  for (const entry of inventory.entries) {
    for (const occurrence of entry.occurrences) {
      const word = cleanVocabText(occurrence.word);
      if (!/^\p{Script=Han}+$/u.test(word)) continue;
      const existing = byWord.get(word) ?? { pinyin: occurrence.pinyin, meanings: [], raw: occurrence.word };
      if (!existing.meanings.includes(occurrence.meaning)) existing.meanings.push(occurrence.meaning);
      byWord.set(word, existing);
    }
  }
  return [...byWord].map(([word, value]) => ({
    word,
    pinyin: value.pinyin,
    meaning: value.meanings.join('; '),
    characters: [...word].map((char) => ({ char, meaning: shortGloss(charMeaning.get(char) ?? null) })),
  })).sort((left, right) => left.word.localeCompare(right.word, 'zh-Hant'));
}

function buildPrompt(entry: WordEntry, retryIssues: string[]): string {
  return JSON.stringify({
    task: 'Write a short, honest memory hook for a Chinese vocabulary word.',
    word: entry.word,
    pinyin: entry.pinyin,
    meaning: entry.meaning,
    characters: entry.characters.map((character) => ({ char: character.char, meaning: character.meaning })),
    rules: [
      'Return JSON only: { "word", "hook", "strategy" }.',
      'strategy is "characters" (the characters explain the meaning), "origin" (a well-known real origin is used), "plain" (just explain the meaning), or "none".',
      'Always state the word meaning clearly.',
      'If the characters genuinely explain the word, show that, e.g. 客(guest) + 氣(air) → the polite air you give a guest means 客氣 "polite".',
      'If the word has a well-known, real origin (dictionary or widely told story), you may use one short clause, e.g. 東西 from the old east-west market streets where goods were sold. Never invent history: if you are not sure it is true, omit it.',
      'Otherwise just explain the meaning in plain words. Never force a character story.',
      'Use only characters that appear in the word itself; no other Han characters.',
      'At most 2 sentences and at most 24 words.',
      'If no honest, helpful hook exists, use strategy "none" with hook null.',
      ...(retryIssues.length > 0 ? [`Fix these problems from the previous attempt: ${retryIssues.join(' | ')}`] : []),
    ],
  });
}

const ORIGIN_CLAIM = /\b(comes from|come from|originally|historically|ancient|history|origin|old market|market streets|legend|story goes|derived)\b/i;

function validate(entry: WordEntry, candidate: { hook: string | null; strategy: string }): WordRecord['issues'] {
  const issues: WordRecord['issues'] = [];
  const add = (code: string, severity: 'error' | 'flag', message: string) => issues.push({ code, severity, message });
  if (candidate.strategy === 'none' || !candidate.hook) {
    if (candidate.strategy !== 'none') add('missing-hook', 'error', 'No hook returned.');
    return issues;
  }
  const hook = candidate.hook;
  if (hook.length < 12 || hook.length > 220) add('invalid-length', 'error', 'Hook must be 12-220 characters.');
  const sentences = hook.replace(/\bi\.e\./gi, 'ie').replace(/\be\.g\./gi, 'eg')
    .split(/[.!?。！？]+/).filter((part) => part.trim()).length;
  if (sentences > 2) add('too-many-sentences', 'error', 'Hook must use at most two sentences.');
  if (hook.trim().split(/\s+/).length > 30) add('too-many-words', 'error', 'Hook must use at most 30 words.');
  const wordChars = new Set([...entry.word]);
  const strayHan = [...new Set([...hook].filter((glyph) => /\p{Script=Han}/u.test(glyph) && !wordChars.has(glyph)))];
  if (strayHan.length > 0) add('stray-han', 'error', `Hook uses characters outside the word: ${strayHan.join(' ')}.`);
  if (ORIGIN_CLAIM.test(hook)) add('origin-claim', 'flag', 'Hook makes an origin/history claim; verify before shipping.');
  const core = entry.meaning.split(/[;/,"]/)[0].replace(/^to\s+/i, '').trim().toLowerCase();
  const simplified = core.replace(/^be\s+/, '');
  if (core && core.length <= 20 && !hook.toLowerCase().includes(core) && !hook.toLowerCase().includes(simplified)) {
    add('meaning-not-mentioned', 'flag', `Hook may not mention the meaning "${core}".`);
  }
  return issues;
}

async function critique(provider: ProviderConfig, entry: WordEntry, hook: string): Promise<{ score: number; problems: string[] }> {
  const content = await generateJson(
    provider,
    'You review memory hooks for Chinese vocabulary. Score honestly. Return valid JSON only.',
    JSON.stringify({
      task: 'Rate this vocabulary hook from 1 (bad) to 5 (great) and list real problems.',
      word: entry.word,
      meaning: entry.meaning,
      characters: entry.characters,
      hook,
      criteria: [
        'Concrete: one clear image or explanation a beginner can follow.',
        'Honest: no invented facts or fake etymology; a made-up scene is fine, a made-up fact is not.',
        'Accurate: it does not misstate what a character or the word means.',
        'Meaning: the whole word meaning is clearly present.',
        'Origin claims: any historical or origin explanation must be well-known and true; invented etymology costs points.',
        'Every named character must pull its weight; decoration costs points.',
      ],
      output: '{ "score": 1-5, "problems": [ "short problem", ... ] }',
    }),
    500,
  );
  const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
  const score = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
  const problems = Array.isArray(parsed.problems)
    ? parsed.problems.filter((item): item is string => typeof item === 'string')
    : [];
  if (!Number.isFinite(score)) throw new Error('Critic returned no score.');
  return { score, problems };
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  const execute = flags.has('--execute');
  const force = flags.has('--force');
  const limitIndex = process.argv.indexOf('--limit');
  const limit = limitIndex > -1 ? Number(process.argv[limitIndex + 1]) : Infinity;

  const words = loadWords();
  const singles = words.filter((entry) => [...entry.word].length === 1);
  const multi = words.filter((entry) => [...entry.word].length > 1);
  const scope = (flags.has('--singles') ? words : multi).slice(0, limit);

  if (!execute) {
    console.log(JSON.stringify({
      dryRun: true,
      words: words.length,
      singleCharacter: singles.length,
      multiCharacter: multi.length,
      scope: scope.length,
      samplePrompt: JSON.parse(buildPrompt(scope[0], [])),
    }, null, 2));
    return;
  }

  const artifactPath = resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json');
  const prior = !force && existsSync(artifactPath)
    ? (JSON.parse(readFileSync(artifactPath, 'utf8')) as { records: WordRecord[] }).records
    : [];
  const priorByWord = new Map(prior.map((record) => [record.word, record]));
  const provider = resolveProvider();
  const criticMin = Number(process.env.MEMORY_HOOK_CRITIC_MIN || 3);
  const concurrency = Math.max(1, Number(process.env.MEMORY_HOOK_CONCURRENCY || 8));
  const results: Array<WordRecord | null> = new Array(scope.length).fill(null);
  const queue = scope.map((_, index) => index);
  let completed = 0;

  const save = (): void => {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const finished = results.filter((record): record is WordRecord => record !== null);
    writeFileSync(artifactPath, `${JSON.stringify({
      schemaVersion: 1,
      distribution: 'development-only-candidate',
      publishable: false,
      model: provider.model,
      promptVersion: PROMPT_VERSION,
      records: finished,
    }, null, 2)}\n`);
  };

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const index = queue.shift()!;
      const entry = scope[index];
      const cached = priorByWord.get(entry.word);
      if (cached && cached.acceptance !== 'failed' && cached.meaning === entry.meaning) {
        results[index] = cached;
        completed += 1;
        continue;
      }
      let hook: string | null = null;

      let strategy = 'none';
      let issues: WordRecord['issues'] = [];
      let attempts = 0;
      let criticProblems: string[] = [];
      while (attempts < 3) {
        attempts += 1;
        try {
          const content = await generateJson(
            provider,
            'You write honest, concrete vocabulary hooks for a Chinese course. Return valid JSON only.',
            buildPrompt(entry, [...issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message), ...criticProblems]),
            600,
          );
          const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
          strategy = typeof parsed.strategy === 'string' ? parsed.strategy : 'plain';
          hook = typeof parsed.hook === 'string' ? parsed.hook.trim() : null;
          issues = validate(entry, { hook, strategy });
        } catch (error: unknown) {
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 402 || status === 403 || (error as { fatal?: boolean }).fatal) throw error;
          hook = null;
          issues = [{ code: status ? 'generation-failed' : 'generation-invalid', severity: 'error', message: error instanceof Error ? error.message : String(error) }];
          if (status === 429) await delay(5000);
        }
        criticProblems = [];
        if (issues.some((issue) => issue.code.startsWith('generation-'))) break;
        if (issues.some((issue) => issue.severity === 'error')) continue;
        if (!hook) break;
        try {
          const review = await critique(provider, entry, hook);
          if (review.score >= criticMin) break;
          criticProblems = review.problems;
          issues = [...issues, { code: 'critic-low', severity: 'flag', message: `Critic ${review.score}/5: ${review.problems.join('; ')}` }];
        } catch (error: unknown) {
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 402 || status === 403 || (error as { fatal?: boolean }).fatal) throw error;
          issues = [...issues, { code: 'critic-failed', severity: 'flag', message: error instanceof Error ? error.message : String(error) }];
          break;
        }
      }
      const hasErrors = issues.some((issue) => issue.severity === 'error');
      results[index] = {
        word: entry.word,
        pinyin: entry.pinyin,
        meaning: entry.meaning,
        characters: entry.characters,
        strategy,
        hook,
        issues,
        attempts,
        acceptance: strategy === 'none' || !hook ? (hasErrors ? 'failed' : 'none') : hasErrors ? 'failed' : issues.length > 0 ? 'flagged' : 'clean',
        model: provider.model,
        promptVersion: PROMPT_VERSION,
      };
      completed += 1;
      if (completed % 10 === 0 || completed === scope.length) {
        save();
        console.log(`[${completed}/${scope.length}] saved`);
      }
      await delay(Number(process.env.MEMORY_HOOK_THROTTLE_MS || 200));
    }
  });
  await Promise.all(workers);
  save();
  const counts = results.filter((record): record is WordRecord => record !== null)
    .reduce<Record<string, number>>((accumulator, record) => {
      accumulator[record.acceptance] = (accumulator[record.acceptance] ?? 0) + 1;
      return accumulator;
    }, {});
  console.log(JSON.stringify({ words: scope.length, counts, artifactPath }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
