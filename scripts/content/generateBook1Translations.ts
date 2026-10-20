/**
 * generateBook1Translations.ts
 *
 * Generates beginner-aligned, textbook-structured Pinyin and English translations
 * for all Book 1 vocabulary example sentences, combining the 200 verified OCR examples
 * with strict LLM translations for the remaining sentences.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveProvider, generateJson } from '../memory-hooks/provider';

const ROOT = resolve(import.meta.dirname, '../..');
const RAW_SENTENCES_PATH = resolve(ROOT, 'output/book-1-vocab-sentences-raw.json');
const PROGRESS_PATH = resolve(ROOT, 'output/book-1-translations-progress.json');
const FINAL_PATH = resolve(ROOT, 'content/vocabulary/book-1-examples.json');

interface RawItem {
  id: string;
  word: string;
  meaning: string;
  pos: string;
  chinese: string;
  ocrPinyin: string | null;
  ocrEnglish: string | null;
}

interface ExampleTranslation {
  chinese: string;
  pinyin: string;
  english: string;
}

const SYSTEM_PROMPT = `You are the lead pedagogical translator for "Modern Chinese" (時代華語), a top university Mandarin Chinese textbook series.
Your task is to provide accurate Hanyu Pinyin (with tone marks) and beginner-friendly English translations for textbook vocabulary example sentences.

RULES FOR TRANSLATION:
1. TARGET WORD LOCK: The English translation MUST incorporate the exact target meaning/lemma defined for the vocabulary word. Never replace the target word with an unrelated synonym that hides its meaning from the learner.
2. STRUCTURAL ISOMORPHISM: Mirror the Chinese clause order where natural in English (Time/Condition clause first -> Main clause; Topic -> Comment; Reason -> Result). Do not unnecessarily flip sentence order.
3. PINYIN WITH TONES: Use standard tone-marked Hanyu Pinyin with standard spacing and capitalization (capitalize proper names like Táiwān, Měiguó, and first letter of sentence).
4. TRANSPARENT GRAMMAR: Reflect grammatical particles (e.g. 了, 著, 過, 吧, 嗎, 把, 被, 跟, 在) clearly so learners see how the sentence works.
5. NATURAL YET CLEAR: Use clear, natural, beginner-accessible English without awkward literalisms or overly loose colloquialisms.

Format: Return a JSON object with a "translations" array containing objects with "id", "pinyin", and "english".`;

async function main() {
  const rawItems = JSON.parse(readFileSync(RAW_SENTENCES_PATH, 'utf8')) as RawItem[];
  
  let progress: Record<string, ExampleTranslation> = {};
  if (existsSync(PROGRESS_PATH)) {
    try {
      progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
    } catch {
      progress = {};
    }
  }

  // Populate OCR verified ones first
  let ocrCount = 0;
  for (const item of rawItems) {
    if (item.ocrPinyin && item.ocrEnglish && !progress[item.id]) {
      progress[item.id] = {
        chinese: item.chinese,
        pinyin: item.ocrPinyin,
        english: item.ocrEnglish,
      };
      ocrCount++;
    }
  }
  console.log(`Loaded ${ocrCount} verified examples directly from textbook OCR.`);

  const toTranslate = rawItems.filter((item) => !progress[item.id]);
  console.log(`Remaining to translate: ${toTranslate.length}`);

  if (toTranslate.length === 0) {
    writeFileSync(FINAL_PATH, JSON.stringify(progress, null, 2));
    console.log(`All done! Saved ${Object.keys(progress).length} translations to ${FINAL_PATH}`);
    return;
  }

  const provider = resolveProvider();
  console.log(`Using provider: ${provider.provider} (${provider.model})`);

  const BATCH_SIZE = 25;
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)} (${batch.length} items)...`);

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
        const rawJson = await generateJson(provider, SYSTEM_PROMPT, prompt, 3500);
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

        writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
        break;
      } catch (err) {
        retries--;
        console.error(`Batch failed (retries left: ${retries}):`, err instanceof Error ? err.message : err);
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // Ensure all rawItems are present
  const missing = rawItems.filter((item) => !progress[item.id]);
  if (missing.length > 0) {
    console.warn(`Warning: ${missing.length} items still missing translations!`);
  }

  writeFileSync(FINAL_PATH, JSON.stringify(progress, null, 2));
  console.log(`Successfully generated all translations! Total: ${Object.keys(progress).length}`);
  console.log(`Saved to ${FINAL_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
