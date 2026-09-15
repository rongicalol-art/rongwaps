# Course Example Sentences

Flashcard example sentences are shipped as versioned, per-book static JSON packs in
`public/data/course-examples/`. Each record includes the Chinese sentence, pinyin,
English meaning, curriculum location, source card, and extraction provenance.

## Runtime behavior

- `courseExamplePackService.ts` loads and validates the manifest and book packs.
- `vocabularyService.ts` prefers a matching rich static record, then falls back to
  Supabase or the vocabulary pack's Chinese-only example text.
- `courseExamples.ts` ranks the candidates against the learner's current Book,
  Lesson, and Part but never drops them: the exact block match is the highlighted
  Top match, same-lesson sentences are This lesson, earlier curriculum is Previous
  lesson, and anything not yet studied (later books and lessons, e.g. Book 2–4
  sentences on a Book 1 card) appears last as Other lesson.
- The flashcard keeps one fixed size for both faces and fetches examples lazily
  once the back is visible. The back is a scroll container: the answer stays
  centered and every ranked sentence scrolls beneath it in a calm, reference-style
  stream. The exact match leads as a plain row marked with a small star in the
  source book's accent on the left — no frame or label text; everything else
  flows as quiet per-book blocks — plain rows with only a bottom divider, grouped
  by book with no headers (order carries the ranking). Sentence pinyin and the
  B·L meta carry the source book's accent too.

## Matching a word to its sentences

Vocabulary forms are authored with notation, and matching expands it fully:

- `/` means "or": `護理師/護士` searches both, and mixed-script alternatives like
  `臺灣/台灣/台湾` work too.
- `(...)` means "optional": `有(一)點(兒)` expands to every spoken form —
  `有一點兒, 有一點, 有點兒, 有點` (capped at 3 optional groups per form).
- Both raw scripts are searched: cards carry their authored `traditional` and
  `simplified` forms, so a simplified sentence (`老板`) matches a traditional
  card (`老闆`) and vice versa. The display front is a fallback for data that
  only has one form.
- Within a ranked group the sentence using the longest form leads (a `一點兒`
  hit outranks a bare `點` hit), and highlighting uses the same expanded terms
  longest-first.
- Substring matching is deliberate: a short core (點, 事) is still a real word,
  so occurrences inside other words (點心, 同事) are included but sink below
  sentences where the form does real work.

## Book 1 import

Run:

```sh
npm run course-examples:export
```

The importer joins `output/ocr/modern_chinese_1/**/lesson.json` to the production
Book 1 vocabulary pack by curriculum location, explicit and optional vocabulary
variants, meaning, and available Chinese example text. It publishes only unique,
source-reviewed matches that contain Chinese, pinyin, and English. Ambiguous,
unmatched, or `needs-review` entries are excluded and written to
`output/course-examples/book-1-import-report.json` for manual review.

The textbook sometimes gives one example to a grouped set of related entries. The
pack preserves that source association, while runtime lookup shows the sentence
only for words that actually occur in it. A source-verified sentence from the same
Part's Reading supplies the term-specific example for 夏天.

For Lessons 7–10, the importer also publishes visually verified dialogue lines and
aligned Reading sentences as Part-scoped examples. Context extraction accepts
either lesson-wide pinyin verification or the narrower dialogue-and-Reading
verification flag. Raw OCR pinyin is never published for unverified sections.

The OCR source and review report are local generated inputs and are intentionally
ignored by Git. The generated manifest and per-book packs under `public/data/` are
the production artifacts and must be committed.

## Adding another book

Extract its textbook content into the same structured lesson shape, add its
vocabulary pack as an importer input, and publish a separate `book-N.json` entry in
the manifest. Keep the strict join and rejection report: missing translations must
fall back gracefully rather than being guessed or exposed from later lessons.

---

# Reading Vocabulary Coverage

Every Book 1 target word should eventually be met inside the course content
that practices it. This file records the gap between the vocabulary pack and the
Reading Mode texts (all 48 readings: dialogues 1–2 and the 短文 narrative per lesson).

The readings are **verbatim transcripts of the official recordings**, so their text
cannot be edited to host more target words without breaking the audio and karaoke
alignment. The sentences below are authored practice suggestions, kept level-true to
the vocabulary and grammar taught up to their lesson, ready for whichever surface
eventually carries them (workbook-style practice, an extra authored reading with TTS
audio, or a flashcard example).

## Method

- Target words: the Book 1 vocabulary pack (`public/data/vocabulary/book-1.json`).
- Covered = the word (in any authored variant form) occurs in a reading of its
  lesson, in interactive grammar content, or in the course-example packs.
- 825 target words checked: **670 covered, 155 never used in a reading**, of which
  **75 are already practiced in grammar labs/examples** and **80 have no usage
  anywhere in reading or grammar content** — listed below.
- Every suggested sentence was machine-checked for level fit (all characters taught
  by its lesson, two marked one-lesson previews), pinyin syllable coverage, and
  target-word presence.

## Lesson 1 (5)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 中國 | Zhōngguó | China | 他是中國人，我是日本人。 | 他是中国人，我是日本人。 | He is Chinese; I am Japanese. |
| 姓名 | xìngmíng | surname and given name (full name) _(uses 的 (Lesson 2))_ | 請問你的姓名是什麼？ | 请问你的姓名是什么？ | May I ask what your full name is? |
| 自我介紹 | zìwǒ jièshào | self-introduction | 老師請我們自我介紹。 | 老师请我们自我介绍。 | The teacher asked us to introduce ourselves. |
| 午安 | wǔ'ān | good afternoon | 老師，午安！ | 老师，午安！ | Good afternoon, teacher! |
| 晚安 | wǎn'ān | good night | 老師，晚安！ | 老师，晚安！ | Good night, teacher! |

## Lesson 2 (3)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 家人 | jiārén | family members _(uses 都 (Lesson 3))_ | 我的家人都在台灣。 | 我的家人都在台湾。 | My family are all in Taiwan. |
| 再見 | zàijiàn | Good-bye. | 老師，再見！ | 老师，再见！ | Goodbye, teacher! |
| 晚飯 | wǎnfàn | dinner | 我們晚上吃晚飯。 | 我们晚上吃晚饭。 | We eat dinner in the evening. |

## Lesson 4 (5)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 瓶子 | píngzi | bottle | 這個瓶子是綠色的。 | 这个瓶子是绿色的。 | This bottle is green. |
| 綠色 | lǜsè | green color | 我有一個綠色的瓶子。 | 我有一个绿色的瓶子。 | I have a green bottle. |
| 找錢 | zhǎoqián | to give change _(verb–object word; appears as 找我錢 in natural use)_ | 小姐，請找我錢。 | 小姐，请找我钱。 | Miss, please give me my change. |
| 春天 | chūntiān | spring | 台灣的春天不冷也不熱。 | 台湾的春天不冷也不热。 | Spring in Taiwan is neither cold nor hot. |
| 冬天 | dōngtiān | winter | 台灣的冬天不太冷。 | 台湾的冬天不太冷。 | Winter in Taiwan is not very cold. |

## Lesson 5 (1)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 姐姐/姊姊 | jiějie | elder sister | 姐姐的錢包在哪裡？ | 姐姐的钱包在哪里？ | Where is your elder sister's wallet? |

## Lesson 6 (4)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 支 | zhī | measure word for cell phone | 我有兩支手機。 | 我有两支手机。 | I have two cell phones. |
| 輛 | liàng | measure word of vehicles | 爸爸有一輛車。 | 爸爸有一辆车。 | Dad has a car. |
| 學習 | xuéxí | to learn; to study | 我喜歡學習，也喜歡運動。 | 我喜欢学习，也喜欢运动。 | I like learning and I also like sports. |
| 跳舞 | tiàowǔ | to dance | 妹妹很喜歡跳舞。 | 妹妹很喜欢跳舞。 | My younger sister loves to dance. |

## Lesson 7 (11)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 火車 | huǒchē | train | 火車站在前面。 | 火车站在前面。 | The train station is ahead. |
| 下車 | xiàchē | to get off a bus; to get out of a car | 我要在台北車站下車。 | 我要在台北车站下车。 | I want to get off at Taipei Station. |
| 錶/手錶 | biǎo/shǒubiǎo | watch | 這支手錶很貴。 | 这支手表很贵。 | This watch is very expensive. |
| 街 | jiē | street (M: 條tiáo) | 這條街有很多商店。 | 这条街有很多商店。 | This street has many shops. |
| 封 | fēng | measure word for letters | 我要寄一封信。 | 我要寄一封信。 | I want to mail a letter. |
| 信封 | xìnfēng | envelope | 這個信封是白色的。 | 这个信封是白色的。 | This envelope is white. |
| 司機 | sījī | driver | 他是公車司機。 | 他是公车司机。 | He is a bus driver. |
| 車站 | chēzhàn | bus (or rail) station | 車站在哪裡？ | 车站在哪里？ | Where is the station? |
| 站 | zhàn | station | 我要在這一站下車。 | 我要在这一站下车。 | I want to get off at this stop. |
| 架 | jià | measure word for airplanes | 天上有一架飛機。 | 天上有一架飞机。 | There is an airplane in the sky. |
| 起飛 | qǐfēi | to take off (an airplane) | 飛機要起飛了。 | 飞机要起飞了。 | The airplane is about to take off. |

## Lesson 8 (9)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 明年 | míngnián | next year | 明年我要去台灣。 | 明年我要去台湾。 | Next year I want to go to Taiwan. |
| 容易 | róngyì | easy | 這課不難，很容易。 | 这课不难，很容易。 | This lesson is not difficult; it is easy. |
| 瘦 | shòu | thin | 我最近瘦了兩公斤。 | 我最近瘦了两公斤。 | I have recently lost two kilograms. |
| 矮 | ǎi | short | 弟弟很矮，可是很可愛。 | 弟弟很矮，可是很可爱。 | My younger brother is short, but he is very cute. |
| 長 | cháng | long | 這條裙子很長。 | 这条裙子很长。 | This skirt is very long. |
| 襪子 | wàzi | socks (M: 雙shuāng) | 我買了一雙黑色的襪子。 | 我买了一双黑色的袜子。 | I bought a pair of black socks. |
| 樓上 | lóushàng | upstairs | 我的房間在樓上。 | 我的房间在楼上。 | My room is upstairs. |
| 樓梯 | lóutī | stairs | 這個樓梯很小。 | 这个楼梯很小。 | These stairs are very small. |
| 對不起 | duìbùqǐ | sorry | 對不起，我來晚了。 | 对不起，我来晚了。 | Sorry, I am late. |

## Lesson 9 (4)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 毛筆 | máobǐ | writing brush (M: 枝) | 這是老師的毛筆。 | 这是老师的毛笔。 | This is the teacher's writing brush. |
| 作業 | zuòyè | homework | 今天的作業很多。 | 今天的作业很多。 | There is a lot of homework today. |
| 中間 | zhōngjiān | among; between; middle | 我和弟弟中間有一隻小狗。 | 我和弟弟中间有一只小狗。 | There is a small dog between my younger brother and me. |
| 別人 | biérén | others | 這是別人的東西，不是我的。 | 这是别人的东西，不是我的。 | This is someone else's thing, not mine. |

## Lesson 10 (10)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 手指 | shǒuzhǐ | finger | 我的一隻手指很痛。 | 我的一只手指很痛。 | One of my fingers hurts. |
| 香蕉 | xiāngjiāo | banana | 我喜歡吃香蕉。 | 我喜欢吃香蕉。 | I like to eat bananas. |
| 頭髮 | tóufǎ | hair | 他的頭髮很長。 | 他的头发很长。 | His hair is very long. |
| 嘴（巴） | zuǐ(ba) | mouth | 他的嘴巴很小。 | 他的嘴巴很小。 | His mouth is very small. |
| 臉 | liǎn | face | 她的臉紅了。 | 她的脸红了。 | Her face turned red. |
| 耳朵 | ěrduo | ears | 他的耳朵不大。 | 他的耳朵不大。 | His ears are not big. |
| 眼睛 | yǎnjīng | eyes | 妹妹的眼睛很大。 | 妹妹的眼睛很大。 | My younger sister's eyes are very big. |
| 眼鏡 | yǎnjìng | glasses | 我的眼鏡在哪裡？ | 我的眼镜在哪里？ | Where are my glasses? |
| 接電話 | jiē diànhuà | to answer a phone | 他現在在接電話。 | 他现在在接电话。 | He is answering the phone right now. |
| 號碼 | hàomǎ | number | 你的電話號碼是多少？ | 你的电话号码是多少？ | What is your phone number? |

## Lesson 11 (5)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 幫忙 | bāngmáng | to help | 謝謝你來幫忙。 | 谢谢你来帮忙。 | Thank you for coming to help. |
| 點菜 | diǎncài | to order dishes | 小姐，我們要點菜。 | 小姐，我们要点菜。 | Miss, we would like to order. |
| 盤子 | pánzi | plate | 盤子裡有很多水果。 | 盘子里有很多水果。 | There is a lot of fruit on the plate. |
| 照相 | zhàoxiàng | to take a photo | 我們一起照相，好嗎？ | 我们一起照相，好吗？ | Let's take a photo together, okay? |
| 照相機 | zhàoxiàngjī | camera | 我買了一個新照相機。 | 我买了一个新照相机。 | I bought a new camera. |

## Lesson 12 (6)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 分鐘 | fēnzhōng | minute | 請等我五分鐘。 | 请等我五分钟。 | Please wait five minutes for me. |
| 父親 | fùqīn | father | 我父親是醫生。 | 我父亲是医生。 | My father is a doctor. |
| 母親 | mǔqīn | mother | 我母親在公司上班。 | 我母亲在公司上班。 | My mother works at a company. |
| 兒子 | érzi | son | 他們的兒子很聰明。 | 他们的儿子很聪明。 | Their son is very smart. |
| 女兒 | nǚ'ér | daughter | 老師的女兒今年八歲。 | 老师的女儿今年八岁。 | The teacher's daughter is eight years old this year. |
| 談話 | tánhuà | to have a conversation | 老師在跟他談話。 | 老师在跟他谈话。 | The teacher is talking with him. |

## Lesson 13 (3)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 進來 | jìnlái | to come in; to enter | 老師，我可以進來嗎？ | 老师，我可以进来吗？ | Teacher, may I come in? |
| 聲音 | shēngyīn | sound; voice | 你的聲音很好聽。 | 你的声音很好听。 | Your voice sounds very nice. |
| 數學 | shùxué | mathematics; maths | 數學不難，我很喜歡。 | 数学不难，我很喜欢。 | Math is not difficult; I like it a lot. |

## Lesson 14 (2)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 棵 | kē | measure word for trees | 我家前面有一棵大樹。 | 我家前面有一棵大树。 | There is a big tree in front of my house. |
| 魚 | yú | fish (M: 條) | 我喜歡吃魚。 | 我喜欢吃鱼。 | I like to eat fish. |

## Lesson 15 (6)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 打開 | dǎkāi | to open; to turn on | 請打開課本，我們要上課了。 | 请打开课本，我们要上课了。 | Please open your textbook; we are starting class. |
| 課本 | kèběn | textbook | 我的課本在哪裡？ | 我的课本在哪里？ | Where is my textbook? |
| 課文 | kèwén | text (of a text book) | 今天的課文很容易。 | 今天的课文很容易。 | Today's text is very easy. |
| 講話 | jiǎnghuà | to talk | 上課不要講話。 | 上课不要讲话。 | Don't talk in class. |
| 湖 | hú | lake | 湖裡有很多魚。 | 湖里有很多鱼。 | There are many fish in the lake. |
| 輸 | shū | to lose | 這次比賽我們輸了。 | 这次比赛我们输了。 | We lost the competition this time. |

## Lesson 16 (6)

| Word | Pinyin | Meaning | Suggested sentence (traditional) | Suggested sentence (simplified) | English |
| --- | --- | --- | --- | --- | --- |
| 中學 | zhōngxué | high school | 我妹妹是中學生。 | 我妹妹是中学生。 | My younger sister is a high school student. |
| 份 | fèn | measure word for newspapers; reports, etc. | 我買了一份報紙。 | 我买了一份报纸。 | I bought a newspaper. |
| 廁所/洗手間 | cèsuǒ/xǐshǒujiān | toilet; washroom; restroom | 請問洗手間在哪裡？ | 请问洗手间在哪里？ | Excuse me, where is the restroom? |
| 台灣高鐵 | Táiwān Gāotiě | Taiwan High Speed Rail | 我們坐台灣高鐵去高雄。 | 我们坐台湾高铁去高雄。 | We are taking the Taiwan High Speed Rail to Kaohsiung. |
| 公尺 | gōngchǐ | meter | 這個房間長五公尺。 | 这个房间长五公尺。 | This room is five meters long. |
| 公分 | gōngfēn | centimeter | 這張桌子長一百公分。 | 这张桌子长一百公分。 | This table is one hundred centimeters long. |

## Notes

- Two suggestions use one character one lesson early (marked inline): 的 (Lesson 2)
  and 都 (Lesson 3).
- Numerals (五, 八, 十) are taught by the Lesson 2 number grammar and are not
  treated as previews.
- 架 and 起飛 use 飛機 (Lesson 7 vocabulary, with 架 in its own vocabulary entry);
  棵 uses 樹 (Lesson 14 vocabulary, M: 棵). Both sentences are fully level-true.
- These sentences are drafts for native review before they ship anywhere.
