import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const SYSTEM = `You are a Chinese character etymology expert. For each character, write a story-style mnemonic (2-4 sentences) that helps learners remember the character.

PRIORITY:
1. Tell the REAL etymology story — the actual historical/cultural reason ancient Chinese created this character. This is the most important part.
2. Naturally weave in the listed character components as part of the story. Bold each component's meaning: **meaning** (character).
3. If a listed component doesn't match the real etymology, ignore it and use your own knowledge. Real accuracy always wins over forced component matching.

RULES:
- Make it vivid — paint a picture of ancient life
- Keep it 2-4 sentences
- Bold each component's English meaning and write its Chinese character in parentheses: **meaning** (character)
- The story should feel natural, not forced. Components should fit organically into the real etymology.
- Write ENTIRELY in English. No Chinese in the story text (only in bold markers).

Output format: Start each block with the single Chinese character on its own line, followed by the story on subsequent lines. Separate blocks with a blank line.`;

async function llm(user: string): Promise<string> {
  // Primary: Gemini 2.5 Flash Lite (no daily limit)
  if (process.env.GEMINI_API_KEY) {
    for (const model of ['models/gemini-2.5-flash-lite', 'models/gemini-2.5-flash', 'models/gemini-2.0-flash']) {
      for (let a = 0; a < 3; a++) {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const res = await ai.models.generateContent({ model, contents: user, config: { systemInstruction: SYSTEM, temperature: 0.3 } });
          const t = res?.text?.trim() || '';
          if (t.length > 20) return t;
          break;
        } catch (err: any) {
          const msg = err?.message || '';
          if (msg.includes('503') || msg.includes('UNAVAILABLE')) { console.log(`  [Gemini ${model}] overloaded, retry ${a+1}/3...`); await sleep(20000); continue; }
          if (msg.includes('429') || msg.includes('quota')) { break; }
          console.log(`  [Gemini ${model}] ${msg.slice(0,60)}`); break;
        }
      }
    }
  }
  // Fallback: OWL Alpha via OpenRouter (free, 200 req/day limit)
  if (process.env.OPENROUTER_API_KEY) {
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'openrouter/owl-alpha', messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], temperature: 0.3, max_tokens: 2000 }),
        });
        if (r.ok) { const j = await r.json(); const t = j.choices?.[0]?.message?.content?.trim() || ''; if (t.length > 20) return t; }
        if (r.status === 429) { await sleep((a + 1) * 10000); continue; }
        break;
      } catch (err: any) { console.log(`  [OWL Alpha] ${err.message?.slice(0,60)}`); await sleep(3000); }
    }
  }
  throw new Error('All models failed');
}

function parse(resp: string): Array<{ char: string; mnemonic: string }> {
  const results: Array<{ char: string; mnemonic: string }> = [];
  const lines = resp.split('\n');
  let currentChar = '', currentText = '';
  for (const line of lines) {
    const trimmed = line.trim();
    const clean = trimmed.replace(/\*\*/g, '').trim();
    if (/^[\u4e00-\u9fa5]$/.test(clean)) {
      if (currentChar && currentText.trim()) results.push({ char: currentChar, mnemonic: currentText.trim() });
      currentChar = clean; currentText = '';
    } else if (currentChar && trimmed) { currentText += trimmed + ' '; }
  }
  if (currentChar && currentText.trim()) results.push({ char: currentChar, mnemonic: currentText.trim() });
  return results;
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text.replace(/\*\*/g, '').replace(/\([^\)]+\)/g, ''));
}

// Common radical/component names not in breakdowns table
const CN: Record<string, string> = {
  '氵':'water',
  '冫':'ice',
  '灬':'fire',
  '火':'fire',
  '木':'tree/wood',
  '糹':'silk',
  '纟':'silk',
  '金':'metal/gold',
  '钅':'metal',
  '土':'earth',
  '石':'stone',
  '山':'mountain',
  '田':'field',
  '日':'sun/day',
  '月':'moon/month',
  '雨':'rain',
  '风':'wind',
  '口':'mouth',
  '目':'eye',
  '耳':'ear',
  '心':'heart',
  '忄':'heart',
  '手':'hand',
  '扌':'hand',
  '足':'foot',
  '⻊':'foot',
  '人':'person',
  '亻':'person',
  '女':'woman',
  '子':'child',
  '老':'old',
  '大':'big',
  '小':'small',
  '一':'one',
  '二':'two',
  '三':'three',
  '十':'ten',
  '百':'hundred',
  '千':'thousand',
  '王':'king',
  '玉':'jade',
  '力':'power',
  '刀':'knife',
  '刂':'knife',
  '弓':'bow',
  '戈':'spear/halberd',
  '斤':'axe',
  '矢':'arrow',
  '网':'net',
  '罒':'net',
  '门':'gate/door',
  '門':'gate/door',
  '户':'door',
  '穴':'cave/hole',
  '宀':'roof/house',
  '冖':'cover',
  '广':'shelter',
  '厂':'cliff',
  '彡':'hair/brush',
  '攵':'strike/tap',
  '欠':'yawn/lack',
  '止':'stop/foot',
  '走':'walk/run',
  '辶':'walk/move',
  '廴':'long walk',
  '彳':'step',
  '尸':'body',
  '身':'body',
  '骨':'bone',
  '肉':'meat/flesh',
  '巾':'cloth',
  '衣':'clothing',
  '衤':'clothing',
  '食':'food/eat',
  '饣':'food/eat',
  '酉':'wine/alcohol',
  '米':'rice',
  '牛':'cow/ox',
  '羊':'sheep',
  '马':'horse',
  '馬':'horse',
  '鸟':'bird',
  '鳥':'bird',
  '鱼':'fish',
  '魚':'fish',
  '虫':'insect',
  '犬':'dog',
  '犭':'dog/animal',
  '龙':'dragon',
  '龍':'dragon',
  '白':'white',
  '黑':'black',
  '赤':'red',
  '黄':'yellow',
  '青':'green/blue',
  '工':'work',
  '己':'self',
  '已':'already',
  '幺':'tiny/one',
  '川':'river',
  '水':'water',
  '谷':'valley',
  '回':'return',
  '各':'each',
  '旦':'dawn',
  '寸':'inch',
  '比':'compare',
  '上':'up',
  '下':'down',
  '中':'middle',
  '内':'inside',
  '外':'outside',
  '左':'left',
  '右':'right',
  '前':'front',
  '后':'behind',
  '後':'behind',
  '今':'now',
  '古':'ancient',
  '明':'bright',
  '早':'early',
  '晚':'late',
  '生':'life',
  '死':'death',
  '少':'few/young',
  '长':'long',
  '長':'long',
  '短':'short',
  '高':'tall',
  '低':'low',
  '新':'new',
  '旧':'old/former',
  '来':'come',
  '來':'come',
  '去':'go',
  '出':'exit',
  '入':'enter',
  '开':'open',
  '開':'open',
  '关':'close',
  '關':'close',
  '合':'join/close',
  '有':'have',
  '无':'not have',
  '無':'not have',
  '没':'not have',
  '沒':'not have',
  '是':'is/yes',
  '不':'not/no',
  '非':'not/wrong',
  '未':'not yet',
  '也':'also',
  '又':'again',
  '再':'again',
  '很':'very',
  '太':'too',
  '最':'most',
  '会':'can',
  '會':'can',
  '能':'able',
  '可':'may',
  '要':'want',
  '想':'think/want',
  '知':'know',
  '道':'way',
  '看':'see',
  '見':'see',
  '听':'hear',
  '聽':'hear',
  '说':'speak',
  '說':'speak',
  '话':'speech',
  '話':'speech',
  '语':'language',
  '語':'language',
  '读':'read',
  '讀':'read',
  '写':'write',
  '寫':'write',
  '字':'character',
  '书':'book',
  '書':'book',
  '文':'writing',
  '那':'that',
  '这':'this',
  '這':'this',
  '哪':'which',
  '什':'what',
  '么':'what',
  '麼':'what',
  '谁':'who',
  '誰':'who',
  '把':'hold',
  '给':'give',
  '給':'give',
  '用':'use',
  '以':'by',
  '从':'from',
  '從':'from',
  '向':'toward',
  '对':'toward',
  '對':'toward',
  '和':'and/with',
  '跟':'with',
  '同':'same/together',
  '与':'and/with',
  '與':'and/with',
  '但':'but',
  '而':'and/but',
  '或':'or',
  '着':'continuous',
  '著':'famous',
  '了':'completed',
  '过':'past',
  '過':'pass',
  '得':'obtain',
  '地':'adverb',
  '的':'possessive',
  '吗':'question',
  '嗎':'question',
  '呢':'question',
  '吧':'suggestion',
  '请':'please',
  '請':'please',
  '谢':'thank',
  '謝':'thank',
  '先':'first',
  '然':'so',
  '才':'only then',
  '刚':'just',
  '剛':'just',
  '曾':'once',
  '正':'right',
  '在':'at/in',
  '每':'each',
  '都':'all',
  '还':'still',
  '還':'still',
  '就':'then',
  '只':'only',
  '仅':'only',
  '僅':'only',
  '真':'real/true',
  '假':'fake',
  '错':'wrong',
  '錯':'wrong',
  '难':'difficult',
  '難':'difficult',
  '易':'easy',
  '快':'fast',
  '慢':'slow',
  '迟':'late',
  '遲':'late',
  '远':'far',
  '遠':'far',
  '近':'near',
  '深':'deep',
  '浅':'shallow',
  '淺':'shallow',
  '轻':'light',
  '輕':'light',
  '重':'heavy',
  '厚':'thick',
  '薄':'thin',
  '干':'dry',
  '乾':'dry',
  '湿':'wet',
  '濕':'wet',
  '净':'clean',
  '淨':'clean',
  '空':'empty/sky',
  '满':'full',
  '滿':'full',
  '实':'real',
  '實':'real',
  '安':'safe',
  '危':'danger',
  '稳':'stable',
  '穩':'stable',
  '冷':'cold',
  '热':'hot',
  '熱':'hot',
  '凉':'cool',
  '涼':'cool',
  '暖':'warm',
  '亮':'bright',
  '暗':'dark',
  '阴':'shade',
  '陰':'shade',
  '阳':'bright',
  '陽':'bright',
  '静':'quiet',
  '靜':'quiet',
  '闹':'noisy',
  '鬧':'noisy',
  '打':'hit',
  '做':'do',
  '作':'do',
  '办':'handle',
  '辦':'handle',
  '吃':'eat',
  '喝':'drink',
  '穿':'wear',
  '住':'live',
  '睡':'sleep',
  '醒':'wake',
  '梦':'dream',
  '夢':'dream',
  '笑':'laugh',
  '哭':'cry',
  '怒':'angry',
  '怕':'fear',
  '敢':'dare',
  '爱':'love',
  '愛':'love',
  '恨':'hate',
  '喜':'joy',
  '乐':'happy',
  '樂':'happy',
  '忙':'busy',
  '闲':'idle',
  '閒':'idle',
  '累':'tired',
  '饿':'hungry',
  '餓':'hungry',
  '病':'sick',
  '痛':'pain',
  '伤':'wound',
  '傷':'wound',
  '命':'life/fate',
  '运':'luck',
  '運':'luck',
  '钱':'money',
  '錢':'money',
  '贵':'expensive',
  '貴':'expensive',
  '买':'buy',
  '買':'buy',
  '卖':'sell',
  '賣':'sell',
  '店':'shop',
  '市':'market',
  '车':'car',
  '車':'car',
  '船':'boat',
  '飞':'fly',
  '飛':'fly',
  '路':'road',
  '街':'street',
  '房':'house',
  '屋':'house',
  '室':'room',
  '厅':'hall',
  '廳':'hall',
  '楼':'building',
  '樓':'building',
  '灯':'light',
  '燈':'light',
  '机':'machine',
  '機':'machine',
  '器':'tool',
  '菜':'dish',
  '蛋':'egg',
  '奶':'milk',
  '茶':'tea',
  '酒':'alcohol',
  '糖':'sugar',
  '盐':'salt',
  '鹽':'salt',
  '油':'oil',
  '面':'noodle',
  '麵':'noodle',
  '饭':'meal',
  '飯':'meal',
  '汤':'soup',
  '湯':'soup',
  '花':'flower',
  '草':'grass',
  '树':'tree',
  '樹':'tree',
  '叶':'leaf',
  '葉':'leaf',
  '根':'root',
  '森':'forest',
  '海':'sea',
  '河':'river',
  '湖':'lake',
  '江':'river',
  '岛':'island',
  '島':'island',
  '云':'cloud',
  '雲':'cloud',
  '雾':'fog',
  '霧':'fog',
  '雪':'snow',
  '星':'star',
  '天':'sky',
  '国':'country',
  '國':'country',
  '城':'city',
  '村':'village',
  '镇':'town',
  '鎮':'town',
  '校':'school',
  '课':'lesson',
  '課':'lesson',
  '试':'test',
  '試':'test',
  '考':'exam',
  '题':'question',
  '題':'question',
  '年':'year',
  '岁':'age',
  '歲':'age',
  '周':'week',
  '週':'week',
  '礼':'ritual',
  '禮':'ritual',
  '义':'justice',
  '義':'justice',
  '德':'virtue',
  '平':'peace',
  '公':'fair',
  '法':'law',
  '理':'reason',
  '规':'rule',
  '規':'rule',
  '成':'become',
  '败':'fail',
  '敗':'fail',
  '胜':'win',
  '勝':'win',
  '进':'advance',
  '進':'advance',
  '退':'retreat',
  '起':'rise',
  '落':'fall',
  '加':'add',
  '减':'decrease',
  '減':'decrease',
  '常':'often',
  '总':'always',
  '總':'always',
  '经':'already',
  '經':'already',
  '自':'self',
  '到':'arrive',
  '为':'for',
  '為':'for',
  '如':'like',
  '像':'resemble',
  '似':'similar',
  '随':'follow',
  '隨':'follow',
  '除':'except',
  '由':'from',
  '于':'at',
  '時':'time',
  '时':'time',
  '間':'between',
  '间':'between',
  '之':'of',
  '裡':'inside',
  '里':'inside',
  '边':'side',
  '邊':'side',
  '东':'east',
  '西':'west',
  '南':'south',
  '北':'north',
  '⺈':'knife',
  '彐':'snout',
  '耂':'old',
  '虍':'tiger',
  '豕':'pig',
  '廿':'twenty',
  '爫':'claw',
  '丿':'slash',
  '㠯':'use',
  '帀':'rotate',
  '丱':'hair tufts',
  '乂':'cut',
  '亅':'hook',
  '乚':'turn',
  '亠':'cover',
  '冂':'boundary',
  '凵':'container',
  '匚':'box',
  '卩':'seal',
  '丬':'split wood',
  '丩':'join',
  '夂':'go slowly',
  '屮':'sprout',
  '巛':'river',
  '幵':'even',
  '彑':'snout',
  '戉':'axe',
};

const RADICAL_RE = /[\u2FF0-\u2FFF]/g;

function resolveDecomp(decomp: string, compMap: Map<string, string>): string {
  if (!decomp || decomp === '？' || decomp === '?') return '(no decomposition)';
  const chars = [...decomp.replace(RADICAL_RE, '')].filter(c => c.trim());
  if (!chars.length) return '(no decomposition)';
  return chars.map(c => {
    const def = compMap.get(c) || CN[c];
    return def ? `${c} (${def})` : c;
  }).join(' + ');
}

async function main() {
  const BATCH = 5, DELAY = 1000;
  const bookArg = process.argv[2] || 'ALL';

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   Story Mnemonic Generator (Gemini 2.5 Flash) ║`);
  console.log(`║   Book: ${bookArg.padEnd(34)} ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Get vocab
  const all: any[] = [];
  let vO = 0;
  while (true) {
    const { data } = await supabase.from('book_vocabulary').select('id,traditional,simplified').range(vO, vO + 999);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    vO += 1000;
  }
  const vocab = bookArg === 'ALL' ? all : all.filter(v => v.id.startsWith(bookArg));

  // Extract unique chars
  const charSet = new Set<string>();
  for (const v of vocab) for (const c of (v.traditional || v.simplified || '')) if (/[\u4e00-\u9fa5]/.test(c)) charSet.add(c);

  // Delete ALL existing story mnemonics first for clean regeneration
  console.log('Deleting existing story mnemonics...');
  const { data: oldStories } = await supabase.from('mnemonics').select('id').eq('content_type', 'story');
  if (oldStories && oldStories.length > 0) {
    for (const s of oldStories) {
      await supabase.from('mnemonics').delete().eq('id', s.id);
    }
    console.log(`Deleted ${oldStories.length} old story mnemonics.\n`);
  }

  // All chars need regeneration now
  const queue = [...charSet];

  console.log(`Total chars: ${charSet.size} | Need regeneration: ${queue.length}\n`);
  if (!queue.length) { console.log('All done!'); return; }

  // Fetch breakdowns for queue chars
  const { data: bds } = await supabase.from('character_breakdowns').select('character,definition,decomposition').in('character', queue);
  const bdM = new Map();
  if (bds) for (const b of bds) bdM.set(b.character, b);

  // Build component->definition lookup from ALL breakdowns
  const { data: allBds } = await supabase.from('character_breakdowns').select('character,definition');
  const compMap = new Map();
  if (allBds) for (const b of allBds) if (b.character && b.definition) compMap.set(b.character, b.definition);

  let ok = 0, fail = 0, tot = queue.length, t0 = Date.now();

  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH);
    let p = `Generate story-style mnemonics for these ${batch.length} characters.\n\nTell the REAL etymology story for each character. Use the listed components as a guide — weave them naturally into the story. If a component doesn't match the real etymology, use your own knowledge instead.\n\n`;
    for (const c of batch) {
      const bd = bdM.get(c);
      p += `${c} | meaning: ${bd?.definition || ''} | components: ${resolveDecomp(bd?.decomposition || '', compMap)}\n`;
    }
    p += '\nWrite ENTIRELY in English. One char per block, blank line between blocks.';

    try {
      const resp = await llm(p);
      const parsed = parse(resp);
      for (const item of parsed) {
        await supabase.from('mnemonics').delete().eq('id', `story_${item.char}`);
        const { error } = await supabase.from('mnemonics').insert({ id: `story_${item.char}`, character: item.char, mnemonic: item.mnemonic, content_type: 'story' });
        if (error) { console.log(`  ✗ ${item.char}: ${error.message}`); fail++; }
        else { ok++; console.log(`\n✓ ${item.char}\n${item.mnemonic}\n`); }
        await sleep(300);
      }
      const un = batch.length - parsed.length;
      if (un > 0) { fail += un; for (const c of batch) if (!parsed.find(x => x.char === c)) console.log(`  ✗ ${c}: parse fail`); }
    } catch (e: any) { console.log(`  ✗ [batch] ${e.message}`); fail += batch.length; }

    console.log(`── ${Math.round(((i + batch.length) / tot) * 100)}% (${ok} ok, ${fail} fail) ──\n`);
    if (i + BATCH < queue.length) await sleep(DELAY);
  }

  console.log(`\n═══════════════════════════════════════\n  DONE: ${ok} ok, ${fail} fail in ${((Date.now() - t0) / 60000).toFixed(1)}min\n═══════════════════════════════════════\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
