/**
 * Story Mnemonic Generator — Book 2
 * Run: npx tsx scripts/genStoryB2.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const GEMINI_API_KEY=proces..._KEY || '';
const OPENROUTER_API_KEY=proces..._KEY || '';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const SYSTEM_PROMPT = `You are a Chinese character etymology expert. For each character, write a short story-style mnemonic (2-4 sentences) explaining the REAL historical/cultural origin of how ancient Chinese people created this character.

RULES:
1. Base on actual etymology — why components were chosen, ancient life.
2. Vivid and memorable.
3. Bold each component: **meaning** (character). Bold ALL components mentioned.
4. End connecting to modern meaning.
5. 2-4 sentences max.
6. If origin uncertain, say so briefly, give best accepted explanation.

IMPORTANT: Output EXACTLY one character per block. Each block must start with the single Chinese character on its own line, followed by the story on the next line. Separate blocks with a blank line.

Example:
**休**
In ancient China, farm workers toiled under the hot sun. When they needed a break, they would lean against a **tree** (木) to rest — that's why the character shows a **person** (亻) next to a tree. To this day, 休 means "to rest."

**好**
In ancient Chinese culture, a **woman** (女) with her **child** (子) represented the ideal of family happiness. This combination became the symbol for what is **good** in life. That's why 好 means "good."`;

async function callLLM(user: string): Promise<string> {
  const models = [
    { provider: 'or', model: 'openai/gpt-oss-120b:free' },
    { provider: 'or', model: 'qwen/qwen3-32b:free' },
    ...(GEMINI_API_KEY ? [{ provider: 'gemini' as const, model: 'gemini-2.0-flash' }] : []),
  ];

  for (const m of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        let text = '';
        if (m.provider === 'or' && OPENROUTER_API_KEY) {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: m.model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: user }], temperature: 0.3, max_tokens: 1500 }),
          });
          if (res.ok) {
            const json = await res.json();
            text = json.choices?.[0]?.message?.content?.trim() || '';
          } else {
            const errText = await res.text();
            if (res.status === 429) { await sleep((attempt + 1) * 10000); continue; }
            console.log(`    [${m.model}] ${res.status}: ${errText.slice(0,60)}`);
          }
        } else if (m.provider === 'gemini' && GEMINI_API_KEY) {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
          const response = await ai.models.generateContent({ model: m.model, contents: user, config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3 } });
          text = response?.text?.trim() || '';
        }
        if (text.length > 20) return text;
        break;
      } catch (err: any) {
        console.log(`    [${m.model}] ${err.message?.slice(0,60)}`);
        if (err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE')) {
          await sleep(20000);
          continue;
        }
        await sleep(5000);
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
  // Split on blank lines between blocks
  const blocks = resp.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;
    const firstLine = lines[0].trim().replace(/\*\*/g, '').trim();
    // Check if first line is a single Chinese character
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
  const BATCH_SIZE = 3;
  const DELAY_MS = 2000;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Story Mnemonic Generator — Book 2          ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Get B2 vocab
  const all: any[] = [];
  let vOffset = 0;
  while (true) {
    const { data: vPage } = await supabase.from('book_vocabulary').select('*').range(vOffset, vOffset + 999);
    if (!vPage || !vPage.length) break;
    all.push(...vPage);
    if (vPage.length < 1000) break;
    vOffset += 1000;
  }
  const b2Vocab = all.filter(v => v.id.startsWith('B2'));

  const charSet = new Set<string>();
  for (const v of b2Vocab)
    for (const c of (v.traditional || v.simplified || ''))
      if (/[\u4e00-\u9fa5]/.test(c)) charSet.add(c);

  const { data: existing } = await supabase.from('mnemonics').select('character').eq('content_type', 'story');
  const existingChars = new Set(existing?.map((e: any) => e.character) || []);
  const queue = [...charSet].filter(c => !existingChars.has(c));

  console.log(`B2 unique chars: ${charSet.size} | Have stories: ${charSet.size - queue.length} | Need: ${queue.length}\n`);
  if (!queue.length) { console.log('All done!'); return; }

  // Fetch breakdowns
  const { data: breakdowns } = await supabase.from('character_breakdowns').select('character,definition,decomposition').in('character', queue);
  const bdMap = new Map();
  if (breakdowns) for (const b of breakdowns) bdMap.set(b.character, b);

  let success = 0, failed = 0;
  const total = queue.length;
  const startTime = Date.now();

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);

    let prompt = `Generate story-style mnemonics for these ${batch.length} characters:\n\n`;
    for (const char of batch) {
      const bd = bdMap.get(char);
      prompt += `**${char}** | meaning: ${bd?.definition || ''} | components: ${bd?.decomposition || ''}\n`;
    }
    prompt += '\nRemember: one character per block, blank line between blocks.';

    try {
      const resp = await callLLM(prompt);
      const parsed = parseResponse(resp);

      for (const p of parsed) {
        const { error } = await supabase.from('mnemonics').upsert({ id: `story_${p.char}`, character: p.char, mnemonic: p.mnemonic, content_type: 'story' });
        if (error) { console.log(`  ✗ ${p.char}: ${error.message}`); failed++; }
        else { success++; console.log(`\n${renderBar(success + failed, total)} ✓ ${p.char}\n${p.mnemonic}\n`); }
        await sleep(300);
      }

      const unparsed = batch.length - parsed.length;
      if (unparsed > 0) {
        failed += unparsed;
        for (const c of batch) if (!parsed.find(p => p.char === c)) console.log(`  ✗ ${c}: parse fail`);
      }
    } catch (err: any) { console.log(`  ✗ [batch] ${err.message}`); failed += batch.length; }

    if (i + BATCH_SIZE < queue.length) await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n═══════════════════════════════════════\n  Book 2 DONE: ${success} ok, ${failed} fail in ${elapsed}min\n═══════════════════════════════════════\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
