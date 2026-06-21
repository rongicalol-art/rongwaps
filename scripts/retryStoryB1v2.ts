import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const SYSTEM = `You are a Chinese character etymology expert. Write a short story mnemonic (2-4 sentences) for each character explaining its REAL historical origin. Bold each component: **meaning** (character). End connecting to modern meaning. One character per block, blank line between blocks.`;

async function llm(user: string): Promise<string> {
  // Try OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    for (const model of ['openai/gpt-oss-120b:free','qwen/qwen3-32b:free']) {
      for (let a = 0; a < 3; a++) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method:'POST', headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json'},
            body:JSON.stringify({model,messages:[{role:'system',content:SYSTEM},{role:'user',content:user}],temperature:0.3,max_tokens:1500})
          });
          if (r.ok) { const j = await r.json(); const t = j.choices?.[0]?.message?.content?.trim()||''; if (t.length>20) return t; }
          if (r.status===429) { await sleep((a+1)*10000); continue; }
          break;
        } catch { await sleep(3000); }
      }
    }
  }
  // Fallback Gemini
  if (process.env.GEMINI_API_KEY) {
    for (const model of ['gemini-2.0-flash','gemini-2.5-flash']) {
      try {
        const {GoogleGenAI} = await import('@google/genai');
        const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
        const res = await ai.models.generateContent({model,contents:user,config:{systemInstruction:SYSTEM,temperature:0.3}});
        const t = res?.text?.trim()||''; if (t.length>20) return t;
      } catch { }
    }
  }
  throw new Error('All models failed');
}

function parse(resp: string): Array<{char:string,mnemonic:string}> {
  const r: Array<{char:string,mnemonic:string}> = [];
  for (const block of resp.split(/\n\s*\n/)) {
    const lines = block.trim().split('\n').filter(l=>l.trim());
    if (lines.length<2) continue;
    const first = lines[0].trim().replace(/\*\*/g,'').trim();
    if (/^[\u4e00-\u9fa5]$/.test(first)) {
      const m = lines.slice(1).join(' ').trim();
      if (m.length>10) r.push({char:first,mnemonic:m});
    }
  }
  return r;
}

async function main() {
  const BATCH = 3, DELAY = 2000;
  console.log('\n╔══════════════════════════════════════════════╗\n║   Retry Failed B1 Story Mnemonics (v2)       ║\n╚══════════════════════════════════════════════╝\n');

  const all: any[] = []; let vO = 0;
  while(true) { const {data} = await supabase.from('book_vocabulary').select('id,traditional,simplified').range(vO,vO+999); if(!data||!data.length)break; all.push(...data); if(data.length<1000)break; vO+=1000; }
  const b1 = new Set<string>();
  for(const v of all.filter(v=>v.id.startsWith('B1'))) for(const c of (v.traditional||v.simplified||'')) if(/[\u4e00-\u9fa5]/.test(c)) b1.add(c);
  const {data:ex} = await supabase.from('mnemonics').select('character').eq('content_type','story');
  const exSet = new Set(ex?.map((e:any)=>e.character)||[]);
  const miss = [...b1].filter(c=>!exSet.has(c));
  console.log(`Missing: ${miss.length}\n`);
  if(!miss.length){console.log('All done!');return;}

  const {data:bds} = await supabase.from('character_breakdowns').select('character,definition,decomposition').in('character',miss);
  const bdM = new Map(); if(bds) for(const b of bds) bdM.set(b.character,b);

  let ok=0, fail=0, tot=miss.length, t0=Date.now();

  for(let i=0;i<miss.length;i+=BATCH) {
    const batch = miss.slice(i,i+BATCH);
    let p = `Generate story mnemonics for:\n\n`;
    for(const c of batch){ const bd=bdM.get(c); p+=`${c} | ${bd?.definition||''} | ${bd?.decomposition||''}\n`; }
    p+='\nOne char per block, blank line between.';

    try {
      const resp = await llm(p);
      const parsed = parse(resp);
      for(const p of parsed) {
        const {error} = await supabase.from('mnemonics').upsert({id:`story_${p.char}`,character:p.char,mnemonic:p.mnemonic,content_type:'story'});
        if(error){console.log(`  ✗ ${p.char}: ${error.message}`);fail++;}
        else{ok++;console.log(`\n✓ ${p.char}\n${p.mnemonic}\n`);}
        await sleep(300);
      }
      const un = batch.length-parsed.length;
      if(un>0){fail+=un;for(const c of batch)if(!parsed.find(p=>p.char===c))console.log(`  ✗ ${c}: parse fail`);}
    } catch(e:any){console.log(`  ✗ [batch] ${e.message}`);fail+=batch.length;}

    console.log(`── ${Math.round(((i+batch.length)/tot)*100)}% (${ok} ok, ${fail} fail) ──\n`);
    if(i+BATCH<miss.length) await sleep(DELAY);
  }

  console.log(`\n═══════════════════════════════════════\n  DONE: ${ok} ok, ${fail} fail in ${((Date.now()-t0)/60000).toFixed(1)}min\n═══════════════════════════════════════\n`);
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1);});
