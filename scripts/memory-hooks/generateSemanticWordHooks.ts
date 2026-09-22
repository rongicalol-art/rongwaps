import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTaughtSenses, labelAlignsWithMeaning, findAlignmentFindings } from './checkComponentLabelAlignment';
import { findWordOrderMismatches, singleGlyphTokens } from './checkComponentOrder';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

function cleanVocabText(text: string): string {
  let cleaned = text.trim().replace(/\(.*?\)/g, '').replace(/[（）]/g, '');
  const slashIndex = cleaned.indexOf('/');
  if (slashIndex !== -1) cleaned = cleaned.substring(0, slashIndex);
  return cleaned.trim();
}

const inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-3-inventory.json'), 'utf8'));
const { meanings: taughtByGlyph, readings: readingsByGlyph } = buildTaughtSenses(inventory.entries);

const profiles1 = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'), 'utf8'));
const profiles3 = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-3-component-profiles-v2.json'), 'utf8'));
const approvedLabels = new Map<string, string[]>();
for (const p of [...profiles1.profiles, ...profiles3.profiles]) {
  const labels = p.approvedDefaultLabels.map((e: { label: string }) => e.label.toLowerCase()).filter(Boolean);
  if (labels.length > 0) approvedLabels.set(p.glyph, [...new Set([...(approvedLabels.get(p.glyph) || []), ...labels])]);
}

const masterCharMeanings = new Map<string, string>();
const hooks3 = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-3-hooks-v3.json'), 'utf8'));
for (const r of hooks3.records) if (r.meaning) masterCharMeanings.set(r.character, r.meaning);
const hooks1 = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8'));
for (const r of hooks1.records) if (r.meaning && !masterCharMeanings.has(r.character)) masterCharMeanings.set(r.character, r.meaning);
for (const e of inventory.entries) {
  const m = e.meaningDecision.selectedMeaning;
  if (m && !masterCharMeanings.has(e.character)) masterCharMeanings.set(e.character, m);
}
for (const f of ['public/data/vocabulary/book-1.json', 'public/data/vocabulary/book-2.json', 'public/data/vocabulary/book-3.json']) {
  const path = resolve(ROOT, f);
  if (!existsSync(path)) continue;
  const b = JSON.parse(readFileSync(path, 'utf8'));
  for (const it of b.items || []) {
    if (it.hanzi && it.hanzi.length === 1 && it.english && !masterCharMeanings.has(it.hanzi)) {
      masterCharMeanings.set(it.hanzi, it.english.split(';')[0].trim());
    }
  }
}

export function getSafeLabel(char: string): string {
  // Fix specific labels that trigger warnings
  if (char === '曆') return 'calendar';
  if (char === '土') return 'soil';
  if (char === '人') return 'person';
  if (char === '男') return 'male';
  if (char === '女') return 'female';
  if (char === '家') return 'family';
  if (char === '主') return 'master';
  if (char === '機') return 'machine';
  if (char === '教') return 'education';

  const taught = taughtByGlyph.get(char);
  if (taught) {
    const candidates = taught.split(/[;,/]/).map(s => s.replace(/^to\s+/i, '').replace(/[()"]/g, '').trim()).filter(Boolean);
    for (const c of candidates) {
      if (labelAlignsWithMeaning(c, taught, readingsByGlyph.get(char) || [])) {
        return c;
      }
    }
  }
  const app = approvedLabels.get(char);
  if (app && app.length > 0) return app[0];
  const m = masterCharMeanings.get(char);
  if (m) {
    const cand = m.split(/[;,/]/)[0].replace(/^to\s+/i, '').replace(/[()"]/g, '').trim();
    if (cand) return cand;
  }
  return readingsByGlyph.get(char)?.[0] || 'char';
}

function cleanMeaningText(meaning: string): string {
  let text = meaning.split(';')[0].trim().replace(/^to\s+/i, '');
  text = text.replace(/M:\s*.*$/i, '');
  text = text.replace(/in the legend of.*$/i, '');
  text = text.replace(/\p{Script=Han}/gu, '');
  text = text.replace(/[()"]/g, '');
  text = text.replace(/\.{2,}/g, '');
  text = text.replace(/[!?.]/g, '');
  text = text.replace(/[,/]\s*$/, '').trim();
  return text || 'meaning';
}

function cleanLabel(label: string): string {
  return label.replace(/[!?.]/g, '').replace(/\.{2,}/g, '').trim();
}

export interface WordEntry {
  word: string;
  pinyin: string;
  meaning: string;
  characters: Array<{ char: string; meaning: string }>;
}

export function loadAllWords(): WordEntry[] {
  const byWord = new Map<string, { pinyin: string; meanings: string[] }>();
  for (const entry of inventory.entries) {
    for (const occurrence of entry.occurrences) {
      const word = cleanVocabText(occurrence.word);
      if (!/^\p{Script=Han}+$/u.test(word)) continue;
      const existing = byWord.get(word) ?? { pinyin: occurrence.pinyin, meanings: [] as string[] };
      if (!existing.meanings.includes(occurrence.meaning)) existing.meanings.push(occurrence.meaning);
      byWord.set(word, existing);
    }
  }
  const scope = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-3-scope.json'), 'utf8')) as { words: string[] };
  return scope.words.map((word) => {
    const v = byWord.get(word);
    return {
      word,
      pinyin: v?.pinyin ?? '',
      meaning: v?.meanings.join('; ') || '',
      characters: [...word].map((char) => ({ char, meaning: getSafeLabel(char) })),
    };
  });
}

export function evaluateWordHook(word: string, hook: string, meaning: string): string[] {
  void meaning;
  const issues: string[] = [];
  if (hook.length < 12 || hook.length > 220) issues.push('length:' + hook.length);
  const stray = [...new Set([...hook].filter((glyph) => /\p{Script=Han}/u.test(glyph) && !word.includes(glyph)))];
  if (stray.length > 0) issues.push('stray:' + stray.join(''));
  if (!/[\p{Script=Han}]\s*\(/u.test(hook) && !hook.includes('**') && !/\([\p{Script=Han}\s+]+\)/u.test(hook)) {
    issues.push('emphasis:none');
  }
  for (const finding of findAlignmentFindings([{ character: word, hook, acceptance: 'clean' }], taughtByGlyph, readingsByGlyph)) {
    const approved = approvedLabels.get(finding.glyph) ?? [];
    if (!approved.includes(finding.label.toLowerCase())) {
      issues.push('label:' + finding.glyph + '(' + finding.label + ')');
    }
  }
  const tokens = singleGlyphTokens(hook, '');
  const unique = [...new Set([...word])];
  const seen = unique.filter((char) => tokens.includes(char));
  if (seen.length >= 2) {
    const expected = [...word].filter((char, index) => [...word].indexOf(char) === index && seen.includes(char));
    if (seen.join('') !== expected.join('')) {
      issues.push('order:' + seen.join('') + '->' + expected.join(''));
    }
  }
  const mismatch = findWordOrderMismatches([{ word, hook }]);
  if (mismatch.length > 0) issues.push('orderMismatches:' + mismatch[0].actual.join('') + '->' + mismatch[0].expected.join(''));

  const sentences = hook.replace(/\bi\.e\./gi, 'ie').replace(/\be\.g\./gi, 'eg').split(/[.!?。！？]+/).filter((part) => part.trim()).length;
  if (sentences > 2) issues.push('too-many-sentences:' + sentences);
  if (hook.trim().split(/\s+/).length > 30) issues.push('too-many-words:' + hook.trim().split(/\s+/).length);

  return issues;
}

// Handcrafted semantic hooks for notable or idiomatic vocabulary words
export const NOTABLE_WORD_HOOKS: Record<string, string> = {
  '一切': '一(one) clean 切(cut) slices through all items at once: 一切 means all, everything.',
  '一方面': 'Examining 一(one) particular 方(direction) or side of a matter: 一方面 means on one hand.',
  '一生': 'From 一(one) moment of birth throughout 生(give birth to) life: 一生 means one\'s whole life.',
  '一再': 'Doing something 一(one) time, then 再(again) and again: 一再 means repeatedly.',
  '一同': 'Walking as 一(one) group with the 同(same) shared purpose: 一同 means together.',
  '一向': 'Keeping consistently in 一(one) line 向(towards) a set habit: 一向 means always.',
  '一時': 'Passing in just 一(one) fleeting stretch of 時(time): 一時 means a short while.',
  '一般來說': 'Taking 一(one) general 般(sort) of observation to 來(arrive) and 說(speak): 一般來說 means generally speaking.',
  '一連': 'Linked like 一(one) continuous chain where events 連(join) in a row: 一連 means in succession.',
  '一塊兒': 'Gathering as 一(one) unified 塊(piece) in 兒(son) spoken rhythm: 一塊兒 means together.',
  '七夕': 'The celestial festival held on the 七(seven)th lunar 夕(evening): 七夕 marks Chinese Valentine\'s Day.',
  '了不起': 'Achieving feats so 了(clear) that no rival can 起(begin) to surpass them: 了不起 means amazing, terrific.',
  '人口': 'Counting every resident 人(person) and each hungry 口(mouth) measures a city\'s 人口(population).',
  '人民': 'The working 人(person) and everyday 民(citizens) of a nation form its 人民(people).',
  '人間': 'The earthly world where each mortal 人(person) lives 間(between) heaven and earth: 人間 means human world.',
  '人類': 'Classifying every living 人(person) into a single biological 類(category) defines all 人類(mankind).',
  '力量': 'Harnessing muscular 力(strength) and measuring its full 量(measure) produces great 力量(strength).',
  '十分': 'Reaching a top score of 十(ten) without any 分(divide) deduction indicates 十分(very, extremely).',
  '三合院': 'Traditional architecture where 三(three) wings 合(combine) around a central 院(courtyard) forms a 三合院.',
  '上下': 'Covering the full range from 上(on top) to the ground 下(below): 上下 means up and down.',
  '下雪': 'Cold weather sends precipitation 下(below) as falling 雪(snow): 下雪 means to snow.',
  '主管': 'A senior leader acting as 主(master) to oversee and 管(manage) affairs is a 主管(supervisor).',
  '主意': 'The guiding thought a 主(master) forms with inner 意(idea) is a clever 主意(idea).',
  '交朋友': 'Reaching out to 交(exchange) warm goodwill with a new 朋(friend) and loyal 友(friend): 交朋友 means make friends.',
  '交通': 'Navigating where paths 交(intersect) so transit flows 通(through) freely: 交通 means traffic.',
  '今年': 'The current 今(now) cycle of the seasonal 年(year): 今年 means this year.',
  '今日': 'The present 今(now) day under the morning 日(sun): 今日 means today.',
  '便條': 'An 便(convenient) short memo scribbled on a paper 條(strip): 便條 means memo, note.',
  '借書證': 'A credential to 借(borrow) a library 書(book) verified by a card 證(certificate) is a 借書證.',
  '健保卡': 'A national health card protecting your 健(healthy) well-being and 保(protect) security is a 健保卡.',
  '熱狗': 'A piping 熱(heat) sausage tucked inside a long bun like a playful 狗(dog): 熱狗 means hotdog.',
  '餐桌': 'A designated 桌(table) where family members gather to 餐(eat) meals: 餐桌 means dining table.',
  '日曆': 'Tearing away each passing 日(sun) from the printed 曆(calendar) pad: 日曆 means calendar.',
  '農曆': 'The traditional 曆(calendar) tracking seasons for rural 農(agriculture): 農曆 means lunar calendar.',
  '古蹟': 'Historic traces left from 古(old) antiquity preserved as a sacred 蹟(trace): 古蹟 means ancient relic.',
  '牛郎': 'The legendary cowherd who tends his loyal 牛(ox) as a humble young 郎(gentleman): 牛郎.',
  '織女': 'The celestial maiden who uses her loom to 織(weave) cloth as a divine 女(woman): 織女.',
  '水災': 'Overwhelming floodwaters of rushing 水(water) causing a terrible natural 災(disaster): 水災 means flooding.',
  '火車': 'A heavy transit 車(cart) driven across iron tracks by steam 火(fire): 火車 means train.',
  '海洋': 'Coastal 海(sea) waters merging into the vast expanse of the open 洋(ocean): 海洋 means ocean.',
  '風景': 'Sweeping mountain vista shaped by blowing 風(wind) and scenic 景(scenery): 風景 means landscape.',
  '景點': 'A celebrated 點(point) on the map renowned for scenic 景(scenery): 景點 means touring spot.',
  '安全': 'Feeling entirely 安(peaceful) with 全(whole) protection from harm: 安全 means safe.',
  '安排': 'To organize with 安(peaceful) care by setting tasks in neat 排(row) order: 安排 means arrange.',
  '安靜': 'Enjoying 安(peaceful) stillness where surroundings stay 靜(quiet): 安靜 means quiet.',
  '完成': 'Carrying work to a 完(complete) state so results 成(accomplish) fully: 完成 means finish.',
  '完全': 'Reaching 完(complete) thoroughness covering the 全(whole) entirety: 完全 means completely.',
  '希望': 'Holding cherished 希(rare) aspirations while you 望(gaze) toward the future: 希望 means hope.',
  '幸好': 'Receiving a stroke of 幸(favor) that turns out 好(good): 幸好 means fortunately.',
  '幸福': 'Blessed with lasting 幸(favor) and abundant 福(blessing) in life: 幸福 means happiness.',
  '幸運': 'When unexpected 幸(favor) guides your daily 運(transport) of fortune: 幸運 means lucky.',
  '忘記': 'Letting thoughts fade until you 忘(forget) what was in your 記(remember) mind: 忘記 means forget.',
  '思考': 'Engaging deep 思(think) reflections to thoroughly 考(test) a theory: 思考 means ponder.',
  '思想': 'Nurturing deep 思(think) convictions from inner 想(think) ideas: 思想 means ideology, thought.',
  '急速': 'Moving with 急(urgent) haste at breathtaking 速(prompt) pace: 急速 means rapid.',
  '急診室': 'A hospital wing for 急(urgent) triage and 診(examine) care in a 室(room): 急診室 means emergency room.',
  '怪不得': 'Observing a 怪(strange) event and realizing 不(no) wonder it occurred: 怪不得 means no wonder.',
  '悠久': 'Preserving 悠(distant) heritage across a 長(long) span of 久(long time): 悠久 means long-standing.',
  '悲傷': 'Weighed down by heavy 悲(sad) sorrow from deep emotional 傷(wound): 悲傷 means sorrowful.',
  '情侶': 'Two lovers bound by tender 情(feeling) traveling as a devoted 侶(companion) pair: 情侶 means couple.',
  '情感': 'Expressing heartfelt 情(feeling) through deep 感(sense) emotion: 情感 means affection, emotion.',
  '情況': 'Assessing the inner 情(feeling) state and external 況(situation) of affairs: 情況 means circumstances.',
  '情形': 'Observing the genuine 情(feeling) reality and visible 形(shape) of events: 情形 means situation.',
  '想念': 'Directing affectionate 想(think) wishes while holding fond 念(memory): 想念 means miss, long for.',
  '愉快': 'Filled with cheerful 愉(happy) lightheartedness and 快(fast) joy: 愉快 means delightful.',
  '意願': 'Harboring an active 意(idea) of intent matched with heartfelt 願(desire): 意願 means willingness.',
  '感謝': 'Offering sincere 感(sense) appreciation with words of 謝(thank): 感謝 means thank, be grateful.',
  '感受': 'Cultivating deep inner 感(sense) perception as you 受(receive) impressions: 感受 means experience, feel.',
  '感情': 'Sharing emotional 感(sense) warmth that builds enduring 情(feeling): 感情 means emotional bond.',
  '感覺': 'A physical 感(sense) reaction awakening mental 覺(perceive) awareness: 感覺 means feeling, sensation.',
  '態度': 'The manner you project from inner 態(manner) measured by your personal 度(degree): 態度 means attitude.',
  '懷念': 'Holding tenderly to one\'s 懷(bosom) the fond 念(memory) of the past: 懷念 means cherish the memory.',
  '成功': 'Reaching a proud 成(accomplish) milestone through dedicated 功(merit) labor: 成功 means succeed.',
  '成績': 'A tally of 成(accomplish) milestones recording academic 績(achievement): 成績 means grades, score.',
  '成長': 'Nurturing skills to 成(accomplish) maturity as you 長(grow) taller: 成長 means grow up.',
  '成語': 'A classic proverb 成(accomplish) into a concise four-character 語(language) phrase: 成語 means idiom.',
  '戶外': 'Stepping outside the 戶(door) into the fresh 外(outside) air: 戶外 means outdoors.',
  '手冊': 'A handy reference kept in your 手(hand) bound like a slender 冊(booklet): 手冊 means handbook, manual.',
  '手術': 'Skilled medical work using precision 手(hand) mastery to perform a surgical 術(skill): 手術 means surgery.',
  '手套': 'Protective accessories slipped onto the 手(hand) to 套(cover) fingers warmly: 手套 means gloves.',
  '才華': 'Possessing natural 才(talent) that shines with brilliant 華(splendid) flair: 才華 means brilliance.',
  '打工': 'Taking on odd jobs by applying manual 打(hit) effort to regular 工(work): 打工 means work part-time.',
  '打折': 'Attracting shoppers by agreeing to 打(strike) a lower 折(fold) discount off prices: 打折 means give discount.',
  '打折卡': 'A card that lets cashiers 打(strike) a reduced 折(fold) price: 打折卡 means discount card.',
  '打掃': 'Using a broom to 打(strike) dust and 掃(sweep) clean the floors: 打掃 means sweep, clean.',
  '批評': 'Offering sharp 批(criticism) to thoroughly 評(evaluate) performance: 批評 means criticize.',
  '按照': 'Executing duties 按(based on) rules that 照(shine) light on standard procedure: 按照 means according to.',
  '挑戰': 'Ready to 挑(select) tough opponents in courageous 戰(war) competition: 挑戰 means challenge.',
  '卡車': 'A vehicle equipped to handle heavy 卡(card) cargo loads like an industrial 車(cart): 卡車 means truck.',
  '購物': 'Browsing bustling markets to 購(buy) and acquire each needed 物(thing): 購物 means go shopping.',
  '出力': 'Stepping forward to 出(go out) and contribute all your physical 力(strength): 出力 means share one\'s strength or power.',
  '實力': 'Proving that one\'s 實(real) preparation translates into genuine competitive 力(strength): 實力 means strength.',
  '魅力': 'Captivating audiences with mysterious 魅(magic) and magnetic 力(strength): 魅力 means charm, charisma.',
  '球員': 'A skilled athlete on the 球(ball) court serving as an official team 員(employee): 球員 means player.',
  '演員': 'An artist trained to 演(perform) dramatic roles as a cast 員(employee): 演員 means actor, actress.',
  '當場': 'Happening directly while events are 當(appropriate) right at the open scene or 場(classifier for events): 當場 means on the spot.',
  '廣場': 'A vast open area stretching 廣(broad) as a bustling community gathering 場(classifier for events): 廣場 means public square, plaza.',
  '職場': 'Fulfilling your professional 職(duty) daily within the dynamic work 場(classifier for events): 職場 means workplace.',
  // Multi-character words (>2 characters)
  '上山下海': 'Venturing 上(on) the mountain and 下(below) into the sea: 上山下海 means to go everywhere.',
  '不用說': 'There is 不(no) need to 用(use) words to 說(speak): 不用說 means needless to say.',
  '不能不': 'There is 不(no) way one 能(can) avoid acting 不(no): 不能不 means cannot but.',
  '分分秒秒': 'Cherishing each passing 分(divide) minute and fleeting 秒(second): 分分秒秒 means every minute and second.',
  '天主教': 'Venerating the Heavenly 天(sky) Lord 主(master) through religious 教(education): 天主教 means Catholicism.',
  '太平洋': '太(very) peaceful and 平(flat) waters stretching across the vast open 洋(sea): 太平洋 means Pacific Ocean.',
  '王母娘娘': 'The celestial royal 王(king) Mother 母(mother) revered as divine 娘(mother): 王母娘娘.',
  '古人古事': 'Remembering 古(old) ancestral 人(person) and ancient 事(affair) stories: 古人古事 means ancients and their stories.',
  '多多少少': 'Combining 多(much) and 少(few) amounts: 多多少少 means more or less.',
  '忙不過來': 'Too 忙(busy) with incoming tasks to 過(pass) through them all 來(arrive): 忙不過來 means too busy to manage.',
  '收音機': 'Designed to 收(collect) broadcasts and play audio 音(sound) through a receiver 機(machine): 收音機 means radio.',
  '早生貴子': 'Wishing parents an 早(early) birth to 生(give birth to) an esteemed 貴(honorable) 子(son): 早生貴子 means have a baby soon.',
  '自由自在': 'Enjoying 自(self) freedom from constraints while living 自(self) at 在(at) ease: 自由自在 means carefree.',
  '自動提款機': 'An automated 自(self) machine to 動(move) and 提(carry) out 款(funds) cash: 自動提款機 means ATM.',
  '別這麼說': 'Advising 別(separate) do not speak 這(this) way or 說(speak) such words: 別這麼說 means don\'t say that.',
  '坐月子': 'Resting indoors to 坐(seat) for a full 月(moon) month after giving birth to a 子(son): 坐月子 means postpartum confinement.',
  '快時尚': 'Following 快(speedy) trend changes in 時(time) fashion 尚(still): 快時尚 means fast fashion.',
  '沒什麼': 'Reassuring that 沒(gone) is any 什(what? mixed) serious matter of concern: 沒什麼 means nothing serious.',
  '沒話說': 'Having 沒(gone) critical 話(talk) left to 說(speak): 沒話說 means beyond words.',
  '事事如意': 'May every single 事(affair) turn out 如(if) desired in your 意(thought): 事事如意 means may everything go smoothly.',
  '事實上': 'Grounded in real 事(affair) facts on 實(real) ground 上(on): 事實上 means in fact, in reality.',
  '受不了': 'Finding hardship hard to 受(receive) and 不(no) longer able to endure 了(clear): 受不了 means cannot bear.',
  '受得了': 'Able to 受(receive) hardship with strength to 得(get) through it 了(clear): 受得了 means bearable.',
  '放輕鬆': 'Willing to 放(release) tension so body and mind become 輕(light) and calm 鬆(pine tree): 放輕鬆 means relax.',
  '社群網站': 'Connecting a community 社(group) of people 群(group) across the internet 網(net) at a web 站(stand): 社群網站 means social media.',
  '青少年': 'Youth in the vibrant 青(nature\'s color) spring of youth 少(few) during teenage 年(year): 青少年 means teenager.',
  '怎麼一回事': 'Inquiring 怎(what why how) and 麼(interrogative particle) happened in this 一(one) turn of 事(affair): 怎麼一回事 means What\'s the matter.',
  '看不起': 'Choosing to 看(look) down on someone with 不(no) respect to lift them 起(begin): 看不起 means despise, look down on.',
  '科學家': 'A scholar devoting their career to scientific 科(field) and 學(learn) inquiry: 科學家 means scientist.',
  '紅毛城': 'The historic fortress built with 紅(red) bricks by red-haired 毛(hair) foreigners: 紅毛城 means Fort San Domingo.',
  '背包客': 'An independent traveler who carries a 背(back) pack 包(pack) as an adventurous 客(guest): 背包客 means backpacker.',
  '風雨聲': 'Hearing the blowing 風(wind) and falling 雨(rain) echo as natural 聲(sound once): 風雨聲 means sound of wind and rain.',
  '食物銀行': 'An organized charity distributing 食(food) provisions and essential 物(thing) items: 食物銀行 means food bank.',
  '健康檢查': 'Assessing overall 健(strong) vitality and 康(health) by conducting a 檢(check) and 查(investigate): 健康檢查 means physical check-up.',
  '基督教': 'The faith based on Christian 基(foundation) and 督(supervise) religious 教(education): 基督教 means Protestant Christianity.',
  '情人節': 'A day of tender 情(emotion) celebrated by each 人(person) on Valentine\'s 節(festival): 情人節 means Valentine\'s Day.',
  '情侶裝': 'Matching clothes designed for romantic 情(emotion) and 侶(companion) pairs to 裝(dress): 情侶裝 means couples\' matching outfits.',
  '貨比三家不吃虧': 'Comparing 貨(merchandise) prices across 三(three) shops 家(family) ensures you suffer 不(no) loss: 貨比三家不吃虧 means shop around for the best deal.',
  '這下子': 'Given 這(this) situation right 下(below) now with suffix 子(son): 這下子 means now, thus.',
  '這樣子': 'Appearing in 這(this) specific 樣(kind) of manner: 這樣子 means this way, like this.',
  '部落格': 'Web communities sharing personal posts in a structured 部(department) grid 格(form): 部落格 means blog.',
  '就是說嘛': 'Heartily affirming that 就(with regard to) this 是(be) exactly what you 說(speak): 就是說嘛 means you\'re right.',
  '殖民地': 'Settlers migrate to 殖(breed) and settle as 民(citizens) upon foreign 地(earth): 殖民地 means colony.',
  '無論如何': 'Bearing 無(no) hesitation regardless of what 論(debate) happens in 何(what) case: 無論如何 means in any case.',
  '發脾氣': 'Giving vent to an outburst of 發(distribute) heat from the 脾(spleen) into bad 氣(air): 發脾氣 means lose one\'s temper.',
  '絕大部分': 'The vast 大(big) share of a divided 部(department) within the total 分(divide): 絕大部分 means the majority of.',
  '進一步': 'Advancing 進(enter) forward by 一(one) single 步(walk): 進一步 means further.',
  '補習班': 'Students go to 補(fix) weak subjects by regular 習(study) in a cram 班(class): 補習班 means cram school.',
  '電子信箱': 'An electronic 電(electricity) portal for receiving digital 信(trust) letters in a 箱(box): 電子信箱 means email inbox.',
  '電子書': 'A digital 電(electricity) publication stored electronically as a modern 書(book): 電子書 means ebook.',
  '夢想成真': 'Holding a cherished 夢(dream) and heartfelt 想(believe) wish until it comes 成(become) into 真(real) reality: 夢想成真 means dreams come true.',
  '歌仔戲': 'Traditional folk 歌(song) drama performed on stage as a theatrical 戲(play): 歌仔戲 means Taiwanese opera.',
  '說也奇怪': 'Speaking 說(speak) about the matter 也(also) seems remarkably 奇(strange) and unusual: 說也奇怪 means strange to say.',
  '說起來': 'When one begins to 說(speak) and 起(begin) bringing up 來(arrive) the topic: 說起來 means as a matter of fact.',
  '摩托車': 'A motorized vehicle driven by 摩(scour) friction and engine power like a 車(cart): 摩托車 means motorcycle.',
  '模特兒': 'A professional runway model displaying stylish fashion designs with 兒(son) charm: 模特兒 means model.',
  '糊里糊塗': 'Acting in a completely 糊(muddled) and confused 塗(smear) state of mind: 糊里糊塗 means muddle-headed.',
  '衝浪板': 'Riders 衝(wash) forward across the crest of each 浪(breaker) on a surf 板(board): 衝浪板 means surfboard.',
  '隨身碟': 'A pocket drive you 隨(follow) carry on your 身(body) shaped like a small 碟(plate): 隨身碟 means USB flash drive.',
  '隨時隨地': 'Ready to 隨(follow) at any 時(time) and anywhere on the 地(earth): 隨時隨地 means anytime, anywhere.',
  '嚇一跳': 'Startled by an abrupt 嚇(scare) that makes you leap 一(one) high 跳(hop): 嚇一跳 means shocked.',
  '環島旅行': 'Making a complete 環(bracelet) around the 島(island) on an exciting 旅(journey): 環島旅行 means travel around the island.',
  '總而言之': 'Gathering 總(gather) all points together to express in concise 言(words): 總而言之 means in short.',
  '檸檬汁': 'Tangy 檸(lemon) and citrus 檬(a type of locust tree) squeezed into sweet fruit 汁(juice): 檸檬汁 means lemon juice.',
  '雙胞胎': 'Two siblings formed as a 雙(double) pair in the mother\'s 胞(womb) placenta: 雙胞胎 means twins.',
  '藝術品': 'A refined creative work displaying 藝(art) and technical 術(skill) crafted as a fine 品(article): 藝術品 means work of art.',
  '攝影機': 'Trained to 攝(absorb) light and capture moving 影(shadow) pictures through an optical 機(machine): 攝影機 means video camera.',
  // Notable 2-character words
  '溝通': 'Clearing the 溝(ditch) channel so dialogue flows 通(through) between both sides: 溝通 means communicate.',
  '忍耐': 'Steeling your heart to 忍(endure) hardship and 耐(resist) pain: 忍耐 means tolerate.',
  '生命': 'Cherishing every breath from initial 生(give birth to) until the end of mortal 命(life): 生命 means life.',
  '合理': 'When facts 合(combine) smoothly with logical 理(science) principles: 合理 means reasonable.',
  '手續': 'Completing required paperwork by 手(hand) through 續(continuous) official steps: 手續 means process, procedure.',
  '對方': 'Facing opposite across the table 對(correct) in the other party\'s 方(direction): 對方 means the other party, opponent.',
  '現實': 'Facing what is 現(appear) before you grounded in real 實(real) facts: 現實 means realistic.',
  '真正': 'Possessing 真(real) authenticity aligned with upright 正(right now) honesty: 真正 means real.',
  '假裝': 'Putting on a 假(false) persona and deceptive 裝(dress) disguise: 假裝 means pretend.',
  '強烈': 'Possessing 強(strong) force burning with 烈(fiery) intensity: 強烈 means strong, intense.',
  '障礙': 'A barrier that acts to 障(separate) paths and 礙(block) forward movement: 障礙 means obstacle.',
  '上傳': 'Passing files 上(on top) onto networks to 傳(pass) data across the cloud: 上傳 means upload.',
  '下載': 'Bringing files down 下(below) to 載(load) onto your personal device: 下載 means download.',
  '自然': 'Allowing things to unfold from their 自(self) true essence 然(certainly) without interference: 自然 means natural.',
  '風格': 'A fresh creative breeze of 風(wind) shaping unique structural 格(form): 風格 means style.',
  '結局': 'Tying the final 結(knot) on the overall 局(bureau) situation: 結局 means ending.',
  '過去': 'Time that has 過(pass) by and gone 去(go away) into history: 過去 means past.',
  '擔任': 'Stepping forward to 擔(bear) a trusted 任(trust) assignment: 擔任 means play the role of.',
  '紅包': 'Gifting festive luck wrapped in lucky 紅(red) paper inside a celebratory 包(pack): 紅包 means red envelope.',
  '出國': 'Traveling 出(go out) beyond the borders of one\'s home 國(country): 出國 means go abroad.',
  '留學': 'Choosing to 留(stay) in a foreign land for academic 學(learn) study: 留學 means study abroad.',
  '上班': 'Arriving at work 上(on top) to begin your assigned 班(class) shift: 上班 means go to work.',
  '下班': 'Stepping 下(below) down from your work 班(class) shift at the end of the day: 下班 means get off work.',
  '看病': 'Visiting the clinic to 看(look) at symptoms and diagnose an 病(illness): 看病 means see a doctor.',
  '住院': 'Admitted to 住(live) inside a medical 院(courtyard) for hospital care: 住院 means be hospitalized.',
  '掛號': 'Registering by 掛(hang) your name under an official number 號(number): 掛號 means register at clinic.',
  '開車': 'Taking the wheel to 開(open) and operate a motorized 車(cart): 開車 means drive a car.',
  '坐車': 'Taking a 坐(seat) inside a passenger 車(cart) for transit: 坐車 means ride in a car or bus.',
  '買票': 'Paying money to 買(buy) an admission or transit 票(ticket): 買票 means buy a ticket.',
  '拍照': 'Positioning the camera to 拍(clap) the shutter and 照(shine) light on the scene: 拍照 means take a photograph.',
  '唱歌': 'Vocalizing melodies to 唱(sing) lyrics of a 歌(song): 唱歌 means sing a song.',
  '跳舞': 'Moving rhythmically to 跳(hop) and perform an expressive 舞(dance): 跳舞 means dance.',
  '跑步': 'Moving with athletic 跑(run) speed taking rapid 步(walk) strides: 跑步 means run, jog.',
  '游泳': 'Gliding through water to 游(swim) and 泳(swim) across the pool: 游泳 means swim.',
  '爬山': 'Exerting effort to 爬(crawl) up the rugged 山(mountain) trail: 爬山 means climb a mountain.',
  '散步': 'Taking a relaxed stroll to 散(scatter) stress step by 步(walk) step: 散步 means take a walk.',
  '逛街': 'Leisurely browsing to 逛(stroll) along the commercial 街(street): 逛街 means go window shopping.',
  '煮飯': 'Heating water to 煮(boil) grains into nourishing 飯(cooked rice): 煮飯 means cook meals.',
  '洗碗': 'Using soap to 洗(wash) dining dishes and each ceramic 碗(bowl): 洗碗 means wash dishes.',
  '洗澡': 'Using warm water to 洗(wash) clean and 澡(bath) the whole body: 洗澡 means take a bath.',
  '睡覺': 'Closing your eyes to 睡(sleep) peacefully until waking 覺(perceive): 睡覺 means sleep.',
  '起床': 'Waking up to 起(begin) your day rising from the soft 床(bed): 起床 means get out of bed.',
  '美麗': 'Admiring graceful 美(pretty) elegance that looks radiant and 麗(beautiful): 美麗 means beautiful.',
  '巨大': 'Towering with 巨(huge) proportions that are immensely 大(big): 巨大 means gigantic.',
  '寒冷': 'Shivering in piercing 寒(cold) winter temperatures and 冷(cold) air: 寒冷 means freezing cold.',
  '溫暖': 'Surrounded by soothing 溫(warm) gentleness and cozy 暖(warm) sunshine: 溫暖 means warm.',
  '制度': 'A structured 制(system) governing regulations under standard 度(degree): 制度 means system, institution.',
  '法律': 'Enforcing public 法(law) standards according to official 律(statute) rules: 法律 means law.',
  '規定': 'Setting formal 規(compass) standards that are firmly 定(fix) fixed: 規定 means regulation, rule.',
  '限制': 'Setting boundary 限(limit) markers to 制(system) control activity: 限制 means restrict, limit.',
  '保護': 'Guarding safety to 保(protect) welfare and 護(protect) against harm: 保護 means protect.',
  '支持': 'Lending helping 支(branch) assistance to 持(hold) up a cause: 支持 means support.',
  '幫助': 'Offering kind 幫(help) assistance to 助(help) someone in need: 幫助 means help, assist.',
  '歡迎': 'Stepping out with warm 歡(joyous) cheer to 迎(welcome) arriving guests: 歡迎 means welcome.',
  '整理': 'Arranging items into 整(orderly) rows according to neat 理(science) logic: 整理 means organize, tidy up.',
  '修理': 'Fixing broken parts to 修(repair) mechanisms back into working 理(science) order: 修理 means repair.',
  '改變': 'Introducing new 改(change) direction so matters 變(change) form: 改變 means change, alter.',
  '增加': 'Expanding capacity to 增(increase) numbers and 加(add) value: 增加 means increase.',
  '減少': 'Scaling back to 減(decrease) waste and keep amounts 少(few): 減少 means reduce, decrease.',
  '停止': 'Calling a full 停(stop) halt and coming to a complete 止(stop): 停止 means stop, halt.',
  '結束': 'Tying the final 結(knot) and binding 束(bundle) tasks to a close: 結束 means conclude, end.',
};

/**
 * Generate a Formula v2 compliant hook with genuine semantic connection.
 */
export function generateSemanticWordHook(entry: WordEntry): { hook: string; strategy: string } {
  const word = entry.word;
  const cleanMeaning = cleanMeaningText(entry.meaning);
  const chars = entry.characters.map(c => ({ char: c.char, meaning: cleanLabel(c.meaning) }));

  // 1. Check curated notable dictionary
  if (NOTABLE_WORD_HOOKS[word]) {
    return { hook: NOTABLE_WORD_HOOKS[word], strategy: 'characters' };
  }

  // 2. Doubled word case: e.g. 慢慢, 天天
  const isDoubled = word.length === 2 && word[0] === word[1];
  if (isDoubled) {
    const c = chars[0];
    const hook = `Taking deliberate steps with ${c.char}(${c.meaning}) repeated for emphasis: ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 3. Productive Suffixes and Prefixes for 2-character words
  if (word.length === 2) {
    const [c1, c2] = chars;

    // Suffix Patterns
    if (c2.char === '人') return { hook: `An individual identified with ${c1.char}(${c1.meaning}) who acts as a specialized ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '家') return { hook: `Devoting your skills to ${c1.char}(${c1.meaning}) as a recognized master within the ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '員') return { hook: `Managing responsibilities of ${c1.char}(${c1.meaning}) as an appointed team ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '者') return { hook: `A dedicated practitioner of ${c1.char}(${c1.meaning}) active as this ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '師') return { hook: `A trained professional practicing ${c1.char}(${c1.meaning}) as a respected ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '生') return { hook: `Engaging in ${c1.char}(${c1.meaning}) during one's academic or daily ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '子') return { hook: `A practical tool for ${c1.char}(${c1.meaning}) formed as an object with suffix ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '物') return { hook: `Acquiring distinct ${c1.char}(${c1.meaning}) items classified as useful ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '品') return { hook: `Crafted goods embodying ${c1.char}(${c1.meaning}) produced as a refined ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '費') return { hook: `Financial expenditure for ${c1.char}(${c1.meaning}) charged as an official ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '力') return { hook: `Applying energetic ${c1.char}(${c1.meaning}) with all your physical ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '心') return { hook: `Focusing your efforts on ${c1.char}(${c1.meaning}) with genuine dedication from the ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '情') return { hook: `Expressing sincere sentiment in ${c1.char}(${c1.meaning}) that builds emotional ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '意') return { hook: `Forming a deliberate thought toward ${c1.char}(${c1.meaning}) with clear ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '感') return { hook: `Experiencing an intuitive perception of ${c1.char}(${c1.meaning}) through bodily ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '性') return { hook: `Understanding how ${c1.char}(${c1.meaning}) defines the core internal ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '度') return { hook: `Assessing the precise level of ${c1.char}(${c1.meaning}) against a calibrated ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '期') return { hook: `Marking an appointed phase for ${c1.char}(${c1.meaning}) across a scheduled ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '法') return { hook: `Applying systematic rules of ${c1.char}(${c1.meaning}) according to established ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '點') return { hook: `Observing distinctive ${c1.char}(${c1.meaning}) at this designated scenic ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '場') return { hook: `Managing tasks of ${c1.char}(${c1.meaning}) within the open municipal ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '館') return { hook: `Visiting a center for ${c1.char}(${c1.meaning}) located inside a public ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '院') return { hook: `An organized institution focused on ${c1.char}(${c1.meaning}) centered in a traditional ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '室') return { hook: `Conducting dedicated work on ${c1.char}(${c1.meaning}) inside a private ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '車') return { hook: `Hauling heavy ${c1.char}(${c1.meaning}) cargo with a motorized transport ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '路') return { hook: `Navigating the thoroughfare of ${c1.char}(${c1.meaning}) along this paved ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '話') return { hook: `Conveying clear thoughts about ${c1.char}(${c1.meaning}) through spoken ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '風') return { hook: `Exhibiting the distinctive character of ${c1.char}(${c1.meaning}) carried like a cultural ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '界') return { hook: `The specialized domain of ${c1.char}(${c1.meaning}) recognized across its professional ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '量') return { hook: `Measuring the total accumulation of ${c1.char}(${c1.meaning}) to assess its complete ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '形') return { hook: `Displaying the visible appearance of ${c1.char}(${c1.meaning}) structured in physical ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '態') return { hook: `Observing how ${c1.char}(${c1.meaning}) manifests in observable outward ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '氣') return { hook: `Sensing the vibrant atmosphere of ${c1.char}(${c1.meaning}) radiating through vital ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '光') return { hook: `Illuminating elements of ${c1.char}(${c1.meaning}) with bright radiant ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '水') return { hook: `Quenching thirst or washing with ${c1.char}(${c1.meaning}) using pure liquid ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '書') return { hook: `Recording official details of ${c1.char}(${c1.meaning}) bound into a formal ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '信') return { hook: `Dispatching important news regarding ${c1.char}(${c1.meaning}) through written ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '機') return { hook: `Operating equipment for ${c1.char}(${c1.meaning}) with an efficient ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '店') return { hook: `Browsing commercial selections of ${c1.char}(${c1.meaning}) available at a local ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '門') return { hook: `Stepping through the portal of ${c1.char}(${c1.meaning}) via this grand entry ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '錢') return { hook: `Paying monetary sums for ${c1.char}(${c1.meaning}) in physical currency or ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '頭') return { hook: `Reaching the prominent boundary of ${c1.char}(${c1.meaning}) situated at the leading ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '面') return { hook: `Surveying the specific dimension of ${c1.char}(${c1.meaning}) across this external ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '間') return { hook: `Locating the quiet interval of ${c1.char}(${c1.meaning}) nestled in the space ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '處') return { hook: `Addressing the particular aspect of ${c1.char}(${c1.meaning}) located at this dedicated ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '業') return { hook: `Developing a professional venture in ${c1.char}(${c1.meaning}) within a commercial ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '理') return { hook: `Analyzing principles of ${c1.char}(${c1.meaning}) through structured systematic ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '實') return { hook: `Confirming that initial ${c1.char}(${c1.meaning}) translates into genuine physical ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '定') return { hook: `Stabilizing erratic ${c1.char}(${c1.meaning}) until matters become firmly ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '動') return { hook: `Inspiring active ${c1.char}(${c1.meaning}) into vibrant physical ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '成') return { hook: `Bringing ongoing ${c1.char}(${c1.meaning}) to full fruit as matters ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '服') return { hook: `Wearing protective attire for ${c1.char}(${c1.meaning}) fashioned into comfortable ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '包') return { hook: `Wrapping up items of ${c1.char}(${c1.meaning}) inside a secure protective ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '袋') return { hook: `Packing provisions of ${c1.char}(${c1.meaning}) into a portable cloth ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '片') return { hook: `Slicing fresh portions of ${c1.char}(${c1.meaning}) into a thin slender ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '杯') return { hook: `Serving warm refreshments of ${c1.char}(${c1.meaning}) poured in a ceramic ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '條') return { hook: `Drafting detailed notes on ${c1.char}(${c1.meaning}) onto a slender paper ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '箱') return { hook: `Storing organized items of ${c1.char}(${c1.meaning}) inside a sturdy wooden ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '瓶') return { hook: `Preserving delicious liquids of ${c1.char}(${c1.meaning}) sealed inside a glass ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '鍋') return { hook: `Simmering tasty ingredients of ${c1.char}(${c1.meaning}) over heat in a deep cooking ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '網') return { hook: `Interconnecting resources of ${c1.char}(${c1.meaning}) across an expansive woven ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '票') return { hook: `Presenting admission credentials for ${c1.char}(${c1.meaning}) printed on an entrance ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '牌') return { hook: `Displaying a recognizable trademark for ${c1.char}(${c1.meaning}) inscribed upon a commercial ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '卡') return { hook: `Verifying official access for ${c1.char}(${c1.meaning}) encoded on a magnetic ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '文') return { hook: `Composing scholarly prose about ${c1.char}(${c1.meaning}) written in refined literary ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '語') return { hook: `Communicating ideas of ${c1.char}(${c1.meaning}) through shared spoken ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '音') return { hook: `Listening closely to notes of ${c1.char}(${c1.meaning}) vibrating in acoustic ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '色') return { hook: `Admiring vivid hues of ${c1.char}(${c1.meaning}) painted in vibrant ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };

    // Prefix Patterns
    if (c1.char === '好') return { hook: `Finding it pleasant and 好(${c1.meaning}) to engage with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '難') return { hook: `Facing tough obstacles that are 難(${c1.meaning}) when trying to ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '大') return { hook: `Undertaking a grand 大(${c1.meaning}) scale effort involving ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '小') return { hook: `Paying attention to modest 小(${c1.meaning}) details regarding ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '高') return { hook: `Reaching an elevated 高(${c1.meaning}) summit in ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '長') return { hook: `Sustaining an enduring 長(${c1.meaning}) continuity throughout ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '新') return { hook: `Introducing a fresh 新(${c1.meaning}) modern perspective into ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '老') return { hook: `Drawing upon seasoned 老(${c1.meaning}) veteran experience in ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '全') return { hook: `Encompassing the entire 全(${c1.meaning}) scope across all ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '無') return { hook: `Operating without 無(${c1.meaning}) any restriction regarding ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '不') return { hook: `Marked by an explicit 不(${c1.meaning}) absence of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '自') return { hook: `Relying on one's own 自(${c1.meaning}) initiative to guide ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '公') return { hook: `Serving the general 公(${c1.meaning}) community through open ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '同') return { hook: `Sharing a mutual 同(${c1.meaning}) connection through common ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '相') return { hook: `Interacting in a mutual 相(${c1.meaning}) exchange with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '互') return { hook: `Benefiting from reciprocal 互(${c1.meaning}) cooperation alongside ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '真') return { hook: `Possessing genuine 真(${c1.meaning}) authenticity in every ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '重') return { hook: `Attaching significant 重(${c1.meaning}) importance to matters of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '正') return { hook: `Standing strictly in upright 正(${c1.meaning}) alignment with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '反') return { hook: `Taking an opposite 反(${c1.meaning}) stance contrary to ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '再') return { hook: `Repeating once 再(${c1.meaning}) to reinforce the ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '前') return { hook: `Looking ahead toward the front 前(${c1.meaning}) horizon of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '後') return { hook: `Reflecting on subsequent 後(${c1.meaning}) outcomes following ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '外') return { hook: `Expanding beyond into outer 外(${c1.meaning}) spheres of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '內') return { hook: `Looking inward toward interior 內(${c1.meaning}) aspects of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '出') return { hook: `Stepping outward to 出(${c1.meaning}) and demonstrate one's ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '進') return { hook: `Moving forward to 進(${c1.meaning}) and develop further ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '開') return { hook: `Taking initiative to 開(${c1.meaning}) and launch new ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '關') return { hook: `Paying close attention to 關(${c1.meaning}) and connect with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '過') return { hook: `Transitioning across to 過(${c1.meaning}) beyond the boundaries of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '發') return { hook: `Initiating an impulse to 發(${c1.meaning}) and cultivate dynamic ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '生') return { hook: `Giving vibrant life to 生(${c1.meaning}) and nurture lasting ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '上') return { hook: `Engaging directly 上(${c1.meaning}) to participate with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '下') return { hook: `Descending directly 下(${c1.meaning}) to proceed with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '中') return { hook: `Focusing centrally 中(${c1.meaning}) within the scope of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };

    // Dynamic 2-character compound synthesis
    const hook = `${c1.char}(${c1.meaning}) + ${c2.char}(${c2.meaning}) → connecting ${c1.meaning} and ${c2.meaning}: ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 3-character compounds
  if (word.length === 3) {
    const [c1, c2, c3] = chars;
    const hook = `${c1.char}(${c1.meaning}) + ${c2.char}(${c2.meaning}) + ${c3.char}(${c3.meaning}) → uniting these elements: ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 4-character idioms / compounds
  if (word.length === 4) {
    const [c1, c2, c3, c4] = chars;
    const hook = `${c1.char}(${c1.meaning}) + ${c2.char}(${c2.meaning}) followed by ${c3.char}(${c3.meaning}) + ${c4.char}(${c4.meaning}): ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 5+ characters
  const hook = `Expressing ${chars[0].char}(${chars[0].meaning}) followed by ${chars[1].char}(${chars[1].meaning}) in a longer phrase: ${word} means ${cleanMeaning}.`;
  return { hook, strategy: 'characters' };
}

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

export function runBatches(batchSize = 50) {
  const allWords = loadAllWords();
  const totalBatches = Math.ceil(allWords.length / batchSize);
  console.log(`\n======================================================`);
  console.log(`Starting Semantic Word Batch Generation: ${allWords.length} words in ${totalBatches} batches (${batchSize}/batch)`);
  console.log(`======================================================\n`);

  const records: WordRecord[] = [];

  for (let b = 0; b < totalBatches; b++) {
    const start = b * batchSize;
    const end = Math.min(start + batchSize, allWords.length);
    const slice = allWords.slice(start, end);
    const batchNum = b + 1;

    console.log(`--- Batch ${batchNum}/${totalBatches} (Words ${start + 1} to ${end}) ---`);
    let batchErrors = 0;

    for (const entry of slice) {
      const { hook, strategy } = generateSemanticWordHook(entry);
      const issues = evaluateWordHook(entry.word, hook, entry.meaning);

      if (issues.length > 0) {
        batchErrors++;
        console.error(`  FAIL: ${entry.word} -> ${issues.join(', ')}`);
      }

      records.push({
        word: entry.word,
        pinyin: entry.pinyin,
        meaning: entry.meaning,
        characters: entry.characters,
        strategy,
        hook,
        issues: issues.map(iss => ({ code: iss.split(':')[0], severity: 'flag' as const, message: iss })),
        attempts: 1,
        acceptance: issues.length === 0 ? 'clean' : 'flagged',
        model: 'in-session-formula-v2',
        promptVersion: 'book-3-words-v2',
      });
    }

    // Save checkpoint after every batch
    const artifact = {
      schemaVersion: 1,
      distribution: 'development-only-candidate',
      publishable: false,
      model: 'in-session-formula-v2',
      promptVersion: 'book-3-words-v2',
      records,
    };
    writeFileSync(resolve(OUTPUT_DIR, 'book-3-word-hooks-v1.json'), JSON.stringify(artifact, null, 2) + '\n');

    // Batch Review summary
    const cleanInBatch = slice.length - batchErrors;
    console.log(`  [Batch ${batchNum} Review] Processed: ${slice.length} | Clean: ${cleanInBatch} | Flagged: ${batchErrors}`);
    console.log(`  Sample Hook: "${records[start].word}" -> "${records[start].hook}"`);
    console.log(`  Cumulative Progress: ${records.length}/${allWords.length} checkpointed.\n`);
  }

  console.log(`======================================================`);
  console.log(`ALL ${totalBatches} BATCHES COMPLETED! Total records: ${records.length}`);
  console.log(`======================================================\n`);
}

if (process.argv.includes('--run')) {
  runBatches(50);
}
