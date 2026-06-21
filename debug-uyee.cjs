const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ylpzxpqyfaayavkvhikw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscHp4cHF5ZmFheWF2a3ZoaWt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzNTY2MywiZXhwIjoyMDkzNzExNjYzfQ.JFXv5UFyxVan25PI04p0BEX2e8i-3DIWn9UI6uwr2PY'
);

async function check() {
  const { count, error: countErr } = await supabase.from('character_breakdowns_v2').select('*', { count: 'exact', head: true });
  console.log('Count:', count, 'Error:', countErr ? countErr.message : 'none');

  const uyee = String.fromCodePoint(0x2696F);
  const { data: d1 } = await supabase.from('character_breakdowns_v2').select('*').eq('character', uyee).single();
  console.log('uyee:', d1 ? JSON.stringify(d1) : 'NOT FOUND');

  const { data: d2 } = await supabase.from('character_breakdowns_v2').select('*').eq('character', '\u5B78').single();
  console.log('xue:', d2 ? JSON.stringify(d2) : 'NOT FOUND');
}

check().catch(console.error);
