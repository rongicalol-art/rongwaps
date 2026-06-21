/**
 * Batch Mnemonic Generator
 * Generates mnemonics for all book vocab using Gemini + OpenRouter fallback.
 * Saves to Supabase mnemonics table. Loops until all done.
 *
 * Usage: npx tsx scripts/batchMnemonics.ts [--start=0] [--end=999999]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { cleanVocabText } from '../src/utils/vocabCleaner';

// ─── Config ──────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '***';
const DELAY_MS = 3000;
const BATCH_SIZE = 5;

// ─── Parallel mode ────────────────────────────────────────────────────
const START_IDX = parseInt(process.argv.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
const END_IDX = parseInt(process.argv.find(a => a.startsWith('--end='))?.split('=')[1] || '999999');

// Models to try in order
const MODELS = [
  { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
  { provider: 'openrouter', model: 'openai/gpt-oss-120b:free' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
];

// ─── Load .env ───────────────────────────────────────────────────────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[t.slice(0, i).trim()] = v;
    }
  } catch { /* noop */ }
  return env;
}

const env = loadEnv();
const supabase = createClient(env['VITE_SUPABASE_URL'] || '', env['VITE_SUPABASE_ANON_KEY'] || '');

// ─── Helpers ─────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callLLM(system: string, user: string): Promise<string> {
  for (const m of MODELS) {
    try {
      if (m.provider === 'gemini' && GEMINI_API_KEY) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: m.model,
          contents: user,
          config: { systemInstruction: system, temperature: 0.2 },
        });
        return response.text?.trim() || '';
      } else if (m.provider === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: m.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 200 }),
        });
        if (res.ok) {
          const json = await res.json();
          return json.choices?.[0]?.message?.content?.trim() || '';
        }
        console.log(`  Model ${m.model} failed (${res.status})`);
      }
    } catch (err: any) {
      console.log(`  Model ${m.model} error: ${err.message}`);
    }
  }
  throw new Error('All models failed');
}

const CHAR_SYS = `Write a 1-sentence mnemonic for this Chinese character. Rules:
1. Create a memory bridge connecting the Parts to explain the Meaning. DO NOT break Parts into smaller radicals.
2. You MUST bold every part's English meaning and write its Chinese character in parentheses: **meaning** (character). Bold EVERY part mentioned.
3. End with: ", so this character means **[Mean]** ([Char])."
Example: A **person** (亻) resting against a **tree** (木), so this character means **to rest** (休).`;

const WORD_SYS = `Write a 1-sentence mnemonic for this Chinese word. Rules:
1. Create a memory bridge connecting the Parts to explain the Meaning.
2. You MUST bold every part's English meaning and write its Chinese character in parentheses: **meaning** (character). Bold EVERY part mentioned.
3. End with: ", so together means **[Mean]** ([Word])."
Example: A **mouth** (口) **begging** (乞) for food, so together means **to eat** (吃).`;

async function getCharacterBreakdown(char: string): Promise<any> {
  const { data } = await supabase.from('character_breakdowns').select('*').eq('character', char).limit(1).single();
  return data;
}

async function loadPregen() {
  try {
    const m = await import('../src/data/pregeneratedMnemonics.js');
    return { words: m.pregeneratedWordMnemonics, chars: m.pregeneratedCharMnemonics };
  } catch { return { words: {}, chars: {} }; }
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Batch Mnemonic Generator ===');
  console.log(`Models: ${MODELS.map(m => m.model).join(', ')}`);
  console.log(`Delay: ${DELAY_MS}ms between calls`);
  console.log('');

  // 1. Get existing mnemonics
  const { data: existing } = await supabase.from('mnemonics').select('id');
  const existingIds = new Set((existing as any[])?.map(r => r.id) || []);
  console.log(`Existing mnemonics: ${existingIds.size}`);

  // 2. Get vocab from Supabase
  let vocabItems: Array<{ id: string; text: string; definition: string; type: 'character' | 'word' }> = [];

  const { data: bookVocab } = await supabase.from('book_vocab').select('*');
  if (bookVocab && bookVocab.length > 0) {
    console.log(`Found ${bookVocab.length} items in book_vocab`);
    for (const row of bookVocab as any[]) {
      const text = row.traditional || row.simplified || row.word || row.character || row.text || row.front || '';
      const def = row.meaning || row.definition || row.english || row.back || '';
      if (!text) continue;
      const isWord = text.length > 1;
      vocabItems.push({ id: isWord ? `word_${text}` : text, text, definition: def, type: isWord ? 'word' : 'character' });
    }
  }

  if (vocabItems.length === 0) {
    let from = 0;
    const step = 1000;
    while (true) {
      const { data: bookVoc } = await supabase.from('book_vocabulary').select('*').range(from, from + step - 1);
      if (!bookVoc || bookVoc.length === 0) break;
      console.log(`Fetched ${bookVoc.length} items from book_vocabulary (offset ${from})`);
      for (const row of bookVoc as any[]) {
        const text = row.traditional || row.simplified || row.word || row.character || row.text || row.front || '';
        const def = row.meaning || row.definition || row.english || row.back || '';
        if (!text) continue;
        const isWord = text.length > 1;
        vocabItems.push({ id: isWord ? `word_${text}` : text, text, definition: def, type: isWord ? 'word' : 'character' });
      }
      if (bookVoc.length < step) break;
      from += step;
    }
    console.log(`Total from book_vocabulary: ${vocabItems.length}`);
  }

  // Extract characters from words
  const allChars = new Set<string>();
  for (const item of vocabItems) {
    if (item.type === 'word') {
      [...item.text].filter(c => /[\u4e00-\u9fa5]/.test(c)).forEach(c => allChars.add(c));
    }
  }
  for (const char of allChars) {
    if (!vocabItems.find(v => v.text === char && v.type === 'character')) {
      vocabItems.push({ id: char, text: char, definition: '', type: 'character' });
    }
  }

  console.log(`Total vocab items: ${vocabItems.length}`);

  // 3. Filter by start/end index
  const filteredVocab = vocabItems.slice(START_IDX, END_IDX);
  console.log(`Processing items ${START_IDX} to ${END_IDX} (${filteredVocab.length} items)`);

  // 4. Filter out existing
  const pregen = await loadPregen();
  const queue = filteredVocab.filter(item => {
    if (existingIds.has(item.id)) return false;
    if (item.type === 'character' && existingIds.has(item.text)) return false;
    if (item.type === 'word' && (existingIds.has(item.id) || existingIds.has(item.text))) return false;
    if (item.type === 'word' && pregen.words[item.text]) return false;
    if (item.type === 'character' && pregen.chars[item.text]) return false;
    return true;
  });

  console.log(`Need to generate: ${queue.length}`);
  if (queue.length === 0) { console.log('All done!'); return; }

  // 5. Generate in batches
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;

  while (queue.length > 0) {
    const batch = queue.splice(0, BATCH_SIZE);
    console.log(`\n--- Batch: ${batch.length} items (${totalProcessed + 1}-${totalProcessed + batch.length} of ${totalProcessed + queue.length + batch.length}) ---`);

    for (const item of batch) {
      const cleanedText = cleanVocabText(item.text);
      if (!cleanedText) { totalSkipped++; continue; }
      const id = item.id;
      try {
        let mnemonic: string;
        if (item.type === 'character') {
          const breakdown = await getCharacterBreakdown(cleanedText);
          const shortDef = breakdown?.definition ? breakdown.definition.split(/[;,/]/)[0].trim() : item.definition;
          let componentsInfo = '';
          if (breakdown?.decomposition) {
            const decompChars = [...breakdown.decomposition].filter(c => /[\u4e00-\u9fa5]/.test(c) && c !== cleanedText);
            if (decompChars.length > 1) {
              const componentData = await Promise.all(decompChars.map(async (c) => {
                const b = await getCharacterBreakdown(c);
                return { char: c, definition: b?.definition || '' };
              }));
              componentsInfo = componentData.map(c => `${c.char}/${c.definition.split(/[;,/]/)[0].trim()}`).join(', ');
            }
          }
          const prompt = componentsInfo ? `${cleanedText} | ${shortDef} | ${componentsInfo}` : `${cleanedText} | ${shortDef}`;
          mnemonic = await callLLM(CHAR_SYS, prompt);
        } else {
          const chars = [...cleanedText].filter(c => /[\u4e00-\u9fa5]/.test(c));
          mnemonic = await callLLM(WORD_SYS, `${cleanedText} | ${item.definition} | ${chars.join(', ')}`);
        }

        if (mnemonic && mnemonic.length > 10) {
          await supabase.from('mnemonics').upsert({ id, character: cleanedText, mnemonic, content_type: item.type });
          totalSuccess++;
          console.log(`  ✓ ${item.type} "${cleanedText}": ${mnemonic}`);
        } else {
          totalFailed++;
          console.log(`  ✗ ${item.type} "${cleanedText}": empty response`);
        }
      } catch (err: any) {
        totalFailed++;
        console.error(`  ✗ ${item.type} "${cleanedText}": ${err.message}`);
      }
      totalProcessed++;
      await sleep(DELAY_MS);
    }

    console.log(`Progress: ${totalSuccess} success, ${totalFailed} failed, ${queue.length} remaining`);
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Total generated: ${totalSuccess}`);
  console.log(`Total failed: ${totalFailed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
