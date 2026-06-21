const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ylpzxpqyfaayavkvhikw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscHp4cHF5ZmFheWF2a3ZoaWt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzNTY2MywiZXhwIjoyMDkzNzExNjYzfQ.JFXv5UFyxVan25PI04p0BEX2e8i-3DIWn9UI6uwr2PY'
);

async function insert() {
  const rows = [
    {
      character: '\uD85A\uDE6F',
      decomposition: '\u2FF3\uD859\uDD52\u515B\u5196',
      components_historical: ['\uD859\uDD52', '\u515B', '\u5196'],
      definition: 'Component cluster used in 學, 覺, 攪, etc.',
    },
    {
      character: '\uD842\uDC0C',
      decomposition: '\u2FF1\u4EBA\u4EBA',
      components_historical: ['\u4EBA', '\u4EBA'],
      definition: 'Double person component, appears in 傘',
    },
    {
      character: '\uD85C\uDC47',
      decomposition: '\u2FF1\u5344\u2FF8\u5382\u7528',
      components_historical: ['\u5344', '\u5382', '\u7528'],
      definition: 'Component cluster used in 備',
    },
  ];

  for (const row of rows) {
    const { data, error } = await supabase.from('character_breakdowns_v2').upsert(row).select();
    if (error) console.error('Error:', error.message);
    else console.log('OK:', JSON.stringify(data));
  }

  const { count } = await supabase.from('character_breakdowns_v2').select('*', { count: 'exact', head: true });
  console.log('Total rows:', count);
}

insert().catch(console.error);
