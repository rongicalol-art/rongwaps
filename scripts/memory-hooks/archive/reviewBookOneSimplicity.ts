import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

export interface SimplicityFinding {
  code: 'ROBOTIC_SOUND' | 'PURPLE_PROSE' | 'OVERLY_LONG' | 'MECHANICAL_TEMPLATE' | 'DANGLING_PROP';
  detail: string;
}

export interface SimplicityAuditRecord {
  id: string;
  type: 'character' | 'word';
  text: string;
  hook: string;
  findings: SimplicityFinding[];
}

const PURPLE_PROSE_TERMS = [
  'unearths',
  'luminous',
  'perish',
  'ceremonial',
  'reverent',
  'expanse',
  'craftsmanship',
  'endurance',
  'torrents',
  'radiating',
  'fragrance',
  'dignified',
  'sacred',
  'vibrant',
  'profound',
  'weary traveler',
  'first light',
  'chores overwhelm',
  'harvesting fresh timber',
];

const MECHANICAL_WORD_PATTERNS = [
  /^Stepping 上\(above\) into or toward/i,
  /into an exact 半\(half\):/i,
];

export function auditSimplicityForCharacter(character: string, hook: string): SimplicityFinding[] {
  const findings: SimplicityFinding[] = [];

  // 1. Robotic sound component appendage: e.g. ", with X as the sound component (a -> b)"
  if (/,\s*with\s+[\p{Script=Han}]+\([^)]+\)\s+as\s+the\s+sound\s+component/u.test(hook)) {
    findings.push({
      code: 'ROBOTIC_SOUND',
      detail: 'Uses robotic ", with X as the sound component (...)" appendix',
    });
  } else if (/with\s+[\p{Script=Han}]+\([^)]+\)\s+as\s+the\s+sound\s+component\s*\([^)]+\):/u.test(hook)) {
    findings.push({
      code: 'ROBOTIC_SOUND',
      detail: 'Uses formulaic "with X as the sound component (...):" pattern',
    });
  }

  // 2. Purple prose / overly dramatic language not suited for beginners
  // Strip approved component tokens `字(label)` so labels like 亡(perish) or 卓(profound) are not flagged
  const proseWithoutTokens = hook.replace(/[\p{Script=Han}]+\([^)]+\)/gu, '');
  for (const term of PURPLE_PROSE_TERMS) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(proseWithoutTokens)) {
      findings.push({
        code: 'PURPLE_PROSE',
        detail: `Contains overly ornate / purple-prose term "${term}"`,
      });
    }
  }

  // 3. Overly long hooks (>110 characters) that overburden beginners
  // Note: Sanctioned sound characters or hooks with explicit sound cues (lends the sound, sound cue)
  // may reach up to 125 chars to comfortably fit the phonetic transition without compressing the story into nonsense.
  const hasPhoneticCue = /\b(lends the sound|sound cue|sound shifts)\b/i.test(hook);
  const maxLength = (hasPhoneticCue || ['媽', '爸', '請', '客', '喝', '城', '湖', '花', '問'].includes(character)) ? 125 : 110;
  if (hook.length > maxLength) {
    findings.push({
      code: 'OVERLY_LONG',
      detail: `Hook length (${hook.length}) exceeds ${maxLength} chars; too complex/long for beginners`,
    });
  }

  // 4. Specific dangling props flagged by beginners
  if (character === '新' && /timber/i.test(hook)) {
    findings.push({
      code: 'DANGLING_PROP',
      detail: 'Mentions "timber" which is not in the visible decomposition of 新',
    });
  }

  return findings;
}

export function auditSimplicityForWord(word: string, hook: string): SimplicityFinding[] {
  const findings: SimplicityFinding[] = [];

  for (const pat of MECHANICAL_WORD_PATTERNS) {
    if (pat.test(hook)) {
      findings.push({
        code: 'MECHANICAL_TEMPLATE',
        detail: `Matches awkward mechanical template: ${pat}`,
      });
    }
  }

  if (hook.includes('measure word for times')) {
    findings.push({
      code: 'MECHANICAL_TEMPLATE',
      detail: 'Contains leaked grammar label "measure word for times"',
    });
  }

  return findings;
}

export function runSimplicityReview(): {
  charactersAudited: number;
  flaggedCharacters: SimplicityAuditRecord[];
  wordsAudited: number;
  flaggedWords: SimplicityAuditRecord[];
} {
  const charPath = resolve(OUTPUT_DIR, 'book-1-hooks-v3.json');
  const charData = JSON.parse(readFileSync(charPath, 'utf8')) as {
    records: Array<{ character: string; hook: string | null }>;
  };

  const flaggedCharacters: SimplicityAuditRecord[] = [];
  for (const r of charData.records) {
    const findings = auditSimplicityForCharacter(r.character, r.hook ?? '');
    if (findings.length > 0) {
      flaggedCharacters.push({
        id: r.character,
        type: 'character',
        text: r.character,
        hook: r.hook ?? '',
        findings,
      });
    }
  }

  const wordPath = resolve(OUTPUT_DIR, 'book-1-word-hooks-v1.json');
  const flaggedWords: SimplicityAuditRecord[] = [];
  let wordsAudited = 0;
  if (readFileSync(wordPath)) {
    const wordData = JSON.parse(readFileSync(wordPath, 'utf8')) as {
      records: Array<{ word: string; hook: string | null }>;
    };
    wordsAudited = wordData.records.length;
    for (const r of wordData.records) {
      const findings = auditSimplicityForWord(r.word, r.hook ?? '');
      if (findings.length > 0) {
        flaggedWords.push({
          id: `word_${r.word}`,
          type: 'word',
          text: r.word,
          hook: r.hook ?? '',
          findings,
        });
      }
    }
  }

  return {
    charactersAudited: charData.records.length,
    flaggedCharacters,
    wordsAudited,
    flaggedWords,
  };
}

if (process.argv[1] && process.argv[1].endsWith('reviewBookOneSimplicity.ts')) {
  const res = runSimplicityReview();
  console.log(`Audited ${res.charactersAudited} characters, found ${res.flaggedCharacters.length} flagged.`);
  console.log(`Audited ${res.wordsAudited} words, found ${res.flaggedWords.length} flagged.`);
  if (res.flaggedCharacters.length > 0) {
    console.log('\nSample flagged characters:');
    for (const c of res.flaggedCharacters.slice(0, 10)) {
      console.log(`- ${c.text}: ${c.findings.map((f) => f.code).join(', ')}`);
      console.log(`  "${c.hook}"`);
    }
  }
  if (res.flaggedWords.length > 0) {
    console.log('\nSample flagged words:');
    for (const w of res.flaggedWords.slice(0, 10)) {
      console.log(`- ${w.text}: ${w.findings.map((f) => f.code).join(', ')}`);
      console.log(`  "${w.hook}"`);
    }
  }
}
