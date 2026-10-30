/**
 * Authored detection rules for the reader's "used in this reading" badges.
 *
 * Each entry answers one question: does this grammar page's pattern actually
 * occur in a reading's text? The rules are deliberately conservative and
 * reviewed by hand; a page without a rule must declare `undetectable` with the
 * reason, so no page is ever silently guessed at. `validateInteractiveLessons`
 * enforces that every grammar page has exactly one of the two.
 *
 * Evidence is matched sentence by sentence on the reader's own word
 * segmentation (`getWordChunks` over the authored pinyin), never on raw
 * substrings — `可愛` therefore cannot satisfy a rule that looks for `愛`.
 *
 * The one hard rule for authors: never let a badge claim something the text
 * does not show. When in doubt, mark the page undetectable and explain why.
 */
import { USAGE_TOKEN_SEPARATOR, type TokenEvidence, type TokenEvidenceGuards } from '../utils/grammar/tokenEvidence';

export { USAGE_TOKEN_SEPARATOR };

/** Grammar rules use the shared token-evidence shapes. */
export type GrammarUsageGuards = TokenEvidenceGuards;
export type GrammarUsageEvidence = TokenEvidence;

export interface GrammarUsageDetectedRule {
  /** Alternatives — any single match marks the page as used. */
  anyOf: GrammarUsageEvidence[];
  /** The authored pattern this rule encodes, e.g. `太 + X + 了`. */
  citation: string;
}

export type GrammarUsageRuleEntry =
  | { detected: GrammarUsageDetectedRule; undetectable?: never }
  | { undetectable: string; detected?: never };

export type GrammarUsageRules = Record<string, GrammarUsageRuleEntry>;

const SEP = USAGE_TOKEN_SEPARATOR;

const inOrder = (
  tokens: string[],
  maxGap = 3,
  guards: GrammarUsageGuards = {},
): GrammarUsageEvidence => ({ kind: 'inOrder', tokens, maxGap, ...guards });

const sentenceFinal = (tokens: string[], guards: GrammarUsageGuards = {}): GrammarUsageEvidence => ({
  kind: 'sentenceFinal',
  tokens,
  ...guards,
});

const reduplication = (
  options: { besideAnyOf?: string[]; separators?: string[] } = {},
): GrammarUsageEvidence => ({ kind: 'reduplication', ...options });

const aNotA = (): GrammarUsageEvidence => ({ kind: 'aNotA' });

const tokenEndsWith = (characters: string[], except: string[] = []): GrammarUsageEvidence => ({
  kind: 'tokenEndsWith',
  characters,
  except,
});

const regex = (source: string): GrammarUsageEvidence => ({ kind: 'regex', source });

const detected = (citation: string, anyOf: GrammarUsageEvidence[]): GrammarUsageRuleEntry => ({
  detected: { citation, anyOf },
});

const NUMBERS = ['一', '兩', '二', '三', '四', '五', '六', '七', '八', '九', '十', '幾', '半'];
const MEASURE_WORDS = [
  '個', '本', '朵', '張', '條', '雙', '瓶', '杯', '首', '位', '間', '件',
  '種', '部', '家', '歲', '點', '號', '月', '天', '年', '次', '遍', '隻', '臺',
  '枝', '把', '束', '顆', '頭', '腳', '公斤', '公分',
];
const TIME_UNITS = ['分鐘', '小時', '天', '年', '月', '晚', '星期', '禮拜', '學期'];
const NUMBER_ALT = NUMBERS.join('|');
const MEASURE_ALT = MEASURE_WORDS.join('|');
const TIME_ALT = TIME_UNITS.join('|');
/** Numbers, 個, 多 … that may sit between 了 and its duration (三個小時, 半年). */
const DURATION_PREFIX = `(?:(?:${NUMBER_ALT}|個|多|半)${SEP}?)*`;

/** Book 2 Lesson 3: the motion verbs its directional patterns list. */
const MOTION_VERBS = ['走', '跑', '帶', '放', '拿', '搬', '站'];
/** Book 2 Lesson 3: directional verb + 來／去 compounds. 起來 is left out of
 *  G01: on its own it is the judgemental 起來 of G06, and the book treats
 *  站起來 as a motion verb + direction (G02). */
const DIRECTIONAL_COMPLEMENTS = [
  '上來', '上去', '下來', '下去', '進來', '進去',
  '出來', '出去', '回來', '回去', '過來', '過去',
];
const MOTION_ALT = MOTION_VERBS.join('|');
const DIRECTION_ALT = [...DIRECTIONAL_COMPLEMENTS, '起來'].join('|');

/** Book 2 Lesson 6: the verbs its V好 result-complement page pairs with 好. */
const L06_HAO_VERBS = [
  '點', '學', '做', '寫', '吃', '喝', '唱', '買', '賣', '收', '洗', '煮', '修',
  '準備', '複習', '練習', '打掃', '排', '考', '教', '弄', '說', '講', '開', '關',
  '放', '掛', '貼', '穿', '戴', '整理',
];
const L06_HAO_ALT = L06_HAO_VERBS.join('|');
/** Book 2 Lesson 6: the verbs its V錯 page pairs with 錯. */
const L06_CUO_VERBS = [
  '聽', '看', '說', '寫', '做', '吃', '喝', '買', '賣', '唱', '弄', '拿', '放',
  '記', '想', '算', '念', '讀', '打', '開', '關', '走', '坐', '選', '點',
];
const L06_CUO_ALT = L06_CUO_VERBS.join('|');
/** Book 2 Lesson 6: question words its QW……就……QW page lists. */
const L06_QW_ALT = `什${SEP}?麼|誰|哪裡|哪兒|怎麼|多少|幾|哪`;

/** Book 2 Lesson 7: measure words its 一 + M + 都／也 + Neg page uses. */
const L07_MEASURE_WORDS = [
  '個', '班', '毛', '塊', '家', '位', '張', '件', '種', '隻', '條', '本',
  '杯', '瓶', '點', '歲', '次', '遍', '趟', '句', '分', '層',
];
const L07_MEASURE_ALT = L07_MEASURE_WORDS.join('|');
/** Book 2 Lesson 7: the verbs its V光 page pairs with 光. */
const L07_GUANG_VERBS = [
  '吃', '用', '賣', '走', '喝', '買', '花', '拿', '送', '丟', '脫', '洗',
  '掃', '收', '看', '玩', '打', '開',
];
const L07_GUANG_ALT = L07_GUANG_VERBS.join('|');

export const GRAMMAR_USAGE_RULES: GrammarUsageRules = {
  // Lesson 1 — 新同學
  'B1L01-G01-P38': detected('叫／姓／是 introduce a name or identity', [
    inOrder(['叫']),
    inOrder(['姓']),
    regex(
      `(?:^|${SEP})(?:我|你|妳|他|她|我們|你們|他們|誰|宜文|中明|友美|國安|家樂|元真|老師|媽媽|爸爸|朋友|同學)${SEP}(?:不${SEP})?是${SEP}[^${SEP}]+`,
    ),
  ]),
  'B1L01-G02-P39': detected('很／不 describe someone', [inOrder(['很']), inOrder(['不'])]),
  'B1L01-G03-P40': detected('sentence-final 嗎', [sentenceFinal(['嗎'])]),
  'B1L01-G04-P44': detected('sentence-final 呢', [sentenceFinal(['呢'])]),
  'B1L01-G05-P45': detected('subject + action or feeling + object', [
    regex(
      `(?:^|${SEP})(?:我|你|妳|他|她|我們|你們|他們|宜文|中明|友美|國安|家樂|元真)(?:${SEP}(?:不|很|也|都))?${SEP}(?:喜歡|愛|要|想|吃|喝|買|看|送|學|聽|唱|打|說|做|玩|認識|知道|找|用)${SEP}(?!(?:嗎|呢|吧|啊|了|的)(?:${SEP}|$))[^${SEP}]+`,
    ),
  ]),

  // Lesson 2 — 你幾點去學校？
  'B1L02-G01-P54': detected('date and clock markers', [
    inOrder(['月', '號'], 2),
    inOrder(['星期'], 2),
    inOrder(['禮拜'], 2),
    inOrder(['點', '分'], 2),
    inOrder(['幾', '點'], 2),
    inOrder(['幾', '號'], 2),
    inOrder(['幾', '月'], 2),
    // Clock times without 幾: 九點, 四點四十分, 十二點半 …
    regex(`${SEP}[0-9一二兩三四五六七八九十百千萬万幾半]+${SEP}點`),
  ]),
  'B1L02-G02-P55': detected('time before the action', [
    regex(
      `(?:^|${SEP})(?:今天|明天|昨天|早上|中午|下午|晚上|週末|星期|禮拜|(?:[0-9一二兩三四五六七八九十]+${SEP})?點)(?:${SEP}[^${SEP}]+){0,6}${SEP}(?:去|來|上課|下課|回家|起床|吃飯|睡覺|做|看|買|有|沒有|要|想|喝|吃|玩|上|下|回|出門|上班|見|見面)`,
    ),
  ]),
  'B1L02-G03-P56': detected('有／沒有 for possession', [inOrder(['有']), inOrder(['沒有'])]),
  'B1L02-G04-P60': detected('owner + 的 + thing', [
    regex(
      `(?:^|${SEP})(?:我|你|妳|他|她|我們|你們|他們|誰|老師|媽媽|爸爸|朋友|同學|宜文|中明|友美|國安|家樂|元真)${SEP}的${SEP}[^${SEP}]+`,
    ),
  ]),
  'B1L02-G05-P61': detected('want or like before the action', [
    regex(
      `(?:^|${SEP})(?:我|你|妳|他|她|我們|你們|他們|誰|老師|媽媽|爸爸|朋友|同學|宜文|中明|友美|國安|家樂|元真)(?:${SEP}不)?${SEP}(?:要|喜歡|愛|想)(?:${SEP}不${SEP}(?:要|喜歡|愛|想))?${SEP}(?:去|來|喝|吃|買|看|聽|玩|學|說|做|上|回|休息|游泳|打|唱歌|跳舞|工作|找|用|寫|讀)`,
    ),
  ]),
  'B1L02-G06-P62': detected('A-not-A question', [aNotA(), inOrder(['是不是']), inOrder(['有沒有'])]),

  // Lesson 3 — 買生日禮物
  'B1L03-G01-P73': detected('measure words', [
    inOrder(['個']),
    inOrder(['本']),
    inOrder(['朵']),
    inOrder(['隻']),
    inOrder(['張']),
    inOrder(['枝']),
    inOrder(['塊']),
    inOrder(['杯']),
    inOrder(['臺']),
    inOrder(['台']),
    inOrder(['位']),
    inOrder(['件']),
    inOrder(['種']),
    inOrder(['間']),
    inOrder(['瓶']),
    inOrder(['碗']),
    inOrder(['歲']),
  ]),
  'B1L03-G02-P74': detected('送 + receiver + gift', [inOrder(['送'])]),
  'B1L03-G03-P81': detected('這／那／哪 (+ number) + measure word', [
    regex(`(?:^|${SEP})(?:這|那|哪)${SEP}?(?:${NUMBER_ALT})?${SEP}?(?:${MEASURE_ALT})`),
  ]),
  'B1L03-G04-P82': detected('description + 的 (+ noun)', [
    regex(
      `(?:^|${SEP})(?:可愛|漂亮|快樂|便宜|好吃|好玩|好看|有趣|高興|聰明|安靜|熱鬧|紅色|白色|黑色|綠色|藍色|黃色|灰色|大|小|新|舊|好|紅|白|黑|綠|貴|長|短|高|矮)${SEP}的(?:${SEP}|$)`,
    ),
  ]),
  'B1L03-G05-P84': detected('都 for a group', [inOrder(['都'])]),

  // Lesson 4 — 你要咖啡還是茶？
  'B1L04-G01-P95': detected('thing in focus, then person + 都／也 + action', [
    regex(
      `^(?:[^${SEP}]+${SEP})+(?:我|你|他|她|我們|你們|他們)${SEP}(?:都|也)${SEP}(?:喜歡|要|有|買|吃|喝|看)`,
    ),
  ]),
  'B1L04-G02-P97': detected('也 for the same situation', [inOrder(['也'])]),
  'B1L04-G03-P98': detected('太 + X + 了', [inOrder(['太', '了'], 4)]),
  'B1L04-G04-P104': detected('萬、千、百、十 place values', [
    inOrder(['萬']),
    inOrder(['千']),
    inOrder(['百']),
    inOrder(['零']),
  ]),
  'B1L04-G05-P105': detected('number + 多 (more than)', [
    regex(`(?:^|${SEP})(?:[0-9]+|${NUMBER_ALT})(?:${SEP}?(?:十|百|千|萬|[0-9]+))*${SEP}?多`),
    regex(`(?:^|${SEP})(?:點|歲|年|月|天|個|小時)${SEP}多`),
  ]),

  // Lesson 5 — 我的錢包在哪裡？
  'B1L05-G01-P116': detected('（不）在 + place', [inOrder(['在'])]),
  'B1L05-G02-P117': detected('在 + place + action', [
    regex(
      `(?:^|${SEP})(?:不${SEP})?在${SEP}[^${SEP}]+(?:${SEP}(?:上|下|裡|裡面|外面|前面|後面|旁邊|左邊|右邊))?${SEP}(?:看|聽|做|吃|喝|玩|買|寫|讀|說|睡|工作|上課|下課|上學|聊天|洗澡|運動|唱歌|跳舞|曬|休息|等|找|學|坐|站|用)`,
    ),
  ]),
  'B1L05-G03-P118': detected('suggesting with 吧', [sentenceFinal(['吧'])]),
  'B1L05-G04-P124': detected('direction words', [
    inOrder(['裡']),
    inOrder(['裡面']),
    inOrder(['上面']),
    inOrder(['下面']),
    inOrder(['前面']),
    inOrder(['後面']),
    inOrder(['旁邊']),
    inOrder(['外面']),
    inOrder(['樓上']),
    inOrder(['樓下']),
  ]),
  'B1L05-G05-P126': detected('place + 有／沒有 + thing', [inOrder(['有']), inOrder(['沒有'])]),

  // Lesson 6 — 週末去打網球吧！
  'B1L06-G01-P135': detected('（不）會 + learned skill', [
    regex(
      `(?:^|${SEP})(?:不${SEP})?(?:會${SEP}不${SEP}會|會)${SEP}(?:游泳|打球|打網球|打籃球|打棒球|做飯|做菜|做甜點|說中文|說英文|寫字|唱歌|跳舞|畫畫|騎腳踏車|騎車|開車|彈鋼琴|下棋|煮)`,
    ),
  ]),
  'B1L06-G02-P136': detected('V + 得 + complement', [
    regex(`(?:^|${SEP})得${SEP}(?:很|好|真|不|太|那麼|這麼)`),
  ]),
  'B1L06-G03-P146': detected('有（一）點（兒） + state', [
    regex(
      `(?:^|${SEP})(?:有點|有點兒|有一點|有一點兒|有${SEP}一點(?:兒)?)${SEP}(?:忙|累|貴|便宜|小|大|冷|熱|餓|渴|慢|快|難|無聊|緊張|奇怪|有趣|好玩|好吃|好喝|好看|晚|早|遠|近|高|矮|長|短|重|輕|吵|安靜|開心|高興|舒服|不舒服|痛|疼)`,
    ),
  ]),
  'B1L06-G04-P147': detected('可以 for permission', [inOrder(['可以'])]),

  // Lesson 7 — 怎麼到飯店去？
  'B1L07-G01-P158': detected('從 … 到 … (route)', [
    inOrder(['從', '到'], 5),
    // The source dialogue splits the route across paragraphs, so each half
    // (start + motion, destination) also evidences the pattern.
    regex(
      `(?:^|${SEP})從${SEP}(?:學校|家|飯店|機場|捷運|站|這裡|那裡|台北|高雄|我家|朋友家|公司|圖書館|宿舍)${SEP}(?:走路|去|來|坐|開車|搭|到)`,
    ),
    regex(
      `(?:^|${SEP})到${SEP}(?:天美|飯店|學校|家|機場|車站|台北|高雄|朋友家|公司|圖書館|宿舍|哪裡)`,
    ),
  ]),
  'B1L07-G02-P160': detected('travel method + 去／到', [
    inOrder(['怎麼', '去'], 4),
    inOrder(['怎麼', '到'], 4),
    regex(
      `(?:^|${SEP})(?:坐|搭|騎)${SEP}(?:捷運|地鐵|公車|公共汽車|火車|飛機|計程車|高鐵|車|船|紅線|藍線|綠線|腳踏車|摩托車)`,
    ),
    regex(`(?:^|${SEP})(?:走路|開車|騎車)(?:${SEP}|$)`),
  ]),
  'B1L07-G03-P162': detected('new-situation 了', [inOrder(['了'], 1, { notAfter: ['太'] })]),
  'B1L07-G04-P170': detected('activity first, comment after', [
    regex(
      `(?:^|${SEP})(?:坐|走路|走|騎|搭|開車|去|來|看|吃|喝|買|學|用|游泳|跑步|上班|上課|旅行)${SEP}(?:[^${SEP}]+${SEP}){0,1}(?:很|太|真|比較)${SEP}(?:快|慢|累|貴|便宜|方便|舒服|遠|近|好|好玩|好看|好吃|好喝|難|容易|危險|安全|無聊|有意思)`,
    ),
  ]),
  'B1L07-G05-P172': detected('又…又…', [
    regex(`(?:^|${SEP})又${SEP}(?:[^${SEP}]+${SEP}){0,4}又`),
  ]),

  // Lesson 8 — 這條裙子真好看
  'B1L08-G01-P185': detected('好／難 + sensory or action verb', [
    regex(
      `(?:^|${SEP})(?:好吃|好喝|好看|好聽|好玩|好學|好寫|好找|好買|好做|難吃|難喝|難看|難聽|難學|難寫|難找|難買|難懂|難做)(?:${SEP}|$)`,
    ),
    regex(`(?:^|${SEP})(?:好|難)${SEP}(?:吃|喝|看|聽|玩|學|寫|找|買|做|懂|用|讀|說)`),
  ]),
  'B1L08-G02-P186': detected('因為 … 所以 …', [
    inOrder(['因為', '所以'], 20),
    inOrder(['為什麼', '因為'], 6),
  ]),
  'B1L08-G03-P193': detected('sentence-final 吧', [sentenceFinal(['吧'])]),
  'B1L08-G04-P194': detected('reduplicated verb + 看', [reduplication({ besideAnyOf: ['看'] })]),
  'B1L08-G05-P195': detected('快／快要／要 … 了', [
    inOrder(['快', '了'], 4),
    inOrder(['快要', '了'], 4),
    inOrder(['要', '了'], 3),
  ]),

  // Lesson 9 — 我的中文課
  'B1L09-G01-P205': detected('在 + action (happening now)', [
    regex(
      `(?:^|${SEP})在${SEP}(?:睡|看|吃|喝|做|寫|讀|聽|說|玩|工作|上|下課|聊天|洗澡|運動|唱|跳舞|等|找|想|準備|練習|複習|考試|打|游泳|跑步|騎|學)`,
    ),
  ]),
  'B1L09-G02-P206': detected('從 … 到 … (time)', [inOrder(['從', '到'], 8)]),
  'B1L09-G03-P207': detected('先 … 再 …', [inOrder(['先', '再'], 6)]),
  'B1L09-G04-P213': detected('能／不能／可以 conditions', [
    inOrder(['能']),
    inOrder(['不能']),
    inOrder(['可以']),
  ]),
  'B1L09-G05-P216': detected('比較 comparison', [inOrder(['比較'])]),

  // Lesson 10 — 最近感冒的人很多
  'B1L10-G01-P226': detected('跟／對／向 partners', [
    inOrder(['跟']),
    inOrder(['對'], 1, { notAfter: ['不'], notBefore: ['了', '不'] }),
    inOrder(['向']),
  ]),
  'B1L10-G02-P228': detected('modifier + 的 + noun', [
    regex(
      `(?:^|${SEP})(?:[^${SEP}]+${SEP}){0,2}的${SEP}(?:人|東西|話|字|歌|事|時間|地方|衣服|朋友|學生|問題|工作|活動|書|車|房間|餐廳|醫院|學校|錢|水|藥|食物|圖片|故事|經驗|心情|顏色|鞋子|褲子|裙子|功課|孩子|父母|節目|比賽)`,
    ),
  ]),
  'B1L10-G03-P231': detected('多／少 + action', [
    regex(
      `(?:^|${SEP})(?:多|少)${SEP}(?:喝|吃|休息|睡|穿|運動|帶|看|聽|說|練|複習|寫|走|用|注意|小心|買|玩|讀|做|洗手)`,
    ),
  ]),
  'B1L10-G04-P236': detected('會 + expected-future action', [
    regex(
      `(?:^|${SEP})會${SEP}(?:給|去|來|到|告訴|幫|寄|買|準備|下雪|下雨|變|冷|熱|開|關|回|參加|跟)`,
    ),
  ]),
  'B1L10-G05-P237': detected('如果／要是 … 就 …', [
    inOrder(['如果', '就'], 6),
    inOrder(['要是', '就'], 6),
  ]),

  // Lesson 11 — 你們是怎麼認識的？
  'B1L11-G01-P247': detected('completed action 了', [inOrder(['了'], 1, { notAfter: ['太'] })]),
  'B1L11-G02-P249': detected('沒／還沒 for what did not happen', [
    inOrder(['還沒']),
    inOrder(['沒'], 1, { notBefore: ['有'] }),
  ]),
  'B1L11-G03-P251': detected('是 … 的 focus', [inOrder(['是', '的'], 6)]),
  'B1L11-G04-P257': detected('先 … 等 … 再 …', [
    inOrder(['先', '等', '再'], 10),
    inOrder(['先', '等'], 6),
    inOrder(['等', '再'], 6),
  ]),
  'B1L11-G05-P259': detected('給 + receiver', [inOrder(['給'])]),

  // Lesson 12 — 你想做什麼工作？
  'B1L12-G01-P271': detected('用 + tool', [inOrder(['用'], 1, { notAfter: ['不', '沒'] })]),
  'B1L12-G02-P272': detected('以前／以後', [inOrder(['以前']), inOrder(['以後'])]),
  'B1L12-G03-P281': detected('對 + person or thing', [
    inOrder(['對'], 1, { notAfter: ['不'], notBefore: ['了', '不'] }),
  ]),
  'B1L12-G04-P282': detected('V + 過 (experience)', [
    regex(
      `(?:^|${SEP})(?:上過|去過|看過|吃過|喝過|學過|聽過|用過|玩過|住過|見過|做過|買過|說過|問過|認識過|旅行過|參加過|工作過|試過)(?:${SEP}|$)`,
    ),
    regex(
      `(?:^|${SEP})(?:去|看|吃|喝|學|聽|用|玩|住|見|做|買|說|問|認識|旅行|參加|上班|工作|試)${SEP}過(?:${SEP}|$)`,
    ),
  ]),
  'B1L12-G05-P284': detected('…的時候', [
    inOrder(['的時候']),
    inOrder(['的', '時候'], 1),
  ]),

  // Lesson 13 — 用手機上網
  'B1L13-G01-P295': detected('VV / V一V light action', [reduplication({ separators: ['一'] })]),
  'B1L13-G02-P296': detected('從 … 往 …', [inOrder(['從', '往'], 8)]),
  'B1L13-G03-P297': detected('就 for earliness or result', [inOrder(['就'])]),
  'B1L13-G04-P303': detected('就要／快要 … 了', [
    inOrder(['就要', '了'], 4),
    inOrder(['快要', '了'], 4),
    inOrder(['就', '要', '了'], 4),
    inOrder(['快', '要', '了'], 4),
  ]),
  'B1L13-G05-P304': detected('action + duration', [
    regex(`(?:^|${SEP})[0-9一二兩三四五六七八九十百千萬万幾半]+${SEP}(?:${TIME_ALT})`),
    // A counted 個 only: 兩個小時 counts, 上個星期 / 下個星期 do not.
    regex(`(?:^|${SEP})[0-9一二兩三四五六七八九十百千萬万幾半]+${SEP}個${SEP}(?:小時|星期|禮拜|月)`),
    regex(`(?:^|${SEP})(?:小時|分鐘)`),
  ]),

  // Lesson 14 — 跨年活動
  'B1L14-G01-P319': detected('V + 了 + duration', [
    regex(`(?:^|${SEP})了${SEP}(?:[^${SEP}]+${SEP}){0,2}${DURATION_PREFIX}(?:${TIME_ALT}|多久)`),
    regex(`(?:^|${SEP})${DURATION_PREFIX}(?:${TIME_ALT}|多久)${SEP}了`),
  ]),
  'B1L14-G02-P322': detected('V + 了 + duration + 了', [
    regex(
      `(?:^|${SEP})了${SEP}(?:[^${SEP}]+${SEP}){0,2}${DURATION_PREFIX}(?:${TIME_ALT}|多久)${SEP}了`,
    ),
  ]),
  'B1L14-G03-P331': detected('比 comparison', [inOrder(['比'])]),

  // Lesson 15 — 十二生肖
  'B1L15-G01': detected('A 跟 B (不)一樣', [
    inOrder(['跟', '一樣'], 8),
    inOrder(['跟', '不一樣'], 8),
  ]),
  'B1L15-G02': detected('durative 著 (V著)', [
    tokenEndsWith(['著'], ['著名', '著作', '著急', '睡著', '著火', '顯著']),
  ]),
  'B1L15-G03': detected('一 … 就 …', [inOrder(['一', '就'], 4)]),

  // Lesson 16 — 在台灣旅行
  'B1L16-G01': detected('離 … 近／遠', [
    inOrder(['離', '近'], 6),
    inOrder(['離', '遠'], 6),
  ]),
  'B1L16-G02': detected('本來／原來 … 後來', [
    inOrder(['本來', '後來'], 10),
    inOrder(['原來', '後來'], 10),
    inOrder(['本來']),
  ]),
  'B1L16-G03': detected('比 … 更', [inOrder(['比', '更'], 5), inOrder(['更'])]),
  'B1L16-G04': detected('V 了 … 就 …', [inOrder(['了', '就'], 3)]),
  'B1L16-G05': detected('V + 得 + complement', [
    regex(`(?:^|${SEP})得${SEP}(?:很|好|真|不|太|那麼|這麼)`),
  ]),

  // Book 3 Lesson 1 — 我的夢想
  'B3L01-G01-P29': detected('可以說是', [inOrder(['可以說是'])]),
  'B3L01-G02-P30': detected('多麼 … 啊', [inOrder(['多麼'])]),
  'B3L01-G03-P32': detected('再說', [inOrder(['再說'])]),
  'B3L01-G04-P38': detected('而', [inOrder(['而'])]),
  'B3L01-G05-P40': detected('V出', [inOrder(['出'])]),
  'B3L01-G06-P42': detected('就算……也', [inOrder(['就算', '也'], 6)]),

  // Book 3 Lesson 2 — 便利商店真方便
  'B3L02-G01-P51': detected('早就……了', [inOrder(['早就', '了'], 8)]),
  'B3L02-G02-P52': detected('順便', [inOrder(['順便'])]),
  'B3L02-G03-P53': detected('一會兒…一會兒…', [inOrder(['一會兒', '一會兒'], 6)]),
  'B3L02-G04-P54': detected('算了', [inOrder(['算了'])]),
  'B3L02-G05-P62': detected('V開', [inOrder(['開'])]),
  'B3L02-G06-P64': detected('經過', [inOrder(['經過'])]),
  'B3L02-G07-P65': detected('用…來…', [inOrder(['用', '來'], 6)]),

  // Book 3 Lesson 3 — 貨比三家不吃虧
  'B3L03-G01-P78': detected('試+V', [inOrder(['試'])]),
  'B3L03-G02-P80': detected('V掉', [inOrder(['掉'])]),
  'B3L03-G03-P81': detected('什麼(N)都……，就是……', [inOrder(['什麼', '都', '就是'], 10)]),
  'B3L03-G04-P82': detected('別再……了', [inOrder(['別再', '了'], 6), inOrder(['不再', '了'], 6)]),
  'B3L03-G05-P88': detected('不僅……也/還……', [inOrder(['不僅'])]),
  'B3L03-G06-P90': detected('NP 一M比一M + Vs (了)', [inOrder(['比'], 4)]),

  // Book 3 Lesson 4 — 孩子滿月了
  'B3L04-G01-P101': detected('好Vs的N(啊)!', [inOrder(['好', '的'], 4)]),
  'B3L04-G02-P103': detected('V來V去，還是……', [inOrder(['來', '去'], 3), inOrder(['還是'])]),
  'B3L04-G03-P105': detected('終於', [inOrder(['終於'])]),
  'B3L04-G04-P113': detected('V個不停 / V個沒完', [inOrder(['個不停']), inOrder(['個沒完'])]),
  'B3L04-G05-P114': detected('不Vs1不Vs2', [inOrder(['不', '不'], 4)]),
  'B3L04-G06-P115': detected('除了……(以外)，就是……', [inOrder(['除了', '就是'], 8)]),
  'B3L04-G07-P117': detected('不是……，就是……', [inOrder(['不是', '就是'], 8)]),

  // Book 3 Lesson 5 — 地震與颱風
  'B3L05-G01-P128': detected('萬一', [inOrder(['萬一'])]),
  'B3L05-G02-P130': detected('一連', [inOrder(['一連'])]),
  'B3L05-G03-P132': detected('以為…沒想到…', [inOrder(['以為', '沒想到'], 8), inOrder(['以為'])]),
  'B3L05-G04-P133': detected('……，還是……吧', [inOrder(['還是', '吧'], 8)]),
  'B3L05-G05-P141': detected('結果', [inOrder(['結果'])]),
  'B3L05-G06-P143': detected('甚至', [inOrder(['甚至'])]),
  'B3L05-G07-P144': detected('以東/西/南/北', [inOrder(['以東']), inOrder(['以西']), inOrder(['以南']), inOrder(['以北'])]),

  // Book 3 Lesson 6 — 休閒新生活
  'B3L06-G01-P155': detected('……倒是/是……，可是/但是/不過……', [inOrder(['倒是', '可是'], 8), inOrder(['倒是', '但是'], 8), inOrder(['倒是', '不過'], 8), inOrder(['是', '可是'], 6), inOrder(['是', '不過'], 6), inOrder(['倒是'])]),
  'B3L06-G02-P157': detected('X分之Y', [inOrder(['分之'])]),
  'B3L06-G03-P159': detected('總算', [inOrder(['總算'])]),
  'B3L06-G04-P160': detected('既然……，就……', [inOrder(['既然', '就'], 8), inOrder(['既然'])]),
  'B3L06-G05-P167': detected('在……中', [inOrder(['在', '中'], 6)]),
  'B3L06-G06-P169': detected('不能不 / 不得不', [inOrder(['不能不']), inOrder(['不得不'])]),
  'B3L06-G07-P171': detected('正＋V', [inOrder(['正要']), inOrder(['正想']), inOrder(['正打算']), inOrder(['正準備']), inOrder(['正'])]),

  // Book 3 Lesson 7 — 背包客的旅行
  'B3L07-G01-P184': detected('才……就……', [inOrder(['才', '就'], 8)]),
  'B3L07-G02-P186': detected('話說回來', [inOrder(['話說回來'])]),
  'B3L07-G03-P187': detected('這麼說', [inOrder(['這麼說'])]),
  'B3L07-G04-P189': detected('V成', [inOrder(['談成']), inOrder(['辦成']), inOrder(['做成']), inOrder(['去不成']), inOrder(['辦不成']), inOrder(['買得成']), inOrder(['沒看成'])]),
  'B3L07-G05-P195': detected('就……來說', [inOrder(['就', '來說'], 8)]),
  'B3L07-G06-P197': detected('V/Vs得……', [inOrder(['得'], 4)]),

  // Book 3 Lesson 8 — 穿著和品味
  'B3L08-G01-P210': detected('S 把 NP1 + V 成 NP2', [inOrder(['把', '成'], 8)]),
  'B3L08-G02-P211': detected('再……，也/都……', [inOrder(['再', '也'], 8), inOrder(['再', '都'], 8)]),
  'B3L08-G03-P213': detected('V慣', [inOrder(['慣'])]),
  'B3L08-G04-P219': detected('況且', [inOrder(['況且'])]),
  'B3L08-G05-P221': detected('非……不可', [inOrder(['非', '不可'], 8)]),
  'B3L08-G06-P222': detected('畢竟', [inOrder(['畢竟'])]),

  // Book 3 Lesson 9 — 誰說得念大學才有未來？
  'B3L09-G01-P235': detected('V過來', [inOrder(['過來'])]),
  'B3L09-G02-P237': detected('怎麼不……反而……呢？', [inOrder(['怎麼不', '反而'], 8)]),
  'B3L09-G03-P238': detected('不但不/沒……反而……', [inOrder(['不但', '反而'], 8)]),
  'B3L09-G04-P240': detected('才……(呢)', [inOrder(['才', '呢'], 6), inOrder(['才不']), inOrder(['才沒'])]),
  'B3L09-G05-P247': detected('尤其是', [inOrder(['尤其是']), inOrder(['尤其'])]),
  'B3L09-G06-P248': detected('V著', [inOrder(['得著']), inOrder(['不著']), inOrder(['著了'])]),
  'B3L09-G07-P250': detected('以……代替……', [inOrder(['以', '代替'], 8)]),

  // Book 3 Lesson 10 — 健康檢查不麻煩
  'B3L10-G01-P262': detected('直到……(以後/時)才……', [inOrder(['直到', '才'], 12)]),
  'B3L10-G02-P263': detected('只不過', [inOrder(['只不過'])]),
  'B3L10-G03-P265': detected('害', [inOrder(['害'])]),
  'B3L10-G04-P272': detected('V到底', [inOrder(['到底'])]),
  'B3L10-G05-P274': detected('一再', [inOrder(['一再'])]),
  'B3L10-G06-P275': detected('假如', [inOrder(['假如'])]),
  'B3L10-G07-P276': detected('為了……而……', [inOrder(['為了', '而'], 10)]),

  // Book 3 Lesson 11 — 網路交友要小心
  'B3L11-G01-P289': detected('透過', [inOrder(['透過'])]),
  'B3L11-G02-P291': detected('以上 / 以下', [inOrder(['以上']), inOrder(['以下'])]),
  'B3L11-G03-P292': detected('看得起 / 看不起', [inOrder(['看得起']), inOrder(['看不起'])]),
  'B3L11-G04-P299': detected('卻', [inOrder(['卻'])]),
  'B3L11-G05-P301': detected('對得起 / 對不起', [inOrder(['對得起']), inOrder(['對不起'])]),
  'B3L11-G06-P302': detected('至於', [inOrder(['至於'])]),

  // Book 3 Lesson 12 — 你有面試的經驗嗎？
  'B3L12-G01-P313': detected('這就', [inOrder(['這就'])]),
  'B3L12-G02-P314': detected('在……方面', [inOrder(['在', '方面'], 8)]),
  'B3L12-G03-P316': detected('往往', [inOrder(['往往'])]),
  'B3L12-G04-P318': detected('有關', [inOrder(['有關'])]),
  'B3L12-G05-P325': detected('儘管', [inOrder(['儘管'])]),
  'B3L12-G06-P327': detected('不論……都……', [inOrder(['不論', '都'], 10)]),

  // Book 3 Lesson 13 — 雲端科技真方便
  'B3L13-G01-P338': detected('這下子', [inOrder(['這下子'])]),
  'B3L13-G02-P339': detected('既……又……', [inOrder(['既', '又'], 8)]),
  'B3L13-G03-P341': detected('更別說', [inOrder(['更別說'])]),
  'B3L13-G04-P347': detected('就是……(也)……', [inOrder(['就是', '也'], 8), inOrder(['就是'])]),
  'B3L13-G05-P348': detected('一方面……，一方面……', [inOrder(['一方面', '一方面'], 12)]),

  // Book 3 Lesson 14 — 七夕情人節的故事
  'B3L14-G01-P360': detected('(這)就要從……V起了', [inOrder(['就要從']), inOrder(['說起']), inOrder(['談起']), inOrder(['找起'])]),
  'B3L14-G02-P362': detected('V下去', [inOrder(['下去']), inOrder(['下去了'])]),
  'B3L14-G03-P363': detected('幸虧……要不然……', [inOrder(['幸虧', '要不然'], 12), inOrder(['幸虧'])]),
  'B3L14-G04-P369': detected('根據', [inOrder(['根據'])]),
  'B3L14-G05-P371': detected('按照 / 按 / 照 NP + V', [inOrder(['按照']), inOrder(['就按']), inOrder(['照說明書'])]),

  // Book 2 Lesson 1 — 認識新朋友
  'B2L01-G01-P30': detected('V一下', [inOrder(['一下'])]),
  'B2L01-G02-P31': detected('最好 + VP', [inOrder(['最好'])]),
  'B2L01-G03-P32': detected('不但……也……', [inOrder(['不但', '也'], 8)]),
  'B2L01-G04-P32': detected('V完', [tokenEndsWith(['完'], ['完全', '完成', '完整'])]),
  'B2L01-G05-P38': detected('V在', [inOrder(['住', '在'], 1), inOrder(['放', '在'], 1), inOrder(['站', '在'], 1), inOrder(['寫', '在'], 1)]),
  'B2L01-G06-P38': detected('V給', [inOrder(['送', '給'], 1), inOrder(['賣', '給'], 1), inOrder(['寄', '給'], 1), inOrder(['打', '給'], 1), inOrder(['拿', '給'], 1), inOrder(['帶', '給'], 1), inOrder(['寫', '給'], 1), inOrder(['說', '給'], 1)]),
  'B2L01-G07-P39': detected('（一）邊……（一）邊……', [inOrder(['一邊', '一邊'], 6)]),
  'B2L01-G08-P40': detected('雖然……可是……', [inOrder(['雖然', '可是'], 12)]),
  'B2L01-G09-P41': detected('句末呢', [sentenceFinal(['呢'], { notAfter: ['後來'] })]),

  // Book 2 Lesson 2 — 我得做家事
  'B2L02-G01-P51': detected('Subject + 把 + N + V + 了', [
    regex(`(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,4}${SEP}[^${SEP}]+${SEP}了`),
  ]),
  'B2L02-G02-P51': detected('Subject + 把 + N + V + 完', [
    regex(`(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,4}${SEP}[^${SEP}]+${SEP}完`),
  ]),
  'B2L02-G03-P52': detected('Subject + 把 + N + V一V', [
    regex(`(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,4}${SEP}([^${SEP}]+)${SEP}一${SEP}\\1`),
  ]),
  'B2L02-G04-P53': detected('Subject + 把 + N + V給 + Receiver', [
    regex(
      `(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,3}${SEP}(?:送|賣|拿|寄|遞|借|交|帶|打|寫|說|還)${SEP}給`,
    ),
  ]),
  'B2L02-G05-P54': detected('（有）多 + Vs', [
    regex(
      `(?:^|${SEP})(?<!很${SEP})(?<!不${SEP})(?<!太${SEP})(?<!沒有${SEP})(?:有${SEP})?多${SEP}(?:大|長|高|遠|重|髒|舊|新|貴|便宜|快|慢|早|晚|久|深|寬|厚|熱|冷|難|忙|累|近)`,
    ),
  ]),
  'B2L02-G06-P54': detected('Time duration + 沒／不 + V', [
    regex(
      `(?:^|${SEP})${DURATION_PREFIX}(?:${TIME_ALT})${SEP}(?:沒|不)${SEP}(?!關係|問題|事了)[^${SEP}]+`,
    ),
  ]),
  'B2L02-G07-P55': detected('Question word + 都／也 + VP', [
    regex(
      `(?:^|${SEP})(?:什麼|哪裡|哪兒|誰|怎麼|哪|多少|幾)(?:${SEP}(?!我|你|妳|他|她|我們|你們|他們|大家|時候|時間)[^${SEP}]+){0,3}${SEP}(?:都|也)`,
    ),
  ]),
  'B2L02-G08-P56': detected('又 + VP', [inOrder(['又'])]),
  'B2L02-G09-P56': detected('Time + 才 + VP', [
    regex(
      `(?:^|${SEP})(?:昨天|今天|明天|前天|後天|早上|上午|中午|下午|晚上|每天|的${SEP}時候|(?:這個|上個|下個|每個)?(?:星期|禮拜)[一二三四五六日天]?|[0-9一二兩三四五六七八九十]+${SEP}(?:點|月|號|日))(?:${SEP}[^${SEP}]+){0,3}${SEP}才`,
    ),
  ]),
  'B2L02-G10-P62': detected('Subject + 把 + N + V在／到 + Place', [
    regex(
      `(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,3}${SEP}(?:丟|放|拿|寫|寄|擺|掛|停|踢|送|帶|搬|倒|藏|收|排|貼)${SEP}(?:在|到)`,
    ),
  ]),
  'B2L02-G11-P63': detected('Condition + 才 + Result', [
    regex(
      `(?:^|${SEP})(?:因為|為了|要是|如果|以後|的話|最好|得|要)(?:${SEP}[^${SEP}]+){0,12}${SEP}才`,
    ),
  ]),

  // Book 2 Lesson 3 — 我要租房子
  'B2L03-G01-P75': detected('Directional verb + 來／去', [
    ...DIRECTIONAL_COMPLEMENTS.map((token) =>
      inOrder([token], 1, {
        notAfter: [...MOTION_VERBS, ...(token === '過去' ? ['在'] : [])],
        notBefore: token === '過去' ? ['的'] : [],
      }),
    ),
  ]),
  'B2L03-G02-P77': detected('Motion verb + directional verb + 來／去', [
    regex(
      `(?:^|${SEP})(?:${MOTION_ALT})(?:${SEP})?(?:${DIRECTION_ALT})(?=${SEP}|$)`,
    ),
  ]),
  'B2L03-G03-P78': detected('Motion verb + directional verb + place + 來／去', [
    regex(
      `(?:^|${SEP})(?:${MOTION_ALT})(?:${SEP})?(?:進|出|回|上|下|過)(?:${SEP}[^${SEP}]+){1,3}${SEP}(?:來|去)(?=${SEP}|$)`,
    ),
  ]),
  'B2L03-G04-P79': detected('Subject + 把 + Object + motion verb + directional verb + 來／去', [
    regex(
      `(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,4}${SEP}(?:${MOTION_ALT})(?:${SEP})?(?:${DIRECTION_ALT})(?=${SEP}|$)`,
    ),
    regex(
      `(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,4}${SEP}(?:${MOTION_ALT})(?:${SEP}(?:進|出|回|上|下|過))(?:${SEP}[^${SEP}]+){1,3}${SEP}(?:來|去)(?=${SEP}|$)`,
    ),
  ]),
  'B2L03-G05-P79': detected('XY + XY (two-syllable verb reduplication)', [
    regex(
      `(?:^|${SEP})(?!爸爸|媽媽|哥哥|弟弟|姐姐|妹妹|星星|常常|剛剛|慢慢|天天|種種)([\\u3400-\\u9fff]{2})${SEP}\\1(?=${SEP}|$)`,
    ),
  ]),
  'B2L03-G06-P80': detected('V起來 + comment', [
    regex(`(?:^|${SEP})(?:看|聽|吃|喝|穿|用|玩|學|讀|做)起來(?=${SEP}|$)`),
    regex(`(?:^|${SEP})(?:看|聽|吃|喝|穿|用|玩|學|讀|做)${SEP}起來(?=${SEP}|$)`),
  ]),
  'B2L03-G07-P81': detected('替 + person + action', [inOrder(['替'])]),
  'B2L03-G08-P86': detected('除了……，還……', [
    inOrder(['除了', '還'], 15, { notBefore: ['是'] }),
  ]),
  'B2L03-G09-P87': detected('Subject + 把 + Object + Verb得 + Adv + Vs', [
    regex(
      `(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,4}${SEP}[^${SEP}]+${SEP}得(?:${SEP})?(?:很|真|太|非常|更|那麼|這麼|不)`,
    ),
    regex(
      `(?:^|${SEP})把(?:${SEP}[^${SEP}]+){1,4}${SEP}[^${SEP}]+得(?:${SEP})?(?:很|真|太|非常|更|那麼|這麼|不)`,
    ),
  ]),

  // Book 2 Lesson 4 — 逛夜市真有趣
  'B2L04-G01-P99': detected('Thing + 就 + 在／是 + place or person', [
    inOrder(['就在']),
    inOrder(['就', '在'], 1),
    inOrder(['就是']),
    inOrder(['就', '是'], 1),
  ]),
  'B2L04-G02-P100': detected('V到／V得到了／V得到／V不到', [
    regex(
      `(?:^|${SEP})(?:想|看|買|吃|找|租|走|拿|聽|收|遇|碰)(?:${SEP}(?:得|不))?${SEP}?(?:得|不)?到(?:了)?(?=${SEP}|$)`,
    ),
  ]),
  'B2L04-G03-P101': detected('V懂／V得懂／V不懂', [
    regex(
      `(?:^|${SEP})(?:聽|看)(?:${SEP}(?:得|不))?${SEP}?(?:得|不)?懂(?=${SEP}|$)`,
    ),
  ]),
  'B2L04-G04-P108': detected('Vs得不得了／Vs極了', [
    inOrder(['得不得了']),
    inOrder(['得', '不得了'], 1),
    inOrder(['極了']),
    inOrder(['極', '了'], 1),
  ]),
  'B2L04-G05-P110': detected('越來越……', [inOrder(['越來越'])]),
  'B2L04-G06-P111': detected('V得起／V不起', [
    regex(
      `(?:^|${SEP})(?:吃|買|看|喝|住|用|玩|付|租)(?:${SEP}(?:得|不))?${SEP}?(?:得|不)?起(?=${SEP}|$)`,
    ),
  ]),
  'B2L04-G07-P112': detected('V飽／V得飽／V不飽', [
    regex(
      `(?:^|${SEP})(?:吃|睡)(?:${SEP}(?:得|不))?${SEP}?(?:得|不)?飽(?=${SEP}|$)`,
    ),
  ]),
  'B2L04-G08-P113': detected('對……有／沒（有）興趣', [
    regex(
      `(?:^|${SEP})對(?!${SEP}了)(?:${SEP}[^${SEP}]+){1,8}${SEP}(?:很${SEP})?(?:沒有|有|沒)(?:${SEP}(?:一點兒|一點|有些))?${SEP}?興趣(?=${SEP}|$)`,
    ),
  ]),

  // Book 2 Lesson 5 — 歡迎到我家來玩
  'B2L05-G01-P122': detected('N₁（+Neg）+被（+N₂）+V+C', [
    regex(
      `(?:^|${SEP})被(?:${SEP}[^${SEP}]+){0,3}${SEP}[^${SEP}]+${SEP}了(?:${SEP}|$)`,
    ),
    regex(`(?:^|${SEP})(?:沒|沒有|不會|不)${SEP}被`),
  ]),
  'B2L05-G02-P123': detected('S₁+V著V著，（S₂）+就……了', [
    regex(
      `(?:^|${SEP})([^${SEP}]*著)${SEP}\\1(?:${SEP}[^${SEP}]+){0,3}${SEP}就`,
    ),
  ]),
  'B2L05-G03-P124': detected('只要……就……', [inOrder(['只要', '就'], 8)]),
  'B2L05-G04-P124': detected('有時候……，有時候……', [
    regex(
      `(?:^|${SEP})(?:有${SEP}時候|有時候)(?:${SEP}[^${SEP}]+){0,10}${SEP}(?:有${SEP}時候|有時候)`,
    ),
  ]),
  'B2L05-G05-P130': detected('Vs起來／V起（O）來', [
    regex(`(?:^|${SEP})[^${SEP}]+${SEP}起來(?:${SEP}|$)`),
    regex(`(?:^|${SEP})[^${SEP}]+起來(?:${SEP}|$)`),
    regex(
      `(?:^|${SEP})[^${SEP}]+${SEP}起(?:${SEP}[^${SEP}]+){0,2}${SEP}來(?:${SEP}|$)`,
    ),
  ]),
  'B2L05-G06-P130': detected('還好……，要不然……', [inOrder(['還好', '要不然'], 12)]),
  'B2L05-G07-P131': detected('每+Nu+M₁（+就）+V+Nu+M₂（+N）', [
    regex(
      `(?:^|${SEP})每${SEP}(?:[0-9]+|[一二兩三四五六七八九十百千萬半幾]+)(?:${SEP}[^${SEP}]+){1,3}${SEP}(?:就${SEP})?[^${SEP}]+${SEP}(?:[0-9]+|[一二兩三四五六七八九十半幾]+)(?:${SEP}[^${SEP}]+){0,2}${SEP}(?:次|遍|趟|班|回|場|期)`,
    ),
  ]),
  'B2L05-G08-P132': detected('A像B一樣（+Vs）', [inOrder(['像', '一樣'], 6)]),

  // Book 2 Lesson 6 — 我們去KTV唱歌吧！
  'B2L06-G01-P143': detected('V好了／沒V好／V得/不 + 好', [
    regex(`(?:^|${SEP})(?:${L06_HAO_ALT})${SEP}好${SEP}了(?=${SEP}|$)`),
    regex(`(?:^|${SEP})(?:${L06_HAO_ALT})${SEP}(?:得|不)${SEP}好(?:${SEP}了)?$`),
    regex(
      `(?:^|${SEP})(?:沒|沒有)(?:${SEP}[^${SEP}]+){0,4}${SEP}(?:${L06_HAO_ALT})${SEP}好`,
    ),
  ]),
  'B2L06-G02-P144': detected('V錯了／沒V錯', [
    regex(
      `(?:^|${SEP})(?:${L06_CUO_ALT})(?:[^${SEP}]*錯|${SEP}錯)(?:${SEP}?了)?`,
    ),
  ]),
  'B2L06-G03-P145': detected('V會了／沒V會／V得/不會', [
    regex(`(?:^|${SEP})(?:學|教)(?:${SEP}(?:得|不))?${SEP}?會(?:了)?(?=${SEP}|$)`),
  ]),
  'B2L06-G04-P145': detected('QW……就……QW', [
    regex(
      `(?:^|${SEP})(?:${L06_QW_ALT})(?:${SEP}[^${SEP}]+){0,4}${SEP}就[^${SEP}]*(?:${SEP}[^${SEP}]+){0,2}${SEP}(?:${L06_QW_ALT})(?=${SEP}|$)`,
    ),
    regex(
      `(?:^|${SEP})(?:${L06_QW_ALT})(?:${SEP}[^${SEP}]+){0,4}${SEP}(?:${L06_QW_ALT})(?:${SEP}[^${SEP}]+){0,2}${SEP}就`,
    ),
  ]),
  'B2L06-G05-P146': detected('一定／很快／不會 + 會……的', [
    regex(
      `(?:^|${SEP})(?:一定|當然|應該)(?:${SEP}[^${SEP}]+){0,2}${SEP}會(?:${SEP}[^${SEP}]+){0,5}${SEP}的(?:${SEP}|$)`,
    ),
    regex(
      `(?:^|${SEP})很${SEP}?快(?:${SEP}[^${SEP}]+){0,2}${SEP}會(?:${SEP}[^${SEP}]+){0,5}${SEP}的(?:${SEP}|$)`,
    ),
    regex(`(?:^|${SEP})不${SEP}?會(?:${SEP}[^${SEP}]+){1,4}${SEP}的(?:${SEP}|$)`),
  ]),
  'B2L06-G06-P147': detected('等……，就……', [inOrder(['等', '就'], 8)]),
  'B2L06-G07-P153': detected('才 + Number (fewer than expected)', [
    regex(`(?:^|${SEP})才(?:${SEP}[^${SEP}]+){0,3}${SEP}(?:[0-9]+|[一二兩三四五六七八九十百千萬半幾])`),
    regex(
      `(?:^|${SEP})個${SEP}[^${SEP}]*才${SEP}(?:[0-9]+|[一二兩三四五六七八九十百千萬半幾])`,
    ),
  ]),
  'B2L06-G08-P154': detected('讓 + B + Feeling', [inOrder(['讓'])]),

  // Book 2 Lesson 7 — 坐火車到花蓮去旅行
  'B2L07-G01-P165': detected('不但……，還……', [inOrder(['不但', '還'], 12)]),
  'B2L07-G02-P166': detected('一 + M（+N）+ 都／也 + Neg + V', [
    regex(
      `(?:^|${SEP})一${SEP}(?:${L07_MEASURE_ALT})(?:${SEP}[^${SEP}]+){0,2}${SEP}(?:都|也)${SEP}(?:沒有|不|沒)`,
    ),
  ]),
  'B2L07-G03-P166': detected('讓 + Person + V（客氣地）', [
    regex(
      `(?:^|${SEP})讓(?:${SEP}[^${SEP}]+){1,3}${SEP}(?:請客|請|帶|送|等|去|來|吃|喝|看|坐|選|訂|說|買|休息|上班|回家|進來|出去|走|做|寫|讀|唱|玩|參加|打|用|開|關|放|拿|教|幫)`,
    ),
  ]),
  'B2L07-G04-P167': detected('是 +（Adv）+ Vs', [
    regex(
      `(?:^|${SEP})是${SEP}(?:比較|有點兒|有點|有一點兒|有一點|很|真|太|更|非常|這麼|那麼)${SEP}(?:危險|安全|貴|便宜|難|難寫|難買|容易|忙|累|漂亮|好看|好吃|好玩|舒服|冷|熱|快|慢|遠|近|新|舊|大|小|高|矮|長|短|多|少|好|對|錯|無聊|有趣|開心|高興)`,
    ),
    regex(
      `(?:^|${SEP})是${SEP}(?:危險|安全|貴|便宜|難|容易|忙|累|漂亮|好看|好吃|好玩|舒服|冷|熱|快|慢|遠|近|無聊|有趣|開心|高興)(?=${SEP}(?:的|了|多了|極了)?(?:${SEP}|$))`,
    ),
  ]),
  'B2L07-G05-P168': detected('V光（了）', [
    regex(`(?:^|${SEP})(?:${L07_GUANG_ALT})${SEP}?光(?:${SEP}?了)?(?=${SEP}|$)`),
  ]),
  'B2L07-G06-P169': detected('一點兒 + 都／也 + Neg + Vs', [
    regex(`(?:^|${SEP})(?:一點兒|一點)${SEP}(?:都|也)${SEP}(?:沒有|不|沒)`),
  ]),
  'B2L07-G07-P176': detected('剛……（，）就……', [inOrder(['剛', '就'], 8)]),
  'B2L07-G08-P176': detected('趁（著）', [
    regex(`(?:^|${SEP})趁(?:著)?${SEP}[^${SEP}]+`),
  ]),

  // Book 2 Lesson 8 — 請給我貼紙，我要換史努比！
  'B2L08-G01-P188': detected('滿 + number + measure word (+ noun)', [
    inOrder(['滿'], 1, { notAfter: ['客'] }),
  ]),
  'B2L08-G02-P188': detected('連 + focus + 都／也', [
    // The reader segments 都不／也不 as one token, so matching the standalone
    // 連 token avoids missing those common variants while excluding 連續劇.
    inOrder(['連']),
  ]),
  'B2L08-G03-P189': detected('像 + example + 這樣／那樣 + 的 + noun', [
    inOrder(['像', '這樣'], 12),
    inOrder(['像', '那樣'], 12),
  ]),
  'B2L08-G04-P190': detected('只好 + action', [inOrder(['只好'])]),
  'B2L08-G05-P191': detected('為了 + purpose', [inOrder(['為了'])]),
  'B2L08-G06-P197': detected('V + 上 result complement', [
    inOrder(['愛上']),
  ]),
  'B2L08-G07-P198': detected('因為 + noun / phrase + 的關係', [
    // In 因為韓劇的關係, 韓劇的 is a single reading token.
    inOrder(['因為', '關係'], 8),
  ]),

  // Book 2 Lesson 9 — 你怕考試嗎？
  'B2L09-G01-P208': detected('negative statement + sentence-final 嗎', [
    inOrder(['不', '是', '嗎'], 3),
  ]),
  'B2L09-G02-P209': detected('快／慢（一）點兒 + action', [
    inOrder(['快', '點兒'], 1),
  ]),
  'B2L09-G03-P209': detected('verb + 到 + endpoint', [
    inOrder(['考', '到'], 1),
  ]),
  'B2L09-G04-P211': detected('negative + noncommittal question word', [
    inOrder(['沒', '修', '多少'], 1),
  ]),
  'B2L09-G05-P212': detected('怎麼這麼 + state verb', [
    inOrder(['怎麼', '這麼'], 1),
  ]),
  'B2L09-G06-P212': detected('potential complement 得下／不下', [
    inOrder(['吃', '不', '下'], 1),
  ]),
  'B2L09-G01-P218': detected('state-verb reduplication with 的／地', [
    // The reading uses the complement form 說得清清楚楚 (without optional 的).
    inOrder(['得', '清清楚楚'], 1),
  ]),

  // Book 2 Lesson 10 — 下課後一起去健身吧！
  'B2L10-G01-P231': detected('不但……而且……', [inOrder(['不但', '而且'], 8)]),
  'B2L10-G02-P232': detected('Vs + 死了', [inOrder(['痛', '死', '了'], 1)]),
  'B2L10-G03-P232': detected('越……越……', [inOrder(['越', '做', '越'], 1)]),
  'B2L10-G04-P233': detected('到底', [inOrder(['到底', '要', '不', '要'], 1)]),
  'B2L10-G01-P239': detected('對……來說', [inOrder(['對', '來', '說'], 8)]),
  'B2L10-G02-P240': detected('condition + 的話', [inOrder(['要是', '的', '話'], 20)]),
  'B2L10-G03-P241': detected('對……有幫助', [inOrder(['對', '有', '幫助'], 8)]),

  // Book 2 Lesson 11 — 你想參加哪一個社團？
  'B2L11-G01-P250': detected('place + V了 + noun', [inOrder(['擺', '了', '攤子'], 6)]),
  'B2L11-G02-P252': detected('對……感興趣', [inOrder(['對', '感', '興趣'], 8)]),
  'B2L11-G03-P252': detected('V不出來', [inOrder(['看', '不', '出來'], 1)]),
  'B2L11-G04-P253': detected('嘛', [inOrder(['社', '嘛'], 1)]),
  'B2L11-G05-P254': detected('同一 + measure word', [inOrder(['同', '一', '個'], 1)]),
  'B2L11-G06-P260': detected('examples + 等', [inOrder(['住院', '出院', '等'], 2)]),
  'B2L11-G07-P260': detected('從……中', [inOrder(['從', '服務', '中'], 1), inOrder(['從', '課本', '中'], 1)]),

  // Book 2 Lesson 12 — 小職員？大老闆？
  'B2L12-G01-P271': detected('除了……都……', [inOrder(['除了', '翻譯', '都'], 12)]),
  'B2L12-G02-P272': detected('不像……那麼', [inOrder(['不', '像', '那麼'], 8)]),
  'B2L12-G03-P273': detected('從……起', [inOrder(['從', '起'], 8)]),
  'B2L12-G04-P273': detected('向 + person + verb', [inOrder(['向', '他', '學習'], 1)]),
  'B2L12-G05-P274': detected('難怪', [inOrder(['難怪'])]),
  'B2L12-G06-P275': detected('V不了', [inOrder(['做', '不', '了'], 1)]),
  'B2L12-G07-P282': detected('V個 + noun', [inOrder(['喝', '個', '茶'], 1), inOrder(['聽', '個', '音樂'], 1)]),
  'B2L12-G08-P283': detected('N + 來', [inOrder(['自己', '來'], 1)]),

  // Book 2 Lesson 13 — 我要買筆電
  'B2L13-G01-P293': detected('不管……都……', [inOrder(['不管', '都'], 8)]),
  'B2L13-G02-P294': detected('不如', [inOrder(['不如', '買'], 1)]),
  'B2L13-G03-P294': detected('Vs了（一）點兒', [inOrder(['貴', '了', '一點兒'], 1)]),
  'B2L13-G04-P301': detected('比起來', [inOrder(['跟', '平板', '比起來'], 1)]),
  'B2L13-G05-P302': detected('差一點兒就', [inOrder(['差', '一點兒', '就'], 1)]),
  'B2L13-G06-P303': detected('白 V', [inOrder(['沒', '白跑'], 1)]),

  // Book 2 Lesson 14 — 餐桌上的魚，年年有餘
  'B2L14-G01-P316': detected('想起來', [inOrder(['想起來', '了'], 1)]),
  'B2L14-G02-P317': detected('從來沒', [inOrder(['從來', '沒'], 1)]),
  'B2L14-G03-P317': detected('examples + 等等', [inOrder(['年糕', '發糕', '蘿蔔糕', '等等'], 1)]),
  'B2L14-G04-P325': { undetectable: 'The reading uses 當天, not the 當……就…… frame.' },
  'B2L14-G05-P325': detected('讓 + agent + 給 + V了', [inOrder(['讓', '怪獸', '給', '吃', '了'], 1)]),
  'B2L14-G06-P327': detected('無所謂', [inOrder(['無所謂'])]),
  'B2L14-G07-P328': detected('V走', [inOrder(['趕', '走'], 1), inOrder(['嚇', '走'], 1)]),
  'B2L14-G08-P329': detected('要不是', [inOrder(['要', '不', '是'], 1)]),

  // Book 2 Lesson 15 — 孔子不知道的事
  'B2L15-G01-P341': detected('可 + state verb', [inOrder(['可', '有', '興趣'], 1)]),
  'B2L15-G02-P342': detected('V + 一 + measure word', [inOrder(['看', '我', '一', '眼'], 1)]),
  'B2L15-G03-P343': detected('V下來', [inOrder(['記', '下來'], 1)]),
  'B2L15-G04-P343': detected('說 V 就 V', [inOrder(['說', '走', '就', '走'], 1)]),
  'B2L15-G05-P351': detected('誰知道', [inOrder(['誰', '知道'], 1)]),

  // Book 2 Lesson 16 — 世界各地的朋友
  'B2L16-G01-P361': detected('Vs得很', [inOrder(['臭', '得', '很'], 1)]),
  'B2L16-G02-P362': detected('得看', [inOrder(['得', '看'], 1)]),
  'B2L16-G03-P363': detected('像……什麼的', [inOrder(['像', '唱歌', '什麼', '的'], 4)]),
  'B2L16-G04-P364': detected('V來V去', [inOrder(['走', '來', '走', '去'], 1)]),
  'B2L16-G05-P370': detected('比不上', [inOrder(['比', '不', '上'], 1)]),
  'B2L16-G06-P371': detected('只有……才……', [inOrder(['只有', '才'], 10)]),

  // Book 3 Lesson 15 — 去淡水參觀古蹟
  'B3L15-G01-P383': detected('簡直', [inOrder(['簡直'])]),
  'B3L15-G02-P384': detected('Vs得沒話說', [inOrder(['得沒話說'])]),
  'B3L15-G03-P392': detected('同時', [inOrder(['同時'])]),
  'B3L15-G04-P393': detected('及', [inOrder(['及'])]),
  'B3L15-G05-P395': detected('總而言之 / 總之', [inOrder(['總而言之']), inOrder(['總之'])]),

  // Book 3 Lesson 16 — 愛惜食物，從你我做起
  'B3L16-G01-P404': detected('當作 / 當做', [inOrder(['當作']), inOrder(['當做'])]),
  'B3L16-G02-P406': detected('至少', [inOrder(['至少'])]),
  'B3L16-G03-P413': detected('由於……(因此)……', [inOrder(['由於', '因此'], 12), inOrder(['由於']), inOrder(['是由於'])]),
  'B3L16-G04-P415': detected('使得', [inOrder(['使得'])]),
  'B3L16-G05-P417': detected('於是', [inOrder(['於是'])]),
};
