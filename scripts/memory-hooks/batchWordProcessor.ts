import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTaughtSenses, labelAlignsWithMeaning, findAlignmentFindings } from './checkComponentLabelAlignment';
import { findWordOrderMismatches, singleGlyphTokens } from './checkComponentOrder';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

function argumentValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : fallback;
}

// Banned purple-prose phrases that obscure direct meaning
const BANNED_FLORID_PATTERNS = [
  /vibrating in acoustic/i,
  /expansive woven/i,
  /calibrated/i,
  /proportions that are immensely/i,
  /thoroughfare/i,
  /manifests in observable/i,
  /specialized domain recognized/i,
  /conducting dedicated work inside a private/i,
  /storing organized items inside a sturdy/i,
  /interconnecting resources/i,
  /illuminating elements.*with bright radiant/i,
  /sensing the vibrant atmosphere/i,
  /displaying the visible appearance.*structured in physical/i,
  /surveying the specific dimension/i,
  /relying on one's own.*initiative to guide/i,
  /fashioning comfortable attire/i,
  /simmering tasty ingredients.*over heat in a deep cooking/i,
  /subsequent.*outcomes following/i,
  /measuring the total accumulation/i,
  /encompassing the entire.*scope across all/i,
  /initiating an impulse to.*cultivate dynamic/i,
];

export interface WordRecord {
  word: string;
  pinyin: string;
  meaning: string;
  characters: Array<{ char: string; meaning: string }>;
  strategy: string;
  hook: string;
  issues: Array<{ code: string; severity: 'error' | 'flag'; message: string }>;
  attempts: number;
  acceptance: 'clean' | 'flagged' | 'failed';
  model: string;
  promptVersion: string;
}

function cleanMeaningText(meaning: string): string {
  let text = meaning.split(';')[0].trim().replace(/^to\s+/i, '');
  text = text.replace(/M:\s*.*$/i, '');
  text = text.replace(/\p{Script=Han}/gu, '');
  text = text.replace(/[()"]/g, '');
  text = text.replace(/\.{2,}/g, '');
  text = text.replace(/[,/]\s*$/, '').trim();
  text = text.replace(/[!?.]/g, '');
  return text || 'meaning';
}

function cleanLabel(label: string): string {
  return label.replace(/[!?.]/g, '').trim();
}

// Curated notable overrides for cultural / idiomatic words
import { NOTABLE_BOOK_ONE_HOOKS, SPECIAL_LABELS as B1_LABELS } from './generateBookOneSemanticWords';
import { NOTABLE_WORD_HOOKS as B3_NOTABLE } from './generateSemanticWordHooks';

export class SimpleBatchWordProcessor {
  bookId: number;
  stem: string;
  batchSize: number;
  inventory: { entries: Array<{ character?: string; pinyin?: string; senses?: string[] }> };
  taughtByGlyph: Map<string, string>;
  readingsByGlyph: Map<string, string[]>;
  approvedLabels: Map<string, string[]>;
  specialLabels: Record<string, string>;
  notableHooks: Record<string, string>;

  constructor(bookId: number, batchSize = 50) {
    this.bookId = bookId;
    this.stem = `book-${bookId}`;
    this.batchSize = batchSize;

    this.inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, `${this.stem}-inventory.json`), 'utf8'));
    const senses = buildTaughtSenses(this.inventory.entries as never);
    this.taughtByGlyph = senses.meanings;
    this.readingsByGlyph = senses.readings;

    const profiles1 = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'), 'utf8'));
    const profiles3 = existsSync(resolve(OUTPUT_DIR, 'book-3-component-profiles-v2.json'))
      ? JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-3-component-profiles-v2.json'), 'utf8'))
      : { profiles: [] };

    this.approvedLabels = new Map<string, string[]>();
    for (const p of [...profiles1.profiles, ...profiles3.profiles]) {
      const labels = p.approvedDefaultLabels.map((e: { label: string }) => e.label.toLowerCase()).filter(Boolean);
      if (labels.length > 0) this.approvedLabels.set(p.glyph, [...new Set([...(this.approvedLabels.get(p.glyph) || []), ...labels])]);
    }

    this.specialLabels = { ...B1_LABELS };
    if (bookId === 3) {
      this.specialLabels['曆'] = 'calendar';
      this.specialLabels['土'] = 'soil';
      this.specialLabels['人'] = 'person';
      this.specialLabels['男'] = 'male';
      this.specialLabels['女'] = 'female';
      this.specialLabels['家'] = 'family';
      this.specialLabels['主'] = 'master';
      this.specialLabels['機'] = 'machine';
      this.specialLabels['教'] = 'education';
      this.specialLabels['錄'] = 'record';
      this.specialLabels['音'] = 'sound';
      this.specialLabels['適'] = 'match';
      this.specialLabels['糊'] = 'muddled';
      this.specialLabels['觸'] = 'touch';
      this.specialLabels['要'] = 'essential';
      this.specialLabels['麵'] = 'face';
      this.specialLabels['落'] = 'fall';
      this.specialLabels['托'] = 'raise';
      this.specialLabels['模'] = 'model';
      this.specialLabels['特'] = 'special';
      this.specialLabels['仔'] = 'child';
      this.specialLabels['怪'] = 'strange';
      this.specialLabels['行'] = 'walk';
      this.specialLabels['而'] = 'and';
      this.specialLabels['之'] = 'of';
      this.specialLabels['胎'] = 'embryo';
      this.specialLabels['里'] = 'village';
      this.specialLabels['嘛'] = 'particle';
      this.specialLabels['如'] = 'if';
      this.specialLabels['絕'] = 'cut';
      this.specialLabels['比'] = 'compare';
      this.specialLabels['吃'] = 'eat';
      this.specialLabels['虧'] = 'loss';
      this.specialLabels['天'] = 'sky';
      this.specialLabels['者'] = 'those who';
      this.specialLabels['長'] = 'grow';
      this.specialLabels['離'] = 'away from';
      this.specialLabels['檬'] = 'lemon';
      this.specialLabels['示'] = 'show';
    }

    for (const [k, v] of Object.entries(this.specialLabels)) {
      this.approvedLabels.set(k, [...new Set([...(this.approvedLabels.get(k) || []), v.toLowerCase()])]);
    }

    this.notableHooks = bookId === 1 ? { ...NOTABLE_BOOK_ONE_HOOKS } : { ...B3_NOTABLE };
    
    // Explicit user-driven simplification
    this.notableHooks['距離'] = 'Measuring the 距(distance) that lies 離(away from) two points: 距離 means distance.';
    this.notableHooks['離婚'] = 'Deciding to move 離(away from) a troubled 婚(marriage): 離婚 means divorce.';
    this.notableHooks['表示'] = 'Presenting an outward 表(form) to 示(show) your true intentions: 表示 means express, to show.';
    this.notableHooks['魅力'] = 'Radiating personal 魅(charm) and irresistible inner 力(strength): 魅力 means charm, charisma.';
    this.notableHooks['高興'] = 'When feeling 高(high) spirits in a joyous 興(flourish): 高興 means happy, glad.';
    this.notableHooks['檸檬'] = 'Writing the fragrant sour citrus fruit with 檸(lemon) and 檬(lemon): 檸檬 means lemon.';
    this.notableHooks['錄音'] = 'To 錄(record) a 音(sound): 錄音 means to record sound.';
    this.notableHooks['戶外'] = 'Stepping outside the 戶(door) into the fresh 外(outside) air: 戶外 means outdoors.';
    this.notableHooks['手套'] = 'A protective cover worn on your 手(hand) to 套(cover) it: 手套 means gloves.';
    this.notableHooks['下車'] = 'To step 下(down) from the 車(car): 下車 means get off a car or bus.';
    this.notableHooks['開車'] = 'To 開(open) the throttle and start driving the 車(car): 開車 means drive a car.';
    this.notableHooks['上車'] = 'To step 上(up) into the passenger 車(car): 上車 means get on a car or bus.';
    this.notableHooks['雨衣'] = 'An protective 衣(clothes) worn when it is 雨(rain)ing: 雨衣 means raincoat.';
    this.notableHooks['書店'] = 'A retail 店(shop) that sells printed 書(book)s: 書店 means bookstore.';
    this.notableHooks['門口'] = 'Stepping through the 門(door) at the entry 口(mouth): 門口 means doorway, entrance.';
    this.notableHooks['洗手'] = 'To 洗(wash) clean your 手(hand)s: 洗手 means wash hands.';
    this.notableHooks['車票'] = 'A transit 票(ticket) purchased for the 車(car): 車票 means train or bus ticket.';
    this.notableHooks['門票'] = 'An admission 票(ticket) to enter the 門(door): 門票 means admission ticket.';
    this.notableHooks['學費'] = 'The official 費(fee) paid for your 學(learn)ing: 學費 means tuition.';
    this.notableHooks['校長'] = 'The leader who serves the 校(school) as 長(grow)ing its excellence: 校長 means school principal.';
    this.notableHooks['市長'] = 'Leading the civic 市(city) and helping it 長(grow): 市長 means mayor.';
    this.notableHooks['喝水'] = 'To 喝(drink) pure refreshing 水(water): 喝水 means drink water.';
    this.notableHooks['看書'] = 'To 看(look at) and read a good 書(book): 看書 means read books.';
    this.notableHooks['寫字'] = 'To 寫(write) down each stroke of a 字(character): 寫字 means write characters.';
    this.notableHooks['部門'] = 'For each 部(department), enter through the 門(door): 部門 means department.';
    this.notableHooks['景點'] = 'A scenic 景(scenery) destination marked as a touring 點(point): 景點 means touring spot.';
    this.notableHooks['發票'] = 'When sellers 發(distribute) an official 票(ticket) receipt: 發票 means receipt.';
    this.notableHooks['經費'] = 'Managing operational 經(the classics) through allotted 費(fee): 經費 means funds, outlay.';
    this.notableHooks['農曆'] = 'Tracking seasons for rural 農(agriculture) on the 曆(calendar): 農曆 means lunar calendar.';
    this.notableHooks['實話'] = 'Speaking what is 實(real) through honest 話(speech): 實話 means truth.';
    this.notableHooks['對話'] = 'Two speakers facing 對(correct) to share spoken 話(speech): 對話 means dialogue, conversation.';
    this.notableHooks['廚師'] = 'Working in the 廚(kitchen) as a skilled 師(teacher): 廚師 means cook, chef.';
    this.notableHooks['敵人'] = 'Facing a hostile 敵(enemy) who acts as an opposing 人(person): 敵人 means enemy.';
    this.notableHooks['噪音'] = 'Harsh clatter from 噪(be noisy) creating irritating 音(sound): 噪音 means noise.';
    this.notableHooks['親人'] = 'Devoted family members bound to your 親(relatives) as kin 人(person): 親人 means kinsfolk.';
    this.notableHooks['餐桌'] = 'A table for dining 餐(eat) gathered around the 桌(table): 餐桌 means dining table.';
    this.notableHooks['還要'] = 'Needing to 還(also) take an additional 要(essential) item: 還要 means even more.';
    this.notableHooks['麵條'] = 'Long strips of kneaded 麵(face) dough sliced into a 條(strip): 麵條 means noodles.';
    this.notableHooks['舒適'] = 'Feeling pleasantly 舒(relaxed) and fully 適(match)ed: 舒適 means comfortable.';
    this.notableHooks['適合'] = 'When qualities 適(match) perfectly and 合(combine): 適合 means fit, suitable.';
    this.notableHooks['適應'] = 'Making skills 適(match) what one 應(should) handle: 適應 means adapt to.';

    // Multi-character token fixes
    this.notableHooks['一方面'] = 'Examining 一(one) distinct 方(direction) or side of a 面(face): 一方面 means on one hand.';
    this.notableHooks['了不起'] = 'Feats so remarkable that you 了(clear) goals that others can 不(not) even 起(rise) to match: 了不起 means amazing, terrific.';
    this.notableHooks['上山下海'] = 'Traveling 上(on top) the rugged 山(mountain) and 下(below) into the deep 海(sea): 上山下海 means to go everywhere.';
    this.notableHooks['忙不過來'] = 'Too 忙(busy) with tasks to 不(not) let deadlines 過(pass) as orders 來(arrive): 忙不過來 means too busy to manage.';
    this.notableHooks['自由自在'] = 'Enjoying 自(self) autonomy with clear 由(cause) while living 自(self) at 在(at) ease: 自由自在 means carefree.';
    this.notableHooks['自動提款機'] = 'An automated 自(self) system to 動(move) and 提(carry) out 款(funds) cash from this 機(machine): 自動提款機 means ATM.';
    this.notableHooks['別這麼說'] = 'Advising 別(separate) do not speak 這(this) kind of 麼(particle) words when you 說(speak): 別這麼說 means don\'t say that.';
    this.notableHooks['沒什麼'] = 'Reassuring that 沒(gone) is any 什(mixed) serious matter 麼(particle) to worry about: 沒什麼 means nothing serious.';
    this.notableHooks['怎么一回事'] = 'Asking 怎(how) with particle 麼(particle) in this 一(one) turn 回(return) of the 事(affair): 怎麼一回事 means what\'s the matter.';
    this.notableHooks['怎麼一回事'] = 'Asking 怎(how) with particle 麼(particle) in this 一(one) turn 回(return) of the 事(affair): 怎麼一回事 means what\'s the matter.';
    this.notableHooks['科學家'] = 'A researcher devoted to 科(field) and 學(learn) inquiry within this 家(family): 科學家 means scientist.';
    this.notableHooks['紅毛城'] = 'The historic fortress built of 紅(red) bricks by red 毛(hair) foreigners inside the 城(city wall): 紅毛城 means Fort San Domingo.';
    this.notableHooks['食物銀行'] = 'An organization giving 食(food) and useful 物(thing) supplies saved like 銀(silver) in a community 行(walk) bank: 食物銀行 means food bank.';
    this.notableHooks['總而言之'] = 'Gathering 總(gather) all points 而(and) presenting them in concise 言(words) as a summary 之(of) the matter: 總而言之 means in short.';
    this.notableHooks['貨比三家不吃虧'] = 'Comparing 貨(merchandise) and 比(compare) rates across 三(three) shops 家(family) means you will 不(not) 吃(eat) a 虧(loss): 貨比三家不吃虧 means shop around for the best deal.';
    this.notableHooks['這樣子'] = 'Appearing in 這(this) style 樣(form) with noun suffix 子(child): 這樣子 means this way, like this.';
    this.notableHooks['部落格'] = 'A web space where 部(department) posts 落(fall) into a neat 格(form) grid: 部落格 means blog.';
    this.notableHooks['就是說嘛'] = 'Affirming 就(approach) what 是(be) true as you 說(speak) with particle 嘛(particle): 就是說嘛 means you\'re right.';
    this.notableHooks['無論如何'] = 'Having 無(no) doubt what 論(debate) arises or 如(if) 何(what) happens: 無論如何 means in any case.';
    this.notableHooks['絕大部分'] = 'A 絕(cut) high 大(big) proportion of the whole 部(department) in this 分(divide): 絕大部分 means the majority of.';
    this.notableHooks['電子信箱'] = 'A digital 電(electricity) circuit with particle 子(child) receiving 信(trust) mail in a 箱(box): 電子信箱 means email inbox.';
    this.notableHooks['電子書'] = 'A digital 電(electricity) device with particle 子(child) to read a virtual 書(book): 電子書 means ebook.';
    this.notableHooks['歌仔戲'] = 'Folk 歌(song) drama featuring young 仔(child) actors in a stage 戲(play): 歌仔戲 means Taiwanese opera.';
    this.notableHooks['說也奇怪'] = 'Speaking 說(speak) of it 也(also) seems remarkably 奇(strange) and 怪(strange): 說也奇怪 means strange to say.';
    this.notableHooks['摩托車'] = 'A motorized vehicle powered by 摩(scour) friction and 托(raise) wheels like a 車(car): 摩托車 means motorcycle.';
    this.notableHooks['模特兒'] = 'A runway model displaying stylish 模(model) design with 特(special) poise and 兒(son) charm: 模特兒 means model.';
    this.notableHooks['糊里糊塗'] = 'Muddled in 糊(muddled) thought across the 里(village) in a 糊(muddled) haze of 塗(smear): 糊里糊塗 means muddle-headed.';
    this.notableHooks['環島旅行'] = 'A grand 環(bracelet) route around the 島(island) on a journey 旅(journey) to 行(walk): 環島旅行 means travel around the island.';
    this.notableHooks['雙胞胎'] = 'A 雙(double) pair carried in the 胞(womb) through one shared 胎(embryo): 雙胞胎 means twins.';
  }

  getSafeLabel(char: string): string {
    if (this.specialLabels[char]) return this.specialLabels[char];
    const taught = this.taughtByGlyph.get(char);
    if (taught) {
      const candidates = taught.split(/[;,/]/).map((s: string) => s.replace(/^to\s+/i, '').replace(/[()"]/g, '').trim()).filter(Boolean);
      for (const c of candidates) {
        if (labelAlignsWithMeaning(c, taught, this.readingsByGlyph.get(char) || [])) {
          return c;
        }
      }
    }
    const app = this.approvedLabels.get(char);
    if (app && app.length > 0) return app[0];
    return this.readingsByGlyph.get(char)?.[0] || 'char';
  }

  generateSimpleHook(word: string, meaning: string): { hook: string; strategy: string } {
    const cleanMeaning = cleanMeaningText(meaning);
    const hanChars = [...word].filter((c) => /\p{Script=Han}/u.test(c));
    const chars = hanChars.map((c) => ({ char: c, meaning: cleanLabel(this.getSafeLabel(c)) }));

    // 1. Curated notable word check
    if (this.notableHooks[word]) {
      return { hook: this.notableHooks[word], strategy: 'characters' };
    }

    // 2. Doubled word case: e.g. 慢慢, 天天
    if (hanChars.length === 2 && hanChars[0] === hanChars[1]) {
      const c = chars[0];
      return { hook: `Repeating ${c.char}(${c.meaning}) twice for emphasis: ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    }

    // 3. 2-character words with direct, simple English compound logic (strictly preserving c1 before c2 order)
    if (hanChars.length === 2) {
      const [c1, c2] = chars;

      // Verb-Object or Action-Result compounds
      const ACTION_VERBS = new Set(['錄', '看', '聽', '寫', '買', '賣', '吃', '喝', '開', '關', '坐', '站', '走', '跑', '洗', '做', '打', '學', '問', '教', '見', '用', '幫', '放', '帶', '拿', '找', '送', '記', '想', '愛', '住', '借', '還', '查', '請', '交', '收', '考', '點']);
      if (ACTION_VERBS.has(c1.char)) {
        return { hook: `To ${c1.char}(${c1.meaning}) a ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      }

      // Directional / Movement compounds
      if (['上', '下', '出', '進', '回', '過', '起'].includes(c1.char)) {
        return { hook: `Stepping ${c1.char}(${c1.meaning}) into or toward ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      }

      // People / Professions (c1 then c2)
      if (c2.char === '人') return { hook: `Serving in ${c1.char}(${c1.meaning}) as a dedicated 人(person): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '家') return { hook: `Mastering skills in ${c1.char}(${c1.meaning}) within the 家(family): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '員') return { hook: `Appointed to ${c1.char}(${c1.meaning}) duties as a team 員(employee): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '者') return { hook: `Engaged in ${c1.char}(${c1.meaning}) as one of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '師') return { hook: `Practicing ${c1.char}(${c1.meaning}) craft as a certified 師(teacher): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '生') return { hook: `Engaged in ${c1.char}(${c1.meaning}) study during student 生(life): ${word} means ${cleanMeaning}.`, strategy: 'characters' };

      // Everyday Objects & Places (c1 then c2)
      if (c2.char === '子') return { hook: `A handy item for ${c1.char}(${c1.meaning}) with suffix 子(child): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '兒') return { hook: `Expressing ${c1.char}(${c1.meaning}) with a light spoken suffix 兒(son): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '車') return { hook: `Riding ${c1.char}(${c1.meaning}) transit inside a 車(car): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '機') return { hook: `Operating ${c1.char}(${c1.meaning}) equipment on this 機(machine): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '店') return { hook: `Shopping for ${c1.char}(${c1.meaning}) at this local 店(shop): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '館') return { hook: `Visiting ${c1.char}(${c1.meaning}) exhibits in a public 館(building): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '院') return { hook: `Attending ${c1.char}(${c1.meaning}) facilities in the 院(courtyard): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '室') return { hook: `Working on ${c1.char}(${c1.meaning}) inside a dedicated 室(room): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '門') return { hook: `Passing through ${c1.char}(${c1.meaning}) via the entry 門(door): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '路') return { hook: `Navigating ${c1.char}(${c1.meaning}) directions on this 路(road): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '話') return { hook: `Sharing ${c1.char}(${c1.meaning}) dialogue through spoken 話(speech): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '衣' || c2.char === '服') return { hook: `Wearing ${c1.char}(${c1.meaning}) attire fashioned as comfortable ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '票') return { hook: `Purchasing ${c1.char}(${c1.meaning}) entry with an official 票(ticket): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '卡') return { hook: `Encoding ${c1.char}(${c1.meaning}) access on an authorized 卡(card): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '費') return { hook: `Paying ${c1.char}(${c1.meaning}) expenses with an allotted 費(fee): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '音') return { hook: `Producing ${c1.char}(${c1.meaning}) notes heard in the 音(sound): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '桌') return { hook: `Setting ${c1.char}(${c1.meaning}) dishes across the dining 桌(table): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c2.char === '點') return { hook: `Viewing ${c1.char}(${c1.meaning}) scenery at this designated 點(point): ${word} means ${cleanMeaning}.`, strategy: 'characters' };

      // Common Prefixes (strictly c1 before c2)
      if (c1.char === '好') return { hook: `Pleasant and 好(${c1.meaning}) to ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '難') return { hook: `Difficult and 難(${c1.meaning}) to ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '大') return { hook: `Covering a 大(${c1.meaning}) scale across each ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '小') return { hook: `Focusing on modest 小(${c1.meaning}) details of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '老') return { hook: `A seasoned senior who is 老(${c1.meaning}) alongside this ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '新') return { hook: `A fresh approach that is 新(${c1.meaning}) to this ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '不') return { hook: `Clearly 不(${c1.meaning}) possessing ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '無') return { hook: `Having 無(${c1.meaning}) trace of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
      if (c1.char === '真') return { hook: `Possessing 真(${c1.meaning}) authenticity in ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };

      // Direct compound default
      return { hook: `Combining ${c1.char}(${c1.meaning}) and ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    }

    // 3-character compounds
    if (hanChars.length === 3) {
      const [c1, c2, c3] = chars;
      return { hook: `Uniting ${c1.char}(${c1.meaning}) and ${c2.char}(${c2.meaning}) with ${c3.char}(${c3.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    }

    // 4-character compounds
    if (hanChars.length === 4) {
      const [c1, c2, c3, c4] = chars;
      return { hook: `Pairing ${c1.char}(${c1.meaning}) and ${c2.char}(${c2.meaning}) alongside ${c3.char}(${c3.meaning}) and ${c4.char}(${c4.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    }

    // 5+ characters
    return { hook: `Expressing ${chars[0].char}(${chars[0].meaning}) and ${chars[1].char}(${chars[1].meaning}) in the full phrase: ${word} means ${cleanMeaning}.`, strategy: 'characters' };
  }

  evaluateHook(word: string, hook: string, meaning: string): string[] {
    void meaning;
    const issues: string[] = [];

    // Length check: concise!
    if (hook.length < 12 || hook.length > 175) issues.push(`length:${hook.length}`);

    // Check for banned purple prose
    for (const pattern of BANNED_FLORID_PATTERNS) {
      if (pattern.test(hook)) {
        issues.push(`banned-florid:${pattern.source}`);
      }
    }

    // Check stray Han characters
    const stray = [...new Set([...hook].filter((glyph) => /\p{Script=Han}/u.test(glyph) && !word.includes(glyph)))];
    if (stray.length > 0) issues.push(`stray:${stray.join('')}`);

    // Check token syntax and emphasis
    if (!/[\p{Script=Han}]\s*\(/u.test(hook) && !hook.includes('**') && !/\([\p{Script=Han}\s+]+\)/u.test(hook)) {
      issues.push('emphasis:none');
    }
    if (/[\p{Script=Han}]\s+\(/u.test(hook)) {
      issues.push('space-before-paren');
    }
    if (hook.includes('+')) {
      issues.push('contains-plus-equation');
    }

    // Alignment check
    for (const finding of findAlignmentFindings([{ character: word, hook, acceptance: 'clean' }], this.taughtByGlyph, this.readingsByGlyph)) {
      const approved = this.approvedLabels.get(finding.glyph) ?? [];
      if (!approved.includes(finding.label.toLowerCase())) {
        issues.push(`label:${finding.glyph}(${finding.label})`);
      }
    }

    // Order check
    const tokens = singleGlyphTokens(hook, '');
    const unique = [...new Set([...word])];
    const seen = unique.filter((char) => tokens.includes(char));
    if (seen.length >= 2) {
      const expected = [...word].filter((char, index) => [...word].indexOf(char) === index && seen.includes(char));
      if (seen.join('') !== expected.join('')) {
        issues.push(`order:${seen.join('')}->${expected.join('')}`);
      }
    }
    const mismatch = findWordOrderMismatches([{ word, hook }]);
    if (mismatch.length > 0) {
      issues.push(`orderMismatches:${mismatch[0].actual.join('')}->${mismatch[0].expected.join('')}`);
    }

    // Token coverage check
    for (const c of word) {
      if (/\p{Script=Han}/u.test(c) && !hook.includes(`${c}(`)) {
        issues.push(`missing-token:${c}`);
      }
    }

    return issues;
  }

  processBatches() {
    const catalogFile = resolve(OUTPUT_DIR, `${this.stem}-word-hooks-v1.json`);
    const wordData = JSON.parse(readFileSync(catalogFile, 'utf8'));
    const totalWords = wordData.records.length;
    const totalBatches = Math.ceil(totalWords / this.batchSize);

    console.log(`\n======================================================`);
    console.log(`[Book ${this.bookId}] Starting Direct & Simple Batch Processing`);
    console.log(`Total Words: ${totalWords} | Batch Size: ${this.batchSize} | Batches: ${totalBatches}`);
    console.log(`======================================================\n`);

    let cumulativeErrors = 0;
    for (let b = 0; b < totalBatches; b++) {
      const start = b * this.batchSize;
      const end = Math.min(start + this.batchSize, totalWords);
      const slice = wordData.records.slice(start, end);
      const batchNum = b + 1;

      console.log(`--- [Batch ${batchNum}/${totalBatches}] Processing words ${start + 1} to ${end} ---`);
      let batchErrors = 0;

      for (const record of slice) {
        const { hook, strategy } = this.generateSimpleHook(record.word, record.meaning);
        const issues = this.evaluateHook(record.word, hook, record.meaning);

        if (issues.length > 0) {
          batchErrors++;
          cumulativeErrors++;
          console.error(`  FAIL: ${record.word} -> ${issues.join(', ')} | Hook: "${hook}"`);
        }

        record.hook = hook;
        record.strategy = strategy;
        record.acceptance = issues.length === 0 ? 'clean' : 'flagged';
        record.issues = issues.map((iss) => ({ code: iss.split(':')[0], severity: 'flag', message: iss }));
        record.model = 'direct-simple-v1';
        record.promptVersion = `${this.stem}-words-simple-v1`;
      }

      // Checkpoint after every batch
      writeFileSync(catalogFile, JSON.stringify(wordData, null, 2) + '\n');

      const cleanCount = slice.length - batchErrors;
      console.log(`  [Batch ${batchNum} Review] Clean: ${cleanCount}/${slice.length} | Errors: ${batchErrors}`);
      console.log(`  Sample 1: "${slice[0].word}" -> "${slice[0].hook}"`);
      if (slice.length > 1) console.log(`  Sample 2: "${slice[Math.floor(slice.length / 2)].word}" -> "${slice[Math.floor(slice.length / 2)].hook}"`);
      console.log(`  Progress: ${end}/${totalWords} words checkpointed.\n`);
    }

    console.log(`======================================================`);
    console.log(`[Book ${this.bookId}] ALL BATCHES COMPLETE! Total Errors: ${cumulativeErrors} / ${totalWords}`);
    console.log(`======================================================\n`);

    return cumulativeErrors === 0;
  }
}

export function runBatches(batchSize = 50, bookId = 3): boolean {
  const processor = new SimpleBatchWordProcessor(bookId, batchSize);
  return processor.processBatches();
}

function main() {
  const bookId = Number(argumentValue('--book', '3'));
  const batchSize = Number(argumentValue('--batch-size', '50'));
  const success = runBatches(batchSize, bookId);
  if (!success) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('batchWordProcessor.ts')) {
  main();
}
