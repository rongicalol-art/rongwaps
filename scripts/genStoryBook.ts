import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const SYSTEM = `You are a Chinese character etymology expert. For each character, write a short story-style mnemonic (2-4 sentences) explaining the REAL historical/cultural origin of how ancient Chinese people created this character.

RULES:
1. Base on actual etymology — why components were chosen, ancient life.
2. Make it vivid and memorable.
3. Bold each component's English meaning and write its Chinese character in parentheses: **meaning** (character). Bold EVERY component mentioned.
4. End by connecting the story to the modern meaning.
5. Keep it 2-4 sentences max.
6. If true origin is uncertain, say so briefly and give the most accepted explanation.

Output format: Start each block with the single Chinese character on its own line, followed by the story on subsequent lines. Separate blocks with a blank line.`;

async function llm(user: string): Promise<string> {
  // OpenRouter free models
  if (process.env.OPENROUTER_API_KEY) {
    for (const model of ['openai/gpt-oss-120b:free', 'qwen/qwen3-32b:free', 'meta-llama/llama-3.3-70b-instruct:free']) {
      for (let a = 0; a < 3; a++) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], temperature: 0.3, max_tokens: 2000 }),
          });
          if (r.ok) {
            const j = await r.json();
            const t = j.choices?.[0]?.message?.content?.trim() || '';
            if (t.length > 20) return t;
          }
          const errText = await r.text();
          if (r.status === 429) { await sleep((a + 1) * 10000); continue; }
          console.log(`  [${model}] ${r.status}: ${errText.slice(0, 60)}`);
          break;
        } catch (err: any) {
          console.log(`  [${model}] ${err.message?.slice(0, 60)}`);
          await sleep(3000);
        }
      }
    }
  }
  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    for (const model of ['gemini-2.0-flash', 'gemini-2.5-flash']) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.generateContent({ model, contents: user, config: { systemInstruction: SYSTEM, temperature: 0.3 } });
        const t = res?.text?.trim() || '';
        if (t.length > 20) return t;
      } catch (err: any) {
        console.log(`  [Gemini ${model}] ${err.message?.slice(0, 60)}`);
      }
    }
  }
  throw new Error('All models failed');
}

function parse(resp: string): Array<{ char: string; mnemonic: string }> {
  const results: Array<{ char: string; mnemonic: string }> = [];
  const lines = resp.split('\n');
  let currentChar = '';
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if this line is a single Chinese character (possibly with **)
    const clean = trimmed.replace(/\*\*/g, '').trim();
    if (/^[\u4e00-\u9fa5]$/.test(clean)) {
      // Save previous block
      if (currentChar && currentText.trim()) {
        results.push({ char: currentChar, mnemonic: currentText.trim() });
      }
      currentChar = clean;
      currentText = '';
    } else if (currentChar && trimmed) {
      currentText += trimmed + ' ';
    }
  }
  // Save last block
  if (currentChar && currentText.trim()) {
    results.push({ char: currentChar, mnemonic: currentText.trim() });
  }
  return results;
}

async function main() {
  const BATCH = 3, DELAY = 2000;

  // Check which book to run
  const bookArg = process.argv[2] || 'B1';
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   Story Mnemonic Generator — ${bookArg}               ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  const all: any[] = [];
  let vO = 0;
  while (true) {
    const { data } = await supabase.from('book_vocabulary').select('id,traditional,simplified').range(vO, vO + 999);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    vO += 1000;
  }
  const vocab = all.filter(v => v.id.startsWith(bookArg));

  const charSet = new Set<string>();
  for (const v of vocab)
    for (const c of (v.traditional || v.simplified || ''))
      if (/[\u4e00-\u9fa5]/.test(c)) charSet.add(c);

  const { data: ex } = await supabase.from('mnemonics').select('character').eq('content_type', 'story');
  const exSet = new Set(ex?.map((e: any) => e.character) || []);
  const queue = [...charSet].filter(c => !exSet.has(c));

  console.log(`${bookArg}: ${charSet.size} chars | Have: ${charSet.size - queue.length} | Missing: ${queue.length}\n`);
  if (!queue.length) { console.log('All done!'); return; }

  const { data: bds } = await supabase.from('character_breakdowns').select('character,definition,decomposition').in('character', queue);
  const bdM = new Map();
  if (bds) for (const b of bds) bdM.set(b.character, b);

  let ok = 0, fail = 0, tot = queue.length, t0 = Date.now();

  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH);

    let p = `Generate story-style mnemonics for these ${batch.length} characters:\n\n`;
    for (const c of batch) {
      const bd = bdM.get(c);
      p += `${c} | meaning: ${bd?.definition || ''} | components: ${bd?.decomposition || ''}\n`;
    }
    p += '\nOutput each character in its own block: char on one line, story next.';

    try {
      const resp = await llm(p);
      const parsed = parse(resp);
      for (const p of parsed) {
        const { error } = await supabase.from('mnemonics').upsert({ id: `story_${p.char}`, character: p.char, mnemonic: p.mnemonic, content_type: 'story' });
        if (error) { console.log(`  ✗ ${p.char}: ${error.message}`); fail++; }
        else { ok++; console.log(`\n✓ ${p.char}\n${p.mnemonic}\n`); }
        await sleep(300);
      }
      const un = batch.length - parsed.length;
      if (un > 0) {
        fail += un;
        for (const c of batch) if (!parsed.find(p => p.char === c)) console.log(`  ✗ ${c}: parse fail`);
      }
    } catch (e: any) { console.log(`  ✗ [batch] ${e.message}`); fail += batch.length; }

    const pct = Math.round(((i + batch.length) / tot) * 100);
    console.log(`── ${pct}% (${ok} ok, ${fail} fail) ──\n`);
    if (i + BATCH < queue.length) await sleep(DELAY);
  }

  const elapsed = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\n═══════════════════════════════════════\n  ${bookArg} DONE: ${ok} ok, ${fail} fail in ${elapsed}min\n═══════════════════════════════════════\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
