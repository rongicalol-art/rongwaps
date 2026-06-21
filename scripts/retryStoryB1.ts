/**
 * Retry failed Book 1 story mnemonics.
 * Run: npx tsx scripts/retryStoryB1.ts
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, appendFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env using dotenv (handles quoting, etc.)
dotenv.config({ path: resolve(process.cwd(), '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

console.log('[DEBUG] Gemini:', GEMINI_API_KEY ? GEMINI_API_KEY.length + ' chars' : 'MISSING');
console.log('[DEBUG] OpenRouter:', OPENROUTER_API_KEY ? OPENROUTER_API_KEY.length + ' chars' : 'MISSING');
console.log('[DEBUG] Supabase URL:', supabaseUrl ? supabaseUrl.slice(0, 30) + '...' : 'MISSING');
console.log('[DEBUG] Supabase key:', supabaseKey ? supabaseKey.length + ' chars' : 'MISSING');

const SYSTEM_PROMPT = `You are a Chinese character etymology expert. For each character, write a short story-style mnemonic (2-4 sentences) explaining the REAL historical/cultural origin of how ancient Chinese people created this character.

RULES:
1. Base on actual etymology — why components were chosen, ancient life.
2. Vivid and memorable.
3. Bold each component: **meaning** (character). Bold ALL components mentioned.
4. End connecting to modern meaning.
5. 2-4 sentences max.
6. If origin uncertain, say so briefly, give best accepted explanation.

Output: <character> on one line, story on next line.`;

async function callLLM(user: string): Promise<string> {
  // Primary: OpenRouter free
  if (OPENROUTER_API_KEY) {
    const orModels = ['openai/gpt-oss-120b:free', 'meta-llama/llama-3.3-70b-instruct:free'];
    for (const model of orModels) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: user }], temperature: 0.3, max_tokens: 500 }),
          });
          if (res.ok) {
            const json = await res.json();
            const text = json.choices?.[0]?.message?.content?.trim() || '';
            if (text.length > 20) return text;
          }
          const errText = await res.text();
          console.log(`  [OR ${model}] ${res.status}: ${errText.slice(0,80)}`);
          if (res.status === 429) { await sleep((attempt + 1) * 10000); continue; }
          if (res.status === 401) break; // key issue, don't retry
          break;
        } catch (err: any) {
          console.log(`  [OR err] ${model}: ${err.message?.slice(0,60)}`);
          await sleep(5000);
        }
      }
    }
  }

  // Fallback: Gemini
  if (GEMINI_API_KEY) {
    for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
          const response = await ai.models.generateContent({ model, contents: user, config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3 } });
          const text = response?.text?.trim() || '';
          if (text.length > 20) return text;
          break;
        } catch (err: any) {
          if (err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE')) {
            console.log(`  [Gemini retry ${attempt+1}/3] waiting 20s...`);
            await sleep(20000);
            continue;
          }
          console.log(`  [Gemini err] ${model}: ${err.message?.slice(0,60)}`);
          break;
        }
      }
    }
  }

  throw new Error('All models failed');
}

function parseResponse(resp: string): Array<{ char: string; mnemonic: string }> {
  const results: Array<{ char: string; mnemonic: string }> = [];
  const blocks = resp.split(/\n(?=[\u4e00-\u9fa5]\n)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    const first = lines[0].trim();
    if (/^[\u4e00-\u9fa5]$/.test(first)) {
      const mnemonic = lines.slice(1).join(' ').trim();
      if (mnemonic.length > 10) results.push({ char: first, mnemonic });
    }
  }
  return results;
}

async function main() {
  const BATCH_SIZE = 3;
  const DELAY_MS = 2000;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Retry Failed B1 Story Mnemonics            ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Get B1 chars
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('book_vocabulary').select('id,traditional,simplified').range(from, from + 999);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const b1chars = new Set<string>();
  for (const v of all.filter(v => v.id.startsWith('B1')))
    for (const c of (v.traditional || v.simplified || ''))
      if (/[\u4e00-\u9fa5]/.test(c)) b1chars.add(c);

  const { data: existing } = await supabase.from('mnemonics').select('character').eq('content_type', 'story');
  const existingSet = new Set(existing?.map((e: any) => e.character) || []);
  const missing = [...b1chars].filter(c => !existingSet.has(c));

  console.log(`B1 chars: ${b1chars.size} | Have stories: ${b1chars.size - missing.length} | Missing: ${missing.length}\n`);

  if (!missing.length) { console.log('All done!'); return; }

  // Fetch breakdowns
  const { data: breakdowns } = await supabase.from('character_breakdowns').select('character,definition,decomposition').in('character', missing);
  const bdMap = new Map();
  if (breakdowns) for (const b of breakdowns) bdMap.set(b.character, b);

  let success = 0, failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);

    let prompt = 'Generate story-style mnemonics:\n\n';
    for (const char of batch) {
      const bd = bdMap.get(char);
      prompt += `${char} | meaning: ${bd?.definition || ''} | components: ${bd?.decomposition || ''}\n`;
    }

    try {
      const resp = await callLLM(prompt);
      const parsed = parseResponse(resp);

      for (const p of parsed) {
        const { error } = await supabase.from('mnemonics').upsert({ id: `story_${p.char}`, character: p.char, mnemonic: p.mnemonic, content_type: 'story' });
        if (error) { console.log(`  ✗ ${p.char}: ${error.message}`); failed++; }
        else { success++; console.log(`\n✓ ${p.char}\n${p.mnemonic}\n`); }
        await sleep(300);
      }

      const unparsed = batch.length - parsed.length;
      if (unparsed > 0) { failed += unparsed; for (const c of batch) if (!parsed.find(p => p.char === c)) console.log(`  ✗ ${c}: parse fail`); }
    } catch (err: any) { console.log(`  ✗ [batch] ${err.message}`); failed += batch.length; }

    const pct = Math.round(((i + batch.length) / missing.length) * 100);
    console.log(`── ${pct}% (${success} ok, ${failed} fail) ──\n`);
    if (i + BATCH_SIZE < missing.length) await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n═══════════════════════════════════════\n  DONE: ${success} ok, ${failed} fail in ${elapsed}min\n═══════════════════════════════════════\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
