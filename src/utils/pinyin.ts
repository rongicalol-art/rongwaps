const toneMap: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à', 'a'],
  A: ['A', 'Ā', 'Á', 'Ǎ', 'À', 'A'],
  e: ['e', 'ē', 'é', 'ě', 'è', 'e'],
  E: ['E', 'Ē', 'É', 'Ě', 'È', 'E'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì', 'i'],
  I: ['I', 'Ī', 'Í', 'Ǐ', 'Ì', 'I'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò', 'o'],
  O: ['O', 'Ō', 'Ó', 'Ǒ', 'Ò', 'O'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù', 'u'],
  U: ['U', 'Ū', 'Ú', 'Ǔ', 'Ù', 'U'],
  v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  V: ['Ü', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ü'],
  'ü': ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  'Ü': ['Ü', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ü']
};

export function numberToToneMarks(pinyin: string): string {
  if (!pinyin) return '';

  return pinyin
    .replace(/u:/g, 'v')
    .replace(/U:/g, 'V')
    .replace(/([A-Za-züÜvV]+)([1-5])/g, (match, s, toneStr) => {
      const tone = parseInt(toneStr, 10);
      
      if (tone === 5) {
        return s.replace(/v/gi, (v: string) => v.toLowerCase() === 'v' ? (v === 'v' ? 'ü' : 'Ü') : v);
      }
      
      let targetVowel = '';
      const sLower = s.toLowerCase();

      if (sLower.includes('a')) targetVowel = s.match(/a/i)?.[0] || '';
      else if (sLower.includes('e')) targetVowel = s.match(/e/i)?.[0] || '';
      else if (sLower.includes('ou')) targetVowel = s.match(/o/i)?.[0] || '';
      else {
        const vowels = s.match(/[aeiouüv]/ig);
        if (vowels && vowels.length > 0) {
          targetVowel = vowels[vowels.length - 1]; // last vowel
        }
      }

      if (targetVowel && toneMap[targetVowel]) {
        const replacement = toneMap[targetVowel][tone];
        s = s.replace(targetVowel, replacement);
      }
      
      return s.replace(/v/gi, (v: string) => v === 'v' ? 'ü' : 'Ü');
    });
}
