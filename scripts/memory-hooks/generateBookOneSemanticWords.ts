import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTaughtSenses, labelAlignsWithMeaning, findAlignmentFindings } from './checkComponentLabelAlignment';
import { findWordOrderMismatches, singleGlyphTokens } from './checkComponentOrder';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

const inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), 'utf8'));
const { meanings: taughtByGlyph, readings: readingsByGlyph } = buildTaughtSenses(inventory.entries);

const profiles1 = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json'), 'utf8'));
const approvedLabels = new Map<string, string[]>();
for (const p of profiles1.profiles) {
  const labels = p.approvedDefaultLabels.map((e: { label: string }) => e.label.toLowerCase()).filter(Boolean);
  if (labels.length > 0) approvedLabels.set(p.glyph, [...new Set([...(approvedLabels.get(p.glyph) || []), ...labels])]);
}

// Special curated labels for Book 1 that are guaranteed to align with taught inventory senses
export const SPECIAL_LABELS: Record<string, string> = {
  '子': 'child',
  '兒': 'son',
  '公': 'public',
  '為': 'do',
  '老': 'old',
  '世': 'world',
  '界': 'boundary',
  '片': 'slice',
  '場': 'open space',
  '會': 'meet',
  '空': 'empty',
  '了': 'clear',
  '記': 'record',
  '要': 'want',
  '麼': 'particle',
  '樣': 'form',
  '學': 'learn',
  '運': 'transport',
  '禮': 'courtesy',
  '上': 'above',
  '許': 'promise',
  '小': 'small',
  '作': 'make',
  '候': 'wait',
  '里': 'village',
  '太': 'too',
  '去': 'go',
  '鐵': 'iron',
  '生': 'birth',
  '有': 'have',
  '闆': 'boss',
  '朵': 'flower',
  '衣': 'clothes',
  '服': 'wear',
  '訴': 'accuse',
  '樂': 'music',
  '係': 'connect',
  '體': 'body',
  '辛': 'bitter',
  '情': 'feeling',
  '朋': 'friend',
  '附': 'adhere',
  '封': 'envelope',
  '前': 'front',
  '活': 'live',
  '動': 'move',
  '相': 'mutual',
  '程': 'journey',
  '容': 'contain',
  '興': 'flourish',
  '常': 'frequent',
  '就': 'approach',
  '單': 'single',
  '超': 'surpass',
  '越': 'exceed',
  '媽': 'mother',
  '想': 'think',
  '冒': 'risk',
  '踏': 'tread',
  '碼': 'number',
  '院': 'courtyard',
  '對': 'correct',
  '語': 'language',
  '巴': 'desire',
  '談': 'talk',
  '應': 'should',
  '聰': 'clever',
  '話': 'speech',
  '醫': 'cure',
  '覺': 'conscious',
  '麵': 'noodles',
  '理': 'reason',
  '感': 'sense',
  '希': 'hope',
  '望': 'expect',
  '魯': 'foolish',
  '的': 'possessive',
  '紹': 'introduce',
  '律': 'statute',
  '級': 'level',
  '曬': 'dry in the sun',
  '咖': 'coffee',
  '啡': 'coffee',
  '淇': 'river',
  '淋': 'drench',
  '菲': 'fragrant',
  '賓': 'guest',
  '潭': 'deep pool',
  '博': 'wide',
  '館': 'building',
  '鐘': 'bell',
  '考': 'test',
  '視': 'look at',
  '影': 'shadow',
  '圖': 'picture',
  '書': 'book',
  '介': 'lie between',
  '司': 'take charge',
  '百': 'hundred',
  '貨': 'goods',
  '珍': 'precious',
  '珠': 'pearl',
  '奶': 'milk',
  '茶': 'tea',
  '冷': 'cold',
  '氣': 'air',
  '機': 'machine',
  '歡': 'happy',
  '迎': 'welcome',
  '廳': 'hall',
  '明': 'bright',
  '天': 'day',
  '見': 'see',
  '星': 'star',
  '期': 'period',
  '什': 'what',
  '計': 'calculate',
  '車': 'car',
  '差': 'differ',
  '不': 'not',
  '多': 'many',
  '接': 'receive',
  '電': 'electricity',
  '聊': 'chat',
  '幾': 'how many',
  '點': 'point',
  '中': 'middle',
  '市': 'market',
  '照': 'shine',
  '腳': 'foot',
  '郵': 'mail',
  '件': 'item',
  '室': 'room',
  '護': 'protect',
  '師': 'teacher',
  '陽': 'sun',
  '十': 'ten',
  '字': 'character',
  '路': 'road',
  '口': 'mouth',
  '印': 'seal',
  '尼': 'nun',
  '美': 'beautiful',
  '國': 'country',
  '馬': 'horse',
  '韓': 'Korea',
};

export function getSafeLabel(char: string): string {
  if (SPECIAL_LABELS[char]) return SPECIAL_LABELS[char];
  const taught = taughtByGlyph.get(char);
  if (taught) {
    const candidates = taught.split(/[;,/]/).map((s: string) => s.replace(/^to\s+/i, '').replace(/[()"]/g, '').trim()).filter(Boolean);
    for (const c of candidates) {
      if (labelAlignsWithMeaning(c, taught, readingsByGlyph.get(char) || [])) {
        return c;
      }
    }
  }
  const app = approvedLabels.get(char);
  if (app && app.length > 0) return app[0];
  return readingsByGlyph.get(char)?.[0] || 'char';
}

function cleanMeaningText(meaning: string): string {
  let text = meaning.split(';')[0].trim().replace(/^to\s+/i, '');
  text = text.replace(/M:\s*.*$/i, '');
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

// Handcrafted semantic hooks for notable Book 1 vocabulary
export const NOTABLE_BOOK_ONE_HOOKS: Record<string, string> = {
  // Multi-character (>2) words
  '公共汽車': 'A large transit vehicle for the 公(public) to 共(common) ride powered by 汽(steam) engine 車(car): 公共汽車 means bus.',
  '太魯閣': 'The grand canyon trail where 太(too) steep cliffs meet rugged 魯(foolish) boulders beside a high mountain 閣(pavilion): 太魯閣 means Taroko Gorge.',
  '日月潭': 'A scenic highland lake where the 日(sun) shaped basin joins the crescent 月(moon) shore over a deep 潭(deep pool): 日月潭 means Sun Moon Lake.',
  '牛肉麵': 'Simmering tender 牛(cow) flank 肉(meat) served over hot broth and fresh 麵(noodles): 牛肉麵 means beef noodles.',
  '世界上': 'Every living creature across the human 世(world) within earth boundary 界(boundary) living 上(above) the land: 世界上 means in the world.',
  '台北101': 'The soaring skyscraper in northern Taiwan uniting 台(platform) and capital 北(north) rising 101 stories: 台北101 means Taipei 101.',
  '台灣高鐵': 'Connecting the island from 台(platform) harbor 灣(bay) along 高(tall) speed tracks built of heavy 鐵(iron): 台灣高鐵 means Taiwan High Speed Rail.',
  '巧克力': 'Confectioners use 巧(clever) recipes to 克(overcome) bitter cacao with the rich sweet 力(power) of cocoa: 巧克力 means chocolate.',
  '打電話': 'Using your fingers to 打(hit) the keypad and send 電(electricity) signals carry human 話(speech): 打電話 means make a phone call.',
  '冰淇淋': 'Chilled sweet cream cold as 冰(ice) scooped like river 淇(river) pebbles to 淋(drench) with sweet syrup: 冰淇淋 means ice cream.',
  '合歡山': 'Hikers 合(combine) together in 歡(happy) fellowship to summit the scenic 山(mountain): 合歡山 means Hehuan Mountain.',
  '有一點兒': 'When you 有(have) only 一(one) tiny 點(point) of an item with a spoken 兒(son) lilt: 有一點兒 means a little.',
  '有的時候': 'Occasions that 有(have) their own specific nature 的(possessive) arriving at an interval of 時(time) while you 候(wait): 有的時候 means sometimes.',
  '有意思': 'Engaging thoughts that 有(have) deep artistic 意(idea) that make you 思(think): 有意思 means interesting.',
  '百貨公司': 'A grand shopping venue offering 百(hundred) varieties of 貨(goods) run by a 公(public) business to 司(take charge): 百貨公司 means department store.',
  '自我介紹': 'Speaking for one self 自(self) to present 我(I) by stepping in to 介(lie between) strangers and 紹(introduce) yourself: 自我介紹 means self-introduction.',
  '西子灣': 'The scenic sunset beach in the 西(west) named after a legendary beauty 子(child) sheltered along a tranquil 灣(bay): 西子灣 means Sizihwan.',
  '冷氣機': 'An appliance blowing chilled 冷(cold) refreshing 氣(air) powered by an electric 機(machine): 冷氣機 means air conditioner.',
  '沒有空': 'Having 沒(not have) any schedule where you 有(have) leisure or 空(empty) moments: 沒有空 means unavailable.',
  '沒問題': 'When there is 沒(not have) need to 問(ask) doubts about this 題(topic): 沒問題 means no problem.',
  '沒關係': 'Assured that there is 沒(not have) vital reason to 關(close) doors or 係(connect) blame: 沒關係 means it does not matter.',
  '受歡迎': 'A charismatic personality who can 受(receive) enthusiastic 歡(happy) cheers and warm 迎(welcome) anywhere: 受歡迎 means popular.',
  '咖啡廳': 'A relaxing lounge where roasted 咖(coffee) beans and brewed 啡(coffee) are served in an open 廳(hall): 咖啡廳 means café.',
  '明天見': 'Looking forward to the 明(bright) sunrise of the next 天(day) when we will 見(see) each other: 明天見 means see you tomorrow.',
  '怎麼樣': 'Inquiring 怎(how) a plan appears with a gentle 麼(particle) in its current 樣(form): 怎麼樣 means how about it.',
  '星期天': 'The culminating day of the planetary 星(star) weekly 期(period) devoted to a full 天(day) of rest: 星期天 means Sunday.',
  '為什麼': 'Asking for what purpose one would 為(do) an action, questioning 什(what) with an inquiring 麼(particle): 為什麼 means why.',
  '珍珠奶茶': 'Chewy tapioca rounds prized like 珍(precious) glowing 珠(pearl) stirred into creamy 奶(milk) and black 茶(tea): 珍珠奶茶 means bubble milk tea.',
  '計程車': 'A commercial passenger vehicle equipped to 計(calculate) the fare for your travel 程(journey) inside a metered 車(car): 計程車 means taxi.',
  '差不多': 'When measurements 差(differ) by an amount that is 不(not) very 多(many): 差不多 means approximately.',
  '接電話': 'Reaching out to 接(receive) incoming 電(electricity) signals that carry spoken 話(speech): 接電話 means answer the phone.',
  '聊天兒': 'Passing idle hours to 聊(chat) under the open 天(day) with a cheerful 兒(son) spoken rhythm: 聊天兒 means chat.',
  '博物館': 'A majestic repository housing a 博(wide) collection of historical 物(thing) inside a public 館(building): 博物館 means museum.',
  '幾點鐘': 'Asking 幾(how many) hour markers stand at this 點(point) on the ticking clock 鐘(bell): 幾點鐘 means what time.',
  '期中考': 'An academic evaluation held across the semester 期(period) right in the 中(middle) to 考(test) student knowledge: 期中考 means midterm exam.',
  '菲律賓': 'An archipelago of lush 菲(fragrant) isles governed by constitutional 律(statute) that warmly welcomes each foreign 賓(guest): 菲律賓 means the Philippines.',
  '超級市場': 'A grocery depot designed to 超(surpass) everyday standard 級(level) scale as a giant 市(market) across a vast open 場(open space): 超級市場 means supermarket.',
  '照相機': 'Using optical lenses to 照(shine) light and capture a person visible 相(mutual) likeness through a mechanical 機(machine): 照相機 means camera.',
  '腳踏車': 'A pedal-driven vehicle where you use each 腳(foot) to 踏(tread) the pedals and propel the 車(car): 腳踏車 means bicycle.',
  '電子郵件': 'Digital communications sent via 電(electricity) with particle 子(child) circuits dispatched as postal 郵(mail) in a single message 件(item): 電子郵件 means email.',
  '電視機': 'A household screen using 電(electricity) so viewers can 視(look at) broadcasts on a media 機(machine): 電視機 means television set.',
  '電影院': 'Projecting dynamic 電(electricity) lighting and moving 影(shadow) pictures inside a theatrical 院(courtyard): 電影院 means movie theater.',
  '圖書館': 'A quiet learning center preserving reference 圖(picture) maps and printed 書(book) volumes inside a grand public 館(building): 圖書館 means library.',
  '對不起': 'Apologizing because one actions failed to be 對(correct) and one can 不(not) hold one head 起(rise) high: 對不起 means sorry.',
  '演唱會': 'Music fans gather as talented artists 演(perform) live and 唱(sing) songs where crowds 會(meet): 演唱會 means concert.',
  '語言交換': 'Partners practicing spoken 語(language) and oral 言(speech) by letting native fluency 交(intersect) and mutually 換(change) skills: 語言交換 means language exchange.',
  '辦公室': 'A professional workspace where administrators 辦(manage) official 公(public) duties inside a dedicated 室(room): 辦公室 means office.',
  '護理師': 'A healthcare professional trained to 護(protect) patients, administer medical 理(reason) care, and serve as a certified 師(teacher): 護理師 means nurse.',
  '曬太陽': 'Lounging outdoors to 曬(dry in the sun) comfortably under the 太(too) warm rays of the morning 陽(sun): 曬太陽 means bask in the sun.',
  '十字路口': 'Where four streets form a 十(ten) cross 字(character) along the traffic 路(road) at the intersection 口(mouth): 十字路口 means intersection.',
  '一點兒': 'Taking only 一(one) small 點(point) of an item with a light 兒(son) spoken ending: 一點兒 means a little bit.',
  '什麼時候': 'Asking 什(what) kind of 麼(particle) moment during this 時(time) while you 候(wait): 什麼時候 means when.',
  '下午茶': 'A midday break stepping 下(below) afternoon 午(noon) to sip refreshing 茶(tea): 下午茶 means afternoon tea.',

  // Notable 2-character words
  '一半': 'Dividing 一(one) whole portion into an exact 半(half): 一半 means one half.',
  '一共': 'Summing each 一(one) individual item into a 共(common) shared total: 一共 means altogether.',
  '一些': 'Gathering 一(one) modest cluster of 些(some) assorted items: 一些 means some, a few.',
  '一定': 'Fixing 一(one) definite plan so certainty remains firmly 定(fixed): 一定 means certainly, definitely.',
  '一起': 'Joining together as 一(one) unit to 起(rise) in shared purpose: 一起 means together.',
  '一樣': 'Sharing 一(one) identical 樣(form) in every observable detail: 一樣 means the same.',
  '印尼': 'A sound-match for Indonesia: stamped like an official 印(seal) across islands where 尼(nun) temples stand: 印尼 means Indonesia.',
  '咖啡': 'A popular fragrant brew where aromatic 咖(coffee) beans are ground into dark rich 啡(coffee): 咖啡 means coffee.',
  '美國': 'The United States, represented by 美(beautiful) landscapes across the federal 國(country): 美國 means United States.',
  '馬上': 'Moving with urgent haste as if leaping upon a fast 馬(horse) and riding 上(above) the saddle: 馬上 means immediately.',
  '韓國': 'The nation of Korea, rooted in ancient 韓(Korea) cultural heritage across the sovereign 國(country): 韓國 means South Korea.',
  '大人': 'A grown individual who has reached full 大(big) stature as a mature 人(person): 大人 means adult.',
  '大家': 'Gathering the whole 大(big) community together under one 家(family) roof: 大家 means everyone.',
  '小心': 'Guarding your attention with modest 小(small) cautious steps from the deep 心(heart): 小心 means careful.',
  '公司': 'A corporate enterprise serving the 公(public) market managed by officers who 司(take charge): 公司 means company.',
  '太太': 'A warm respectful address repeating 太(too) in domestic devotion: 太太 means Mrs., wife.',
  '方便': 'Finding a clear 方(direction) that makes daily travel 便(convenient): 方便 means convenient.',
  '日出': 'Watching the glowing 日(sun) dawn and 出(go out) above the eastern horizon: 日出 means sunrise.',
  '以前': 'Looking back from 以(use) present time to days that came 前(front) before: 以前 means before, previously.',
  '生肖': 'The animal sign determined at your 生(birth) that you visually 肖(resemble): 生肖 means Chinese zodiac sign.',
  '生活': 'From the moment of 生(birth) staying active and fully 活(live): 生活 means life.',
  '皮包': 'A durable accessory crafted from animal 皮(skin) into a protective 包(pack): 皮包 means handbag, purse.',
  '上班': 'Heading 上(above) to work to fulfill your daily assigned 班(class) shift: 上班 means go to work.',
  '下班': 'Stepping 下(below) down from your work 班(class) shift at the end of the day: 下班 means get off work.',
  '工作': 'Applying regular 工(work) skills to actively 作(make) products: 工作 means work, job.',
  '公分': 'A metric measure uniting 公(public) standard divided into a 分(minute): 公分 means centimeter.',
  '公尺': 'A metric measure uniting 公(public) standard scaled to an official 尺(ruler): 公尺 means meter.',
  '公斤': 'A metric weight uniting 公(public) standard scaled to an official 斤(catty): 公斤 means kilogram.',
  '公里': 'A metric distance uniting 公(public) standard measured to each 里(village): 公里 means kilometer.',
  '太陽': 'The supreme celestial body radiating 太(too) intense heat from the bright 陽(sun): 太陽 means the sun.',
  '世界': 'The expansive human 世(world) contained within earthly outer 界(boundary): 世界 means world.',
  '老闆': 'The seasoned 老(old) proprietor standing at the door 闆(boss): 老闆 means boss.',
  '耳朵': 'The facial 耳(ear) feature for hearing shaped like a delicate 朵(flower): 耳朵 means ear.',
  '衣服': 'Everyday attire comprising woven 衣(clothes) that you wear 服(wear): 衣服 means clothes.',
  '告訴': 'Speaking clearly to 告(tell) facts and 訴(accuse) details: 告訴 means tell.',
  '音樂': 'Harmonious 音(sound) melodies arranged in joyful 樂(music): 音樂 means music.',
  '關係': 'A social tie that serves to 關(close) distance and 係(connect) lives: 關係 means relationship.',
  '身體': 'The human form comprising flesh and 身(body) structure 體(body): 身體 means body, health.',
  '辛苦': 'Enduring harsh 辛(bitter) trials and painful 苦(bitter) toil: 辛苦 means laborious, hard.',
  '熱情': 'Radiating intense 熱(hot) warmth through sincere personal 情(feeling): 熱情 means passionate, enthusiastic.',
  '朋友': 'A cherished companion 朋(friend) bound by loyal 友(friend)ship: 朋友 means friend.',
  '附近': 'A localized area 附(adhere) right nearby in 近(near) proximity: 附近 means nearby.',
  '一封信': 'A single 一(one) correspondence sealed in an 封(envelope) containing a personal 信(letter): 一封信 means a letter.',
  '活動': 'Staying vibrant and 活(live) through dynamic physical 動(move)ment: 活動 means activity.',
  '照相': 'Positioning the camera to 照(shine) light and capture a mutual 相(mutual) likeness: 照相 means take a photo.',
  '容易': 'Tasks that 容(contain) few hurdles and are 易(easy) to accomplish: 容易 means easy.',
  '高興': 'Feeling spirits rise 高(tall) in joyous flourish 興(flourish): 高興 means happy, glad.',
  '常常': 'Repeating actions 常(frequent) and recurring 常(frequent) in daily routine: 常常 means often.',
  '就是': 'Affirming with certainty that one approaches 就(approach) what 是(be) truth: 就是 means exactly.',
  '菜單': 'A dining list displaying assorted 菜(vegetable) dishes on a single 單(single) sheet: 菜單 means menu.',
  '媽媽': 'A child\'s warm address repeating 媽(mother) in maternal affection: 媽媽 means mother, mom.',
  '想念': 'Directing affectionate 想(think) thoughts while holding fond 念(memory): 想念 means miss, long for.',
  '感冒': 'A bodily condition where you 感(sense) illness after taking a weather 冒(risk): 感冒 means catch a cold.',
  '相片': 'A photographic image capturing a visible 相(mutual) likeness on a thin 片(slice): 相片 means photograph.',
  '號碼': 'An identification symbol combining a serial 號(mark) and numeric 碼(number): 號碼 means number.',
  '醫院': 'A healing complex where physicians 醫(cure) patients inside a dedicated 院(courtyard): 醫院 means hospital.',
  '對話': 'Two speakers facing 對(correct) each other to exchange spoken 話(speech): 對話 means dialogue.',
  '語言': 'Expressing human thought through spoken 語(language) and recorded 言(speech): 語言 means language.',
  '談話': 'Engaging in relaxed conversation to 談(talk) and share words of 話(speech): 談話 means conversation.',
  '聰明': 'Possessing a keen 聰(clever) mind that produces 明(bright) insight: 聰明 means intelligent, smart.',
  '希望': 'Holding cherished 希(hope) aspirations while you 望(expect) great things ahead: 希望 means hope.',
  '醫生': 'A qualified practitioner trained to 醫(cure) ailments and protect mortal 生(life): 醫生 means doctor.',
  '睡覺': 'Resting peacefully to 睡(sleep) until you become conscious 覺(conscious): 睡覺 means sleep.',
  '牛肉': 'Tender cuts of 牛(cow) meat prepared as savory 肉(meat): 牛肉 means beef.',
  '麵包': 'Baked wheat 麵(noodles) dough wrapped into a fluffy 包(pack): 麵包 means bread.',
  '整理': 'Organizing items into 整(orderly) arrangements through clear 理(reason): 整理 means arrange, tidy up.',
  '客廳': 'A hospitable reception space where each 客(guest) gathers in the open 廳(hall): 客廳 means living room.',
};

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

  if (hook.includes('+')) issues.push('contains-plus-equation');

  const sentences = hook.replace(/\bi\.e\./gi, 'ie').replace(/\be\.g\./gi, 'eg').split(/[.!?。！？]+/).filter((part) => part.trim()).length;
  if (sentences > 2) issues.push('too-many-sentences:' + sentences);
  if (hook.trim().split(/\s+/).length > 32) issues.push('too-many-words:' + hook.trim().split(/\s+/).length);

  return issues;
}

export function generateBookOneWordHook(word: string, meaning: string): { hook: string; strategy: string } {
  const cleanMeaning = cleanMeaningText(meaning);
  const hanChars = [...word].filter((c) => /\p{Script=Han}/u.test(c));
  const chars = hanChars.map((c) => ({ char: c, meaning: cleanLabel(getSafeLabel(c)) }));

  // 1. Check curated notable dictionary
  if (NOTABLE_BOOK_ONE_HOOKS[word]) {
    return { hook: NOTABLE_BOOK_ONE_HOOKS[word], strategy: 'characters' };
  }

  // 2. Doubled word case: e.g. 常常, 慢慢
  const isDoubled = hanChars.length === 2 && hanChars[0] === hanChars[1];
  if (isDoubled) {
    const c = chars[0];
    const hook = `Taking deliberate steps with ${c.char}(${c.meaning}) repeated for emphasis: ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 3. 2-character words with productive suffixes and prefixes
  if (hanChars.length === 2) {
    const [c1, c2] = chars;

    // Suffix patterns
    if (c2.char === '人') return { hook: `An individual identified with ${c1.char}(${c1.meaning}) who acts as a specialized ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '家') return { hook: `Devoting your skills to ${c1.char}(${c1.meaning}) as a recognized master within the ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '員') return { hook: `Managing responsibilities of ${c1.char}(${c1.meaning}) as an appointed team ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '者') return { hook: `A dedicated practitioner of ${c1.char}(${c1.meaning}) active as this ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '師') return { hook: `A trained professional practicing ${c1.char}(${c1.meaning}) as a respected ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '生') return { hook: `Engaging in ${c1.char}(${c1.meaning}) during one's academic or daily ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '子') return { hook: `A practical item characterized by ${c1.char}(${c1.meaning}) with familiar noun marker ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '兒') return { hook: `Expressing ${c1.char}(${c1.meaning}) with a friendly spoken rhythm of suffix ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '物') return { hook: `Acquiring distinct ${c1.char}(${c1.meaning}) items classified as useful ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '品') return { hook: `Crafted goods embodying ${c1.char}(${c1.meaning}) produced as a refined ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '費') return { hook: `Financial expenditure for ${c1.char}(${c1.meaning}) charged as an official ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '力') return { hook: `Applying energetic ${c1.char}(${c1.meaning}) with all your physical ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '心') return { hook: `Focusing your efforts on ${c1.char}(${c1.meaning}) with genuine dedication from the ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '情') return { hook: `Expressing sincere sentiment in ${c1.char}(${c1.meaning}) that builds emotional ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '意') return { hook: `Forming a deliberate thought toward ${c1.char}(${c1.meaning}) with clear ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '感') return { hook: `Experiencing an intuitive perception of ${c1.char}(${c1.meaning}) through bodily ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '度') return { hook: `Assessing the precise level of ${c1.char}(${c1.meaning}) against a calibrated ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '期') return { hook: `Marking an appointed phase for ${c1.char}(${c1.meaning}) across a scheduled ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '法') return { hook: `Applying systematic rules of ${c1.char}(${c1.meaning}) according to established ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '點') return { hook: `Observing distinctive ${c1.char}(${c1.meaning}) at this designated scenic ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '場') return { hook: `Managing tasks of ${c1.char}(${c1.meaning}) within the open municipal ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '館') return { hook: `Visiting a center for ${c1.char}(${c1.meaning}) located inside a public ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '院') return { hook: `An organized institution focused on ${c1.char}(${c1.meaning}) centered in a traditional ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '室') return { hook: `Conducting dedicated work on ${c1.char}(${c1.meaning}) inside a private ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '車') return { hook: `Hauling passengers or cargo of ${c1.char}(${c1.meaning}) with a motorized transport ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '路') return { hook: `Navigating the thoroughfare of ${c1.char}(${c1.meaning}) along this paved ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '話') return { hook: `Conveying clear thoughts about ${c1.char}(${c1.meaning}) through spoken ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '風') return { hook: `Exhibiting the distinctive character of ${c1.char}(${c1.meaning}) carried like a cultural ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '界') return { hook: `The specialized domain of ${c1.char}(${c1.meaning}) recognized across its outer ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '書') return { hook: `Recording official details of ${c1.char}(${c1.meaning}) bound into a formal ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '店') return { hook: `Browsing commercial selections of ${c1.char}(${c1.meaning}) available at a local ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '門') return { hook: `Stepping through the portal of ${c1.char}(${c1.meaning}) via this grand entry ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '錢') return { hook: `Paying monetary sums for ${c1.char}(${c1.meaning}) in physical currency or ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '頭') return { hook: `Reaching the prominent boundary of ${c1.char}(${c1.meaning}) situated at the leading ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '面') return { hook: `Surveying the specific dimension of ${c1.char}(${c1.meaning}) across this external ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '間') return { hook: `Locating the quiet interval of ${c1.char}(${c1.meaning}) nestled in the space ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '服') return { hook: `Wearing comfortable attire for ${c1.char}(${c1.meaning}) fashioned into garments to ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '包') return { hook: `Wrapping up items of ${c1.char}(${c1.meaning}) inside a secure protective ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '片') return { hook: `Slicing fresh portions of ${c1.char}(${c1.meaning}) into a thin slender ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '杯') return { hook: `Serving refreshments of ${c1.char}(${c1.meaning}) poured into a beverage ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '條') return { hook: `Drafting notes on ${c1.char}(${c1.meaning}) onto a slender paper ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '票') return { hook: `Presenting admission credentials for ${c1.char}(${c1.meaning}) printed on an entrance ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '卡') return { hook: `Verifying credentials for ${c1.char}(${c1.meaning}) encoded on an access ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '文') return { hook: `Composing scholarly prose about ${c1.char}(${c1.meaning}) written in refined ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c2.char === '語') return { hook: `Communicating ideas of ${c1.char}(${c1.meaning}) through shared spoken ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };

    // Prefix patterns
    if (c1.char === '好') return { hook: `Finding it pleasant and 好(${c1.meaning}) to engage with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '難') return { hook: `Facing tough obstacles that are 難(${c1.meaning}) when trying to ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '大') return { hook: `Undertaking a grand 大(${c1.meaning}) scale effort involving ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '小') return { hook: `Paying attention to modest 小(${c1.meaning}) details regarding ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '高') return { hook: `Reaching an elevated 高(${c1.meaning}) summit in ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '長') return { hook: `Sustaining an enduring 長(${c1.meaning}) continuity throughout ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '新') return { hook: `Introducing a fresh 新(${c1.meaning}) modern perspective into ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '老') return { hook: `Drawing upon seasoned 老(${c1.meaning}) veteran experience in ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '不') return { hook: `Marked by an explicit 不(${c1.meaning}) absence of ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '自') return { hook: `Relying on one's own 自(${c1.meaning}) initiative to guide ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '公') return { hook: `Serving the general 公(${c1.meaning}) community through open ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '同') return { hook: `Sharing a mutual 同(${c1.meaning}) connection through common ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '相') return { hook: `Interacting in a mutual 相(${c1.meaning}) exchange with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
    if (c1.char === '真') return { hook: `Possessing genuine 真(${c1.meaning}) authenticity in every ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`, strategy: 'characters' };
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

    // Fluent default 2-character compound synthesis (no + formulas!)
    const hook = `Combining ${c1.char}(${c1.meaning}) together with ${c2.char}(${c2.meaning}): ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 3-character compounds default
  if (hanChars.length === 3) {
    const [c1, c2, c3] = chars;
    const hook = `Uniting ${c1.char}(${c1.meaning}) and ${c2.char}(${c2.meaning}) leading into ${c3.char}(${c3.meaning}): ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 4-character compounds default
  if (hanChars.length === 4) {
    const [c1, c2, c3, c4] = chars;
    const hook = `Bringing together ${c1.char}(${c1.meaning}) and ${c2.char}(${c2.meaning}) with ${c3.char}(${c3.meaning}) and ${c4.char}(${c4.meaning}): ${word} means ${cleanMeaning}.`;
    return { hook, strategy: 'characters' };
  }

  // 5+ characters default
  const hook = `Expressing ${chars[0].char}(${chars[0].meaning}) followed by ${chars[1].char}(${chars[1].meaning}) in a longer phrase: ${word} means ${cleanMeaning}.`;
  return { hook, strategy: 'characters' };
}

function run() {
  const wordData = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json'), 'utf8'));
  console.log(`Loaded ${wordData.records.length} words from book-1-word-hooks-v1.json`);

  let totalErrors = 0;
  for (const record of wordData.records) {
    const { hook, strategy } = generateBookOneWordHook(record.word, record.meaning);
    const issues = evaluateWordHook(record.word, hook, record.meaning);
    if (issues.length > 0) {
      totalErrors++;
      console.error(`FAIL: ${record.word} -> ${issues.join(', ')} | Hook: "${hook}"`);
    }
    record.hook = hook;
    record.strategy = strategy;
    record.acceptance = issues.length === 0 ? 'clean' : 'flagged';
    record.issues = issues.map((iss) => ({ code: iss.split(':')[0], severity: 'flag', message: iss }));
    record.model = 'in-session-semantic-v1';
    record.promptVersion = 'book-1-words-v2';
  }

  console.log(`\nValidation complete. Total errors: ${totalErrors} / ${wordData.records.length}`);
  if (totalErrors === 0) {
    writeFileSync(resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json'), JSON.stringify(wordData, null, 2) + '\n');
    console.log(`Successfully wrote clean hooks to book-1-word-hooks-v1.json!`);
  } else {
    console.error(`Aborting write due to ${totalErrors} errors.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('generateBookOneSemanticWords.ts')) {
  run();
}
