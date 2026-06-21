import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const SUPABASE_URL = 'https://ylpzxpqyfaayavkvhikw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscHp4cHF5ZmFheWF2a3ZoaWt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzNTY2MywiZXhwIjoyMDkzNzExNjYzfQ.JFXv5UFyxVan25PI04p0BEX2e8i-3DIWn9UI6uwr2PY';
const GITHUB_IDS_URL = 'https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt';

const LOCAL_IDS_PATH = path.resolve(__dirname, 'ids.txt');
const BACKUP_FILE = path.resolve(__dirname, `character_breakdowns_backup_${Date.now()}.json`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MANUAL_OVERRIDES = {
  '丟': { decomp: '⿱丿去', components: ['丿', '去'] },
  '學': { decomp: '⿱𦥯子', components: ['𦥯', '子'] },
  '令': { decomp: '⿱亽龴', components: ['亽', '龴'] },
  '以': { decomp: '⿰丶人', components: ['丶', '人'] },
  '傘': { decomp: '⿱人⿻十𠈌', components: ['人', '十', '𠈌'] },
  '備': { decomp: '⿰亻𤰇', components: ['亻', '𤰇'] },
  '氺': { decomp: '⿻亅⿱丷八', components: ['亅', '丷', '八'] },
  '惠': { decomp: '⿱直心', components: ['直', '心'] },
  '戈': { decomp: '⿻弋丿', components: ['弋', '丿'] },
  '戉': { decomp: '⿻戈丿', components: ['戈', '丿'] },
  '戎': { decomp: '⿹戈𠂇', components: ['戈', '𠂇'] },
  '戶': { decomp: '⿱丿尸', components: ['丿', '尸'] },
  '择': { decomp: '⿰扌𠬤', components: ['扌', '𠬤'] },
  '探': { decomp: '⿰扌罙', components: ['扌', '罙'] },
  '搴': { decomp: '⿱𡨄手', components: ['𡨄', '手'] },
  '卿': { decomp: '⿰卯卩', components: ['卯', '卩'] },
  '敖': { decomp: '⿰𫠤攵', components: ['𫠤', '攵'] },
  '敝': { decomp: '⿰㡀攵', components: ['㡀', '攵'] },
  '敻': { decomp: '⿱⿱𠂊𠔿⿱目攵', components: ['𠂊', '𠔿', '目', '攵'] },
  '斲': { decomp: '⿰𠁁斤', components: ['𠁁', '斤'] },
  '斷': { decomp: '⿰㡭斤', components: ['㡭', '斤'] },
  '方': { decomp: '⿱亠⿰丿𠃌', components: ['亠', '丿', '𠃌'] },
  '承': { decomp: '氶',  components: ['氶', '三'] },   
};

const ATOMIC_CHARS = new Set(['丨', '丿', '丶', '丷', '乃', '万', '丌', '不', '与', '丏', '丐', '专', '世', '业', '丝', '丧', '丩', '丱', '临', '乂', '攵', '厂', '㐆', '⺀', '⺈', '⺊', '⺌', '⺍', '⺗']);

const INTERMEDIATE_COMPONENTS = {
  '𦥯': { decomp: '⿳𦥑爻冖', components: ['𦥑', '爻', '冖'], definition: 'Component cluster used in 學, 覺, 攪, etc.' },
  '𠈌': { decomp: '⿱人人', components: ['人', '人'], definition: 'Double person component, appears in 傘' },
  '𤰇': { decomp: '⿱卄⿸厂用', components: ['卄', '厂', '用'], definition: 'Component cluster used in 備' },
};

const IDS_OPERATOR_REGEX = /[\u2FF0-\u2FFB]/;

async function downloadIDS() {
  if (fs.existsSync(LOCAL_IDS_PATH)) {
    return fs.readFileSync(LOCAL_IDS_PATH, 'utf8');
  }
  console.log('Downloading ids.txt...');
  const res = await axios.get(GITHUB_IDS_URL);
  fs.writeFileSync(LOCAL_IDS_PATH, res.data);
  return res.data;
}

function parseIDS(text: string) {
  const map = new Map<string, string>();
  const lines = text.split('\n');
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const char = parts[0].trim();
      // Use the first decomposition option
      const decomp = parts[1].split('|')[0].trim();
      map.set(char, decomp);
    }
  }
  return map;
}

function extractComponents(decomposition: string) {
  const components: string[] = [];
  const chars = Array.from(decomposition);
  for (const char of chars) {
    if (!IDS_OPERATOR_REGEX.test(char) && char !== '？' && char !== '?' && !/\s/.test(char)) {
      components.push(char);
    }
  }
  return components;
}

async function run() {
  try {
    const idsText = await downloadIDS();
    const idsMap = parseIDS(idsText);

    console.log('Backing up existing data...');
    const { data: oldData, error: backupError } = await supabase.from('character_breakdowns').select('*');
    if (backupError) throw backupError;
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(oldData, null, 2));
    console.log(`Backup saved to ${BACKUP_FILE}`);

    const rowsToUpsert = [];

    // 1. Process existing characters
    for (const row of oldData) {
      const char = row.character;
      let finalDecomp = null;
      let finalComponents = null;

      // Priority 1: Manual Overrides
      if (MANUAL_OVERRIDES[char]) {
        finalDecomp = MANUAL_OVERRIDES[char].decomp;
        finalComponents = MANUAL_OVERRIDES[char].components;
      } else if (ATOMIC_CHARS.has(char)) {
        finalDecomp = null;
        finalComponents = null;
      } else {
        // Priority 2: cjkvi-ids
        const idsDecomp = idsMap.get(char);
        if (idsDecomp && IDS_OPERATOR_REGEX.test(idsDecomp) && Array.from(idsDecomp).length > 1) {
          finalDecomp = idsDecomp;
          finalComponents = extractComponents(idsDecomp);
        } else {
          // Priority 3: Keep old data
          finalDecomp = row.decomposition;
          finalComponents = finalDecomp ? extractComponents(finalDecomp) : null;
        }
      }

      rowsToUpsert.push({
        character: char,
        radical: row.radial,
        pinyin: row.pinyin,
        definition: row.definition,
        decomposition: finalDecomp,
        components_historical: finalComponents,
      });
    }

    // 2. Add intermediate components
    for (const [char, data] of Object.entries(INTERMEDIATE_COMPONENTS)) {
      rowsToUpsert.push({
        character: char,
        decomposition: data.decomp,
        components_historical: data.components,
        definition: data.definition,
      });
    }

    // 3. Add manual overrides for characters NOT in old data
    const oldChars = new Set(oldData.map((r: any) => r.character));
    for (const [char, override] of Object.entries(MANUAL_OVERRIDES)) {
      if (!oldChars.has(char)) {
        rowsToUpsert.push({
          character: char,
          decomposition: override.decomp,
          components_historical: override.components,
        });
      }
    }

    console.log(`Upserting ${rowsToUpsert.length} rows to character_breakdowns_v2...`);
    for (let i = 0; i < rowsToUpsert.length; i += 200) {
      const batch = rowsToUpsert.slice(i, i + 200);
      const { error } = await supabase.from('character_breakdowns_v2').upsert(batch);
      if (error) throw error;
      console.log(`Processed ${Math.min(i + 200, rowsToUpsert.length)}/${rowsToUpsert.length}`);
    }

    // Verification
    const { count, error: countError } = await supabase.from('character_breakdowns_v2').select('*', { count: 'exact', head: true });
    if (countError) throw countError;
    console.log(`Total rows in v2: ${count}`);

    const samples = ['學', '丟', '好', '字', '愛', '令', '以', '傘', '備', '戈', '方', '惠', '戎', '承'];
    console.log('--- Sample Verification ---');
    for (const s of samples) {
      const { data } = await supabase.from('character_breakdowns_v2').select('*').eq('character', s).single();
      console.log(`${s}: decomp=${data?.decomposition}, components=${JSON.stringify(data?.components_historical)}`);
    }

    const { data: deadEnds } = await supabase.from('character_breakdowns_v2').select('character').ilike('decomposition', '%?%');
    console.log(`Dead-ends found: ${deadEnds?.length || 0}`);

  } catch (err) {
    console.error('Migration Error:', err);
    process.exit(1);
  }
}

run();
