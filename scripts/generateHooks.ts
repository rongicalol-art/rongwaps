/**
 * Batch Memory Hook Generator v3
 * Usage: npx tsx scripts/generateHooks.ts <book_number> [batch_size]
 * Example: npx tsx scripts/generateHooks.ts 1 5
 *
 * Strategy: Give the model a template with bolding already done.
 * The model only fills in connecting words. Post-processing validates.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { cleanVocabText } from '../src/utils/vocabCleaner';

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
const OPENROUTER_API_KEY = env['OPENROUTER_API_KEY'] || '';
const supabase = createClient(env['VITE_SUPABASE_URL'] || '', env['VITE_SUPABASE_ANON_KEY'] || '');

const BATCH_SIZE = parseInt(process.argv[3]) || 5;
const DELAY_MS = 1500;

const MODELS = [
  { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
  { provider: 'openrouter', model: 'openai/gpt-oss-120b:free' },
  { provider: 'openrouter', model: 'qwen/qwen3-32b:free' },
];

// ─── System prompts ─────────────────────────────────────────────────
// Templates have bold pre-filled. The model fills in connecting words.
// Post-processing strips and reapplies bold to ensure correctness.

const SYS_CHARACTER = `You create mnemonics for Chinese characters.

For each character, you are given a TEMPLATE with blanks marked as _____.
Fill in the blanks to create a mnemonic sentence.

RULES:
1. Fill in the blanks with connecting words (verbs, prepositions, articles).
2. Do NOT change, remove, or move the **bold** words or their (parentheses).
3. Do NOT add more **bold** markers.
4. Do NOT add any extra Chinese characters in parentheses — use ONLY the (char) references already in the template.
5. The final sentence must start with a capital letter.
6. Output EXACTLY as: ID: <id> followed by the filled sentence on the next line.

EXAMPLE INPUT:
ID: test-01
_____ **person** (亻) _____ **tree** (木) _____, so this character means to rest (休).

EXAMPLE OUTPUT:
ID: test-01
A **person** (亻) resting against a **tree** (木), so this character means to rest (休).

WRONG — do NOT add extra Chinese chars:
"A **person** (亻) resting against a **wooden** (木) **tree** (木)."
"The **old** (老) person rests (休) against a **tree** (木)."

Now generate mnemonics for the following characters.`;


const SYS_WORD = `You create mnemonics for Chinese words.

For each word, you are given a TEMPLATE with blanks marked as _____.
Fill in the blanks to create a mnemonic sentence.

RULES:
1. Fill in the blanks with connecting words (verbs, prepositions, articles).
2. Do NOT change, remove, or move the **bold** words or their (parentheses).
3. Do NOT add more **bold** markers.
4. Do NOT add any extra Chinese characters in parentheses — use ONLY the (char) references already in the template.
5. The final sentence must start with a capital letter.
6. Output EXACTLY as: ID: <id> followed by the filled sentence on the next line.

EXAMPLE INPUT:
ID: test-02
_____ **mouth** (口) _____ **beg** (乞) _____, so together means to eat (吃).

EXAMPLE OUTPUT:
ID: test-02
A **mouth** (口) **begging** (乞) for food, so together means to eat (吃).`;

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
        const text = response?.text?.trim() || '';
        if (text && text.length > 5) {
          process.stderr.write(`  [gemini]\n`);
          return text;
        }
      } else if (m.provider === 'openrouter') {
        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: m.model,
              messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
              temperature: 0.2, max_tokens: 2000,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            return json.choices?.[0]?.message?.content?.trim() || '';
          }
          if (res.status === 429) {
            await sleep((attempt + 1) * 10000);
            continue;
          }
          break;
        }
      }
    } catch (err: any) {
      process.stderr.write(`  [fallback] ${m.model}: ${err.message}\n`);
    }
  }
  throw new Error('All models failed');
}

async function fetchBreakdowns(chars: string[]): Promise<Map<string, any>> {
  const unique = [...new Set(chars)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from('character_breakdowns').select('character,definition,decomposition').in('character', unique);
  const map = new Map<string, any>();
  if (data) for (const row of data) map.set(row.character, row);
  return map;
}

function renderBar(done: number, total: number): string {
  const pct = Math.round((done / total) * 100);
  const filled = Math.round((done / total) * 25);
  return `[${'█'.repeat(filled)}${'░'.repeat(25 - filled)}] ${pct}% (${done}/${total})`;
}

// ─── Clean and rebold: enforce correct bolding ──────────────────────
// Model writes plain text. We simply bold every occurrence of the
// known meaning words. This is safe because meaning words are specific
// English terms (person, tree, mouth, etc.) that won't appear randomly.
function cleanAndRebold(text: string, pairs: Array<[string, string]>): string {
  let result = text.trim();
  result = result.replace(/\*+/g, '');
  // Deduplicate by meaning word to avoid double-bold (e.g. 多 = 夕 + 夕)
  const seen = new Set<string>();
  const uniquePairs: Array<[string, string]> = [];
  for (const [meaning, char] of pairs) {
    const key = meaning.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniquePairs.push([meaning, char]);
    }
  }
  for (const [meaning] of uniquePairs) {
    const mEsc = meaning.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b(${mEsc})\\b`, 'gi');
    result = result.replace(re, '**$1**');
  }
  return result;
}

// ─── Build a fill-in-the-blank template ─────────────────────────────
// "A **person** (亻) _____ a **tree** (木), so this character means _____ (休)."
function buildCharTemplate(id: string, char: string, components: Array<[string, string]>, def: string): string {
  const parts: string[] = [];
  for (const [meaning, compChar] of components) {
    parts.push(`**${meaning}** (${compChar})`);
  }
  const shortDef = def.split(/[;,/]/)[0].trim();
  // Connect components with blanks
  let template = parts.join(' _____ ');
  template += ` _____, so this character means ${shortDef} (${char}).`;
  return `ID: ${id}\n_____ ${template}`;
}

function buildWordTemplate(id: string, word: string, chars: Array<[string, string]>, def: string): string {
  const parts: string[] = [];
  for (const [meaning, char] of chars) {
    parts.push(`**${meaning}** (${char})`);
  }
  let template = parts.join(' _____ ');
  template += ` _____, so together means ${def} (${word}).`;
  return `ID: ${id}\n_____ ${template}`;
}

// ─── Parse response: extract ID and filled mnemonic ─────────────────
function parseResponse(resp: string): Array<{id: string, mnemonic: string}> {
  const results: Array<{id: string, mnemonic: string}> = [];
  // Split on lines starting with "ID:"
  const blocks = resp.split(/\n(?=ID:\s)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    const idMatch = lines[0].match(/^ID:\s*(\S+)/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const mnemonic = lines.slice(1).join(' ').trim();
    if (mnemonic && mnemonic.length > 10) {
      results.push({ id, mnemonic });
    }
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const bookArg = process.argv[2];
  if (!bookArg) {
    console.log('\nUsage: npx tsx scripts/generateHooks.ts <book_number> [batch_size]\n');
    process.exit(1);
  }

  const bookNum = parseInt(bookArg);
  if (isNaN(bookNum) || bookNum < 1) { console.log('Invalid book number'); process.exit(1); }
  const book = 'B' + bookNum;

  // Fetch ALL vocab (paginate past Supabase's 1000-row limit)
  const allVocab: any[] = [];
  let vOffset = 0;
  while (true) {
    const { data: vPage } = await supabase.from('book_vocabulary').select('*').range(vOffset, vOffset + 999);
    if (!vPage || vPage.length === 0) break;
    allVocab.push(...vPage);
    if (vPage.length < 1000) break;
    vOffset += 1000;
  }
  if (allVocab.length === 0) { console.log('No vocabulary found'); process.exit(1); }

  // Fetch ALL existing mnemonics (paginate past Supabase's 1000-row limit)
  const existingIds = new Set<string>();
  const existingCharTexts = new Set<string>();
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data: page } = await supabase.from('mnemonics').select('id, character, content_type').range(offset, offset + PAGE - 1);
    if (!page || page.length === 0) break;
    for (const r of page as any[]) {
      existingIds.add(r.id);
      if (r.character && r.content_type === 'character') existingCharTexts.add(r.character);
    }
    if (page.length < PAGE) break;
    offset += PAGE;
  }

  // Book stats
  const bookMap = new Map<string, { total: number; missing: number }>();
  for (const row of allVocab as any[]) {
    const match = row.id.match(/^(B\d+)L(\d+)/);
    if (!match) continue;
    const b = match[1];
    if (!bookMap.has(b)) bookMap.set(b, { total: 0, missing: 0 });
    bookMap.get(b)!.total++;
    const text = row.traditional || row.simplified || row.word || '';
    const cleaned = cleanVocabText(text);
    if (!existingIds.has(row.id) && !(cleaned && existingCharTexts.has(cleaned))) {
      bookMap.get(b)!.missing++;
    }
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      Batch Memory Hook Generator v3 (templates)  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  for (const [b, info] of [...bookMap.entries()].sort()) {
    const marker = b === book ? ' ◄──' : '';
    console.log(`  ${b}: ${info.total} vocab  [${info.missing === 0 ? 'done' : `${info.missing} missing`}]${marker}`);
  }

  const vocab = (allVocab as any[])
    .filter((r: any) => r.id.startsWith(book))
    .filter((r: any) => {
      if (existingIds.has(r.id)) return false;
      const text = r.traditional || r.simplified || r.word || '';
      const cleaned = cleanVocabText(text);
      if (cleaned && existingCharTexts.has(cleaned)) return false;
      return true;
    });

  if (vocab.length === 0) { console.log(`\nAll mnemonics already exist for ${book}.\n`); process.exit(0); }

  console.log(`\nGenerating ${vocab.length} mnemonics in batches of ${BATCH_SIZE}...\n`);

  let success = 0, failed = 0, skipped = 0;
  const total = vocab.length;
  const startTime = Date.now();

  for (let i = 0; i < vocab.length; i += BATCH_SIZE) {
    const batch = vocab.slice(i, i + BATCH_SIZE);

    const items: Array<{
      id: string; cleanedText: string; isWord: boolean;
      def: string; chars: string[];
    }> = [];

    for (const v of batch) {
      const text = v.traditional || v.simplified || v.word || '';
      const cleaned = cleanVocabText(text);
      if (!cleaned) { skipped++; continue; }
      items.push({
        id: v.id, cleanedText: cleaned, isWord: cleaned.length > 1,
        def: v.meaning || v.definition || '',
        chars: [...cleaned].filter(c => /[\u4e00-\u9fa5]/.test(c)),
      });
    }
    if (items.length === 0) continue;

    const allChars = [...new Set(items.flatMap(it => it.chars))];
    let breakdowns = await fetchBreakdowns(allChars);

    // Second pass: fetch decomposition component breakdowns for characters
    const charItemsForDecomp = items.filter(it => !it.isWord);
    const decompCharsNeeded: string[] = [];
    for (const it of charItemsForDecomp) {
      const bd = breakdowns.get(it.cleanedText);
      if (!bd?.decomposition) continue;
      const dcChars = [...bd.decomposition].filter(c => /[\u4e00-\u9fa5]/.test(c) && c !== it.cleanedText && !breakdowns.has(c));
      decompCharsNeeded.push(...dcChars);
    }
    if (decompCharsNeeded.length > 0) {
      const moreBreakdowns = await fetchBreakdowns([...new Set(decompCharsNeeded)]);
      for (const [k, v] of moreBreakdowns) breakdowns.set(k, v);
    }

    const charItems = items.filter(it => !it.isWord);
    const wordItems = items.filter(it => it.isWord);

    // ── Characters ──
    if (charItems.length > 0) {
      let userPrompt = '';
      const itemComponents = new Map<string, Array<[string, string]>>();

      for (const it of charItems) {
        const bd = breakdowns.get(it.cleanedText);
        if (!bd) { failed++; continue; }

        const decompChars = bd.decomposition
          ? [...bd.decomposition].filter(c => /[\u4e00-\u9fa5]/.test(c) && c !== it.cleanedText)
          : [];

        const components: Array<[string, string]> = [];
        for (const dc of decompChars) {
          const dcBd = breakdowns.get(dc);
          const def = dcBd?.definition ? dcBd.definition.split(/[;,/]/)[0].trim() : dc;
          components.push([def, dc]);
        }

        if (components.length === 0) {
          // No decomposition available — skip or use placeholder
          console.log(`  ⚠ ${it.id}: no components for "${it.cleanedText}"`);
          failed++;
          continue;
        }

        itemComponents.set(it.id, components);
        userPrompt += buildCharTemplate(it.id, it.cleanedText, components, bd.definition || it.def) + '\n\n';
      }

      if (userPrompt.trim()) {
        try {
          const resp = await callLLM(SYS_CHARACTER, userPrompt.trim());
          const parsed = parseResponse(resp);
          for (const p of parsed) {
            const item = charItems.find(it => it.id === p.id);
            if (!item) continue;
            const pairs = itemComponents.get(p.id) || [];
            const bolded = cleanAndRebold(p.mnemonic, pairs);
            await supabase.from('mnemonics').upsert({
              id: p.id, character: item.cleanedText,
              mnemonic: bolded, content_type: 'character',
            });
            success++;
            const display = bolded.length > 90 ? bolded.slice(0, 87) + '...' : bolded;
            console.log(`  ${renderBar(success + failed, total)} ✓ ${p.id} (char) "${item.cleanedText}"`);
            console.log(`    → ${display}`);
          }
        } catch (err: any) {
          console.log(`  ✗ [char batch] ${err.message}`);
          failed += charItems.length;
        }
      }
    }

    // ── Words ──
    if (wordItems.length > 0) {
      let userPrompt = '';

      for (const it of wordItems) {
        const charPairs: Array<[string, string]> = [];
        for (const c of it.chars) {
          const bd = breakdowns.get(c);
          const def = bd?.definition ? bd.definition.split(/[;,/]/)[0].trim() : c;
          charPairs.push([def, c]);
        }
        userPrompt += buildWordTemplate(it.id, it.cleanedText, charPairs, it.def) + '\n\n';
      }

      if (userPrompt.trim()) {
        try {
          const resp = await callLLM(SYS_WORD, userPrompt.trim());
          const parsed = parseResponse(resp);
          for (const p of parsed) {
            const item = wordItems.find(it => it.id === p.id);
            if (!item) continue;
            // Build char→meaning pairs for this word
            const wordPairs: Array<[string, string]> = [];
            for (const c of item.chars) {
              const bd = breakdowns.get(c);
              const def = bd?.definition ? bd.definition.split(/[;,/]/)[0].trim() : c;
              wordPairs.push([def, c]);
            }
            const bolded = cleanAndRebold(p.mnemonic, wordPairs);
            await supabase.from('mnemonics').upsert({
              id: p.id, character: item.cleanedText,
              mnemonic: bolded, content_type: 'word',
            });
            success++;
            const display = bolded.length > 90 ? bolded.slice(0, 87) + '...' : bolded;
            console.log(`  ${renderBar(success + failed, total)} ✓ ${p.id} (word) "${item.cleanedText}"`);
            console.log(`    → ${display}`);
          }
        } catch (err: any) {
          console.log(`  ✗ [word batch] ${err.message}`);
          failed += wordItems.length;
        }
      }
    }

    if (i + BATCH_SIZE < vocab.length) await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  ${book} DONE: ${success} ok, ${failed} failed, ${skipped} skipped in ${elapsed}min`);
  console.log(`═══════════════════════════════════════════════\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
