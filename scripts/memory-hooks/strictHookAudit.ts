import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

export interface ComponentUsed {
  glyph: string;
  label: string;
}

export interface Part {
  glyph: string;
  suggestedLabel: string | null;
  glosses: string[];
  readings?: string[];
  aliases?: string[];
}

export interface HookRecord {
  character: string;
  meaning: string | null;
  meaningSource: string;
  pinyin: string | null;
  strategy: string;
  hook: string | null;
  componentsUsed: ComponentUsed[];
  parts: Part[];
  reason: string | null;
  acceptance: string;
  validation: { valid: boolean; issues: unknown[] };
}

export interface AuditFinding {
  code: 'ERR-1' | 'ERR-2' | 'ERR-3' | 'ERR-4' | 'ERR-5' | 'ERR-6';
  category: string;
  detail: string;
}

export interface CharacterAudit {
  index: number;
  character: string;
  pinyin: string | null;
  meaning: string | null;
  hook: string;
  components: ComponentUsed[];
  findings: AuditFinding[];
}

const CONSONANT_SOUNDS = /^[bcdfghjklmnpqrstvwxyz]/i;
const VOWEL_SOUNDS = /^[aeiou]/i;

export function auditSingleHook(record: HookRecord): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const hook = record.hook ?? '';
  const meaning = (record.meaning ?? '').trim().toLowerCase();
  const character = record.character;

  if (!hook) {
    findings.push({ code: 'ERR-1', category: 'Missing Hook', detail: 'No hook provided' });
    return findings;
  }

  // ERR-6: Article mismatches: "An" before consonant, "A" before vowel
  const articleMatches = [...hook.matchAll(/\b(A|An)\s+[\p{Script=Han}]+\(([^)]+)\)/gu)];
  for (const match of articleMatches) {
    const art = match[1].toLowerCase();
    const label = match[2].trim().toLowerCase();
    if (art === 'an' && CONSONANT_SOUNDS.test(label) && !label.startsWith('hour') && !label.startsWith('honest')) {
      findings.push({ code: 'ERR-6', category: 'Grammar/Article', detail: `Indefinite article 'An' used before consonant label '${label}'` });
    }
    if (art === 'a' && VOWEL_SOUNDS.test(label) && !label.startsWith('one') && !label.startsWith('uni') && !label.startsWith('use')) {
      findings.push({ code: 'ERR-6', category: 'Grammar/Article', detail: `Indefinite article 'A' used before vowel label '${label}'` });
    }
  }

  // ERR-4: Leaked dictionary / grammar metalanguage
  const jargonPattern = /\b(sentence-final|particle|measure word|counter for|classifier for|possessive particle|modal particle|pronoun|grammatical)\b/i;
  const jargonMatch = hook.match(jargonPattern);
  if (jargonMatch) {
    findings.push({ code: 'ERR-4', category: 'Grammar Jargon', detail: `Contains metalanguage '${jargonMatch[0]}'` });
  }

  // ERR-5: Dry / robotic phonetic boilerplate
  if (/is the sound component\s*\([^)]+\):/i.test(hook)) {
    findings.push({ code: 'ERR-5', category: 'Robotic Phonetic', detail: 'Uses dry boilerplate "is the sound component (...):"' });
  }

  // ERR-3: Tautological lead-in, circular definition, or self-referential token
  if (new RegExp(`^${character}\\s+means\\s+`, 'i').test(hook) || new RegExp(`^To\\s+${character}\\s+means\\s+`, 'i').test(hook)) {
    findings.push({ code: 'ERR-3', category: 'Tautological', detail: `Starts with circular '${character} means'` });
  }
  if (hook.includes(character + '(')) {
    findings.push({ code: 'ERR-3', category: 'Self-Referential', detail: `Uses character ${character} as a parenthetical component token of itself` });
  }
  if (character !== '知' && /[:—–-]\s*[\p{Script=Han}]?\s*means\s+/iu.test(hook)) {
    findings.push({ code: 'ERR-3', category: 'Formulaic Suffix', detail: `Ends with formulaic ': <char> means' or '— <char> means'` });
  }
  if (/[—–-]\s*that['’]?s\s+(a|an)\s+/i.test(hook) || /\bthat is a\b/i.test(hook)) {
    findings.push({ code: 'ERR-3', category: 'Cop-Out Ending', detail: `Ends with lazy 'that's a...' or 'that is a...'` });
  }

  // ERR-2: Too short / lazy fragment
  if (hook.length < 55) {
    findings.push({ code: 'ERR-2', category: 'Too Short/Lazy', detail: `Hook length (${hook.length}) is under 55 characters` });
  }

  // ERR-5: Unapproved sound component usage
  if (hook.includes('sound component') && !['媽', '爸', '請', '客', '喝', '城', '湖', '花', '問'].includes(character)) {
    findings.push({ code: 'ERR-5', category: 'Unapproved Phonetic', detail: `Uses 'sound component' outside approved curriculum phonetics` });
  }

  // ERR-1: Meaning distortion / shoehorning
  if (hook.includes('see red') || (meaning !== 'birth' && hook.includes('give birth to'))) {
    findings.push({ code: 'ERR-1', category: 'Meaning Distortion', detail: 'Shoehorned idiom without connection' });
  }

  // Formulaic ends with "means <char>(<meaning>)" where the story has no connection
  if (new RegExp(`means\\s+${character}\\(`, 'i').test(hook)) {
    findings.push({ code: 'ERR-3', category: 'Tautological Ending', detail: `Formulaic '... means ${character}(...)' ending` });
  }

  return findings;
}

function main(): void {
  const artifactPath = resolve(OUTPUT_DIR, 'book-1-hooks-v3.json');
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as { records: HookRecord[] };

  const allAudits: CharacterAudit[] = [];
  const findingsByCode: Record<string, number> = {
    'ERR-1': 0,
    'ERR-2': 0,
    'ERR-3': 0,
    'ERR-4': 0,
    'ERR-5': 0,
    'ERR-6': 0,
  };

  for (let i = 0; i < artifact.records.length; i++) {
    const record = artifact.records[i];
    const findings = auditSingleHook(record);
    allAudits.push({
      index: i,
      character: record.character,
      pinyin: record.pinyin,
      meaning: record.meaning,
      hook: record.hook ?? '',
      components: record.componentsUsed,
      findings,
    });
    for (const f of findings) {
      findingsByCode[f.code] = (findingsByCode[f.code] || 0) + 1;
    }
  }

  const flagged = allAudits.filter((a) => a.findings.length > 0);
  console.log(`Audited ${allAudits.length} records. Found ${flagged.length} records with automated rule violations.`);
  console.log('Violations breakdown:', findingsByCode);
}

main();
