import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { scanRenderSafety, analyzeCoverage } from './checkHookQuality';
import { auditSingleHook } from './strictHookAudit';
import { buildTaughtSenses, findAlignmentFindings } from './checkComponentLabelAlignment';
import { findOrderMismatches } from './checkComponentOrder';
import { loadRuntimeDirectComponents } from './runtimeIndex';
import { STANDARD_RADICAL_ALIASES } from './standardAliases';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PHASE4_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');

function argumentValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : fallback;
}

export interface CharRecord {
  character: string;
  meaning: string | null;
  meaningSource: string;
  pinyin: string | null;
  strategy: string;
  hook: string | null;
  componentsUsed: Array<{ glyph: string; label: string }>;
  parts: Array<{
    glyph: string;
    suggestedLabel: string | null;
    glosses: string[];
    readings?: string[];
    aliases?: string[];
  }>;
  reason: string | null;
  acceptance: string;
  validation: { valid: boolean; issues: string[] };
  attempts: number;
  model: string;
  promptVersion: string;
}

// Banned fantasy / purple-prose phrases that distract from actual component decomposition
export const BANNED_FANTASY_PATTERNS = [
  /wild boar duels/i,
  /duels fiercely against/i,
  /screams at its face in the mirror/i,
  /rare beast takes a/i,
  /clod rests in a 鬼/i,
  /magic demon/i,
  /sorcerer/i,
  /enchanted fairy/i,
  /celestial duel/i,
];

// Curated sound component & grounded replacements for Book 3
export const BOOK_3_CHAR_OVERRIDES: Record<string, string> = {
  '適': 'Stepping forward with steady 辶(movement) while carrying an armful of grain 啇(stalk) to find an exact 適(match), with 啇(stalk) as the sound component (dí -> shì).',
  '糊': 'Stirring sticky 米(rice) in the pot so 胡(recklessly) that it melts into a thick paste leaves thoughts all 糊(muddled), with 胡(recklessly) as the sound component (hú).',
  '觸': 'A beetle arches its sharp 角(angle) horn to ram a crawling 蜀(caterpillar) in a head-on 觸(butt), with 蜀(caterpillar) as the sound component (shǔ -> chù).',
  '劇': 'Actors stage an epic hunt where hunters face a fierce 豦(wild beast) with flashing 刂(knife) martial arts in grand 劇(theatrical plays), with 豦(wild beast) as the sound component (jù).',
  '醜': 'A person pickled in too much 酉(wine) looks ghastly as a disheveled 鬼(ghost) with an 醜(ugly) face, with 鬼(ghost) as the sound component (guǐ -> chǒu).',
  '握': 'Reaching out with your 扌(hand) to grip the front doorknob of the 屋(house) demonstrates a tight 握(grasp), with 屋(house) as the sound component (wū -> wò).',
  '魅': 'A haunting presence as captivating as a mythical 鬼(ghost) holds an allure that is 未(not yet) fully understood: 魅(charm), with 未(not yet) as the sound component (wèi -> mèi).',
  '罵': 'When anger boils over, words fly like a 罒(net) cast over a runaway 馬(horse) to shout a furious 罵(curse).',
  '錄': 'Using a sharp 金(gold) chisel to 彔(carve wood) historical archives preserves an enduring 錄(record), with 彔(carve wood) as the sound component (lù).',
  '嘛': 'A speaking 口(mouth) adds a casual tone, with 麻(hemp) as the sound component (má -> ma): 嘛(particle).',
  '資': 'Investing in each 次(second) commercial venture with valuable 貝(money) builds up a store of lasting 資(wealth), with 次(second) as the sound component (cì -> zī).',
  '格': 'Carpenters carve seasoned 木(tree) timbers so that 各(each) joint locks into an orderly structural 格(form), with 各(each) as the sound component (gè -> gé).',
  '模': 'Carving a 木(tree) block so precisely that flaws 莫(cannot) be found creates an ideal 模(model), with 莫(cannot) as the sound component (mò -> mó).',
  '供': 'A generous 亻(person) gathers supplies together so community members 共(together) have enough to eat and drink: 供(supply), with 共(together) as the sound component (gòng -> gōng).',
  '饅': 'Bakers knead soft 飠(food) dough into long 曼(long) rolls before steaming warm 饅(steamed buns), with 曼(long) as the sound component (màn -> mán).',
  '把': 'A 扌(hand) grips the handle of an umbrella, with 巴(bā) as the sound component (bā -> bǎ): 把(measure word for umbrella).',
  '虧': 'A 雐(bird) flies off with funds, with 亏(deficient) as the sound component (kuī): 虧(lose).',
  '洋': 'Vast expanses of deep 氵(water) where waves curl like sheep fleece under 羊(sheep) form the open 洋(sea), with 羊(sheep) as the sound component (yáng).',
  '侶': 'A traveling 亻(person) walking beside you, with 呂(lǚ) as the sound component (lǚ): 侶(companion).',
  '銷': 'Smelting raw 金(gold) in a forge until it fuses, with 肖(resemble) as the sound component (xiāo): 銷(fuse).',
  '嗨': 'Opening your 口(mouth) to call out across the water, with 海(sea) as the sound component (hǎi -> hāi): 嗨(Hi!).',
  '胞': 'Living tissue nurtured in the ⺼(meat), with 包(wrap) as the sound component (bāo): 胞(womb).',
  '檸': 'A fragrant citrus 木(tree) yielding sour lemons, with 寧(calm) as the sound component (níng): 檸(lemon).',
  '檬': 'A citrus 木(tree) bearing tart fruit, with 蒙(méng) as the sound component (méng): 檬(locust tree).',
  '圍': 'An outer 囗(enclosure) that fences every side, with 韋(wéi) as the sound component (wéi): 圍(surround).',
  '倒': 'A standing 亻(person) losing balance, with 到(dào) as the sound component (dào -> dǎo): 倒(to fall down).',
  '蟻': 'A crawling 虫(insect) carrying crumbs in a colony, with 義(yì) as the sound component (yì -> yǐ): 蟻(ant).',
  '燭': 'A flickering 火(fire) flame burning on a wick, with 蜀(caterpillar) as the sound component (shǔ -> zhú): 燭(candle).',
  '底': 'Under a wide 广(broad) roof reaching the lowest foundation, with 氐(dī) as the sound component (dī -> dǐ): 底(bottom).',
  '低': 'A humble 亻(person) stooping downward, with 氐(dī) as the sound component (dī): 低(low).',
  '阿': 'Arriving at a scenic 阝(place) and greeting friends, with 可(kě) as the sound component (kě -> ā): 阿(an initial particle).',
  '姨': 'A beloved 女(woman) in the family, with 夷(yí) as the sound component (yí): 姨(aunt).',
  '背': 'Facing south away from the cold 北(north), the rear of your bodily ⺼(meat) forms your sturdy 背(back), with 北(north) as the sound component (běi -> bèi).',
  '落': 'Autumn 艹(grass) leaves dropping to the ground, with 洛(luò) as the sound component (luò): 落(fall).',
  '味': 'Sampling fine cuisine with an appreciative 口(mouth), with 未(wèi) as the sound component (wèi): 味(taste).',
  '誤': 'Words in 言(speech) that miss the mark, with 吳(wú) as the sound component (wú -> wù): 誤(error).',
  '究': 'Spelunkers explore a deep 穴(cave) through 九(nine) twisting subterranean tunnels to thoroughly 究(dig into) the earth, with 九(nine) as the sound component (jiǔ -> jiū).',
  '謂': 'Using 言(speech) to address or name someone, with 胃(stomach) as the sound component (wèi): 謂(call).',
  '醒': 'Sleeping off heavy jars of fermented 酉(wine) until dawn morning 星(star) shines helps the drinker 醒(wake up), with 星(star) as the sound component (xīng -> xǐng).',
  '培': 'Mounding fertile 土(soil) around green shoots, with 咅(pǒu) as the sound component (pǒu -> péi): 培(cultivate).',
  '檢': 'Inspectors examine building beams from each harvested 木(tree) so that 僉(all) structural flaws are caught: 檢(check), with 僉(all) as the sound component (qiān -> jiǎn).',
  '溝': 'Directing fresh 氵(water) through an interlocking 冓(crossbeam) aqueduct drains fields into a clear 溝(ditch), with 冓(crossbeam) as the sound component (gòu -> gōu).',
  '齡': 'Examining the dental wear on an animal 齒(teeth) under a royal 令(command) determines its exact 齡(age), with 令(command) as the sound component (lìng -> líng).',
  '符': 'Carving sacred prayers on 竹(bamboo) slats and presenting them to 付(pay) homage creates an authentic 符(amulet), with 付(pay) as the sound component (fù -> fú).',
  '禍': 'Offering prayers at the 礻(spirit) shrine when crooked 咼(crooked) omens foretell sudden 禍(misfortune), with 咼(crooked) as the sound component (guō -> huò).',
  '抵': 'Thrusting a firm 扌(hand) down against the low 氐(foundation) blocks the charge to 抵(resist), with 氐(foundation) as the sound component (dī -> dǐ).',
  '議': 'Gathering spoken 言(speech) together to uphold moral 義(justice) guides leaders to 議(consult), with 義(justice) as the sound component (yì).',
  '職': 'Listening with a trained 耳(ear) while reading marked 戠(sign) instructions fulfills an official 職(duty), with 戠(sign) as the sound component (zhí).',
  '佈': 'A diligent 亻(person) unrolls woven sheets of 布(cotton) cloth across the lawn to 佈(spread) laundry, with 布(cotton) as the sound component (bù).',
  '論': 'Structuring your spoken 言(speech) into orderly 侖(logical) arguments fuels an engaging public 論(debate), with 侖(logical) as the sound component (lún -> lùn).',
  '顧': 'Before offering 雇(employment) to an applicant, turn your 頁(head) to carefully 顧(take into account) their qualifications, with 雇(employment) as the sound component (gù).',
  '搞': 'Raising a busy 扌(hand) to tackle a stack of chores piled 高(tall) gets things done to 搞(do), with 高(tall) as the sound component (gāo -> gǎo).',
  '雲': 'Before pouring down sheets of 雨(rain), vapor swirls like rolling 云(cloud mist) to form a dense 雲(cloud), with 云(cloud mist) as the sound component (yún).',
  '啦': 'Opening your spoken 口(mouth) as you 拉(pull) on a celebratory party streamer rings out with 啦(sentence-ending sound), with 拉(pull) as the sound component (lā -> la).',
  '托': 'Reaching underneath with an open 扌(hand) to 乇(entrust) delicate items into safe keeping helps 托(raise) them up, with 乇(entrust) as the sound component (tuō).',
  '姑': 'A beloved elder 女(woman) in the family who preserves revered 古(old) traditions is your 姑(father sister), with 古(old) as the sound component (gǔ -> gū).',
  '織': 'Threading colored 糹(silk) fibers according to a plotted 戠(pattern) enables the artisan to 織(weave) tapestries, with 戠(pattern) as the sound component (zhí).',
  '根': 'The underground anchor of a sturdy 木(tree) digs into stubborn 艮(tough) soil as a resilient 根(root), with 艮(tough) as the sound component (gèn -> gēn).',
  '據': 'Extending a firm 扌(hand) to defend against a charging 豦(wild beast) secures territory you 據(possess), with 豦(wild beast) as the sound component (jù).',
  '佛': 'A serene, awakened 亻(person) who turns away from 弗(not) earthly illusions to achieve peace is a 佛(Buddha), with 弗(not) as the sound component (fú -> fó).',
  '極': 'Climbing to the pinnacle of a tall 木(tree) at 亟(urgent) speed takes you to the outer 極(extreme), with 亟(urgent) as the sound component (jí).',
  '費': 'When savings run thin and there is 弗(not) enough 貝(sea shell) to pay bills, daily 費(expenses) pile up, with 弗(not) as the sound component (fú -> fèi).',
  '隧': 'Boring through a stony 阝(place) mountain pass until miners 遂(succeed) in breaking through carves a 隧(tunnel), with 遂(succeed) as the sound component (suì).',
  '仍': 'A steadfast 亻(person) who endures delays and is 乃(indeed) continuing onward is 仍(yet) standing tall, with 乃(indeed) as the sound component (nǎi -> réng).',
  '清': 'Clear mountain 氵(water) that flows as pure as pristine 青(blue-green) skies is sparkling and 清(clean), with 青(blue-green) as the sound component (qīng).',
  '超': 'Picking up pace beyond a normal 走(walk) in response to an urgent 召(summon) lets a runner 超(jump over), with 召(summon) as the sound component (zhào -> chāo).',
  '招': 'Raising a welcoming 扌(hand) to issue an official 召(summon) is to 招(summon), with 召(summon) as the sound component (zhào -> zhāo).',
  '評': 'Using calm 言(speech) to weigh both sides on a 平(flat) balance is to fairly 評(appraise), with 平(flat) as the sound component (píng).',
  '慢': 'When your inner 忄(heart) endures a 曼(long) unhurried delay, pace moves 慢(slowly), with 曼(long) as the sound component (màn).',
  '漫': 'Spreading 氵(water) expanding across a 曼(long) expanse becomes 漫(inundating), with 曼(long) as the sound component (màn).',
  '減': 'When collected 氵(water) is 咸(all) drained away, the volume continues to 減(decrease), with 咸(all) as the sound component (xián -> jiǎn).',
  '缺': 'An empty clay 缶(jar) broken by a 夬(decisive) crack suffers a noticeable 缺(lack), with 夬(decisive) as the sound component (guài -> quē).',
  '證': 'Speaking formal 言(speech) as you 登(rise) to testify provides clear evidence to 證(prove), with 登(rise) as the sound component (dēng -> zhèng).',
  '續': 'Tying each trade with a continuous 糹(silk) cord from one vendor 賣(sell) stall to the next ensures a 續(continuous) supply, with 賣(sell) as the sound component (mài -> xù).',
  '抱': 'Extending a gentle 扌(hand) to 包(wrap) your arms warmly around someone is to 抱(hold), with 包(wrap) as the sound component (bāo -> bào).',
  '泡': 'Trapping air inside foaming 氵(water) to 包(wrap) it into a floating dome produces a 泡(bubble), with 包(wrap) as the sound component (bāo -> pào).',
  '訪': 'Directing polite 言(speech) toward someone in that 方(direction) as you travel to meet is a formal 訪(visit), with 方(direction) as the sound component (fāng -> fǎng).',
  '效': 'When two creative plans 交(intersect) and are put into action with a firm 攵(rap), the outcome produces an effective 效(result), with 交(intersect) as the sound component (jiāo -> xiào).',
  '迷': 'Wandering in circles through 辶(movement) across vast fields of tall wild 米(rice) causes one to lose direction and 迷(bewitch), with 米(rice) as the sound component (mǐ -> mí).',
  '簽': 'Writing on official 竹(bamboo) documents where 僉(all) parties affix their approval is to 簽(sign), with 僉(all) as the sound component (qiān).',
  '導': 'Navigating the proper 道(way) step by 寸(inch) leads travelers correctly to 導(direct), with 道(way) as the sound component (dào -> dǎo).',
  '拍': 'Snapping a photo with a quick 扌(hand) press as a bright 白(white) flash illuminates is to 拍(photograph), with 白(white) as the sound component (bái -> pāi).',
  '油': 'Liquid 氵(water) essence pressed directly 由(from) seeds yields cooking 油(oil), with 由(from) as the sound component (yóu).',
  '源': 'Clear mountain 氵(water) flowing from its pristine underground 原(source) springs forth as a pure 源(spring), with 原(source) as the sound component (yuán).',
  '停': 'A weary traveler 亻(person) pauses under a roadside 亭(pavilion) to rest: 停(suspend), with 亭(pavilion) as the sound component (tíng).',
  '袋': 'Handing down across each 代(generation) a folded 衣(coat) that doubles as a pouch creates a practical 袋(bag), with 代(generation) as the sound component (dài).',
  '福': 'Praying before the sacred 礻(spirit) shrine with a 畐(roll of cloth) full of gratitude brings lasting 福(happiness), with 畐(roll of cloth) as the sound component (fú).',
  '神': 'Offering reverent worship before the 礻(spirit) altar, with 申(shēn) as the sound component (shēn -> shén): 神(god).',
  '祕': 'A sacred 礻(spirit) mystery kept behind doors that 必(surely) remain sealed preserves a profound 祕(secret), with 必(surely) as the sound component (bì -> mì).',
  '童': 'A young child who will 立(stand) tall in the village 里(village) is a playful 童(child), with 里(village) as the sound component (lǐ -> tóng).',
  '被': 'Spreading warm 衤(cloth) over delicate 皮(skin) at night provides cozy 被(bedding), with 皮(skin) as the sound component (pí -> bèi).',
  '破': 'A heavy sharp 石(stone) striking rough animal 皮(skin) until it tears apart causes a 破(break), with 皮(skin) as the sound component (pí -> pò).',
  '婆': 'Rolling 波(waves) of white hair framing a respected elder 女(female) distinguish an affectionate 婆(old woman), with 波(waves) as the sound component (bō -> pó).',
  '坪': 'A flat expanse of fertile 土(earth) leveled out 平(flat) measures one standard 坪(one "ping"=3.3 square meters), with 平(flat) as the sound component (píng).',
  '歉': 'When trying to 兼(combine) competing tasks leaves you with a 欠(lack) of care, you offer a 歉(deficient) apology, with 兼(combine) as the sound component (jiān -> qiàn).',
  '謙': 'Using modest words of sincere 言(speech) that 兼(combine) respect for others makes a scholar 謙(humble), with 兼(combine) as the sound component (jiān -> qiān).',
  '誠': 'Speaking earnest words of truthful 言(speech) to 成(complete) a promise proves someone is truly 誠(honest), with 成(complete) as the sound component (chéng).',
  '感': 'A shared sentiment that touches 咸(all) people deep within the 心(heart) can deeply 感(affect), with 咸(all) as the sound component (xián -> gǎn).',
  '頂': 'A small 丁(nail) gently tapped at the highest point of the 頁(head) marks the very 頂(top), with 丁(nail) as the sound component (dīng -> dǐng).',
  '持': 'A steady 扌(hand) holding office before the imperial 寺(court) hall is entrusted to 持(hold), with 寺(court) as the sound component (sì -> chí).',
  '待': 'With welcoming 彳(step) footsteps approaching the guest 寺(court) hall, hosts prepare to 待(entertain), with 寺(court) as the sound component (sì -> dài).',
};

// Curated sound component & grounded replacements for Book 1
export const BOOK_1_CHAR_OVERRIDES: Record<string, string> = {
  '新': 'Your 亲(parents) buy a sharp 斤(axe) that is brand 新(new) — qīn sharpens to xīn.',
};


export class BatchCharProcessor {
  bookId: number;
  stem: string;
  batchSize: number;
  directComponents: ReturnType<typeof loadRuntimeDirectComponents>;
  labelCandidatesByGlyph: Map<string, string[]>;
  childrenByGlyph: Map<string, string[]>;
  taughtByGlyph: Map<string, string>;
  readingsByGlyph: Map<string, string[]>;
  approvedLabels: Map<string, string[]>;
  lookup: (glyph: string) => RuntimeTreeNode | null;
  overrides: Record<string, string>;

  constructor(bookId = 3, batchSize = 50) {
    this.bookId = bookId;
    this.stem = `book-${bookId}`;
    this.batchSize = batchSize;
    this.directComponents = loadRuntimeDirectComponents();
    this.overrides = bookId === 3 ? BOOK_3_CHAR_OVERRIDES : BOOK_1_CHAR_OVERRIDES;

    // Load curated label data
    const curatedArtifact = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'), 'utf8'));
    this.labelCandidatesByGlyph = new Map();
    this.childrenByGlyph = new Map();
    for (const record of curatedArtifact.records) {
      if (record.use === 'skip') continue;
      const candidates = [record.label, ...(record.alternatives ?? [])].filter(Boolean);
      if (candidates.length > 0) this.labelCandidatesByGlyph.set(record.glyph, candidates);
      const children = (record.children ?? [])
        .map((c: string | { glyph?: string }) => (typeof c === 'string' ? c.split('(')[0].trim() : c.glyph))
        .filter((g: string | undefined): g is string => Boolean(g));
      if (children.length > 0) this.childrenByGlyph.set(record.glyph, [...new Set(children)] as string[]);
    }

    const b1Profiles = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'), 'utf8'));
    for (const p of b1Profiles.profiles) {
      const labels = p.approvedDefaultLabels.map((e: { label: string }) => e.label).filter(Boolean);
      if (labels.length > 0) {
        this.labelCandidatesByGlyph.set(p.glyph, [...new Set([...(this.labelCandidatesByGlyph.get(p.glyph) ?? []), ...labels])]);
      }
    }

    // Load approved labels
    this.approvedLabels = new Map();
    const files = ['book-1-component-profiles-v2.json', `${this.stem}-component-profiles-v2.json`];
    for (const name of files) {
      const path = resolve(OUTPUT_DIR, name);
      if (!existsSync(path)) continue;
      const pData = JSON.parse(readFileSync(path, 'utf8'));
      for (const profile of pData.profiles) {
        const labels = profile.approvedDefaultLabels.map((e: { label: string }) => e.label.toLowerCase()).filter(Boolean);
        if (labels.length > 0) {
          this.approvedLabels.set(profile.glyph, [...new Set([...(this.approvedLabels.get(profile.glyph) ?? []), ...labels])]);
        }
      }
    }

    // Load inventory taught senses
    const invData = JSON.parse(readFileSync(resolve(OUTPUT_DIR, `${this.stem}-inventory.json`), 'utf8'));
    const { meanings, readings } = buildTaughtSenses(invData.entries);
    this.taughtByGlyph = meanings;
    this.readingsByGlyph = readings;

    // Load shard lookup
    const manifest = JSON.parse(readFileSync(resolve(PHASE4_DIR, 'manifest.json'), 'utf8'));
    const shardCount = manifest.recordShards.length;
    const shardCache = new Map<number, Record<string, { t: RuntimeTreeNode }>>();
    this.lookup = (glyph: string): RuntimeTreeNode | null => {
      const shard = (glyph.codePointAt(0) ?? 0) % shardCount;
      if (!shardCache.has(shard)) {
        shardCache.set(
          shard,
          JSON.parse(readFileSync(resolve(PHASE4_DIR, 'records', `shard-${String(shard).padStart(2, '0')}.json`), 'utf8')).records,
        );
      }
      return shardCache.get(shard)?.[glyph]?.t ?? null;
    };
  }

  evaluateHook(character: string, hook: string, parts: Array<{ glyph?: string; aliases?: string[] }>): string[] {
    const issues: string[] = [];

    // 1. Fantasy pattern check
    for (const p of BANNED_FANTASY_PATTERNS) {
      if (p.test(hook)) issues.push(`fantasy:${p.source}`);
    }

    // 2. Render safety
    for (const finding of scanRenderSafety(hook)) {
      issues.push(`render:${finding.code}:${finding.message}`);
    }

    // 3. Component coverage
    const aliasesMap = new Map<string, string[]>();
    const add = (k: string, list: string[]) => {
      aliasesMap.set(k, [...new Set([...(aliasesMap.get(k) ?? []), ...list])]);
    };
    for (const [k, v] of Object.entries(STANDARD_RADICAL_ALIASES)) add(k, v);
    for (const p of parts ?? []) {
      if (p.glyph && p.aliases?.length) add(p.glyph, p.aliases);
    }
    for (const finding of analyzeCoverage({
      hook,
      strategy: 'scene',
      directComponents: this.directComponents.get(character) ?? [],
      labelCandidatesByGlyph: this.labelCandidatesByGlyph,
      childrenByGlyph: this.childrenByGlyph,
      aliasesByGlyph: aliasesMap,
    })) {
      if (finding.severity === 'error') issues.push(`coverage:${finding.code}:${finding.message}`);
    }

    // 4. Strict prose audit
    const selfToken = hook.match(new RegExp(`${character}\\(([^()]+)\\)`, 'u'));
    for (const finding of auditSingleHook({
      character,
      meaning: null,
      hook,
      targetDisplayLabel: selfToken?.[1].trim() ?? null,
    })) {
      issues.push(`prose:${finding.code}:${finding.detail}`);
    }

    // 5. Component order check
    const orderMismatches = findOrderMismatches([{ character, hook, acceptance: 'clean' } as never], this.lookup);
    for (const om of orderMismatches) {
      issues.push(`order:${om.actual.join('')}->${om.expected.join('')}`);
    }

    // 6. Label alignment check
    const alignmentFindings = findAlignmentFindings([{ character, hook, acceptance: 'clean' } as never], this.taughtByGlyph, this.readingsByGlyph);
    for (const af of alignmentFindings) {
      const approved = this.approvedLabels.get(af.glyph) ?? [];
      if (!approved.includes(af.label.toLowerCase())) {
        issues.push(`label:${af.glyph}(${af.label})`);
      }
    }

    return issues;
  }

  processBatches(): boolean {
    const catalogFile = resolve(OUTPUT_DIR, `${this.stem}-hooks-v3.json`);
    const charData = JSON.parse(readFileSync(catalogFile, 'utf8'));
    const totalChars = charData.records.length;
    const totalBatches = Math.ceil(totalChars / this.batchSize);

    console.log(`\n======================================================`);
    console.log(`[Book ${this.bookId}] Starting Grounded & Sensible Character Batch Processing`);
    console.log(`Total Characters: ${totalChars} | Batch Size: ${this.batchSize} | Batches: ${totalBatches}`);
    console.log(`======================================================\n`);

    let cumulativeErrors = 0;
    for (let b = 0; b < totalBatches; b++) {
      const start = b * this.batchSize;
      const end = Math.min(start + this.batchSize, totalChars);
      const slice = charData.records.slice(start, end);
      const batchNum = b + 1;

      console.log(`--- [Batch ${batchNum}/${totalBatches}] Processing characters ${start + 1} to ${end} ---`);
      let batchErrors = 0;

      for (const record of slice) {
        // Apply override if available
        if (this.overrides[record.character]) {
          record.hook = this.overrides[record.character];
        }

        const hook = record.hook ?? '';
        const issues = this.evaluateHook(record.character, hook, record.parts);

        if (issues.length > 0) {
          batchErrors++;
          cumulativeErrors++;
          console.error(`  FAIL: ${record.character} -> ${issues.join(', ')} | Hook: "${hook}"`);
        }

        record.acceptance = issues.length === 0 ? 'clean' : 'flagged';
        record.validation = {
          valid: issues.length === 0,
          issues: issues.map((iss) => ({ code: iss.split(':')[0], severity: 'flag', message: iss })),
        };
        record.model = 'grounded-phonetic-v1';
        record.promptVersion = `${this.stem}-chars-grounded-v1`;
      }

      // Checkpoint after every batch to disk
      writeFileSync(catalogFile, JSON.stringify(charData, null, 2) + '\n');

      const cleanCount = slice.length - batchErrors;
      console.log(`  [Batch ${batchNum} Review] Clean: ${cleanCount}/${slice.length} | Errors: ${batchErrors}`);
      console.log(`  Sample 1: "${slice[0].character}" -> "${slice[0].hook}"`);
      if (slice.length > 1) {
        console.log(`  Sample 2: "${slice[Math.floor(slice.length / 2)].character}" -> "${slice[Math.floor(slice.length / 2)].hook}"`);
      }
      console.log(`  Progress: ${end}/${totalChars} characters checkpointed.\n`);
    }

    console.log(`======================================================`);
    console.log(`[Book ${this.bookId}] ALL BATCHES COMPLETE! Total Errors: ${cumulativeErrors} / ${totalChars}`);
    console.log(`======================================================\n`);

    return cumulativeErrors === 0;
  }
}

export function runCharBatches(batchSize = 50, bookId = 3): boolean {
  const processor = new BatchCharProcessor(bookId, batchSize);
  return processor.processBatches();
}

function main() {
  const bookId = Number(argumentValue('--book', '3'));
  const batchSize = Number(argumentValue('--batch-size', '50'));
  const success = runCharBatches(batchSize, bookId);
  if (!success) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('batchCharProcessor.ts')) {
  main();
}
