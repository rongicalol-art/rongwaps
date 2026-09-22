/**
 * Authored sense rules for vocabulary entries whose surface is taught more than
 * once with different meanings (好 "good" vs "very", 點 "o'clock" vs "to
 * order", 過 aspect vs "to cross" vs "to celebrate", …).
 *
 * Each entry answers one question: does *this* taught sense occur in a reading?
 * Evidence is matched on the reader's own word segmentation through the shared
 * token-evidence matcher (`src/utils/tokenEvidence.ts`), sentence by sentence,
 * never on substrings. A sense that cannot be told apart from its sibling
 * declares `undetectable` with the reason, exactly like the grammar usage
 * rules, so the reader can say "sense unclear here" instead of guessing.
 *
 * The table is keyed by the vocabulary pack id. `surface`, `lessonId` and
 * `meaning` mirror the pack row for the learner-facing note and are
 * cross-checked against the pack by `tests/vocabularySense.test.ts`.
 */
import { USAGE_TOKEN_SEPARATOR, type TokenEvidence } from '../utils/tokenEvidence';

const SEP = USAGE_TOKEN_SEPARATOR;
/** Numbers, including the packed multi-character forms the segmenter produces (十五, 三十). */
const NUM = `(?:[0-9]+|[一二兩三四五六七八九十百千萬万幾半]+)`;

const inOrder = (
  tokens: string[],
  maxGap = 3,
  guards: { notAfter?: string[]; notBefore?: string[] } = {},
): TokenEvidence => ({ kind: 'inOrder', tokens, maxGap, ...guards });
const sentenceFinal = (tokens: string[]): TokenEvidence => ({ kind: 'sentenceFinal', tokens });
const tokenEndsWith = (characters: string[], except: string[] = []): TokenEvidence => ({
  kind: 'tokenEndsWith',
  characters,
  except,
});
const regex = (source: string): TokenEvidence => ({ kind: 'regex', source });

export interface VocabularySenseRule {
  /** The surface this sense shares with its siblings (pack simplified form). */
  surface: string;
  /** Lesson the sense is taught in, for the learner-facing note. */
  lessonId: number;
  /** The pack's meaning for this entry, for the learner-facing note. */
  meaning: string;
  detected?: { anyOf: TokenEvidence[]; citation: string };
  undetectable?: string;
}

const detected = (citation: string, anyOf: TokenEvidence[]) => ({
  detected: { citation, anyOf },
});
const undetectable = (reason: string) => ({ undetectable: reason });

export const VOCABULARY_SENSE_RULES: Record<string, VocabularySenseRule> = {
  // 你 / 妳
  'B1L00-1-03': {
    surface: '你',
    lessonId: 0,
    meaning: 'you',
    ...detected('你 as the written form', [inOrder(['你'])]),
  },
  'B1L01-1-11': {
    surface: '你',
    lessonId: 1,
    meaning: 'you (female)',
    ...detected('妳 as the written form', [inOrder(['妳'])]),
  },

  // 好 "good" / "very"
  'B1L01-2-08': {
    surface: '好',
    lessonId: 1,
    meaning: 'fine; good; well; nice; ok',
    ...detected('很／不 + 好, or 你／妳好 greeting', [
      inOrder(['很', '好']),
      inOrder(['不', '好']),
      inOrder(['你', '好']),
      inOrder(['妳', '好']),
      sentenceFinal(['好']),
    ]),
  },
  'B1L04-1-04': {
    surface: '好',
    lessonId: 4,
    meaning: 'very',
    ...detected('好 + adjective (very)', [
      regex(
        `(?:^|${SEP})好${SEP}(?:熱|冷|累|忙|貴|遠|近|大|小|多|少|快|慢|早|晚|久|難|長|短|重|輕|吵|開心|快樂|有意思|便宜|可愛|漂亮|好玩|好吃|好喝|好看)`,
      ),
    ]),
  },

  // 幾 "how many" / "several"
  'B1L02-1-01': {
    surface: '几',
    lessonId: 2,
    meaning: 'how many',
    ...detected('幾 + measure word', [
      regex(
        `(?:^|${SEP})幾${SEP}(?:點|號|月|歲|本|杯|位|個|天|次|遍|隻|臺|枝|間|件|種|公斤|公分|分鐘|小時)`,
      ),
    ]),
  },
  'B1L06-3-02': {
    surface: '几',
    lessonId: 6,
    meaning: 'several; a few',
    ...detected('好幾, or 幾 + measure + noun (several)', [
      inOrder(['好', '幾']),
      regex(
        `(?:^|${SEP})幾${SEP}(?:個|天|年|次|位|本|杯)${SEP}(?:好|朋友|人|假|東西|學生|老師|同學|親戚)`,
      ),
    ]),
  },

  // 點 "o'clock" / "to order"
  'B1L02-1-02': {
    surface: '点',
    lessonId: 2,
    meaning: "o'clock",
    ...detected('number + 點, 點半／點分／點鐘', [
      regex(`(?:^|${SEP})${NUM}${SEP}點`),
      inOrder(['點', '半']),
      inOrder(['點', '分']),
      inOrder(['點', '鐘']),
    ]),
  },
  'B1L04-2-01': {
    surface: '点',
    lessonId: 4,
    meaning: 'to order from a menu',
    ...detected('點 + food, drink or quantity', [
      regex(`(?:^|${SEP})點${SEP}(?:兩|一|三|幾|什麼|牛肉|飲料|咖啡|茶|杯|碗|菜|東西|心)`),
    ]),
  },

  // 有 "to have" / "there is/are"
  'B1L02-1-17': {
    surface: '有',
    lessonId: 2,
    meaning: 'to have',
    ...detected('possessor + 有, or 沒有', [
      regex(
        `(?:^|${SEP})(?:我|你|妳|他|她|我們|你們|他們|誰|老師|媽媽|爸爸|朋友|同學|國安|宜文|友美|中明|家樂|元真)${SEP}(?:[^${SEP}]+${SEP}){0,2}有`,
      ),
      regex(`(?:^|${SEP})沒${SEP}有`),
      regex(`(?:^|${SEP})沒有`),
    ]),
  },
  'B1L05-2-14': {
    surface: '有',
    lessonId: 5,
    meaning: 'there is/are; to exist',
    ...detected('place + 有 (there is/are)', [
      regex(
        `(?:^|${SEP})(?:上|裡|下|前面|後面|旁邊|外面|教室|學校|家|圖書館|桌子|黑板|房間|客廳|冰箱|公園|店|車上|路上|山上|門口)${SEP}(?:[^${SEP}]+${SEP}){0,2}有`,
      ),
    ]),
  },

  // 沒 "not" / "not (completed action)"
  'B1L02-1-18': {
    surface: '没',
    lessonId: 2,
    meaning: 'not',
    ...detected('沒（有） for not having', [regex(`(?:^|${SEP})沒${SEP}有`), regex(`(?:^|${SEP})沒有`)]),
  },
  'B1L11-1-16': {
    surface: '没',
    lessonId: 11,
    meaning: 'not (for a completed action)',
    ...detected('還沒, or 沒 + action', [
      inOrder(['還', '沒']),
      inOrder(['沒'], 1, { notBefore: ['有'] }),
    ]),
  },

  // 課 "class" / measure word for lessons
  'B1L02-1-19': {
    surface: '课',
    lessonId: 2,
    meaning: 'class',
    ...detected('下課／上課／中文課, or 有 + 課', [
      regex(`(?:^|${SEP})(?:下課|上課|中文課|英文課|日文課)`),
      inOrder(['有', '課']),
    ]),
  },
  'B1L15-1-02': {
    surface: '课',
    lessonId: 15,
    meaning: 'measure word for lessons',
    ...detected('第 + number + 課', [inOrder(['第', '課'], 4)]),
  },

  // 家 "home" / measure word for restaurants
  'B1L02-1-23': {
    surface: '家',
    lessonId: 2,
    meaning: 'home; house',
    ...detected('standalone 家, or 回家／在家', [
      regex(`(?:^|${SEP})家(?:${SEP}|$)`),
      inOrder(['回', '家']),
      inOrder(['在', '家']),
    ]),
  },
  'B1L04-1-13': {
    surface: '家',
    lessonId: 4,
    meaning: 'measure word of restaurants',
    ...detected('demonstrative/number + 家 + restaurant', [
      regex(`(?:^|${SEP})(?:這|那|哪|${NUM})${SEP}家${SEP}(?:餐廳|飯館|店|咖啡廳|商店|餐館)`),
    ]),
  },

  // 啊 interjection / affirmation / interrogative particle
  'B1L02-2-06': {
    surface: '啊',
    lessonId: 2,
    meaning: 'interjection',
    ...detected('sentence-initial 啊', [
      regex(`^啊(?:${SEP}|$)`),
      regex(`(?:^|${SEP})號${SEP}啊(?:${SEP}|$)`),
    ]),
  },
  'B1L03-1-21': {
    surface: '啊',
    lessonId: 3,
    meaning: 'phrase final particle, indicating affirmation',
    ...detected('好／是／對 + 啊 (affirmation)', [
      regex(`(?:^|${SEP})(?:好|是|對|行|可以)${SEP}啊(?:${SEP}|$)`),
    ]),
  },
  'B1L15-1-15': {
    surface: '啊',
    lessonId: 15,
    meaning: 'interrogative final particle (used when the answer is assumed)',
    ...detected('question word … 啊', [
      regex(`(?:^|${SEP})(?:什麼|誰|哪|幾|怎麼|多少)${SEP}(?:[^${SEP}]+${SEP}){0,3}啊(?:${SEP}|$)`),
    ]),
  },

  // 請 "to invite; to treat" / "please"
  'B1L03-3-01': {
    surface: '请',
    lessonId: 3,
    meaning: 'to invite; to treat',
    ...detected('請 + person (invite/treat)', [
      regex(`(?:^|${SEP})請${SEP}(?:我|你|妳|他|她|我們|你們|他們|朋友|同學|大家|客|人)`),
    ]),
  },
  'B1L04-2-13': {
    surface: '请',
    lessonId: 4,
    meaning: 'please',
    ...detected('請 + action (please)', [
      regex(`(?:^|${SEP})請${SEP}(?:給|坐|進|等|說|幫|借|慢|稍|問|聽|看|用|來)`),
    ]),
  },

  // 多 "many" / "more; over" / "to do more"
  'B1L04-1-15': {
    surface: '多',
    lessonId: 4,
    meaning: 'many; much',
    ...detected('很／太 + 多, or 多 as predicate', [
      inOrder(['很', '多']),
      inOrder(['太', '多']),
      regex(`(?:^|${SEP})多${SEP}(?:了|嗎|不多)`),
    ]),
  },
  'B1L04-2-23': {
    surface: '多',
    lessonId: 4,
    meaning: 'more; over',
    ...detected('number + 多 (more than)', [
      regex(`(?:^|${SEP})${NUM}${SEP}多`),
      regex(`(?:^|${SEP})(?:點|歲|年|月|天|個|小時)${SEP}多`),
    ]),
  },
  'B1L10-1-16': {
    surface: '多',
    lessonId: 10,
    meaning: 'to do more',
    ...detected('多 + action (do more)', [
      regex(`(?:^|${SEP})多${SEP}(?:喝|吃|休息|睡|穿|運動|帶|看|聽|說|練|複習|寫|走|用|注意|小心)`),
    ]),
  },

  // 少 "less; little" / "to do less"
  'B1L04-1-16': {
    surface: '少',
    lessonId: 4,
    meaning: 'less; little',
    ...detected('很／太 + 少', [inOrder(['很', '少']), inOrder(['太', '少'])]),
  },
  'B1L10-1-17': {
    surface: '少',
    lessonId: 10,
    meaning: 'to do less',
    ...detected('少 + action (do less)', [
      regex(`(?:^|${SEP})少${SEP}(?:喝|吃|睡|看|用|玩|說|買|運動)`),
    ]),
  },

  // 了 太…了 / change of state / completed action
  'B1L04-1-20': {
    surface: '了',
    lessonId: 4,
    meaning: 'used after a Vs, preceded by 太',
    ...detected('太 + … + 了', [inOrder(['太', '了'], 4)]),
  },
  'B1L07-1-26': {
    surface: '了',
    lessonId: 7,
    meaning: 'indicating changed situations',
    ...detected('sentence-final 了 (new situation)', [regex(`^(?!.*太).*${SEP}了$`)]),
  },
  'B1L11-1-02': {
    surface: '了',
    lessonId: 11,
    meaning: 'verbal particle indicating a completed action',
    ...detected('了 + object (completed action)', [regex(`^(?!.*太).*了${SEP}[^${SEP}]`)]),
  },

  // 給 "to give" / "to (for a person)"
  'B1L04-2-14': {
    surface: '给',
    lessonId: 4,
    meaning: 'to give',
    ...detected('給 + person + thing', [
      regex(
        `(?:^|${SEP})給${SEP}(?:我|你|妳|他|她|我們|你們|他們|客人|老闆|店員|朋友)${SEP}(?:一|兩|三|幾|這|那|杯|碗|個|瓶|塊|錢|東西|書|禮物)`,
      ),
      inOrder(['送', '給']),
    ]),
  },
  'B1L11-2-12': {
    surface: '给',
    lessonId: 11,
    meaning: 'to',
    ...detected('給 + person + action (to / for)', [
      regex(
        `(?:^|${SEP})給${SEP}(?:我|你|妳|他|她|我們|你們|他們)${SEP}(?:打|寫|說|講|寄|拿|帶|做|看|聽|介紹|留言|回|送)`,
      ),
    ]),
  },

  // 在 located at / in the process of
  'B1L05-1-02': {
    surface: '在',
    lessonId: 5,
    meaning: '(to be located) at; in; on',
    ...detected('在 + place', [
      regex(
        `(?:^|${SEP})在${SEP}(?:學校|家|台灣|圖書館|教室|餐廳|咖啡廳|房間|客廳|公園|公司|醫院|日本|美國|英國|中國|印尼|夜市|車站|路上|哪裡|這裡|那裡|樓上|樓下|飯店|店|宿舍|銀行|超市|市場|門口|外面|裡面|前面|後面|旁邊|桌上|車上|臺北|台北)`,
      ),
    ]),
  },
  'B1L09-1-10': {
    surface: '在',
    lessonId: 9,
    meaning: 'in the process of doing something',
    ...detected('在 + action', [
      regex(
        `(?:^|${SEP})在${SEP}(?:睡|看|吃|喝|做|寫|讀|聽|說|玩|工作|上|下課|聊天|洗澡|運動|唱|跳舞|等|找|想|準備|練習|複習|考試|打|游泳|跑步)`,
      ),
    ]),
  },

  // 吧 suggestion / confirmation question
  'B1L05-1-14': {
    surface: '吧',
    lessonId: 5,
    meaning: 'final particle for suggestion',
    ...detected('suggestion + 吧', [
      regex(`(?:^|${SEP})(?:一起|我們|來|去|吃|喝|買|走|試|看|玩|休息|開始|回家|加油)${SEP}(?:[^${SEP}]+${SEP}){0,3}吧$`),
    ]),
  },
  'B1L08-2-03': {
    surface: '吧',
    lessonId: 8,
    meaning: 'final particle for questions',
    ...detected('是／不錯 + … + 吧 (confirmation)', [
      regex(`(?:^|${SEP})(?:是|有|會|要|對|好|不錯|可以|知道|認識|喜歡)${SEP}(?:[^${SEP}]+${SEP}){0,3}吧$`),
    ]),
  },

  // 跟 "and" / "with" / "(talking) to"
  'B1L05-2-01': {
    surface: '跟',
    lessonId: 5,
    meaning: 'and',
    ...detected('A 跟 B (joining things)', [
      regex(
        `(?:^|${SEP})(?:我|你|妳|他|她|我們|你們|他們|國安|宜文|友美|中明|家樂|元真)${SEP}跟${SEP}(?:[^${SEP}]+${SEP}){0,3}(?:一共|都|多少|買|喝|吃|玩)`,
      ),
    ]),
  },
  'B1L08-1-23': {
    surface: '跟',
    lessonId: 8,
    meaning: 'with',
    ...detected('跟 + person + action (with)', [
      regex(
        `(?:^|${SEP})跟${SEP}[^${SEP}]+${SEP}(?:一起|去|來|玩|住|旅行|上課|吃飯|看|買|坐|走|運動|游泳|打球)`,
      ),
    ]),
  },
  'B1L10-1-05': {
    surface: '跟',
    lessonId: 10,
    meaning: '(talking) to',
    ...detected('跟 + person + speech verb (to)', [
      regex(`(?:^|${SEP})跟${SEP}[^${SEP}]+${SEP}(?:說|聊|講|問|借|道歉|見面|打招呼)`),
    ]),
  },

  // 找 "to look for" / "to visit (a person)"
  'B1L05-2-25': {
    surface: '找',
    lessonId: 5,
    meaning: 'to look for',
    ...detected('找 + thing (look for)', [
      regex(`(?:^|${SEP})找${SEP}(?:錢|手機|錢包|書|東西|工作|地方|廁所|路|車|鑰匙)`),
      regex(`(?:^|${SEP})找${SEP}(?:好|到|了|吧|嗎)`),
    ]),
  },
  'B1L07-1-05': {
    surface: '找',
    lessonId: 7,
    meaning: 'to visit; to see (a person)',
    ...detected('找 + person (visit/see)', [
      regex(`(?:^|${SEP})找${SEP}(?:我|你|妳|他|她|朋友|同學|老師|老闆|誰|家人|韓國朋友)`),
    ]),
  },

  // 再 "again" / "then (first…, then…)"
  'B1L05-2-27': {
    surface: '再',
    lessonId: 5,
    meaning: 'again',
    ...detected('再 + action (again)', [
      regex(
        `^(?!.*先).*${SEP}再${SEP}(?:來|去|買|說|吃|喝|看|試|想|等|玩|睡|做|寫|打|問|複習|練習|找|用|洗)`,
      ),
    ]),
  },
  'B1L09-1-16': {
    surface: '再',
    lessonId: 9,
    meaning: 'then (used in "first..., then..." pattern)',
    ...detected('先 … 再 …', [inOrder(['先', '再'], 6)]),
  },

  // 隻 measure word / 只 "only"
  'B1L05-3-10': {
    surface: '只',
    lessonId: 5,
    meaning: 'measure word for animals',
    ...detected('number + 隻', [regex(`(?:^|${SEP})${NUM}${SEP}隻`)]),
  },
  'B1L06-2-18': {
    surface: '只',
    lessonId: 6,
    meaning: 'only; just',
    ...detected('只 (only)', [inOrder(['只'])]),
  },

  // 會 ability / expected future
  'B1L06-1-13': {
    surface: '会',
    lessonId: 6,
    meaning: 'to be able to; can',
    ...undetectable(
      '會 as learned ability cannot be told apart from 會 as expected future without tagging the following verb.',
    ),
  },
  'B1L10-2-15': {
    surface: '会',
    lessonId: 10,
    meaning: 'will; to be going to+V',
    ...undetectable(
      '會 as expected future cannot be told apart from 會 as learned ability without tagging the following verb.',
    ),
  },

  // 快 "fast" / "about to"
  'B1L06-1-18': {
    surface: '快',
    lessonId: 6,
    meaning: 'fast; quick',
    ...detected('很／得／真／太 + 快', [
      inOrder(['很', '快']),
      inOrder(['得', '快']),
      inOrder(['真', '快']),
      inOrder(['太', '快']),
    ]),
  },
  'B1L08-2-16': {
    surface: '快',
    lessonId: 8,
    meaning: 'to be about to',
    ...detected('快（要）… 了 (about to)', [
      inOrder(['快', '了'], 4),
      inOrder(['快要', '了'], 4),
      inOrder(['要', '了'], 3),
    ]),
  },

  // 部 measure word for films / part, region
  'B1L06-2-02': {
    surface: '部',
    lessonId: 6,
    meaning: 'measure word for movies',
    ...detected('demonstrative/number + 部 + film', [
      regex(`(?:^|${SEP})(?:這|那|哪|${NUM})${SEP}部${SEP}(?:電影|片|片子)`),
    ]),
  },
  'B1L16-1-12': {
    surface: '部',
    lessonId: 16,
    meaning: 'part',
    ...detected('…部 as part or region (東部, 南部)', [tokenEndsWith(['部'])]),
  },

  // 比賽 noun / verb
  'B1L06-3-13': {
    surface: '比赛',
    lessonId: 6,
    meaning: 'competition; race; game',
    ...detected('race as a thing: 運動／一場 + 比賽', [
      regex(`(?:^|${SEP})(?:運動|籃球|網球|游泳|過河|跑步|一場|這個|那個|看)${SEP}比賽`),
      regex(`(?:^|${SEP})比賽${SEP}(?:贏|輸|開始|結束|很|真)`),
    ]),
  },
  'B1L15-3-06': {
    surface: '比赛',
    lessonId: 15,
    meaning: 'to compete',
    ...undetectable(
      '比賽 as a verb cannot be told apart from the noun without tagging the subject.',
    ),
  },

  // 怎麼 "how" / "how come"
  'B1L07-1-01': {
    surface: '怎么',
    lessonId: 7,
    meaning: 'how',
    ...detected('怎麼 + action (how)', [
      regex(`(?:^|${SEP})怎麼${SEP}(?:去|走|坐|到|做|寫|說|來|辦|用|讀|念|發音|樣|回|買)`),
    ]),
  },
  'B1L12-1-02': {
    surface: '怎么',
    lessonId: 12,
    meaning: 'how come?',
    ...detected('怎麼 + 沒／不／還 (how come)', [
      regex(`(?:^|${SEP})怎麼${SEP}(?:沒|不|還|這麼|那麼|會|可能)`),
    ]),
  },

  // 到 "to" / "to arrive"
  'B1L07-1-02': {
    surface: '到',
    lessonId: 7,
    meaning: 'to',
    ...detected('從 … 到 … (to)', [inOrder(['從', '到'], 5)]),
  },
  'B1L07-1-07': {
    surface: '到',
    lessonId: 7,
    meaning: 'to arrive (a place)',
    ...detected('到 + place／了 (arrive)', [
      regex(`(?:^|${SEP})到${SEP}(?:了|飯店|學校|家|公司|機場|車站|台北|這裡|那裡|天美|門口)`),
      inOrder(['到', '了']),
    ]),
  },

  // 坐 take transport / sit
  'B1L07-1-09': {
    surface: '坐',
    lessonId: 7,
    meaning: 'to take (transportations)',
    ...detected('坐 + transport', [
      regex(`(?:^|${SEP})坐${SEP}(?:捷運|地鐵|公車|公共汽車|火車|飛機|計程車|高鐵|車|船)`),
    ]),
  },
  'B1L14-1-17': {
    surface: '坐',
    lessonId: 14,
    meaning: 'to sit',
    ...detected('sit: 坐 + 下／在／著', [
      regex(`(?:^|${SEP})坐${SEP}(?:下|在|著|好|起來)`),
      inOrder(['坐', '下']),
    ]),
  },

  // 站 station / stand
  'B1L07-3-08': {
    surface: '站',
    lessonId: 7,
    meaning: 'station',
    ...detected('…站 (station)', [
      tokenEndsWith(['站']),
      regex(`(?:^|${SEP})(?:下一|這|那|哪)${SEP}站`),
    ]),
  },
  'B1L14-1-16': {
    surface: '站',
    lessonId: 14,
    meaning: 'to stand',
    ...detected('站 + 了／在／著 (to stand)', [regex(`(?:^|${SEP})站${SEP}(?:了|在|著|起|好|起來)`)]),
  },

  // 用 "to use" / "using; with"
  'B1L09-2-05': {
    surface: '用',
    lessonId: 9,
    meaning: 'to use',
    ...detected('用 + tool or facility (to use)', [
      regex(`(?:^|${SEP})用${SEP}(?:手機|電腦|筆|錢|筷子|網路|時間|功課|教室)`),
      regex(`(?:^|${SEP})用${SEP}(?:這|那)${SEP}(?:間|個|臺|支|本|張|隻)`),
    ]),
  },
  'B1L12-1-06': {
    surface: '用',
    lessonId: 12,
    meaning: 'using; with',
    ...detected('用 + language／instrument (using, with)', [
      regex(`(?:^|${SEP})用${SEP}(?:中文|英文|日文)`),
      regex(`(?:^|${SEP})用${SEP}(?:[^${SEP}]+${SEP})?(?:說|寫|吃|打|聊|寄|傳|查|上網|工作|溝通)`),
    ]),
  },

  // 對 "correct" / "to (treating a person)"
  'B1L10-1-15': {
    surface: '对',
    lessonId: 10,
    meaning: 'correct; right',
    ...detected('對 as correct/right', [
      regex(`(?:^|${SEP})對${SEP}(?:了|啊|嗎|不對)`),
      regex(`(?:^|${SEP})對(?:${SEP}|$)`),
      inOrder(['對', '不', '對']),
    ]),
  },
  'B1L12-2-05': {
    surface: '对',
    lessonId: 12,
    meaning: 'to; treating (a person)',
    ...detected('對 + person (to / treating)', [
      regex(`(?:^|${SEP})對${SEP}(?:我|你|妳|他|她|我們|你們|他們|人|朋友|同學|老師|家人|客人|身體|工作)`),
    ]),
  },

  // 帶 bring a thing / take a person
  'B1L10-1-19': {
    surface: '带',
    lessonId: 10,
    meaning: 'to bring; to take',
    ...detected('帶 + thing (bring)', [
      regex(
        `(?:^|${SEP})帶(?:${SEP}(?:一些|一點|一|兩|三|幾|很多|些))?${SEP}(?:傘|雨傘|錢|手機|課本|書|藥|便當|水|外套|東西|禮物|水果)`,
      ),
    ]),
  },
  'B1L13-1-07': {
    surface: '带',
    lessonId: 13,
    meaning: 'to take (a person)',
    ...detected('帶 + person (take a person)', [
      regex(`(?:^|${SEP})帶${SEP}(?:我|你|妳|他|她|我們|你們|他們|朋友|同學|家人|小孩|人)`),
    ]),
  },

  // 還 "still" / "also; in addition"
  'B1L11-1-15': {
    surface: '还',
    lessonId: 11,
    meaning: 'still',
    ...detected('還 + 沒／在／想／是 (still)', [
      regex(`(?:^|${SEP})還${SEP}(?:沒|在|想|是|記得|要)`),
    ]),
  },
  'B1L12-3-14': {
    surface: '还',
    lessonId: 12,
    meaning: 'also; in addition',
    ...detected('還 + 可以／會／能 (also)', [
      regex(`(?:^|${SEP})還${SEP}(?:可以|會|能|喜歡|有)`),
    ]),
  },

  // 以前 "in the past" / "before; formerly"
  'B1L11-2-01': {
    surface: '以前',
    lessonId: 11,
    meaning: 'in the past',
    ...detected('很久以前, or 以前 + 沒／不', [
      inOrder(['很久', '以前']),
      regex(`(?:^|${SEP})以前${SEP}(?:沒有|沒|不)`),
    ]),
  },
  'B1L12-1-11': {
    surface: '以前',
    lessonId: 12,
    meaning: 'before; formerly',
    ...detected('以前 + former state', [
      regex(`(?:^|${SEP})以前${SEP}(?:想|是|在|住|工作|當|念|讀|喜歡|每天|常常)`),
    ]),
  },

  // 以後 "in the future" / "after; afterward"
  'B1L11-2-02': {
    surface: '以后',
    lessonId: 11,
    meaning: 'in the future',
    ...detected('以後 + 想／要／會 (in the future)', [
      regex(`(?:^|${SEP})以後${SEP}(?:我|你|妳|他|她|我們|要|再|想|會|可以|有機會)`),
      inOrder(['以後', '再']),
    ]),
  },
  'B1L12-1-10': {
    surface: '以后',
    lessonId: 12,
    meaning: 'after; afterward',
    ...detected('after + 以後 (afterward)', [
      regex(
        `(?:^|${SEP})(?:畢業|下課|放學|上班|下班|吃飯|回家|工作|考試|運動|旅遊|回來)${SEP}(?:[^${SEP}]+${SEP})?以後`,
      ),
    ]),
  },

  // 晚 "late" / "evening"
  'B1L13-1-17': {
    surface: '晚',
    lessonId: 13,
    meaning: 'late',
    ...detected('很／太 + 晚 (late)', [
      regex(`(?:^|${SEP})(?:很|太|比較|這麼|那麼)${SEP}晚`),
      regex(`(?:^|${SEP})晚${SEP}(?:了|一點|睡|到|上|來)`),
    ]),
  },
  'B1L14-1-18': {
    surface: '晚',
    lessonId: 14,
    meaning: 'evening',
    ...detected('晚 as evening (standalone)', [regex(`(?:^|${SEP})晚(?:${SEP}|$)`)]),
  },

  // 過 aspect / cross / celebrate
  'B1L12-2-07': {
    surface: '过',
    lessonId: 12,
    meaning: 'particle indicating experience',
    ...detected('verb + 過 (experience)', [
      regex(
        `(?:^|${SEP})(?:去|看|吃|喝|學|聽|用|玩|住|見|做|買|說|問|認識|旅行|參加|上班|工作|試)${SEP}過(?:${SEP}|$)`,
      ),
    ]),
  },
  'B1L13-3-07': {
    surface: '过',
    lessonId: 13,
    meaning: 'to go across; to pass',
    ...detected('過 + road／river (cross)', [
      regex(
        `(?:^|${SEP})過(?:${SEP}了)?(?:${SEP}第)?(?:${SEP}${NUM})?(?:${SEP}個)?${SEP}(?:馬路|街|河|橋|路口|十字(?:${SEP})?路口)`,
      ),
      inOrder(['過', '馬路']),
      inOrder(['過', '河']),
    ]),
  },
  'B1L14-1-06': {
    surface: '过',
    lessonId: 14,
    meaning: 'to celebrate; to spend',
    ...detected('過 + festival (celebrate)', [
      regex(`(?:^|${SEP})過${SEP}(?:年|生日|節|節日|聖誕|新年|春節)`),
    ]),
  },
};
