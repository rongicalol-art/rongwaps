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
};
