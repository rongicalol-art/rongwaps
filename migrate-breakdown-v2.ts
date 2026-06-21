/**
 * migrate-breakdown-v2.ts
 *
 * Rebuilds character_breakdowns with clean cjkvi-ids data.
 *
 * New table: character_breakdowns_v2
 *   character             TEXT PRIMARY KEY
 *   radical               TEXT
 *   pinyin                TEXT[]
 *   definition            TEXT
 *   decomposition         TEXT       (IDS with ⿱⿰⿲⿳ etc.)
 *   components_historical TEXT[]     (flat array, operators stripped)
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx migrate-breakdown-v2.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const IDS_URL = 'https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt';
const IDS_LOCAL = path.join(process.cwd(), 'ids.txt');
const NEW_TABLE = 'character_breakdowns_v2';
const PAGE_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const IDS_OP_REGEX = /[\u2FF0-\u2FFB]/;

// ─── All overrides in one place ──────────────────────────────────────────────
// Priority: these ALWAYS win over cjkvi-ids and old data.

const OVERRIDES: Record<string, { decomposition: string | null; components_historical: string[] | null }> = {
  // === Historical fixes (old engine was wrong) ===
  '丟': { decomposition: '⿱丿去', components_historical: ['丿', '去'] },
  '學': { decomposition: '⿱𦥯子', components_historical: ['𦥯', '子'] },
  '令': { decomposition: '⿱亽龴', components_historical: ['亽', '龴'] },
  '以': { decomposition: '⿰丶人', components_historical: ['丶', '人'] },
  '傘': { decomposition: '⿱人⿻十𠈌', components_historical: ['人', '十', '𠈌'] },
  '備': { decomposition: '⿰亻𤰇', components_historical: ['亻', '𤰇'] },
  '氺': { decomposition: '⿻亅⿱丷八', components_historical: ['亅', '丷', '八'] },

  // === Characters where cjkvi-ids has real decompositions but old data had ？ ===
  '惠': { decomposition: '⿱直心', components_historical: ['直', '心'] },
  '戈': { decomposition: '⿻弋丿', components_historical: ['弋', '丿'] },
  '戉': { decomposition: '⿻戈丿', components_historical: ['戈', '丿'] },
  '戎': { decomposition: '⿹戈𠂇', components_historical: ['戈', '𠂇'] },
  '戶': { decomposition: '⿱丿尸', components_historical: ['丿', '尸'] },
  '承': { decomposition: '⿻了三', components_historical: ['了', '三'] },
  '择': { decomposition: '⿰扌𠬤', components_historical: ['扌', '𠬤'] },
  '探': { decomposition: '⿰扌罙', components_historical: ['扌', '罙'] },
  '搴': { decomposition: '⿱𡨄手', components_historical: ['𡨄', '手'] },
  '卿': { decomposition: '⿰卯卩', components_historical: ['卯', '卩'] },
  '敖': { decomposition: '⿰𫠤攵', components_historical: ['𫠤', '攵'] },
  '敝': { decomposition: '⿰㡀攵', components_historical: ['㡀', '攵'] },
  '敻': { decomposition: '⿱⿱𠂊𠔿⿱目攵', components_historical: ['𠂊', '𠔿', '目', '攵'] },
  '斲': { decomposition: '⿰𠁁斤', components_historical: ['𠁁', '斤'] },
  '斷': { decomposition: '⿰㡭斤', components_historical: ['㡭', '斤'] },
  '方': { decomposition: '⿱亠⿰丿𠃌', components_historical: ['亠', '丿', '𠃌'] },

  // === Atomic characters (no meaningful decomposition) ===
  // Radical variants
  '⺀': { decomposition: null, components_historical: null },
  '⺈': { decomposition: null, components_historical: null },
  '⺊': { decomposition: null, components_historical: null },
  '⺌': { decomposition: null, components_historical: null },
  '⺍': { decomposition: null, components_historical: null },
  '⺗': { decomposition: null, components_historical: null },
  // Simple strokes
  '丨': { decomposition: null, components_historical: null },
  '丿': { decomposition: null, components_historical: null },
  '丶': { decomposition: null, components_historical: null },
  '丷': { decomposition: null, components_historical: null },
  '乃': { decomposition: null, components_historical: null },
  '万': { decomposition: null, components_historical: null },
  '丌': { decomposition: null, components_historical: null },
  '不': { decomposition: null, components_historical: null },
  '与': { decomposition: null, components_historical: null },
  '丏': { decomposition: null, components_historical: null },
  '丐': { decomposition: null, components_historical: null },
  '专': { decomposition: null, components_historical: null },
  '世': { decomposition: null, components_historical: null },
  '业': { decomposition: null, components_historical: null },
  '丝': { decomposition: null, components_historical: null },
  '丧': { decomposition: null, components_historical: null },
  '丩': { decomposition: null, components_historical: null },
  '丱': { decomposition: null, components_historical: null },
  '临': { decomposition: null, components_historical: null },
  '乂': { decomposition: null, components_historical: null },
  '攵': { decomposition: null, components_historical: null },
  '厂': { decomposition: null, components_historical: null },
  '㐆': { decomposition: null, components_historical: null },
};

// ─── Intermediate components that need their own rows ────────────────────────

const INTERMEDIATE_COMPONENTS: Record<string, { decomposition: string; components_historical: string[]; definition?: string }> = {
  '𦥯': {
    decomposition: '⿳𦥑爻冖',
    components_historical: ['𦥑', '爻', '冖'],
    definition: 'Component cluster used in 學, 覺, 攪, etc.',
  },
  '𠈌': {
    decomposition: '⿱人人',
    components_historical: ['人', '人'],
    definition: 'Double person component, appears in 傘',
  },
  '𤰇': {
    decomposition: '⿱卄⿸厂用',
    components_historical: ['卄', '厂', '用'],
    definition: 'Component cluster used in 備',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractComponents(decomposition: string): string[] {
  return Array.from(decomposition).filter(c => !IDS_OP_REGEX.test(c) && !/[\s！？?]/.test(c));
}

function parseIdsFile(): Map<string, string> {
  console.log('Parsing ids.txt...');
  const content = fs.readFileSync(IDS_LOCAL, 'utf-8');
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const left = parts[0].trim();
    const ids = parts[1].trim();
    if (!ids || ids === '？' || ids === '?') continue;
    let char: string;
    if (left.startsWith('U+')) {
      const cp = parseInt(left.slice(2), 16);
      if (isNaN(cp)) continue;
      char = String.fromCodePoint(cp);
    } else {
      char = left;
    }
    if (char && !map.has(char)) map.set(char, ids);
  }
  console.log(`  → ${map.size.toLocaleString()} entries parsed.`);
  return map;
}

async function downloadIds(): Promise<void> {
  if (fs.existsSync(IDS_LOCAL)) {
    console.log('ids.txt cached locally, skipping download.');
    return;
  }
  console.log('Downloading ids.txt...');
  const res = await fetch(IDS_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  fs.writeFileSync(IDS_LOCAL, await res.text(), 'utf-8');
  console.log('  → Downloaded.');
}

// ─── Step 1: Backup ──────────────────────────────────────────────────────────

async function backup(): Promise<void> {
  console.log('\nBacking up current data to local JSON file...');
  let page = 0, total = 0;
  const allRows: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from('character_breakdowns')
      .select('*')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    allRows.push(...data);
    total += data.length;
    page++;
  }
  const backupFile = path.join(process.cwd(), `character_breakdowns_backup_${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(allRows, null, 2), 'utf-8');
  console.log(`  → ${total} rows saved to ${backupFile}`);
}

// ─── Step 2: Build new dataset ───────────────────────────────────────────────

interface NewRow {
  character: string;
  radical: string | null;
  pinyin: string[] | null;
  definition: string | null;
  decomposition: string | null;
  components_historical: string[] | null;
}

async function buildDataset(idsMap: Map<string, string>): Promise<NewRow[]> {
  console.log('\nBuilding new dataset...');

  const existing = new Map<string, { radical: string | null; pinyin: string[] | null; definition: string | null; decomposition: string | null }>();
  {
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('character_breakdowns')
        .select('character, radical, pinyin, definition, decomposition')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      if (!data?.length) break;
      for (const r of data) existing.set(r.character, r);
      page++;
    }
  }
  console.log(`  → ${existing.size} existing characters loaded.`);

  const rows: NewRow[] = [];
  let fromOverride = 0, fromCjkvi = 0, fromOld = 0;

  for (const [char, old] of existing) {
    // Priority 1: Overrides (always win)
    if (OVERRIDES[char]) {
      const o = OVERRIDES[char];
      rows.push({
        character: char,
        radical: old.radical,
        pinyin: old.pinyin,
        definition: old.definition,
        decomposition: o.decomposition,
        components_historical: o.components_historical,
      });
      fromOverride++;
      continue;
    }

    // Priority 2: cjkvi-ids (only if it has real IDS operators)
    const idsDecomp = idsMap.get(char);
    if (idsDecomp && idsDecomp.length > 1 && IDS_OP_REGEX.test(idsDecomp)) {
      rows.push({
        character: char,
        radical: old.radical,
        pinyin: old.pinyin,
        definition: old.definition,
        decomposition: idsDecomp,
        components_historical: extractComponents(idsDecomp),
      });
      fromCjkvi++;
      continue;
    }

    // Priority 3: Keep old data
    rows.push({
      character: char,
      radical: old.radical,
      pinyin: old.pinyin,
      definition: old.definition,
      decomposition: old.decomposition,
      components_historical: old.decomposition ? extractComponents(old.decomposition) : null,
    });
    fromOld++;
  }

  console.log(`  → ${fromOverride} overrides, ${fromCjkvi} from cjkvi-ids, ${fromOld} kept from old data.`);
  return rows;
}

// ─── Step 3: Build intermediate component rows ───────────────────────────────

function buildIntermediateRows(idsMap: Map<string, string>): NewRow[] {
  console.log('\nBuilding intermediate component rows...');
  const rows: NewRow[] = [];
  for (const [char, data] of Object.entries(INTERMEDIATE_COMPONENTS)) {
    const idsDecomp = idsMap.get(char);
    const finalDecomp = data.decomposition || idsDecomp || null;
    const finalComponents = data.components_historical || (finalDecomp ? extractComponents(finalDecomp) : []);
    rows.push({
      character: char,
      radical: null,
      pinyin: null,
      definition: data.definition || null,
      decomposition: finalDecomp,
      components_historical: finalComponents,
    });
    console.log(`  → ${char}: ${finalDecomp}`);
  }
  return rows;
}

// ─── Step 4: Upload ──────────────────────────────────────────────────────────

async function uploadToNewTable(allRows: NewRow[]): Promise<void> {
  console.log(`\nUploading ${allRows.length} rows to ${NEW_TABLE}...`);
  const BATCH = 200;
  let uploaded = 0;
  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const { error } = await supabase.from(NEW_TABLE).upsert(batch, { onConflict: 'character' });
    if (error) {
      if (error.message.includes('does not exist')) {
        const { error: insErr } = await supabase.from(NEW_TABLE).insert(batch);
        if (insErr) throw insErr;
      } else {
        throw error;
      }
    }
    uploaded += batch.length;
    if (uploaded % 2000 === 0 || uploaded === allRows.length) {
      console.log(`  → ${uploaded}/${allRows.length}`);
    }
  }
  console.log(`  → ${uploaded} rows upserted into ${NEW_TABLE}.`);
}

// ─── Step 5: Verify ──────────────────────────────────────────────────────────

async function verify(): Promise<void> {
  console.log('\n--- Verification ---');

  const { count } = await supabase.from(NEW_TABLE).select('*', { count: 'exact', head: true });
  console.log(`Total rows in ${NEW_TABLE}: ${count}`);

  const samples = ['學', '丟', '好', '𦥯', '字', '愛', '令', '以', '傘', '備', '戈', '方', '惠', '戎', '承'];
  for (const char of samples) {
    const { data } = await supabase.from(NEW_TABLE).select('decomposition, components_historical').eq('character', char).single();
    if (data) {
      console.log(`  ${char}: decomp="${data.decomposition}" components=[${data.components_historical?.join(', ')}]`);
    } else {
      console.log(`  ${char}: NOT FOUND`);
    }
  }

  const { data: deadEnds } = await supabase.from(NEW_TABLE).select('character, decomposition').like('decomposition', '%？%').limit(20);
  if (deadEnds?.length) {
    console.log(`\n⚠️  WARNING: ${deadEnds.length} rows still contain ？:`);
    for (const d of deadEnds) console.log(`    ${d.character}: ${d.decomposition}`);
  } else {
    console.log('\n✅ No ？ dead-ends found.');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Character Breakdown Rebuild: cjkvi-ids ===\n');

  await downloadIds();
  const idsMap = parseIdsFile();

  console.log('\nThis will:');
  console.log('  1. Backup current data to local JSON file');
  console.log(`  2. Upsert ${NEW_TABLE} with clean data`);
  console.log(`  3. Apply ${Object.keys(OVERRIDES).length} overrides`);
  console.log(`  4. Insert ${Object.keys(INTERMEDIATE_COMPONENTS).length} intermediate component rows`);
  console.log('\nCtrl+C to cancel. Starting in 5s...');
  await new Promise(r => setTimeout(r, 5000));

  await backup();
  const mainRows = await buildDataset(idsMap);
  const intermediateRows = buildIntermediateRows(idsMap);
  const allRows = [...mainRows, ...intermediateRows];
  await uploadToNewTable(allRows);
  await verify();

  console.log('\n=== Done ===');
  console.log(`New table: ${NEW_TABLE}`);
  console.log('Backup:    character_breakdowns_backup_YYYY-MM-DD.json (local file)');
  console.log('\nNext steps:');
  console.log('  1. Verify data in Supabase dashboard');
  console.log('  2. Update breakdownService.ts to query from character_breakdowns_v2');
  console.log('  3. Update DBCharacterBreakdown type to include components_historical');
  console.log('  4. When confirmed good, rename tables');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
