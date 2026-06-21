/**
 * Story Mnemonic Generator — Book 1
 * Generates etymology-based story mnemonics for all B1 characters.
 * Saves to Supabase with content_type='story'.
 * Run: npx tsx scripts/genStoryB1.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
const GEMINI_API_KEY = env['GEMINI_API_KEY'] || '';
const supabase = createClient(env['VITE_SUPABASE_URL'] || '', env['VITE_SUPABASE_ANON_KEY'] || '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const SYSTEM_PROMPT = `You are a Chinese character etymology expert. For each character, write a short story-style mnemonic (2-4 sentences) that explains the REAL historical/cultural origin of how ancient Chinese people created this character.

RULES:
1. Base the story on actual etymology — why the components were chosen, what ancient life was like.
2. Make it vivid and memorable — paint a picture.
3. Bold each component's English meaning and write its Chinese character in parentheses: **meaning** (character). Bold EVERY component mentioned.
4. End by connecting the story to the modern meaning.
5. Keep it 2-4 sentences.
6. If true origin is uncertain/debated, say so briefly, give the most accepted explanation.

Output ONE character per block. Start with the character on its own line, then the story.`;

const USER_TEMPLATE = `Generate story-style mnemonics for these {COUNT} characters:

{DATA}

Output each as:
<character>
<story>`;

async function callLLM(user: string): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model,
          contents: user,
          config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3 },
        });
        const text = response?.text?.trim() || '';
        if (text && text.length > 20) return text;
        break;
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
          console.log(`    [retry ${attempt+1}/3] ${model} overloaded, waiting 20s...`);
          await sleep(20000);
          continue;
        }
        console.log(`    [error] ${model}: ${msg.slice(0,80)}`);
        break;
      }
    }
  }
  throw new Error('All models failed');
}

function renderBar(done: number, total: number): string {
  const pct = Math.round((done / total) * 100);
  const filled = Math.round((done / total) * 20);
  return `[${'█'.repeat(filled)}${'░'.repeat(20 - filled)}] ${pct}% (${done}/${total})`;
}

function parseResponse(resp: string): Array<{ char: string; mnemonic: string }> {
  const results: Array<{ char: string; mnemonic: string }> = [];
  const blocks = resp.split(/\n(?=[\u4e00-\u9fa5]\n)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    const firstLine = lines[0].trim();
    if (/^[\u4e00-\u9fa5]$/.test(firstLine)) {
      const mnemonic = lines.slice(1).join(' ').trim();
      if (mnemonic.length > 10) {
        results.push({ char: firstLine, mnemonic });
      }
    }
  }
  return results;
}

async function main() {
  const BATCH_SIZE = 5;
  const DELAY_MS = 2000;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Story Mnemonic Generator — Book 1          ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Get all B1 vocab
  let allVocab: any[] = [];
  let vOffset = 0;
  while (true) {
    const { data: vPage } = await supabase.from('book_vocabulary').select('*').range(vOffset, vOffset + 999);
    if (!vPage || vPage.length === 0) break;
    allVocab.push(...vPage);
    if (vPage.length < 1000) break;
    vOffset += 1000;
  }
  const b1Vocab = allVocab.filter(v => v.id.startsWith('B1'));

  // 2. Extract unique characters
  const charSet = new Set<string>();
  for (const v of b1Vocab) {
    const text = v.traditional || v.simplified || '';
    for (const c of text) {
      if (/[\u4e00-\u9fa5]/.test(c)) charSet.add(c);
    }
  }

  // 3. Get existing story mnemonics
  const { data: existing } = await supabase.from('mnemonics').select('character').eq('content_type', 'story');
  const existingChars = new Set(existing?.map((e: any) => e.character) || []);

  // 4. Filter to missing
  const queue = [...charSet].filter(c => !existingChars.has(c));
  console.log(`Total unique B1 chars: ${charSet.size}`);
  console.log(`Already have stories: ${existingChars.size}`);
  console.log(`Need to generate: ${queue.length}\n`);

  if (queue.length === 0) {
    console.log('All done! No missing mnemonics.');
    return;
  }

  // 5. Get breakdowns for all queued chars
  console.log('Fetching character breakdowns...');
  const { data: breakdowns } = await supabase
    .from('character_breakdowns')
    .select('character,definition,decomposition')
    .in('character', queue);
  const bdMap = new Map();
  if (breakdowns) for (const b of breakdowns) bdMap.set(b.character, b);
  console.log(`Got ${bdMap.size} breakdowns.\n`);

  // 6. Generate in batches
  let success = 0, failed = 0;
  const total = queue.length;
  const startTime = Date.now();
  const fs = await import('fs');
  const logFile = fs.createWriteStream('/tmp/genStoryB1_full.log', { flags: 'a' });

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);

    // Build prompt with breakdown info
    let dataStr = '';
    for (const char of batch) {
      const bd = bdMap.get(char);
      const def = bd?.definition || '';
      const decomp = bd?.decomposition || '';
      dataStr += `${char} | meaning: ${def} | components: ${decomp}\n`;
    }

    const userPrompt = USER_TEMPLATE.replace('{COUNT}', String(batch.length)).replace('{DATA}', dataStr);

    try {
      const resp = await callLLM(userPrompt);
      const parsed = parseResponse(resp);

      for (const p of parsed) {
        const { error } = await supabase.from('mnemonics').upsert({
          id: `story_${p.char}`,
          character: p.char,
          mnemonic: p.mnemonic,
          content_type: 'story',
        });
        if (error) {
          console.log(`  ✗ ${p.char}: ${error.message}`);
          logFile.write(`✗ ${p.char}: ${error.message}\n`);
          failed++;
        } else {
          success++;
          // Print full mnemonic to terminal — no truncation
          console.log(`\n${renderBar(success + failed, total)} ✓ ${p.char}`);
          console.log(`${p.mnemonic}\n`);
          // Also write full to log file
          logFile.write(`✓ ${p.char}\n${p.mnemonic}\n\n`);
        }
        await sleep(300);
      }

      // Count unparsed as failed
      const unparsed = batch.length - parsed.length;
      if (unparsed > 0) {
        failed += unparsed;
        for (const char of batch) {
          if (!parsed.find(p => p.char === char)) {
            console.log(`  ✗ ${char}: failed to parse response`);
          }
        }
      }
    } catch (err: any) {
      console.log(`  ✗ [batch] ${err.message}`);
      failed += batch.length;
    }

    if (i + BATCH_SIZE < queue.length) await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Book 1 DONE: ${success} ok, ${failed} failed in ${elapsed}min`);
  console.log(`═══════════════════════════════════════════════\n`);
  logFile.write(`\n=== DONE: ${success} ok, ${failed} failed in ${elapsed}min ===\n`);
  logFile.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
