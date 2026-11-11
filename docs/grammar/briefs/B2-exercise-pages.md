# Book 2 exercise pages: brief

Status (2026-11-11): all 16 lessons are written, each reviewed against the scans by an independent reviewer and fixed (`docs/grammar/reviews/B2-L01-pages.md` … `B2-L16-pages.md`). Waiting on the owner's try-out.

Book 2 pages are the Book 1 page (`B1-exercise-pages.md`: one scrolling page per grammar point, `slot-build` items only, the learner drags or taps words into blanks, each item checks itself, one retry then the answer). Everything in that brief holds unless this one says otherwise. Owner decisions for Book 2 (2026-11-11): the Book 1 page with phrase tiles; all 16 lessons written fresh (the October draft on `draft/book2-exercises-l1-7` is only a source of sentences); pictures only where the book prints one; pilot on lessons 1 and 7 first.

## What is different in Book 2

The book's exercises are different, so three rules change.

1. **Open blanks.** Most Book 2 items are "finish the sentence in your own words" (`不但____，還____`), a whole clause after a dialogue line, or a rewrite. The app item keeps the book's sentence and gives the blank one natural completion from taught words. The learner builds the **pattern** one blank per part (`[不但][很快]，[還][很舒服]`, `[一][家][便利商店]都沒有`, `[讓][我][想一想]`) and the **content** goes in as a word or a short phrase.
2. **Phrase tiles.** A tile may be a short phrase, up to 8 characters (`下個月再付`, `認識新朋友`). Keep pattern words (不但, 還, 讓, 就, 光, 都, 不, 一 and its measure word) on their own tiles; never glue a pattern word to its content. The one exception is a word the book itself prints whole in a word box (`送給`, `賣給`). Still 4–6 tiles (up to 8 on a build line, rule 4), more tiles than blanks.
3. **Printed pattern words may be blanks.** Where the book prints the pattern word and leaves only the content open (`我是____`, `有學生趁著____`), the page may blank the pattern word too, so the learner builds the pattern. Printed content words stay as text; the one case for blanking one is when the grammar note is about where it goes (`學生就…`: the second subject comes before 就).
4. **Build line.** Blanks that stand next to each other show as one long line, the way the book prints its blank: the learner cannot see how many words go there, and the words go on in order (`free` on the item; the authoring tool sets it). So where the book leaves a whole clause or sentence open (a rewrite, "say it in one sentence", a reply, a reorder), every word of our completion is a tile and the learner builds the clause: `[我][不像][哥哥][那麼][高]`, `[誰知道][房間][這麼][髒]`, `[要是][你][不運動][的話]`. Do not print our own words between the blanks; only the book's printed words stay as text. A build line may have up to 8 tiles. A blank on its own is still one word.
5. **Every order counts.** On a build line, try every order of the tiles. An order that is also right (`我昨天` / `昨天我`, `她到底` / `到底她`, `要是你` / `你要是`) is accepted, with its own sentence under `alternatives`. Two traps that make a second true sentence together (`哥哥不像我那麼矮`) cannot both be in the tray. A wrong order that is real Chinese but not the task gets its own note (`'a<<b'` in the tool: a was placed before b).

Also:

- **Context decides.** An open blank has many good answers in class. On the page exactly one tile set must fit, so each item needs a context trap as well as a grammar trap: a phrase that is grammatical but wrong for this dialogue (`上個月付` when the money is gone this month, `很貴` after two good points), explained from the context.
- **A sentence of our own inside a book item** is allowed only to fill the book's blank or to add the few words that make one answer right (`那天人很多，` before the advice, `，一件五十塊` after the sale). Say so in the notes. Never change printed words.
- **Hints.** A hint the book prints in brackets (`（算）`, `（好看/不貴）`) becomes tiles, or stays as plain words in the line where blanking it would let a second word order be right (`那你[最好]在家[休息]`). The brackets themselves are never typed into the line.
- **Speakers** as printed: `A`/`B`, or the book's roles (先生, 太太, 房東, 病人).
- **Scope.** All of Book 1, plus Book 2 vocabulary up to this lesson part, plus the grammar examples so far. A word the book prints in the exercise itself goes in `allowWords` (`法文`, `良介`, `病人`). Grammar only up to this point in book order.
- **Own items.** At most 2 per page, and only for a mistake the book's note warns about that its items don't test (`寫完`, not `寫光`). Most pages have none.
- **Pictures.** `{ "type": "picture", "book": 2, "page": <printed page>, "box": [...], "alt": "…" }`. Each needs an app-style illustration keyed `b2:<page>:<box>` in `generatedPictureAssets.ts` (the picture test fails without one). No pictures are added where the book has none.
- **Title.** The book's instruction in English. Where the box prints none: "Complete the sentences." / "Complete the dialogues." / "Look at the pictures and complete the sentences."

## Pinyin and simplified

Pinyin follows the app's word cards (Taiwan readings: 休息 xiūxí, 認識 rènshì, 朋友 péngyǒu), with 一/不 tone changes. Verb + result is one word (賣完 màiwán, 吃光 chīguāng); verb + 在/給 is two (坐在 zuò zài, 送給 sòng gěi). Every line, tile and sentence whose simplified form differs carries `simplified`.

## Checks

`PRACTICE_LESSON=b2LessonSeven npx tsx --test tests/content/grammarPracticePages.test.ts` (one lesson), then `npm run content:export`, `content:validate`, and the content tests. The page test enforces: slot-build only, book items in order then at most two own, 4–6 tiles and more than the blanks, tiles up to 8 characters, every accepted fill has its sentence, no answer printed in the item, a note for every wrong tile, lines up to 45 characters, taught words only, simplified present.

## Mistakes the pilot reviews caught (check every item for these)

- A second right answer from moving the pattern word: `給我寫的` beside `寫給我的`, `你讓我決定` beside `讓我自己決定`. Try every tile in every blank, the subject tile first.
- A trap that is right after all: `沒擔心`, `是不容易` (a concession), `很多歌都不會唱`. A near-synonym is never a trap (`完` beside `光`, `才` or `再` after `等…`).
- A note that is false elsewhere in the language ("feelings are negated with 不", "比較 compares two things"). Explain from this dialogue instead.
- The order copied from the other line (`每天都` printed in A's question), or a blank only one tile can fill.
- A printed word missing because the typed transcript dropped it (three 的 in Lesson 9). The scan decides, never the transcript.
- A time or place tile that slips in front of the verb and makes a new right sentence (`明天搬到新家`).
- A silly trap no learner would pick (`趁老`, `上個月付`). A context trap must be something a learner could believe.

## Review (a fresh reviewer per lesson)

Against the scan: every book item present, in order, printed words unchanged, hints used. As a learner: try every tile in every blank — is a "wrong" tile also right? Is the answer given away or found by ruling out silly tiles? Is each note true wherever that tile can land? Chinese natural, pinyin and English right, words taught. Notes go in `docs/grammar/reviews/B2-LXX-pages.md`.
