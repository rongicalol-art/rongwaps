const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ylpzxpqyfaayavkvhikw.supabase.co', 'eyJhbG...r2PY');

async function check() {
  // 1. Check if 𦥯 exists
  const { data: d1, error: e1 } = await supabase.from('character_breakdowns_v2').select('*').eq('character', '\u2696F').single();
  console.log('𦥯 (U+2696F):', e1 ? 'NOT FOUND' : JSON.stringify(d1));

  // 2. Check 學's decomposition
  const { data: d2 } = await supabase.from('character_breakdowns_v2').select('character,decomposition,components_historical').eq('character', '學').single();
  console.log('學:', JSON.stringify(d2));

  // 3. Find all chars whose decomposition contains 𦥯
  const { data: d3 } = await supabase.from('character_breakdowns_v2').select('character,decomposition,components_historical').ilike('decomposition', '%\u2696F%');
  console.log('\nChars with 𦥯 in decomposition:');
  if (d3) d3.forEach(r => console.log(' ', r.character, r.decomposition, JSON.stringify(r.components_historical)));

  // 4. Find all chars whose components contain 𦥯
  const { data: d4 } = await supabase.from('character_breakdowns_v2').select('character,decomposition,components_historical').contains('components_historical', ['\u2696F']);
  console.log('\nChars with 𦥯 in components_historical:');
  if (d4) d4.forEach(r => console.log(' ', r.character, r.decomposition, JSON.stringify(r.components_historical)));
}

check().catch(console.error);
