# Memory hooks

Memory hooks are authored content, kept in `content/memory-hooks/`:

- `characters/book-N.json`: one entry per character, in the lesson that first teaches it. An entry names the character's pieces by stroke range (hanzi-writer stroke order), says what each piece does (meaning, sound, both, a drawing, or a shape learned whole) and gives one sentence that lands on the meaning. `{0|bamboo}` marks the words that name piece 0; `**box**` marks the meaning.
- `words/book-N.json`: one entry per word of two to four characters. `sum` means the parts add up; `whole` means the word is learned whole and carries a plain `teach` line; `sound` means the characters copy a foreign word.

`npm run hooks:packs` checks every entry and writes `public/data/hook-pieces/` and `public/data/word-hooks/`. `npm run hooks:packs -- --check` only checks. `tests/content/hookPacks.test.ts` fails when the committed packs differ from what the content builds.

Fields that stay out of the packs: `lesson`, `plain` (the sentence without its sound word) and each note's `source` tag (`dong`, `shuowen`, `check`, `app`, `trick`).

## The owner's rules

- The hook teaches the meaning the book teaches: one sentence built from the meaning pieces, ending on that meaning. Everything else sits under a closed "Good to know".
- History first. Facts rest on recorded sources. A link we made up says "only a memory trick".
- A sound piece joins the sentence (in blue, "english, 字 pinyin") only when it is a real, useful word and the sound is close. A sound piece left out gets one fixed line saying why; the screen writes that line from the piece's `old` and `rare` flags.
- A tile must match what the learner sees: `note` says "now looks like 月 moon", "shortened here" or "shape has changed" when it does not.
- A drawing stays one drawing. Cut it only into parts a reference names (Shuowen, Wiktionary). A character with nothing smaller inside has one piece with `whole: true`.
- Words: add the characters up. Where they do not add up, explain plainly the way a teacher would, with real history only when sure. No invented stories.

## Where the pieces came from

The piece cuts and jobs were worked out against the Dong Chinese character data (credited on the Sources page), a Shuowen-style record and Wiktionary, then second-checked. That working material (decisions per character, review sheets, the scripts that drafted these files) is not in the repository. The content files here are the source of truth: edit an entry, run `npm run hooks:packs`, commit both.

Three course characters have no entry because the stroke data has none for them: 嚐, 溼, 汙.
