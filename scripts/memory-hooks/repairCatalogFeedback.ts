import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const CHAR_CATALOG = resolve(ROOT, 'output/memory-hooks/book-3-hooks-v3.json');
const WORD_CATALOG = resolve(ROOT, 'output/memory-hooks/book-3-word-hooks-v1.json');

interface CharRecord {
  character: string;
  hook: string;
  acceptance: string;
  [key: string]: unknown;
}

interface WordRecord {
  word: string;
  hook: string;
  acceptance: string;
  [key: string]: unknown;
}

const WORD_REPAIRS: Record<string, string> = {
  // User review feedback
  '戶外': 'Stepping past the 戶(door) to go 外(outside): 戶外 means outdoors.',
  '手套': 'Fitting your 手(hand) into a protective 套(cover): 手套 means gloves.',
  '古人古事': 'Remembering 古(old) people 人(person) and their ancient 古(old) historical 事(affair) stories: 古人古事 means ancients and their stories.',

  // 34 Multi-character compound token fixes
  '一方面': 'Examining 一(one) particular 方(direction) on that 面(face): 一方面 means on one hand.',
  '了不起': 'A skill so clearly 了(clear) extraordinary that rivals can 不(no) way 起(begin) to match it: 了不起 means amazing, terrific.',
  '上山下海': 'Trekking 上(on) the rugged 山(mountain) and diving 下(below) into the deep 海(sea): 上山下海 means to go everywhere.',
  '分分秒秒': 'Cherishing every 分(divide) minute after 分(divide) minute, every fleeting 秒(second) after 秒(second): 分分秒秒 means every minute and second.',
  '王母娘娘': 'The royal 王(king) Mother 母(mother), revered by devotees as 娘(mother) and divine 娘(mother): 王母娘娘 means Queen Mother of the West.',
  '多多少少': 'Blending some 多(much) with more 多(much), or 少(few) with 少(few): 多多少少 means more or less.',
  '忙不過來': 'Far too 忙(busy) with work, unable 不(no) to cope as hours 過(pass) and new tasks 來(arrive): 忙不過來 means too busy to manage.',
  '自由自在': 'Living of your own 自(self) will 由(cause), completely 自(self) at 在(at) ease: 自由自在 means carefree.',
  '自動提款機': 'An automated 自(self) machine to 動(move) and 提(carry) out 款(funds) cash from the 機(machine): 自動提款機 means ATM.',
  '別這麼說': 'Advising 別(separate) do not speak in 這(this) 麼(particle) way when you 說(speak): 別這麼說 means don\'t say that.',
  '沒什麼': 'Reassuring that there is 沒(gone) any serious 什(what? mixed) 麼(particle) matter to worry about: 沒什麼 means nothing serious.',
  '事事如意': 'May one 事(affair) after another 事(affair) turn out exactly 如(if) wished in your 意(thought): 事事如意 means may everything go smoothly.',
  '怎麼一回事': 'Wondering 怎(what? why? how?) and 麼(particle) happened during this 一(one) 回(time) unexpected 事(affair): 怎麼一回事 means What\'s the matter.',
  '科學家': 'A scholar pursuing scientific 科(field) and 學(learn) inquiry as an authority 家(family): 科學家 means scientist.',
  '紅毛城': 'A historic citadel built with 紅(red) bricks for red-haired 毛(hair) foreigners behind strong 城(castle) walls: 紅毛城 means Fort San Domingo.',
  '食物銀行': 'An organized pantry keeping essential 食(food) and 物(thing) supplies backed by solid 銀(silver) so every family is 行(all right): 食物銀行 means food bank.',
  '貨比三家不吃虧': 'Checking 貨(merchandise) to 比(compare) prices across 三(three) separate 家(family) shops ensures you will 不(no) need to 吃(eat) any financial 虧(lose): 貨比三家不吃虧 means shop around for the best deal.',
  '這樣子': 'Appearing in 這(this) particular 樣(kind) like a playful 子(son) youngster: 這樣子 means this way, like this.',
  '部落格': 'An online community 部(department) where users settle in a cyber 落(fall) village to post in a grid 格(form): 部落格 means blog.',
  '就是說嘛': 'Affirming that 就(with regard to) this 是(be) precisely what you 說(speak), adding an emphatic 嘛(particle): 就是說嘛 means you\'re right.',
  '無論如何': 'Having 無(no) doubt regardless of what you 論(debate), 如(if) tested, in 何(what) circumstance: 無論如何 means in any case.',
  '絕大部分': 'The 絕(cut) decisive, overwhelming 大(big) share of the divided 部(department) 分(divide): 絕大部分 means the majority of.',
  '電子信箱': 'An electronic 電(electricity) 子(son) system delivering digital 信(trust) messages into an in-box 箱(box): 電子信箱 means email inbox.',
  '電子書': 'An electronic 電(electricity) 子(son) digital format used for reading a modern 書(book): 電子書 means ebook.',
  '歌仔戲': 'Traditional folk 歌(song) performed by local 仔(small thing) troupes as a staged 戲(play): 歌仔戲 means Taiwanese opera.',
  '說也奇怪': 'To 說(speak) about the matter, it 也(also) seems remarkably 奇(strange) and 怪(blame) odd: 說也奇怪 means strange to say.',
  '摩托車': 'A two-wheeler whose tires 摩(scour) the pavement while you 托(raise) the handlebars of the 車(cart): 摩托車 means motorcycle.',
  '模特兒': 'A runway 模(model) selected for her 特(special) look posing with charming 兒(son) grace: 模特兒 means model.',
  '糊里糊塗': 'Thoughts turn 糊(muddled) over a confusing 里(distance), leaving you completely 糊(muddled) and messily 塗(smear)ed: 糊里糊塗 means muddle-headed.',
  '隨時隨地': 'Ready to 隨(follow) at any 時(time), and 隨(follow) anywhere across the wide 地(earth): 隨時隨地 means anytime, anywhere.',
  '環島旅行': 'Following a scenic 環(bracelet) route around the entire 島(island) on a 旅(journey) to 行(all right) travel: 環島旅行 means travel around the island.',
  '總而言之': 'To 總(gather) up the discussion, 而(and) summarize it in brief 言(words) 之(of): 總而言之 means in short.',
  '雙胞胎': 'Two babies born as a 雙(double) pair from the same motherly 胞(womb) and 胎(embryo): 雙胞胎 means twins.',

  // Medium review cleanups & grammar
  '便條': 'A quick, 便(convenient) short note scribbled on a paper 條(strip): 便條 means memo, note.',
  '限制': 'Setting strict boundary 限(limit) rules to 制(system) regulate actions: 限制 means restrict, limit.',
  '情形': 'Observing both the inner 情(feeling) condition and the visible 形(shape) of events: 情形 means situation.',
  '過去': 'Days that have 過(pass) by and gone 去(go away) forever: 過去 means past.',
  '整理': 'Arranging things into 整(orderly) rows according to systematic 理(science) order: 整理 means organize, tidy up.',
  '織女': 'The celestial maiden who uses her loom to 織(weave) cloth as a divine 女(woman): 織女 means Weaver Girl.',
  '早生貴子': 'Wishing parents an early 早(early) blessing to 生(give birth to) an esteemed 貴(honorable) 子(son): 早生貴子 means have a baby soon.',
  '改變': 'Setting out on a new 改(change) course so that old conditions 變(change) form: 改變 means change, alter.',
};

const CHAR_REPAIRS: Record<string, string> = {
  // User review feedback: sound component explicitly mentioned
  '適': 'Moving forward with 辶(movement) toward what fits, with 啇(stalk) acting as the sound component: 適(match).',

  // Standardize sound component phrasing
  '糊': 'Boiling sticky 米(rice) into a thick paste, with 胡(recklessly) acting as the sound component: 糊(muddled).',
  '觸': 'Lowering sharp horns at an acute 角(angle) to collide, with 蜀(caterpillar) acting as the sound component: 觸(butt).',

  // Clean origin/atmosphere
  '涼': 'A rushing current of mountain 氵(water) flows past the grand 京(capital), making the autumn air briskly 涼(cold).',

  // Grammar indefinite articles
  '制': 'An 牛(ox) is guided inside a 冂(frame) to make a system; the 刂(knife) trims it into place → 制(system).',
  '質': 'An 斤(axe) chops a 貝(sea shell) to test its worth, revealing the true 質(essence).',
  '閱': 'At the 門(door), a 兌(exchange) of documents happens — you check each one → 閱(examine).',
  '整': 'An imperial order 敕(imperial order) sets everything 正(proper) and straight — so the whole is in order → 整(whole).',
  '聯': 'An ear 耳(ear) listens closely as twisted strands of 糹(silk) bind two partners together to 聯(ally).',
  '職': 'An ear 耳(ear) listens for duty; the 戠(zhí) lends the sound, shifting to zhí → 職(duty).',
  '蟻': 'A crawling 虫(insect) paired with 義(yì), which lends the sound, means 蟻(ant).',
  '蠟': 'Wax gathered by a industrious 虫(insect) molded around a candle wick melts into an ambient 蠟(candle).',
  '折': 'A 扌(hand) swings an 斤(axe) to snap something — 折(break).',
  '豆': 'An 一(one) line above a 口(mouth) with two 丷(horns) below is a bean pod splitting open → 豆(beans).',
  '直': 'A 十(ten) pins a 且(qiě) board flat, and an 一(one) line runs down it dead straight → 直(straight).',
  '挑': 'A 扌(hand) points at an 兆(omen) sign, choosing which path to take → 挑(select).',
  '區': 'A 匸(box) that holds an 品(article) inside its open side marks off a protected 區(area).',
  '導': 'A 道(way) measured inch by inch with an 寸(inch) is how you direct a path → 導(direct).',
  '符': 'A 竹(bamboo) slip with 付(fù) lends the sound fú; that written charm is an 符(amulet).',
};

function run() {
  console.log('Applying user feedback and catalog-wide repairs...');

  // 1. Repair characters
  const charData = JSON.parse(readFileSync(CHAR_CATALOG, 'utf8'));
  let charUpdated = 0;
  for (const record of charData.records as CharRecord[]) {
    if (CHAR_REPAIRS[record.character]) {
      record.hook = CHAR_REPAIRS[record.character];
      record.acceptance = 'clean';
      charUpdated++;
    }
  }
  writeFileSync(CHAR_CATALOG, JSON.stringify(charData, null, 2) + '\n');
  console.log(`Updated ${charUpdated} characters in ${CHAR_CATALOG}`);

  // 2. Repair words
  const wordData = JSON.parse(readFileSync(WORD_CATALOG, 'utf8'));
  let wordUpdated = 0;
  for (const record of wordData.records as WordRecord[]) {
    if (WORD_REPAIRS[record.word]) {
      record.hook = WORD_REPAIRS[record.word];
      record.acceptance = 'clean';
      wordUpdated++;
    }
  }
  writeFileSync(WORD_CATALOG, JSON.stringify(wordData, null, 2) + '\n');
  console.log(`Updated ${wordUpdated} words in ${WORD_CATALOG}`);
}

run();
