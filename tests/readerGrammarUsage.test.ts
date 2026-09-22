import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INTERACTIVE_GRAMMAR_PARTS } from '../src/data/interactiveGrammarPages';
import { GRAMMAR_USAGE_RULES } from '../src/data/grammarUsageRules';
import { ALL_READINGS } from '../src/data/readings';
import type { ReadingRecord } from '../src/types/models';
import {
  detectGrammarUsage,
  segmentReadingSentences,
  type GrammarUsageStatus,
} from '../src/utils/grammarUsage';
import { findGrammarPartForReading, findNextGrammarPartForReading } from '../src/utils/readingContext';

const BOOK_ID = 1;
const bookParts = INTERACTIVE_GRAMMAR_PARTS.filter((part) => part.bookId === BOOK_ID);
const bookReadings = ALL_READINGS.filter((reading) => reading.bookId === BOOK_ID);

function reading(id: string): ReadingRecord {
  const found = bookReadings.find((candidate) => candidate.id === id);
  assert.ok(found, `missing reading ${id}`);
  return found;
}

function usageFor(readingRecord: ReadingRecord): Map<string, GrammarUsageStatus> {
  const part = findGrammarPartForReading(readingRecord, INTERACTIVE_GRAMMAR_PARTS);
  const lessonParts = bookParts.filter((candidate) => candidate.lessonId === readingRecord.lessonId);
  const pages = lessonParts.flatMap((candidate) => candidate.grammarPages.map((page) => page.id));
  const targets = new Set(part?.grammarPages.map((page) => page.id) ?? []);
  const entries = detectGrammarUsage(readingRecord, pages, targets);
  return new Map([...entries.entries()].map(([id, entry]) => [id, entry.status]));
}

/** Dialogue → grammar part resolution, checked against the authored book pages. */
test('every grammar part resolves to exactly one reading on the same dialogue number', () => {
  for (const part of bookParts) {
    const matches = bookReadings.filter(
      (candidate) => candidate.audioReference === part.dialogue.audioReference,
    );
    assert.equal(matches.length, 1, `${part.id} should match exactly one reading`);
    assert.equal(matches[0].dialogueNumber, part.partId, `${matches[0].id} should sit on part ${part.partId}`);
  }
});

test('only the short essays of lessons without essay grammar have no mapped part', () => {
  const unmapped = bookReadings.filter(
    (candidate) => !findGrammarPartForReading(candidate, INTERACTIVE_GRAMMAR_PARTS),
  );
  assert.equal(unmapped.length, 15);
  for (const candidate of unmapped) {
    assert.ok(
      candidate.title.includes('短文'),
      `${candidate.id} is unmapped but is not a short essay`,
    );
  }
});

test('a mapped reading marks exactly its own part pages as target', () => {
  for (const part of bookParts) {
    const candidate = bookReadings.find(
      (readingRecord) => readingRecord.audioReference === part.dialogue.audioReference,
    );
    assert.ok(candidate);
    const statuses = usageFor(candidate);
    const targets = [...statuses.entries()]
      .filter(([, status]) => status === 'target')
      .map(([id]) => id)
      .sort();
    assert.deepEqual(
      targets,
      part.grammarPages.map((page) => page.id).sort(),
      `${candidate.id} target pages`,
    );
  }
});

/**
 * Rules must fire on the dialogue they were authored with. One dialogue never
 * uses its part's marker at all, so it is listed here with the reason instead
 * of being silently tolerated. (Lesson 7's split 從 … / 到 … route is covered
 * by fragment evidence, so it is no longer a gap.)
 */
const KNOWN_DIALOGUE_RULE_GAPS = new Map<string, string>([
  ['B1L12-G03-P281', 'Dialogue 1 does not use 對 at all; the page is carried by its own grammar examples.'],
]);

test('each page rule fires on the dialogue it was authored with, except the documented gaps', () => {
  for (const part of bookParts) {
    const candidate = bookReadings.find(
      (readingRecord) => readingRecord.audioReference === part.dialogue.audioReference,
    );
    assert.ok(candidate);
    const lessonParts = bookParts.filter((entry) => entry.lessonId === candidate.lessonId);
    const pages = lessonParts.flatMap((entry) => entry.grammarPages.map((page) => page.id));
    const detected = detectGrammarUsage(candidate, pages, new Set());
    for (const page of part.grammarPages) {
      if (GRAMMAR_USAGE_RULES[page.id]?.undetectable) continue;
      if (KNOWN_DIALOGUE_RULE_GAPS.has(page.id)) continue;
      assert.equal(
        detected.get(page.id)?.status,
        'detected',
        `${page.id} rule should fire on ${candidate.id}`,
      );
    }
  }
});

test('segmenting a reading keeps word units together', () => {
  const sentences = segmentReadingSentences(reading('B1L01-R01'));
  assert.equal(sentences.length, 7);
  assert.deepEqual(sentences[0], ['宜文', '她', '是', '誰']);
  const tokens = sentences.flat();
  assert.ok(tokens.includes('可愛'), '可愛 should stay one word unit');
  assert.ok(!tokens.includes('愛'), '愛 must not appear as its own token inside 可愛');
});

/** Builds a one-sentence reading the detector can segment like production data. */
function syntheticReading(text: string, pinyin: string, lessonId: number): ReadingRecord {
  return {
    id: 'SYNTH-R01',
    bookId: BOOK_ID,
    lessonId,
    dialogueNumber: 1,
    title: 'Synthetic',
    setting: 'Test',
    printedPages: [],
    audioReference: '00-0-0',
    paragraphs: [
      { speaker: 'A', traditional: text, simplified: text, pinyin, english: '' },
    ],
  };
}

/** Near misses that previously produced false "used here" badges. */
const NEGATIVE_FIXTURES: Array<{ text: string; pinyin: string; pageId: string; why: string }> = [
  { text: '這件衣服很好看。', pinyin: 'zhè jiàn yīfu hěn hǎokàn', pageId: 'B1L13-G01-P295', why: '好 is not a reduplicated verb' },
  { text: '她常常去學校。', pinyin: 'tā chángcháng qù xuéxiào', pageId: 'B1L13-G01-P295', why: '常常 is an adverb, not VV' },
  { text: '這家店很有名，是一間著名的餐廳。', pinyin: 'zhè jiā diàn hěn yǒumíng, shì yī jiān zhùmíng de cāntīng', pageId: 'B1L15-G02', why: '著名 is not durative 著' },
  { text: '他昨天沒有來。', pinyin: 'tā zuótiān méiyǒu lái', pageId: 'B1L11-G02-P249', why: '沒有 is possession, not negated past action' },
  { text: '對不起，我不知道。', pinyin: 'duìbùqǐ, wǒ bù zhīdào', pageId: 'B1L12-G03-P281', why: '對不起 is not 對 + person' },
  { text: '對了，你明天有空嗎？', pinyin: 'duì le, nǐ míngtiān yǒu kòng ma', pageId: 'B1L12-G03-P281', why: '對了 is a discourse opener' },
  { text: '我不用手機。', pinyin: 'wǒ bù yòng shǒujī', pageId: 'B1L12-G01-P271', why: '不用 is "need not", not 用 + tool' },
  { text: '最近學習很忙，有很多功課。', pinyin: 'zuìjìn xuéxí hěn máng, yǒu hěnduō gōngkè', pageId: 'B1L04-G05-P105', why: '很多 is not number + 多' },
  { text: '我想去學校。', pinyin: 'wǒ xiǎng qù xuéxiào', pageId: 'B1L07-G01-P158', why: 'no 從 or 到' },
  { text: '我坐捷運。', pinyin: 'wǒ zuò jiéyùn', pageId: 'B1L07-G04-P170', why: 'activity without a comment' },
  { text: '我很好。', pinyin: 'wǒ hěn hǎo', pageId: 'B1L08-G01-P185', why: '好 alone is not 好 + verb' },
  { text: '他在圖書館看書。', pinyin: 'tā zài túshūguǎn kànshū', pageId: 'B1L09-G01-P205', why: '在 + place is locative, not 在 + action' },
  { text: '很多人感冒。', pinyin: 'hěn duō rén gǎnmào', pageId: 'B1L10-G03-P231', why: '多 + noun is not 多 + action' },
  { text: '我會游泳。', pinyin: 'wǒ huì yóuyǒng', pageId: 'B1L10-G04-P236', why: 'learned ability, not expected future' },
  { text: '他過馬路。', pinyin: 'tā guò mǎlù', pageId: 'B1L12-G04-P282', why: '過 as the main verb is not the experience particle' },
  { text: '我覺得很好。', pinyin: 'wǒ juéde hěn hǎo', pageId: 'B1L16-G05', why: '覺得 is not V + 得' },
  { text: '上個星期我去運動。', pinyin: 'shàng ge xīngqī wǒ qù yùndòng', pageId: 'B1L13-G05-P304', why: '上個星期 is not a duration' },
  { text: '下個星期我們去看電影。', pinyin: 'xià ge xīngqī wǒmen qù kàn diànyǐng', pageId: 'B1L13-G05-P304', why: '下個星期 is not a duration' },
  { text: '妳知道嗎？', pinyin: 'nǐ zhīdào ma', pageId: 'B1L01-G05-P45', why: '嗎 is not an object' },
  { text: '我姓林。', pinyin: 'wǒ xìng Lín', pageId: 'B1L01-G05-P45', why: '姓 introduces a name, not an action + object' },
  { text: '她很可愛。', pinyin: 'tā hěn kěài', pageId: 'B1L01-G05-P45', why: 'no object after the describing word' },
  { text: '今天是星期一。', pinyin: 'jīntiān shì xīngqīyī', pageId: 'B1L02-G02-P55', why: 'time with no following action' },
  { text: '我的手機很新。', pinyin: 'wǒ de shǒujī hěn xīn', pageId: 'B1L03-G04-P82', why: 'owner 的 is not a description + 的' },
  { text: '友美的生日。', pinyin: 'Yǒuměi de shēngrì', pageId: 'B1L03-G04-P82', why: 'owner 的 is not a description + 的' },
  { text: '我的錢包不在房間裡。', pinyin: 'wǒ de qiánbāo bù zài fángjiān lǐ', pageId: 'B1L05-G02-P117', why: '在 + place with no action' },
  { text: '我想吃一點東西。', pinyin: 'wǒ xiǎng chī yìdiǎn dōngxi', pageId: 'B1L06-G03-P146', why: '一點 + noun is quantity, not degree' },
  { text: '明天會下雨。', pinyin: 'míngtiān huì xià yǔ', pageId: 'B1L06-G01-P135', why: 'future 會 is not a learned skill' },
  { text: '我要紅茶。', pinyin: 'wǒ yào hóngchá', pageId: 'B1L02-G05-P61', why: 'wanting a thing is not want + action' },
  { text: '我和朋友都很愛喝。', pinyin: 'wǒ hé péngyǒu dōu hěn ài hē', pageId: 'B1L04-G01-P95', why: 'subject + 都, not a fronted topic' },
];

test('near-miss sentences never produce a used-here badge', () => {
  const pageById = new Map(
    bookParts.flatMap((part) => part.grammarPages).map((page) => [page.id, page]),
  );
  for (const fixture of NEGATIVE_FIXTURES) {
    const page = pageById.get(fixture.pageId);
    assert.ok(page, `missing page ${fixture.pageId}`);
    const synthetic = syntheticReading(fixture.text, fixture.pinyin, page.lessonId);
    const detected = detectGrammarUsage(synthetic, [page.id], new Set());
    assert.equal(
      detected.get(page.id)?.status,
      'none',
      `${fixture.pageId} should not fire on "${fixture.text}" (${fixture.why})`,
    );
  }
});

const POSITIVE_FIXTURES: Array<{ text: string; pinyin: string; pageId: string }> = [
  { text: '今天比昨天更冷。', pinyin: 'jīntiān bǐ zuótiān gèng lěng', pageId: 'B1L16-G03' },
  { text: '這樣更快。', pinyin: 'zhèyàng gèng kuài', pageId: 'B1L16-G03' },
  { text: '中明，你手裡拿著什麼？', pinyin: 'Zhōngmíng, nǐ shǒulǐ názhe shénme', pageId: 'B1L15-G02' },
  { text: '我在台灣住了半年了。', pinyin: 'wǒ zài Táiwān zhù le bànnián le', pageId: 'B1L14-G02-P322' },
  { text: '我們住了三個小時。', pinyin: 'wǒmen zhù le sān ge xiǎoshí', pageId: 'B1L14-G01-P319' },
  { text: '五分鐘以後就要開門了。', pinyin: 'wǔ fēnzhōng yǐhòu jiùyào kāimén le', pageId: 'B1L13-G04-P303' },
  { text: '火車快要來了。', pinyin: 'huǒchē kuàiyào lái le', pageId: 'B1L13-G04-P303' },
  { text: '一共兩百多塊錢。', pinyin: 'yīgòng liǎngbǎi duō kuài qián', pageId: 'B1L04-G05-P105' },
  { text: '一共有五十多個學生。', pinyin: 'yīgòng yǒu wǔshí duō ge xuéshēng', pageId: 'B1L04-G05-P105' },
  { text: '妳看哪個顏色漂亮？', pinyin: 'nǐ kàn nǎge yánsè piàoliàng', pageId: 'B1L03-G03-P81' },
  { text: '我們買這兩枝。', pinyin: 'wǒmen mǎi zhè liǎng zhī', pageId: 'B1L03-G03-P81' },
  { text: '因為這個牌子很有名，所以很多人買。', pinyin: 'yīnwèi zhège páizi hěn yǒumíng, suǒyǐ hěnduō rén mǎi', pageId: 'B1L08-G02-P186' },
  { text: '我要穿穿看。', pinyin: 'wǒ yào chuānchuān kàn', pageId: 'B1L08-G04-P194' },
  { text: '這兩個我都穿穿看。', pinyin: 'zhè liǎng ge wǒ dōu chuānchuān kàn', pageId: 'B1L08-G04-P194' },
  { text: '你去不去？', pinyin: 'nǐ qù bù qù', pageId: 'B1L02-G06-P62' },
  { text: '越南的生肖跟中國的有點不一樣。', pinyin: 'Yuènán de shēngxiào gēn Zhōngguó de yǒudiǎn bù yīyàng', pageId: 'B1L15-G01' },
  { text: '上網一查就知道了。', pinyin: 'shàngwǎng yī chá jiù zhīdào le', pageId: 'B1L15-G03' },
  { text: '火車站離百貨公司很近。', pinyin: 'huǒchēzhàn lí bǎihuò gōngsī hěn jìn', pageId: 'B1L16-G01' },
  { text: '他很累，看書看得睡著了。', pinyin: 'tā hěn lèi, kànshū kàn de shuìzháo le', pageId: 'B1L11-G01-P247' },
  { text: '是妳的生日。', pinyin: 'shì nǐ de shēngrì', pageId: 'B1L02-G04-P60' },
  { text: '你們要不要來我家？', pinyin: 'nǐmen yào bù yào lái wǒ jiā', pageId: 'B1L02-G05-P61' },
  { text: '咖啡、茶，我都喜歡。', pinyin: 'kāfēi, chá, wǒ dōu xǐhuān', pageId: 'B1L04-G01-P95' },
  { text: '我喜歡台灣。', pinyin: 'wǒ xǐhuān Táiwān', pageId: 'B1L01-G05-P45' },
  { text: '我知道她是日本人。', pinyin: 'wǒ zhīdào tā shì Rìběn rén', pageId: 'B1L01-G05-P45' },
  { text: '她早上六點三十分起床。', pinyin: 'tā zǎoshang liù diǎn sānshí fēn qǐchuáng', pageId: 'B1L02-G02-P55' },
  { text: '明天晚上六點來我家。', pinyin: 'míngtiān wǎnshàng liù diǎn lái wǒ jiā', pageId: 'B1L02-G02-P55' },
  { text: '她送我兩枝可愛的小鉛筆。', pinyin: 'tā sòng wǒ liǎng zhī kěài de xiǎo qiānbǐ', pageId: 'B1L03-G04-P82' },
  { text: '我最喜歡在沙發上看書。', pinyin: 'wǒ zuì xǐhuān zài shāfā shàng kànshū', pageId: 'B1L05-G02-P117' },
  { text: '貓喜歡在窗戶旁邊曬太陽。', pinyin: 'māo xǐhuān zài chuānghu pángbiān shài tàiyáng', pageId: 'B1L05-G02-P117' },
  { text: '我不會游泳。', pinyin: 'wǒ bù huì yóuyǒng', pageId: 'B1L06-G01-P135' },
  { text: '你會不會做飯？', pinyin: 'nǐ huì bù huì zuòfàn', pageId: 'B1L06-G01-P135' },
  { text: '平常我們都有點忙。', pinyin: 'píngcháng wǒmen dōu yǒudiǎn máng', pageId: 'B1L06-G03-P146' },
  { text: '我覺得有點兒累。', pinyin: 'wǒ juéde yǒudiǎnr lèi', pageId: 'B1L06-G03-P146' },
  { text: '我從學校走路去。', pinyin: 'wǒ cóng xuéxiào zǒulù qù', pageId: 'B1L07-G01-P158' },
  { text: '我們要到天美飯店。', pinyin: 'wǒmen yào dào Tiānměi fàndiàn', pageId: 'B1L07-G01-P158' },
  { text: '我們坐捷運去。', pinyin: 'wǒmen zuò jiéyùn qù', pageId: 'B1L07-G02-P160' },
  { text: '走路去太累了。', pinyin: 'zǒulù qù tài lèi le', pageId: 'B1L07-G04-P170' },
  { text: '這條裙子真好看。', pinyin: 'zhè tiáo qúnzi zhēn hǎokàn', pageId: 'B1L08-G01-P185' },
  { text: '他在上書法課。', pinyin: 'tā zài shàng shūfǎ kè', pageId: 'B1L09-G01-P205' },
  { text: '從上午八點四十分到中午十二點上課。', pinyin: "cóng shàngwǔ bā diǎn sìshí fēn dào zhōngwǔ shí'èr diǎn shàngkè", pageId: 'B1L09-G02-P206' },
  { text: '他寫的字很好看。', pinyin: 'tā xiě de zì hěn hǎokàn', pageId: 'B1L10-G02-P228' },
  { text: '要多喝水。', pinyin: 'yào duō hē shuǐ', pageId: 'B1L10-G03-P231' },
  { text: '我會給你三天的藥。', pinyin: 'wǒ huì gěi nǐ sān tiān de yào', pageId: 'B1L10-G04-P236' },
  { text: '我以前在餐廳上過班。', pinyin: 'wǒ yǐqián zài cāntīng shàngguò bān', pageId: 'B1L12-G04-P282' },
  { text: '他在台灣住了半年。', pinyin: 'tā zài Táiwān zhù le bànnián', pageId: 'B1L14-G01-P319' },
  { text: '你住了多久了？', pinyin: 'nǐ zhù le duōjiǔ le', pageId: 'B1L14-G02-P322' },
  { text: '沒有上次放得那麼久。', pinyin: 'méiyǒu shàngcì fàng de nàme jiǔ', pageId: 'B1L16-G05' },
  { text: '二十多塊錢。', pinyin: 'èrshí duō kuài qián', pageId: 'B1L04-G05-P105' },
  { text: '我每天工作八個小時。', pinyin: 'wǒ měitiān gōngzuò bā ge xiǎoshí', pageId: 'B1L13-G05-P304' },
];

test('documented pattern shapes are recognised', () => {
  const pageById = new Map(
    bookParts.flatMap((part) => part.grammarPages).map((page) => [page.id, page]),
  );
  for (const fixture of POSITIVE_FIXTURES) {
    const page = pageById.get(fixture.pageId);
    assert.ok(page, `missing page ${fixture.pageId}`);
    const synthetic = syntheticReading(fixture.text, fixture.pinyin, page.lessonId);
    const detected = detectGrammarUsage(synthetic, [page.id], new Set());
    assert.equal(
      detected.get(page.id)?.status,
      'detected',
      `${fixture.pageId} should fire on "${fixture.text}"`,
    );
  }
});

/**
 * Reviewed snapshot: every "used here" badge the app can currently produce.
 * Detection is allowed to change only together with a deliberate update of
 * this fixture — that is what keeps the badge honest as content evolves.
 */
test('per-reading used-here detections match the reviewed snapshot', () => {
  const expected = JSON.parse(
    readFileSync(resolve(process.cwd(), 'tests/fixtures/readerGrammarUsage.json'), 'utf8'),
  ) as Record<string, string[]>;

  const actual: Record<string, string[]> = {};
  for (const candidate of bookReadings) {
    const part = findGrammarPartForReading(candidate, INTERACTIVE_GRAMMAR_PARTS);
    const lessonPages = bookParts
      .filter((entry) => entry.lessonId === candidate.lessonId)
      .flatMap((entry) => entry.grammarPages.map((page) => page.id));
    const targets = new Set(part?.grammarPages.map((page) => page.id) ?? []);
    const detected = [...detectGrammarUsage(candidate, lessonPages, targets).entries()]
      .filter(([id, entry]) => entry.status === 'detected' && !targets.has(id))
      .map(([id]) => id)
      .sort();
    if (detected.length > 0) actual[candidate.id] = detected;
  }

  assert.deepEqual(actual, expected);
});

/**
 * The reader paints a background behind the clauses a hovered grammar point
 * matches, so their positions are part of the reviewed snapshot too. Each row
 * is [paragraphIndex, sentenceIndex, charStart, charEnd].
 */
test('matched clause ranges match the reviewed snapshot', () => {
  const expected = JSON.parse(
    readFileSync(resolve(process.cwd(), 'tests/fixtures/readerGrammarMatches.json'), 'utf8'),
  ) as Record<string, number[][]>;

  const actual: Record<string, number[][]> = {};
  for (const candidate of bookReadings) {
    const part = findGrammarPartForReading(candidate, INTERACTIVE_GRAMMAR_PARTS);
    const lessonPages = bookParts
      .filter((entry) => entry.lessonId === candidate.lessonId)
      .flatMap((entry) => entry.grammarPages.map((page) => page.id));
    const targets = new Set(part?.grammarPages.map((page) => page.id) ?? []);
    for (const [id, entry] of detectGrammarUsage(candidate, lessonPages, targets)) {
      const rows = entry.matchedSentences.flatMap((match) =>
        match.ranges.map((range) => [
          match.paragraphIndex,
          match.sentenceIndex,
          range.charStart,
          range.charEnd,
        ]),
      );
      if (rows.length === 0) continue;
      actual[`${candidate.id}:${id}`] = rows;
    }
  }

  assert.deepEqual(actual, expected);
});

test('a match highlights only the clause that carries the pattern', () => {
  const essay = reading('B1L01-R03');
  const entry = detectGrammarUsage(essay, ['B1L01-G02-P39'], new Set()).get('B1L01-G02-P39');
  assert.equal(entry?.matchedSentences.length, 1);
  const [match] = entry!.matchedSentences;
  const [range] = match.ranges;
  assert.equal(
    essay.paragraphs[match.paragraphIndex].traditional.slice(range.charStart, range.charEnd),
    '台灣朋友很可愛。',
    'the neighbouring 我喜歡台灣， clause must not be painted',
  );
});

test('a sentence that uses the pattern several times highlights all of it', () => {
  const essay = reading('B1L02-R03');
  const entry = detectGrammarUsage(essay, ['B1L02-G01-P54'], new Set()).get('B1L02-G01-P54');
  const sentence = entry?.matchedSentences.find((match) => match.paragraphIndex === 1);
  assert.ok(sentence, 'the time sentence must match');
  assert.equal(sentence.ranges.length, 1, 'adjacent clauses merge into one range');
  const [range] = sentence.ranges;
  assert.equal(
    essay.paragraphs[1].traditional.slice(range.charStart, range.charEnd),
    '她早上六點三十分起床，七點去學校，八點四十分上課。',
    'all three clock times must be painted, not only the first',
  );
});

test('target pages still report matched sentences; pages without a match report none', () => {
  const target = detectGrammarUsage(
    reading('B1L01-R01'),
    ['B1L01-G01-P38'],
    new Set(['B1L01-G01-P38']),
  ).get('B1L01-G01-P38');
  assert.equal(target?.status, 'target');
  assert.ok((target?.matchedSentences.length ?? 0) > 0, 'target pages locate their pattern sentences');

  // Lesson 7 dialogue 1 never puts an activity first, so there is nothing to paint.
  const noMatch = detectGrammarUsage(
    reading('B1L07-R01'),
    ['B1L07-G04-P170'],
    new Set(),
  ).get('B1L07-G04-P170');
  assert.equal(noMatch?.status, 'none');
  assert.deepEqual(noMatch?.matchedSentences, [], 'no match means no highlight');
});

test('traditional and simplified paragraph lengths stay equal for highlight coordinates', () => {
  for (const candidate of bookReadings) {
    candidate.paragraphs.forEach((paragraph, index) => {
      assert.equal(
        paragraph.simplified?.length ?? 0,
        paragraph.traditional.length,
        `${candidate.id} paragraph ${index} must keep 1:1 scripts`,
      );
    });
  }
});

test('a part reading continues into the next part grammar; essays and the last part have none', () => {
  assert.equal(
    findNextGrammarPartForReading(reading('B1L01-R01'), INTERACTIVE_GRAMMAR_PARTS)?.id,
    'B1L01-P02-D02',
    "Lesson 1 Part 1's reading leads into Part 2's grammar",
  );
  assert.equal(
    findNextGrammarPartForReading(reading('B1L01-R02'), INTERACTIVE_GRAMMAR_PARTS)?.id,
    'B1L02-P01-D01',
    'the chain crosses into the next lesson',
  );
  assert.equal(
    findNextGrammarPartForReading(reading('B1L01-R03'), INTERACTIVE_GRAMMAR_PARTS),
    null,
    'an essay belongs to no part, so there is no grammar to continue into',
  );
  assert.equal(
    findNextGrammarPartForReading(reading('B1L16-R02'), INTERACTIVE_GRAMMAR_PARTS),
    null,
    'the last part of the book has no next part',
  );
});
