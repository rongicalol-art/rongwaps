import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v;
}
const supabase = createClient(env['VITE_SUPABASE_URL'] || '', env['VITE_SUPABASE_ANON_KEY'] || '');

async function main() {
  // Get all B1 and B2 mnemonics and check quality
  const { data } = await supabase.from('mnemonics').select('*').ilike('id', 'B1%');
  const { data: b2 } = await supabase.from('mnemonics').select('*').ilike('id', 'B2%');
  const all = [...(data as any[] || []), ...(b2 as any[] || [])];

  console.log('B1+B2 mnemonics:', all.length, '\n');

  // Check each one for quality issues
  const issues: any[] = [];
  for (const row of all) {
    const m = row.mnemonic || '';
    const problems: string[] = [];

    // 1. Check if component meanings are bolded (not just the final meaning)
    // Pattern: **meaning** (char) should appear for components
    const componentBoldPattern = /\*\*[^*]+\*\*\s*[\(（][\u4e00-\u9fa5]+[\)）]/g;
    const componentBolds = m.match(componentBoldPattern) || [];

    // 2. Count Chinese characters in the mnemonic that should be bolded
    // For a character mnemonic, the decomposition components should be bolded
    // For a word mnemonic, each character's meaning should be bolded

    // 3. Check if it ends properly
    const hasProperEnding = m.includes('so this character means') || m.includes('so together means');

    // 4. Check for missing bold on components (character in parens not preceded by **)
    // Pattern: word (char) where word is NOT bolded
    const unboldedComponent = /(?<!\*\*)\b\w+\b\s*[\(（][\u4e00-\u9fa5]+[\)）]/g;
    const unbolded = m.match(unboldedComponent) || [];

    if (row.content_type === 'character' && componentBolds.length < 1) {
      problems.push('char: no component bold');
    }
    if (row.content_type === 'word') {
      // Count chars in the word
      const word = row.character || '';
      const charCount = [...word].filter(c => /[\u4e00-\u9fa5]/.test(c)).length;
      // Each char should have a bold meaning
      if (componentBolds.length < charCount) {
        problems.push(`word: ${componentBolds.length} bold components but ${charCount} chars`);
      }
    }
    if (!hasProperEnding) {
      problems.push('missing "so...means" ending');
    }

    if (problems.length > 0) {
      issues.push({ id: row.id, char: row.character, type: row.content_type, problems, mnemonic: m.slice(0, 100) });
    }
  }

  console.log(`Found ${issues.length} mnemonics with quality issues:\n`);
  for (const item of issues.slice(0, 30)) {
    console.log(`[${item.type}] ${item.char} (${item.id})`);
    console.log(`  Issues: ${item.problems.join(', ')}`);
    console.log(`  ${item.mnemonic}`);
    console.log();
  }

  if (issues.length > 30) {
    console.log(`... and ${issues.length - 30} more`);
  }

  // Summary stats
  console.log('\n=== Summary ===');
  const charIssues = issues.filter(i => i.type === 'character').length;
  const wordIssues = issues.filter(i => i.type === 'word').length;
  console.log(`Character issues: ${charIssues}`);
  console.log(`Word issues: ${wordIssues}`);
  console.log(`Total problematic: ${issues.length}/${all.length} (${Math.round(issues.length/all.length*100)}%)`);
}

main().catch(console.error);
