import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FUNCTION_WORD_LABEL, TECHNICAL_LABEL } from './componentRules';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

const HISTORY_LANGUAGE = /\b(ancient|historically|history|originally|origin|evolved|pictograph|oracle bone|bronze script|was created|was formed)\b/i;

interface Part {
  glyph: string;
  suggestedLabel: string | null;
  glosses: string[];
  aliases?: string[];
}

interface HookRecord {
  character: string;
  meaning: string | null;
  hook: string | null;
  acceptance: string;
  componentsUsed: Array<{ glyph: string; label: string }>;
  parts: Part[];
  review?: { action: string };
}

interface Issue {
  code: string;
  message: string;
}

function meaningCore(meaning: string): string {
  return meaning
    .replace(/\([^)]*\)/g, ' ')
    .split(/[;/,"]/)[0]
    .replace(/^to\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function main(): void {
  const artifact = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8')) as {
    records: HookRecord[];
  };
  const curated = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'), 'utf8')) as {
    records: Array<{ glyph: string; label: string | null; use?: string }>;
  };
  const curatedByGlyph = new Map(curated.records.filter((record) => record.use !== 'skip').map((record) => [record.glyph, record.label]));

  const issuesByRecord = new Map<string, Issue[]>();
  let checked = 0;
  for (const record of artifact.records) {
    if (record.acceptance !== 'clean' || !record.hook) continue;
    checked += 1;
    const issues: Issue[] = [];
    const add = (code: string, message: string) => issues.push({ code, message });
    const hook = record.hook;
    const supplied = new Set(record.parts.flatMap((part) => [part.glyph, ...(part.aliases ?? [])]));
    const aliasesByGlyph = new Map(record.parts.map((part) => [part.glyph, part.aliases ?? []]));

    if (hook.length < 15 || hook.length > 240) add('length', 'hook length out of range');
    const sentences = hook.split(/[.!?。！？]+/).filter((part) => part.trim()).length;
    if (sentences > 2) add('sentences', `${sentences} sentences`);
    if (hook.trim().split(/\s+/).length > 40) add('words', 'over 40 words');
    const historyMatch = hook.match(HISTORY_LANGUAGE);
    if (historyMatch && !(record.meaning ?? '').toLowerCase().includes(historyMatch[0].toLowerCase())) {
      add('history-language', 'historical wording');
    }
    if (/\(\s*\)/.test(hook)) add('empty-token', 'empty token');

    const tokens = [...hook.matchAll(/\p{Script=Han}+\(([^)]*)\)/gu)].map((match) => ({ glyph: match[0].split('(')[0], label: match[1] }));
    for (const token of tokens) {
      if (token.glyph === record.character) continue;
      if (!supplied.has(token.glyph)) add('unexpected-glyph', `token ${token.glyph} not supplied`);
      const curatedLabel = curatedByGlyph.get(token.glyph);
      if (curatedLabel && token.label !== curatedLabel) add('label-variant', `${token.glyph} uses "${token.label}" not "${curatedLabel}"`);
      if (token.glyph === token.label) add('glyph-as-label', `${token.glyph} labelled with itself`);
      if (TECHNICAL_LABEL.test(token.label)) add('technical-label', `${token.glyph}(${token.label})`);
      if (FUNCTION_WORD_LABEL.test(token.label)) add('function-label', `${token.glyph}(${token.label})`);
    }
    const allowedHan = new Set([record.character, ...supplied]);
    const unexpectedHan = [...new Set([...hook].filter((glyph) => /\p{Script=Han}/u.test(glyph) && !allowedHan.has(glyph)))];
    if (unexpectedHan.length > 0) add('stray-han', unexpectedHan.join(' '));

    for (const used of record.componentsUsed) {
      const forms = [used.glyph, ...(aliasesByGlyph.get(used.glyph) ?? [])].map((glyph) => `${glyph}(${used.label})`);
      const count = forms.reduce((sum, form) => sum + hook.split(form).length - 1, 0);
      if (count < 1) add('missing-token', `${forms[0]} not in hook`);
      if (count > 2) add('repeated-token', `${forms[0]} x${count}`);
    }
    const distinct = new Set(tokens.map((token) => token.glyph));
    if (distinct.size > 4) add('too-many-tokens', `${distinct.size} distinct tokens`);

    if (record.meaning) {
      const glosses = record.meaning
        .split(/[;,/]/)
        .map((g) => meaningCore(g))
        .filter(Boolean);
      const mentioned = glosses.some((g) => {
        const simplified = g.replace(/^be\s+/, '').replace(/\s+(particle|marker)$/, '').trim();
        return (
          hook.toLowerCase().includes(g) ||
          (simplified.length >= 3 && hook.toLowerCase().includes(simplified))
        );
      });
      if (!mentioned && glosses.length > 0 && glosses[0].length <= 20) {
        add('meaning-not-mentioned', glosses[0]);
      }
    }

    const required = record.parts.filter((part) => part.suggestedLabel || part.glosses.length > 0);
    for (const part of required) {
      const forms = [part.glyph, ...(part.aliases ?? [])].map((glyph) => `${glyph}(`);
      if (!forms.some((form) => hook.includes(form))) add('missing-part', part.glyph);
    }

    if (issues.length > 0) issuesByRecord.set(record.character, issues);
  }

  const codes = new Map<string, string[]>();
  for (const [character, issues] of issuesByRecord) {
    for (const issue of issues) {
      codes.set(issue.code, [...(codes.get(issue.code) ?? []), `${character}: ${issue.message}`]);
    }
  }
  console.log(`checked ${checked} clean hooks; ${issuesByRecord.size} with findings`);
  for (const [code, list] of [...codes].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${code} (${list.length})`);
    console.log(list.slice(0, 12).join('\n'));
    if (list.length > 12) console.log(`... +${list.length - 12} more`);
  }
}

main();
