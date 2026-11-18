/**
 * A review list of what the character check can't see, for a lesson test's author to read by eye:
 *
 *   npx tsx scripts/content/lessonTestScopeScan.ts <lesson.json> [...]
 *
 * 1. Words: dictionary words made of taught pieces but not on any taught list (各位 = 各 + 位, 過生日 = 過 + 生日).
 *    Most are plain sums (下個月, 火車站) and are fine; one whose meaning is more than its pieces needs rewording.
 * 2. Grammar: patterns the book teaches only in a later lesson (早就 is Book 3 Lesson 2, V下來 Book 2 Lesson 15).
 *    A hit can be a look-alike (剛剛 is a word, not 剛…就): read it in context.
 * Prints candidates and always exits 0; checkLessonTest.ts stays the pass/fail rule.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LessonTestLesson } from '../../src/types/lessonTest';
import { traditionalStrings } from '../../src/utils/lesson/lessonScope';
import { loadLessonTestContext, taughtThrough } from './lessonTestRules';

/** Sums of their pieces that reviews have already read and passed, left out to keep the list short. */
const PLAIN_SUMS = new Set(`一邊 好不好 好不 不好 女的 男的 得很 不想 不是 那是 只有 只能 不能 不會 不在 沒有 有沒有 看看 那天 幾天 前幾天
  吃完 寫完 賣完 用完 考完 完了 到了 還有 在家 回家 回去 回到 家的 吃飯 看書 寫字 騎車 坐車 火車站 一家 一個人 個人 我去 哪一個 第一 第一次
  第二 好朋友 女朋友 下個 上個 下個月 上個月 下個星期 上個星期 下星期 上星期 有一次 那時候 不一樣 好多 每次 每個 每個人 帶來 帶去 交給 送給
  心裡 快點 記錯 您好 這位 吃的 家裡 到家 是不是 會不會 一定要 等一下 試試看 看一看 慢慢 不對 不到 不下 拿到 拿來 拿走 開門 停車 付錢`.split(/\s+/));
const NUMBER_OR_DATE = /^([一二三四五六七八九十百千兩半幾]+[次遍號個天年本張件]?|[一二三四五六七八九十]+月|一個半|半小時|[星期禮拜]{2}[一二三四五六日天幾])$|^\d+$/;

/** [pattern, book, lesson]: where the book first teaches it (public/data/grammar). Look-alikes are excluded where cheap. */
const LATER_GRAMMAR: [RegExp, number, number][] = [
  [/把/, 2, 2], [/(?<!看|一)起來/, 2, 3], [/替/, 2, 3], [/除了/, 2, 3], [/越來越/, 2, 4], [/極了|得不得了/, 2, 4], [/[得不]起(?!來)/, 2, 4],
  [/被/, 2, 5], [/只要/, 2, 5], [/要不然/, 2, 5], [/像.{1,8}一樣/, 2, 5], [/還好/, 2, 5], [/好好(?!玩|吃|看|喝|聽)/, 2, 6], [/讓/, 2, 6],
  [/一點兒?[都也][不沒]/, 2, 7], [/光了/, 2, 7], [/(?<!剛)剛(?!剛|好|才)/, 2, 7], [/趁/, 2, 7], [/連(?!絡)/, 2, 8], [/只好/, 2, 8], [/為了/, 2, 8],
  [/的關係/, 2, 8], [/[快慢]一?點(?![，。！？的兒])/, 2, 9], [/不是[^，。？]{1,15}嗎/, 2, 9], [/怎麼這麼/, 2, 9], [/[得不]下(?!課|班|雨|午|面|來|去|次|個)/, 2, 9], [/(.)\1地/, 2, 9],
  [/死了/, 2, 10], [/到底/, 2, 10], [/對.{1,8}來說/, 2, 10], [/(要是|如果).{1,15}的話/, 2, 10], [/越[^來，。]{1,6}越/, 2, 10],
  [/感興趣/, 2, 11], [/嘛/, 2, 11], [/同一/, 2, 11], [/難怪/, 2, 12], [/(?<!不|得不得)[得不]了(?=[，。！？]|$)/, 2, 12], [/不管/, 2, 13], [/不如/, 2, 13],
  [/差一?點/, 2, 13], [/從來/, 2, 14], [/等等/, 2, 14], [/當[^然地].{0,10}的時候/, 2, 14], [/無所謂/, 2, 14], [/(拿|帶|搬|嚇|偷|借|開|送|叫|趕)走/, 2, 14], [/要不是/, 2, 14],
  [/(?<!掉|記|走|坐|停|跑|拿|寫)下來/, 2, 15], [/寫下(?!來|去|課|午|面)/, 2, 15], [/誰知道/, 2, 15], [/要看|得看/, 2, 16], [/什麼的/, 2, 16],
  [/(.)來\1去/, 2, 16], [/比[得不]上/, 2, 16], [/只有.{1,15}才/, 2, 16],
  [/可以說是|可說是/, 3, 1], [/多麼/, 3, 1], [/再說/, 3, 1], [/就算/, 3, 1], [/(?<![很太])早就/, 3, 2], [/順便/, 3, 2], [/一會兒/, 3, 2], [/算了/, 3, 2],
  [/經過/, 3, 2], [/別再|不再/, 3, 3], [/不僅/, 3, 3], [/終於/, 3, 4], [/個不停|個沒完/, 3, 4], [/不是.{1,10}就是/, 3, 4], [/萬一/, 3, 5],
  [/一連/, 3, 5], [/沒想到/, 3, 5], [/甚至/, 3, 5], [/總算/, 3, 6], [/既然/, 3, 6], [/不得不|不能不/, 3, 6], [/話說回來/, 3, 7],
  [/況且/, 3, 8], [/非[^常].{0,7}不可/, 3, 8], [/畢竟/, 3, 8], [/反而/, 3, 9], [/尤其/, 3, 9], [/直到/, 3, 10], [/只不過/, 3, 10],
  [/(?<!星期|禮拜)一再/, 3, 10], [/假如/, 3, 10], [/透過/, 3, 11], [/卻/, 3, 11], [/至於/, 3, 11], [/往往/, 3, 12], [/儘管/, 3, 12],
  [/不論/, 3, 12], [/這下子/, 3, 13], [/更別說/, 3, 13], [/一方面/, 3, 13], [/(?<!樓|一|底)下去/, 3, 14], [/幸虧/, 3, 14], [/根據/, 3, 14],
  [/按照/, 3, 14], [/簡直/, 3, 15], [/同時/, 3, 15], [/總之|總而言之/, 3, 15], [/當作/, 3, 16], [/至少/, 3, 16], [/由於/, 3, 16],
  [/使得/, 3, 16], [/於是/, 3, 16],
];

const root = process.cwd();
const dictionaryDir = join(root, 'public/data/dictionary');
const dictionary = new Set<string>();
for (const file of readdirSync(dictionaryDir).filter((name) => name.startsWith('shard'))) {
  const { items } = JSON.parse(readFileSync(join(dictionaryDir, file), 'utf-8')) as { items: [number, string, string, ...unknown[]][] };
  for (const [, simplified, traditional] of items) dictionary.add(traditional || simplified);
}
const ctx = loadLessonTestContext(root);
const near = (text: string, start: number, end: number) => text.slice(Math.max(0, start - 12), end + 12).replace(/\n/g, ' / ');

for (const file of process.argv.slice(2)) {
  const lesson = JSON.parse(readFileSync(file, 'utf-8')) as LessonTestLesson;
  const taught = taughtThrough(ctx, lesson.bookId, lesson.lessonId, lesson.allowWords);
  const words = new Map<string, string>();
  const grammar = new Map<string, string>();
  for (const item of lesson.slots.flatMap((slot) => slot.versions)) {
    for (const text of traditionalStrings(item)) {
      const chars = [...text];
      // The character check's own split (longest taught word first): only words that start and end on it count.
      const bounds = new Set([0]);
      for (let index = 0; index < chars.length;) {
        index += [6, 5, 4, 3, 2, 1].find((size) => taught.has(chars.slice(index, index + size).join(''))) ?? 1;
        bounds.add(index);
      }
      for (let start = 0; start < chars.length; start += 1) {
        for (let size = 2; size <= 6 && start + size <= chars.length; size += 1) {
          const word = chars.slice(start, start + size).join('');
          if (bounds.has(start) && bounds.has(start + size) && dictionary.has(word) && !taught.has(word)
            && !PLAIN_SUMS.has(word) && !NUMBER_OR_DATE.test(word) && !words.has(word)) {
            words.set(word, `${item.id}: …${near(chars.join(''), start, start + size)}…`);
          }
        }
      }
      for (const [pattern, book, lessonId] of LATER_GRAMMAR) {
        if (book < lesson.bookId || (book === lesson.bookId && lessonId <= lesson.lessonId)) continue;
        const match = pattern.exec(text);
        const label = `${pattern.source} (Book ${book} Lesson ${lessonId})`;
        if (match && !grammar.has(label)) grammar.set(label, `${item.id}: …${near(text, match.index, match.index + match[0].length)}…`);
      }
    }
  }
  console.log(`\n${file}: ${words.size} words and ${grammar.size} grammar patterns to read`);
  for (const [word, where] of words) console.log(`  word ${word}  ${where}`);
  for (const [label, where] of grammar) console.log(`  grammar ${label}  ${where}`);
}
