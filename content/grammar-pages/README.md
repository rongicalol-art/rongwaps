# Public grammar pages

One entry per grammar point that has a public page at `/grammar/<slug>`, keyed by the point's id in
the grammar pack. The title, pattern and rule come from the pack; this file adds what the public
page needs of its own:

- `slug`: the address. The key word's pinyin, then two or three plain English words. Never changed
  once the page is live.
- `examples`: two sentences shown before the exercise.
- `exercise`: one more sentence the visitor builds from tiles. Different from both examples, four to
  six words long.

Sentences are written for the page, not copied from the book. A sentence is its words separated by
spaces, punctuation included as its own item: `我 喝 茶 ， 妳 呢 ？`. A bare word must be on a
vocabulary card taught by that lesson or earlier; the export fails otherwise. A name, or a word the
lesson teaches only in its grammar section, carries its own pinyin and meaning: `王|Wáng|Wang`,
`不|bù|not`. Write 不 and 一 with the tone they are spoken with in that sentence (`不|bú|not` before a fourth tone). Inside those, `_` stands for a space: `王小美|Wáng_Xiǎoměi|Wang_Xiaomei`.

After editing: `npm run grammar-pages:export`, then add any new address to `public/sitemap.xml`.
