/**
 * Test: Generate 10 Book 1 character mnemonics in the new "etymology story" style.
 * Saves to Supabase with content_type='story' so we don't overwrite existing ones.
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── 10 test characters with good etymology potential ───
const TEST_CHARS = [
  { char: '休', meaning: 'to rest', decomposition: '亻+ 木', components: 'person + tree' },
  { char: '好', meaning: 'good', decomposition: '女 + 子', components: 'woman + child' },
  { char: '明', meaning: 'bright', decomposition: '日 + 月', components: 'sun + moon' },
  { char: '林', meaning: 'forest', decomposition: '木 + 木', components: 'tree + tree' },
  { char: '信', meaning: 'to trust / letter', decomposition: '亻+ 言', components: 'person + words' },
  { char: '家', meaning: 'home / family', decomposition: '宀 + 豕', components: 'roof + pig' },
  { char: '安', meaning: 'peace / safe', decomposition: '宀 + 女', components: 'roof + woman' },
  { char: '男', meaning: 'male', decomposition: '田 + 力', components: 'field + strength' },
  { char: '看', meaning: 'to look', decomposition: '手 + 目', components: 'hand + eye' },
  { char: '想', meaning: 'to think / miss', decomposition: '相 + 心', components: 'mutual + heart' },
];

const SYSTEM_PROMPT = `You are a Chinese character etymology expert. For each character, write a short story-style mnemonic (2-4 sentences) that explains the REAL historical/cultural origin of the character.

RULES:
1. Base the story on actual etymology — how ancient Chinese people created this character and why the components were chosen.
2. Make it vivid and memorable — paint a picture of ancient life.
3. Bold each component's English meaning and write its Chinese character in parentheses: **meaning** (character). Bold EVERY component mentioned.
4. End with a sentence connecting the story to the modern meaning.
5. Keep it concise — 2-4 sentences max.
6. If the true origin is uncertain or debated, say so briefly and give the most widely accepted explanation.
7. Output format: Start with the character on its own line, then the story on the next line.

EXAMPLE for 休 (to rest):
休
In ancient China, farm workers toiled under the hot sun. When they needed a break, they would lean against a **tree** (木) to rest — that's why the character shows a **person** (亻) next to a tree. To this day, 休 means "to rest."

EXAMPLE for 好 (good):
好
In ancient Chinese culture, a **woman** (女) with her **child** (子) by her side represented the ideal of family happiness. This combination of mother and child became the symbol for what is **good** and **right** in life. That's why 好 means "good."`;

async function callLLM(user: string): Promise<string> {
  const MODELS = [
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'gemini', model: 'gemini-2.0-flash' },
    { provider: 'openrouter', model: 'openai/gpt-oss-120b:free' },
  ];

  for (const m of MODELS) {
    try {
      if (m.provider === 'gemini' && GEMINI_API_KEY) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const response = await ai.models.generateContent({
              model: m.model,
              contents: user,
              config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3 },
            });
            const text = response?.text?.trim() || '';
            if (text && text.length > 10) return text;
            break;
          } catch (err: any) {
            if (err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE')) {
              console.log(`  [retry ${attempt+1}/3] ${m.model} overloaded, waiting 15s...`);
              await sleep(15000);
              continue;
            }
            throw err;
          }
        }
      } else if (m.provider === 'openrouter' && OPENROUTER_API_KEY) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: m.model,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: user }],
            temperature: 0.3, max_tokens: 500,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          return json.choices?.[0]?.message?.content?.trim() || '';
        }
      }
    } catch (err: any) {
      console.log(`  [fallback] ${m.model}: ${err.message}`);
    }
  }
  throw new Error('All models failed');
}

async function main() {
  console.log('=== Generating 10 Story-Style Mnemonics ===\n');

  // Build user prompt with all 10 characters
  let userPrompt = 'Generate story-style mnemonics for these 10 characters:\n\n';
  for (const c of TEST_CHARS) {
    userPrompt += `${c.char} | meaning: ${c.meaning} | components: ${c.components} (${c.decomposition})\n`;
  }

  console.log('Sending to LLM...');
  const response = await callLLM(userPrompt);
  console.log('\n--- RAW RESPONSE ---\n');
  console.log(response);
  console.log('\n--- PARSING ---\n');

  // Parse response — split by character
  const lines = response.split('\n');
  const results: Array<{ char: string; mnemonic: string }> = [];
  let currentChar = '';
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentChar && currentText) {
        results.push({ char: currentChar, mnemonic: currentText.trim() });
        currentChar = '';
        currentText = '';
      }
      continue;
    }
    // If line is just a single Chinese character, it's a new entry
    if (/^[\u4e00-\u9fa5]$/.test(trimmed) && !currentChar) {
      currentChar = trimmed;
    } else if (currentChar) {
      currentText += trimmed + ' ';
    }
  }
  if (currentChar && currentText) {
    results.push({ char: currentChar, mnemonic: currentText.trim() });
  }

  console.log(`Parsed ${results.length} mnemonics:\n`);

  // Save to Supabase
  for (const r of results) {
    const original = TEST_CHARS.find(c => c.char === r.char);
    const id = `story_${r.char}`;
    const { error } = await supabase.from('mnemonics').upsert({
      id,
      character: r.char,
      mnemonic: r.mnemonic,
      content_type: 'story',
    });
    if (error) {
      console.log(`  ✗ ${r.char}: ${error.message}`);
    } else {
      console.log(`  ✓ ${r.char} (${original?.meaning})`);
      console.log(`    "${r.mnemonic}"`);
      console.log();
    }
    await sleep(200);
  }

  console.log('=== DONE ===');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
