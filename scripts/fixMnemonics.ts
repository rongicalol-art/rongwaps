/**
 * Fix poorly-formatted mnemonics
 * Finds mnemonics with missing bold components or bad endings.
 * Uses regex post-processing to guarantee correct formatting.
 * Usage: npx tsx scripts/fixMnemonics.ts [book_number]
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
const OPENROUTER_API_KEY = env['OPENROUTER_API_KEY'] || '';
const supabase = createClient(env['VITE_SUPABASE_URL'] || '', env['VITE_SUPABASE_ANON_KEY'] || '');
const DELAY_MS = 3000;

const MODELS = [
  { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
  { provider: 'openrouter', model: 'openai/gpt-oss-120b:free' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
];

const CHAR_SYS = `Write a 1-sentence mnemonic for this Chinese character. Format each component as: english_meaning (chinese_character). Example: A person (亻) resting against a tree (木), so this character means to rest (休).

Components to use: {{COMPONENTS}}
Character meaning: {{DEFINITION}}

Write the mnemonic:`;

const WORD_SYS = `Write a 1-sentence mnemonic for this Chinese word. Format each character as: english_meaning (chinese_character). Example: A mouth (口) begging (乞) for food, so together means to eat (吃).

Characters: {{COMPONENTS}}
Word meaning: {{DEFINITION}}

Write the mnemonic:`;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callLLM(system: string, user: string): Promise<string> {
  for (const m of MODELS) {
    try {
      if (m.provider === 'gemini' && GEMINI_API_KEY) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: m.model, contents: user,
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
      }
    } catch (err: any) {
      process.stderr.write(`\n  [fallback] ${m.model}: ${err.message}\n`);
    }
  }
  throw new Error('All models failed');
}

async function getCharacterBreakdown(char: string): Promise<any> {
  try {
    const { data } = await supabase.from('character_breakdowns').select('*').eq('character', char).limit(1).single();
    return data;
  } catch { return null; }
}

function renderBar(current: number, total: number): string {
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 30);
  const bar = '█'.repeat(filled) + '░'.repeat(30 - filled);
  return `[${bar}] ${pct}% (${current}/${total})`;
}

// ─── Post-processing: regex fixer ─────────────────────────────────────
function fixFormatting(mnemonic: string, type: 'character' | 'word', charText: string): string {
  let fixed = mnemonic.trim();

  // Remove trailing period (we'll add it back)
  fixed = fixed.replace(/\.\s*$/, '');

  // Step 1: Fix unbolded component mentions
  // Find all "word (ChineseChar)" patterns and bold the word if not already bolded
  // We process from right to left to avoid position shifts
  const parenPattern = /([a-zA-Z][a-zA-Z\s]*?)\s*([\(\uff08])([\u4e00-\u9fa5]+)([\)\uff29])/g;
  const matches: { index: number; length: number; replacement: string }[] = [];
  let match;
  while ((match = parenPattern.exec(fixed)) !== null) {
    const word = match[1].trim();
    // Skip if already bolded (preceded by **)
    const before = fixed.substring(Math.max(0, match.index - 2), match.index);
    if (before.endsWith('**')) continue;
    // Skip common non-component words
    const skipWords = ['so', 'this', 'together', 'means', 'character', 'the', 'a', 'an', 'is', 'to', 'and', 'or', 'if', 'when', 'each', 'that', 'which'];
    if (skipWords.includes(word.toLowerCase())) continue;
    // Skip if it's the final meaning (after "so...means")
    const afterMatch = fixed.substring(match.index + match[0].length);
    if (afterMatch.trim().startsWith('.') || afterMatch.trim() === '') continue;
    matches.push({
      index: match.index,
      length: match[0].length,
      replacement: `**${word}** ${match[2]}${match[3]}${match[4]}`,
    });
  }
  // Apply replacements from end to start
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    fixed = fixed.substring(0, m.index) + m.replacement + fixed.substring(m.index + m.length);
  }

  // Step 2: Fix the ending — ensure proper format
  if (type === 'character') {
    // Check if it has the proper ending
    if (!fixed.includes('so this character means')) {
      // Try to find the last bolded meaning and restructure
      const lastBold = fixed.match(/\*\*([^*]+)\*\*\s*[\(（][\u4e00-\u9fa5]+[\)）]/g);
      if (lastBold && lastBold.length > 0) {
        const last = lastBold[lastBold.length - 1];
        const meaning = last.match(/\*\*([^*]+)\*\*/)?.[1] || '';
        // Remove the last bold part and add proper ending
        const idx = fixed.lastIndexOf(last);
        if (idx !== -1) {
          fixed = fixed.substring(0, idx).replace(/[,\s]+$/, '') + `, so this character means **${meaning}** (${charText})`;
        }
      }
    } else {
      // Has ending but final meaning might not be bolded
      fixed = fixed.replace(/so this character means\s+([a-zA-Z][a-zA-Z\s,]*?)\s*([\(\uff08])([\u4e00-\u9fa5]+)([\)\uff29])/, (_, meaning, o, c, cl) => {
        return `so this character means **${meaning.trim()}** ${o}${c}${cl}`;
      });
    }
  } else {
    if (!fixed.includes('so together means')) {
      const lastBold = fixed.match(/\*\*([^*]+)\*\*\s*[\(（][\u4e00-\u9fa5]+[\)）]/g);
      if (lastBold && lastBold.length > 0) {
        const last = lastBold[lastBold.length - 1];
        const meaning = last.match(/\*\*([^*]+)\*\*/)?.[1] || '';
        const idx = fixed.lastIndexOf(last);
        if (idx !== -1) {
          fixed = fixed.substring(0, idx).replace(/[,\s]+$/, '') + `, so together means **${meaning}** (${charText})`;
        }
      }
    } else {
      fixed = fixed.replace(/so together means\s+([a-zA-Z][a-zA-Z\s,]*?)\s*([\(\uff08])([\u4e00-\u9fa5]+)([\)\uff29])/, (_, meaning, o, c, cl) => {
        return `so together means **${meaning.trim()}** ${o}${c}${cl}`;
      });
    }
  }

  // Ensure period at end
  if (!fixed.endsWith('.')) fixed += '.';
  return fixed;
}

// ─── Quality check ───────────────────────────────────────────────────
function checkQuality(mnemonic: string, type: 'character' | 'word', charText: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!mnemonic || mnemonic.length < 10) return { ok: false, issues: ['empty'] };

  // Check ending
  const hasEnding = mnemonic.includes('so this character means') || mnemonic.includes('so together means');
  if (!hasEnding) issues.push('missing ending');

  // Check for unbolded component mentions: word (char) where word is NOT **
  const unboldedParen = /(?<!\*\*)\b[a-zA-Z][a-zA-Z\s]{1,30}\b\s*[\(（][\u4e00-\u9fa5]+[\)）]/g;
  const unbolded = mnemonic.match(unboldedParen) || [];
  const realUnbolded = unbolded.filter(u => {
    const skip = ['so', 'this', 'together', 'means', 'character', 'the', 'a', 'an', 'is', 'to', 'and', 'or', 'if', 'when', 'each'];
    return !skip.some(s => u.toLowerCase().startsWith(s));
  });
  if (realUnbolded.length > 0) issues.push(`${realUnbolded.length} unbolded component(s)`);

  // Check bold component count
  const boldPattern = /\*\*[^*]+\*\*\s*[\(（][\u4e00-\u9fa5]+[\)）]/g;
  const boldCount = (mnemonic.match(boldPattern) || []).length;
  if (type === 'character' && boldCount < 1) issues.push('no bold components');
  if (type === 'word') {
    const expected = [...charText].filter(c => /[\u4e00-\u9fa5]/.test(c)).length;
    if (boldCount < expected) issues.push(`only ${boldCount}/${expected} bold`);
  }

  return { ok: issues.length === 0, issues };
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const bookArg = process.argv[2];
  const targetBook = bookArg ? 'B' + parseInt(bookArg) : null;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║          Mnemonic Quality Fixer                  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  if (targetBook) console.log(`Target: ${targetBook}\n`);

  const { data: allMnems } = await supabase.from('mnemonics').select('*');
  if (!allMnems) { console.log('No mnemonics found'); process.exit(1); }

  let mnems = (allMnems as any[]).filter(m => !targetBook || m.id.startsWith(targetBook));
  const { data: allVocab } = await supabase.from('book_vocabulary').select('*');
  const vocabMap = new Map((allVocab as any[])?.map(v => [v.id, v]) || []);

  // Find bad ones
  const bad: any[] = [];
  for (const m of mnems) {
    const result = checkQuality(m.mnemonic, m.content_type, m.character);
    if (!result.ok) bad.push({ ...m, issues: result.issues });
  }

  console.log(`Found ${bad.length} poorly-formatted mnemonics out of ${mnems.length} total\n`);
  if (bad.length === 0) { console.log('✓ All pass!\n'); process.exit(0); }

  console.log('Will fix (showing first 10):');
  for (const b of bad.slice(0, 10)) {
    console.log(`  [${b.content_type}] ${b.character} (${b.id}): ${b.issues.join(', ')}`);
  }
  if (bad.length > 10) console.log(`  ... and ${bad.length - 10} more`);
  console.log();

  let fixed = 0, stillBad = 0, errors = 0;
  const total = bad.length;
  const startTime = Date.now();

  for (let i = 0; i < bad.length; i++) {
    const item = bad[i];
    const itemNum = i + 1;
    const vocab = vocabMap.get(item.id);
    const def = vocab?.meaning || '';
    const text = item.character;

    try {
      let mnemonic: string;

      if (item.content_type === 'character') {
        const breakdown = await getCharacterBreakdown(text);
        const shortDef = breakdown?.definition ? breakdown.definition.split(/[;,/]/)[0].trim() : def;
        let compList = '';
        if (breakdown?.decomposition) {
          const decompChars = [...breakdown.decomposition].filter(c => /[\u4e00-\u9fa5]/.test(c) && c !== text);
          if (decompChars.length > 1) {
            const parts = [];
            for (const c of decompChars) {
              const b = await getCharacterBreakdown(c);
              const d = b?.definition ? b.definition.split(/[;,/]/)[0].trim() : '';
              parts.push(`${d} (${c})`);
            }
            compList = parts.join(', ');
          }
        }
        const promptText = compList
          ? `${text} | ${shortDef} | Components: ${compList}`
          : `${text} | ${shortDef}`;
        mnemonic = await callLLM(CHAR_SYS, promptText);
      } else {
        const chars = [...text].filter(c => /[\u4e00-\u9fa5]/.test(c));
        const parts = [];
        for (const c of chars) {
          const b = await getCharacterBreakdown(c);
          const d = b?.definition ? b.definition.split(/[;,/]/)[0].trim() : '';
          parts.push(`${d} (${c})`);
        }
        const promptText = `${text} | ${def} | ${parts.join(', ')}`;
        mnemonic = await callLLM(WORD_SYS, promptText);
      }

      // Post-process with regex fixer
      if (mnemonic && mnemonic.length > 10) {
        mnemonic = fixFormatting(mnemonic, item.content_type, text);
      }

      // Validate after fix
      const validation = checkQuality(mnemonic, item.content_type, text);

      await supabase.from('mnemonics').upsert({
        id: item.id, character: text, mnemonic, content_type: item.content_type,
      });

      if (validation.ok) {
        fixed++;
        const display = mnemonic.length > 80 ? mnemonic.slice(0, 77) + '...' : mnemonic;
        console.log(`  ${renderBar(itemNum, total)} ✓ ${item.content_type} "${text}"`);
        console.log(`    → ${display}`);
      } else {
        stillBad++;
        console.log(`  ${renderBar(itemNum, total)} ⚠ ${item.content_type} "${text}" (${validation.issues.join(', ')})`);
      }
    } catch (err: any) {
      errors++;
      console.log(`  ${renderBar(itemNum, total)} ✗ ${item.content_type} "${text}" (${err.message})`);
    }

    if (i < bad.length - 1) await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  DONE: ${fixed} fixed, ${stillBad} still bad, ${errors} errors in ${elapsed}min`);
  console.log(`═══════════════════════════════════════════════\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
