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
  // Get ALL B1 mnemonics
  const { data } = await supabase.from('mnemonics').select('*').ilike('id', 'B1%');
  const mnems = (data as any[]) || [];
  console.log(`Total B1 mnemonics: ${mnems.length}\n`);

  const bad: any[] = [];
  const good: any[] = [];

  for (const m of mnems) {
    const text = m.character || '';
    const type = m.content_type;
    const mnemonic = m.mnemonic || '';
    const issues: string[] = [];

    // 1. Check for the proper ending
    const hasCharEnding = mnemonic.includes('so this character means');
    const hasWordEnding = mnemonic.includes('so together means');
    if (type === 'character' && !hasCharEnding) issues.push('missing "so this character means"');
    if (type === 'word' && !hasWordEnding) issues.push('missing "so together means"');

    // 2. Check component bolding: **meaning** (chinese_char)
    const componentPattern = /\*\*[^*]+\*\*\s*[\(（][\u4e00-\u9fa5]+[\)）]/g;
    const boldComponents = mnemonic.match(componentPattern) || [];

    if (type === 'character') {
      // Should have at least 1 component bolded
      if (boldComponents.length < 1) issues.push('no component bold');
    } else {
      // Word: count Chinese chars, each should have a bold meaning
      const chars = [...text].filter(c => /[\u4e00-\u9fa5]/.test(c));
      if (boldComponents.length < chars.length) {
        issues.push(`only ${boldComponents.length}/${chars.length} components bolded`);
      }
    }

    // 3. Check for unbolded component mentions (char in parens without ** before it)
    // e.g., "person (亻)" instead of "**person** (亻)"
    const unboldedParen = /(?<!\*)\b[a-zA-Z\s]+\b\s*[\(（][\u4e00-\u9fa5]+[\)）]/g;
    const unbolded = mnemonic.match(unboldedParen) || [];
    // Filter out the final meaning part which is expected
    const realUnbolded = unbolded.filter(u => {
      // Skip if it's the final "so...means **X** (Y)" part
      if (/so (this character means|together means)/.test(mnemonic.substring(0, mnemonic.indexOf(u)))) return false;
      return true;
    });
    if (realUnbolded.length > 0) {
      issues.push(`unbolded components: ${realUnbolded.join(', ')}`);
    }

    if (issues.length > 0) {
      bad.push({ ...m, issues });
    } else {
      good.push(m);
    }
  }

  console.log(`✓ Good: ${good.length}`);
  console.log(`✗ Bad:  ${bad.length}\n`);

  // Group issues by type
  const issueTypes: Record<string, number> = {};
  for (const b of bad) {
    for (const issue of b.issues) {
      const key = issue.split(':')[0]; // group by main issue type
      issueTypes[key] = (issueTypes[key] || 0) + 1;
    }
  }
  console.log('Issue breakdown:');
  for (const [type, count] of Object.entries(issueTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Show all bad ones
  console.log(`\n=== All ${bad.length} bad B1 mnemonics ===\n`);
  for (const b of bad) {
    console.log(`[${b.content_type}] ${b.character} (${b.id})`);
    console.log(`  Issues: ${b.issues.join(' | ')}`);
    console.log(`  ${b.mnemonic}`);
    console.log();
  }
}

main().catch(console.error);
