/**
 * generateBookTranslations.ts
 *
 * Generates beginner-aligned, textbook-structured Pinyin and English translations
 * for vocabulary example sentences in Book 1, 2, 3, or 4.
 *
 * Usage:
 *   npx tsx scripts/content/generateBookTranslations.ts 3
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveProvider, generateJson } from '../memory-hooks/provider';

const ROOT = resolve(import.meta.dirname, '../..');

interface VocabItem {
  id: string;
  traditional?: string;
  meaning?: string;
  pos?: string;
  examples?: unknown;
}

interface ExampleTranslation {
  chinese: string;
  pinyin: string;
  english: string;
}

async function main() {
  const bookArg = process.argv[2] ? parseInt(process.argv[2], 10) : 3;
  if (![1, 2, 3, 4].includes(bookArg)) {
    throw new Error(`Invalid book number: ${bookArg}. Expected 1, 2, 3, or 4.`);
  }

  const bookPath = resolve(ROOT, `public/data/vocabulary/book-${bookArg}.json`);
  const progressPath = resolve(ROOT, `output/book-${bookArg}-translations-progress.json`);
  const finalPath = resolve(ROOT, `content/vocabulary/book-${bookArg}-examples.json`);

  const systemPrompt = `You are the lead pedagogical translator for "Modern Chinese" (時代華語 Book ${bookArg}), a university Mandarin Chinese textbook series.
Your task is to provide accurate Hanyu Pinyin (with tone marks) and learner-aligned English translations for textbook vocabulary example sentences.

RULES FOR TRANSLATION:
1. TARGET WORD LOCK: The English translation MUST incorporate the exact target meaning/lemma defined for the vocabulary word. Never replace the target word with an unrelated synonym that hides its meaning from the learner.
2. STRUCTURAL ISOMORPHISM: Mirror the Chinese clause order where natural in English (Time/Condition clause first -> Main clause; Topic -> Comment; Reason -> Result; Prepositional phrase -> action). Do not unnecessarily flip sentence order.
3. PINYIN WITH TONES: Use standard tone-marked Hanyu Pinyin with standard spacing and capitalization (capitalize proper names like Táiwān, Měiguó, and first letter of sentence/speaker turns like A: ... B: ...).
4. TRANSPARENT GRAMMAR: Reflect grammatical particles (e.g. 了, 著, 過, 吧, 嗎, 把, 被, 跟, 在, 到, 起來, 得) clearly so learners see how the sentence works.
5. NATURAL YET CLEAR: Use clear, natural, learner-accessible English without awkward literalisms or overly loose colloquialisms.

Format: Return a JSON object with a "translations" array containing objects with "id", "pinyin", and "english".`;

  const pack = JSON.parse(readFileSync(bookPath, 'utf8')) as { items: VocabItem[] };
  const rawItems = pack.items.filter((item) => {
    if (!item.examples) return false;
    if (typeof item.examples === 'string') return Boolean(item.examples.trim());
    return Array.isArray(item.examples) && item.examples.length > 0;
  }).map((item) => ({
    id: item.id,
    word: item.traditional || '',
    meaning: item.meaning || '',
    pos: item.pos || '',
    chinese: (() => {
      if (typeof item.examples === 'string') {
        const trimmed = item.examples.trim();
        if (trimmed.startsWith('[')) {
          try {
            const arr = JSON.parse(trimmed) as Array<{ chinese?: string }>;
            return arr.map((x) => {
              let c = (x.chinese || '').trim();
              if (c && !/[。！？…]$/.test(c)) c += '。';
              return c;
            }).join('');
          } catch {
            return trimmed;
          }
        }
        return trimmed;
      }
      return (item.examples as Array<{ chinese: string }>)[0]?.chinese || '';
    })(),
  }));

  console.log(`Book ${bookArg} has ${rawItems.length} items with example sentences.`);

  let progress: Record<string, ExampleTranslation> = {};
  if (existsSync(progressPath)) {
    try {
      progress = JSON.parse(readFileSync(progressPath, 'utf8'));
    } catch {
      progress = {};
    }
  }

  const toTranslate = rawItems.filter((item) => !progress[item.id]);
  console.log(`Already completed: ${Object.keys(progress).length}. Remaining to translate: ${toTranslate.length}`);

  if (toTranslate.length === 0) {
    writeFileSync(finalPath, JSON.stringify(progress, null, 2));
    console.log(`All done! Saved ${Object.keys(progress).length} translations to ${finalPath}`);
    return;
  }

  const provider = resolveProvider();
  console.log(`Using provider: ${provider.provider} (${provider.model})`);

  const BATCH_SIZE = 25;
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toTranslate.length / BATCH_SIZE);
    console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

    const promptItems = batch.map((item) => ({
      id: item.id,
      word: item.word,
      meaning: item.meaning,
      pos: item.pos,
      sentence: item.chinese,
    }));

    const prompt = `Translate the following ${batch.length} Chinese textbook example sentences.
Input items:
${JSON.stringify(promptItems, null, 2)}

Return JSON:
{
  "translations": [
    { "id": "...", "pinyin": "...", "english": "..." }
  ]
}`;

    let retries = 3;
    while (retries > 0) {
      try {
        const rawJson = await generateJson(provider, systemPrompt, prompt, 3800);
        const result = JSON.parse(rawJson) as { translations: Array<{ id: string; pinyin: string; english: string }> };
        if (!Array.isArray(result.translations)) {
          throw new Error('Missing translations array in output');
        }

        for (const t of result.translations) {
          const item = batch.find((b) => b.id === t.id);
          if (item && t.pinyin && t.english) {
            progress[item.id] = {
              chinese: item.chinese,
              pinyin: t.pinyin.trim(),
              english: t.english.trim(),
            };
          }
        }

        writeFileSync(progressPath, JSON.stringify(progress, null, 2));
        break;
      } catch (err) {
        retries--;
        console.error(`Batch ${batchNum} failed (retries left: ${retries}):`, err instanceof Error ? err.message : err);
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  }

  // Check if anything was missed
  const missing = rawItems.filter((item) => !progress[item.id]);
  if (missing.length > 0) {
    console.warn(`Warning: ${missing.length} items still missing translations!`);
  }

  writeFileSync(finalPath, JSON.stringify(progress, null, 2));
  console.log(`Successfully generated all Book ${bookArg} translations! Total: ${Object.keys(progress).length}`);
  console.log(`Saved to ${finalPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
