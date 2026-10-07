import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

// Specifically crafted beginner-friendly hooks for characters that were overly long,
// purple-prose, or had dangling props.
export const CURATED_SIMPLICITY_REPAIRS: Record<string, { hook: string; targetDisplayLabel?: string }> = {
  新: {
    hook: 'Your 亲(parents) craft a gift with a sharp 斤(axe), making it fresh and brand 新(new) — 亲 lends the sound (qīn -> xīn).',
    targetDisplayLabel: 'new',
  },
  們: {
    hook: 'A welcoming 亻(person) at the 門(door) unites a group of friends together as 們(plural marker) — 門 lends the sound (mén -> men).',
    targetDisplayLabel: 'plural marker',
  },
  問: {
    hook: 'At the 門(door) you open your 口(mouth) to politely 問(ask) directions — 門 lends the sound (mén -> wèn).',
    targetDisplayLabel: 'ask',
  },
  課: {
    hook: 'Words of spoken 言(speech) bear fruitful 果(fruit) learning in every school 課(subject) — 果 lends the sound (guǒ -> kè).',
    targetDisplayLabel: 'subject',
  },
  渴: {
    hook: 'With no 氵(water) left, a parched throat asks 曷(what) to drink when feeling 渴(thirsty) — 曷 lends the sound (hé -> kě).',
    targetDisplayLabel: 'thirsty',
  },
  鐘: {
    hook: 'Chimes of 金(gold) tell the playing 童(child) to check the hour on the wall 鐘(clock) — 童 lends the sound (tóng -> zhōng).',
    targetDisplayLabel: 'clock',
  },
  飯: {
    hook: 'Turning warm 飠(food) over on its 反(reverse) side in the pan prepares a hot 飯(meal) — 反 lends the sound (fǎn -> fàn).',
    targetDisplayLabel: 'meal',
  },
  妹: {
    hook: 'A young 女(woman) who is 未(not yet) grown up is your dear little 妹(younger sister) — 未 lends the sound (wèi -> mèi).',
    targetDisplayLabel: 'younger sister',
  },
  巧: {
    hook: 'Careful hand 工(work) bending a delicate 丂(kǎo) hook takes truly 巧(skillful) craft — 丂 lends the sound (kǎo -> qiǎo).',
    targetDisplayLabel: 'skillful',
  },
  跟: {
    hook: 'A stepping 足(foot) lands firmly on the tough 艮(gèn) bone of your 跟(heel) — 艮 lends the sound (gèn -> gēn).',
    targetDisplayLabel: 'heel',
  },
  過: {
    hook: 'A steady 辶(movement) guides you past a crooked 咼(guō) road as you safely 過(pass) on — 咼 lends the sound (guō -> guò).',
    targetDisplayLabel: 'pass',
  },
  哥: {
    hook: 'An able 可(kě) youth stands tall above his siblings as their dependable 哥(elder brother) — 可 lends the sound (kě -> gē).',
    targetDisplayLabel: 'elder brother',
  },
  近: {
    hook: 'One quick 辶(movement) with a 斤(axe) reaches a target standing right 近(near) to you — 斤 lends the sound (jīn -> jìn).',
    targetDisplayLabel: 'near',
  },
  該: {
    hook: 'Spoken words of 言(speech) remind a resting 亥(covered person) of duties they 該(should) do — 亥 lends the sound (hài -> gāi).',
    targetDisplayLabel: 'should',
  },
  學: {
    hook: 'Two 𦥑(hands) over a desk 冖(cover) guide counting 爻(crossed sticks) for an eager 子(child) to 學(learn).',
    targetDisplayLabel: 'learn',
  },
  人: {
    hook: 'Two legs stride forward across the ground as an upright 人(person).',
    targetDisplayLabel: 'person',
  },
  水: {
    hook: 'A central stream rushes between splashing droplets of cool freshwater: 水(water).',
    targetDisplayLabel: 'water',
  },
  來: {
    hook: 'A 木(tree) gives shade where travelers 从(follow) the path to 來(come) rest.',
    targetDisplayLabel: 'come',
  },
  歲: {
    hook: 'Steps 止(stop) past a guard 戌(halberd), leaving a 𣥂(footprint) as one ages a year: 歲(measure word for age).',
    targetDisplayLabel: 'measure word for age',
  },
  覺: {
    hook: 'Hands lift the bed 冖(cover) as waking eyes 見(see) the sunlight, leaving you alert and 覺(conscious).',
    targetDisplayLabel: 'conscious',
  },
  忙: {
    hook: 'When too many chores make your racing 忄(heart) ready to 亡(perish), you are far too 忙(busy) to rest.',
    targetDisplayLabel: 'busy',
  },
  一: {
    hook: 'A single horizontal stroke stretches unbroken across the page: the number 一(one).',
    targetDisplayLabel: 'one',
  },
  心: {
    hook: 'Three droplets surround a curving chamber as a beating human 心(heart).',
    targetDisplayLabel: 'heart',
  },
  牛: {
    hook: 'Two curved horns branch above a grazing snout on a sturdy farm 牛(cow).',
    targetDisplayLabel: 'cow',
  },
  會: {
    hook: 'Guests 亼(gather) around a shared 囗(box) at the feast, celebrating as a grand crowd 會(assemble).',
    targetDisplayLabel: 'assemble',
  },
  得: {
    hook: 'Walking with each 彳(step) shows how an action goes, using the 㝵(dé) cue to assess: 得(complement marker).',
    targetDisplayLabel: 'complement marker',
  },
  興: {
    hook: 'Two 𦥑(hands) lift 一(one) banner while 八(eight) partners work in 同(same) harmony to make trade 興(thrive).',
    targetDisplayLabel: 'thrive',
  },
  長: {
    hook: 'Braided hair tied past 一(one) band sweeps down round a 𠄌(hooked corner) to form an elegant, 長(long) strand.',
    targetDisplayLabel: 'long',
  },
  望: {
    hook: 'Lest all hope 亡(perish), a scout lifts a 𠂊(bound hand) over cold ⺀(ice) and 土(earth) to 望(expect) aid.',
    targetDisplayLabel: 'expect',
  },
  罩: {
    hook: 'A wide 罒(net) draped over tall 卓(profound) jars forms a protective 罩(cover) to keep dust away.',
    targetDisplayLabel: 'cover',
  },
  身: {
    hook: 'A standing figure with a rounded torso and outstretched leg depicts the human 身(body).',
    targetDisplayLabel: 'body',
  },
  忘: {
    hook: 'When memories fade and 亡(perish) from a healing 心(heart), you finally let go and 忘(forget) the past.',
    targetDisplayLabel: 'forget',
  },
  已: {
    hook: 'A coiled loop snapped shut like a finished knot shows the cycle is 已(already) done.',
    targetDisplayLabel: 'already',
  },
  母: {
    hook: 'Cradling her child tenderly within two dots of milk, a loving figure is a 母(mother).',
    targetDisplayLabel: 'mother',
  },
  世: {
    hook: 'Three stems branch across thirty years, joining hands across the changing 世(world).',
    targetDisplayLabel: 'world',
  },
  慶: {
    hook: 'In a 广(broad) hall, with a glad 心(heart), take a 夊(slow step) to warmly 慶(congratulate) a winning friend.',
    targetDisplayLabel: 'congratulate',
  },
  贏: {
    hook: 'A 吂(speechless) runner by the 月(moon) takes 貝(sea shell) coin as 卂(fly rapidly) flags hail the 贏(win).',
    targetDisplayLabel: 'win',
  },
  報: {
    hook: 'A grant of royal 幸(favor) stamped with a 卩(seal) is carried out 又(again) to proudly 報(announce) good news.',
    targetDisplayLabel: 'announce',
  },

  // Alignment fixes for the 10 strictHookAudit items:
  麼: {
    hook: 'Fibers of 麻(hemp) spun into a tiny 幺(small) thread add a softening 麼(suffix) tone.',
    targetDisplayLabel: 'suffix',
  },
  呢: {
    hook: 'A 口(mouth) rests beside 尼(nun), its ní sound softening to ne → 呢(how-about particle).',
    targetDisplayLabel: 'how-about particle',
  },
  做: {
    hook: 'A diligent 亻(person) acting with a clear 故(reason) steps up to 做(do) it.',
    targetDisplayLabel: 'do',
  },
  朵: {
    hook: 'A 几(table) of 朩(split wood) holds one small 朵(blossom).',
    targetDisplayLabel: 'blossom',
  },
  淇: {
    hook: 'Clear flowing 氵(water) alongside that 其(other) bank gives cool ice cream refreshment in the 淇(river).',
    targetDisplayLabel: 'river',
  },
  吧: {
    hook: 'A speaking 口(mouth) expressing strong 巴(desire) adds a polite 吧(suggestion) to urge consent.',
    targetDisplayLabel: 'suggestion',
  },
  棟: {
    hook: 'Stout 木(tree) timbers aligned toward the 東(east) support the roof 棟(pillar).',
    targetDisplayLabel: 'pillar',
  },
  隻: {
    hook: 'A hunter clutching a captured 隹(bird) reaches 又(again) for another 隻(single) quarry.',
    targetDisplayLabel: 'single',
  },
  作: {
    hook: 'A skilled 亻(person) making the 乍(first) strike begins to 作(do) their craft.',
    targetDisplayLabel: 'do',
  },
  份: {
    hook: 'A diligent 亻(person) who took their 分(divide) of duties now fulfills their 份(copy).',
    targetDisplayLabel: 'copy',
  },
};

export function remakeBookOne(): void {
  console.log('[REMAKE] Starting Book 1 memory hook overhaul...');

  // 1. Restore clean word hooks from HEAD
  console.log('[1/4] Restoring clean compound word hooks from HEAD...');
  const headPackRaw = execSync('git show HEAD:public/data/memory-hooks/book-1.json', {
    maxBuffer: 20 * 1024 * 1024,
    encoding: 'utf8',
  });
  const headPack = JSON.parse(headPackRaw) as {
    items: Array<{ id: string; character: string; mnemonic: string; content_type: string }>;
  };
  const headWordMap = new Map(
    headPack.items.filter((i) => i.content_type === 'word').map((i) => [i.character, i.mnemonic]),
  );
  const headCharMap = new Map(
    headPack.items.filter((i) => i.content_type === 'character').map((i) => [i.character, i.mnemonic]),
  );

  const wordPath = resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json');
  const wordData = JSON.parse(readFileSync(wordPath, 'utf8')) as {
    records: Array<{ word: string; hook: string | null; acceptance: string }>;
  };
  let wordsRestored = 0;
  for (const r of wordData.records) {
    const cleanHook = headWordMap.get(r.word);
    if (cleanHook && r.hook !== cleanHook) {
      r.hook = cleanHook;
      r.acceptance = 'clean';
      wordsRestored++;
    }
  }
  writeFileSync(wordPath, JSON.stringify(wordData, null, 2) + '\n');
  console.log(`  Restored ${wordsRestored} word hooks in ${wordPath}`);

  // 2. Overhaul character hooks
  console.log('[2/4] Overhauling character hooks for simplicity & beginner friendliness...');
  const charPath = resolve(OUTPUT_DIR, 'book-1-hooks-v3.json');
  const charData = JSON.parse(readFileSync(charPath, 'utf8')) as {
    records: Array<{
      character: string;
      hook: string | null;
      targetDisplayLabel?: string;
      acceptance: string;
    }>;
  };

  let charsUpdated = 0;
  for (const r of charData.records) {
    const ch = r.character;

    // First check custom simplicity repairs
    if (CURATED_SIMPLICITY_REPAIRS[ch]) {
      const repair = CURATED_SIMPLICITY_REPAIRS[ch];
      r.hook = repair.hook;
      if (repair.targetDisplayLabel) {
        r.targetDisplayLabel = repair.targetDisplayLabel;
      }
      r.acceptance = 'clean';
      charsUpdated++;
      continue;
    }

    // Otherwise, if this character had a clunky override applied, restore the clean HEAD hook
    const headHook = headCharMap.get(ch);
    if (headHook && r.hook !== headHook) {
      r.hook = headHook;
      r.acceptance = 'clean';
      charsUpdated++;
    }
  }

  // Ensure targetDisplayLabel matches the hook's target token for all characters
  for (const r of charData.records) {
    if (!r.hook) continue;
    const match = r.hook.match(new RegExp(`${r.character}\\(([^)]+)\\)[^)]*$`));
    if (match) {
      r.targetDisplayLabel = match[1];
    }
  }

  writeFileSync(charPath, JSON.stringify(charData, null, 2) + '\n');
  console.log(`  Overhauled ${charsUpdated} character hooks in ${charPath}`);

  // 3. Export pack
  console.log('[3/4] Exporting memory hook pack for Book 1...');
  execSync('npx tsx scripts/memory-hooks/exportHookPack.ts --book 1', { cwd: ROOT, stdio: 'inherit' });

  console.log('[4/4] Remake complete.');
}

if (process.argv[1] && process.argv[1].endsWith('remakeBookOneHooks.ts')) {
  remakeBookOne();
}
