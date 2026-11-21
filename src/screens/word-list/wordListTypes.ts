/** One word of a public word list (generated into data/level-N.ts). `simplified` is there only when it differs. */
export type ListWord = readonly [hanzi: string, pinyin: string, meaning: string, simplified?: string];
