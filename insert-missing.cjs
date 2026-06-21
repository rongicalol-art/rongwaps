const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ylpzxpqyfaayavkvhikw.supabase.co', 'eyJhbG...r2PY');

async function check() {
  // Check RLS by doing a select with count
  const { count, error } = await supabase.from('character_breakdowns_v2').select('*', { count: 'exact', head: true });
  console.log('Count:', count, 'Error:', error?.message);

  // Try inserting 𦥯 directly
  const { data: ins, error: insErr } = await supabase.from('character_breakdowns_v2').upsert({
    character: '\u2696F',
    decomposition: '\u2FF3\u26952\u515B\u5196\u5151',
    components_historical: ['\u26952', '\u515B', '\u5196', '\u5151'],
    definition: 'Component cluster used in 學, 覺, 攪, etc.',
  }).select();
  console.log('Insert 𦥯:', insErr ? insErr.message : JSON.stringify(ins));

  // Try inserting 學 with override
  const { data: xue, error: xueErr } = await supabase.from('character_breakdowns_v2').upsert({
    character: '學',
    decomposition: '\u2FF1\u2696F\u5B50',
    components_historical: ['\u2696F', '\u5B50'],
  }).select();
  console.log('Insert 學:', xueErr ? xueErr.message : JSON.stringify(xue));

  // Verify
  const { data: ver } = await supabase.from('character_breakdowns_v2').select('*').in('character', ['\u2696F', '學']);
  console.log('Verify:', JSON.stringify(ver));
}

check().catch(console.error);
