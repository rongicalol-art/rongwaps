const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ylpzxpqyfaayavkvhikw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscHp4cHF5ZmFheWF2a3ZoaWt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzNTY2MywiZXhwIjwOTMxMTY2M30.JFXv5UFyxVan25PI04p0BEX2e8i-3DIWn9UI6uwr2PY'
);

async function insert() {
  const rows = [
    {
      character: String.fromCodePoint(0x2696F),
      decomposition: String.fromCodePoint(0x2FF3) + String.fromCodePoint(0x26952) + String.fromCodePoint(0x515B) + String.fromCodePoint(0x5196),
      components_historical: [String.fromCodePoint(0x26952), '\u515B', '\u5196'],
      definition: 'Component cluster used in 學, 覺, 攪, etc.',
    },
  ];

  for (const row of rows) {
    const { data, error } = await supabase.from('character_breakdowns_v2').upsert(row).select();
    if (error) console.error('Error:', error.message);
    else console.log('Inserted:', row.character, data);
  }

  // Verify count
  const { count } = await supabase.from('character_breakdowns_v2').select('*', { count: 'exact', head: true });
  console.log('Total rows:', count);
}

insert().catch(console.error);
