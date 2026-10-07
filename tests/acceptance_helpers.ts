import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReadingRecord, InteractiveGrammarPart } from '../src/types/models';
import { validateInteractiveLessons as validateCore } from '../src/utils/grammar/validateInteractiveLessons';

export const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));

export function isStrictAcceptance(): boolean {
  return process.env.ACCEPTANCE_STRICT === 'true';
}

export function readJson<T = unknown>(relativePath: string): T {
  const fullPath = path.resolve(PROJECT_ROOT, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as T;
}

export function readSource(relativePath: string): string {
  const fullPath = path.resolve(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

export function listSourceFiles(dir: string): string[] {
  return listFilesRecursive(path.resolve(PROJECT_ROOT, dir), (f) => f.endsWith('.ts') || f.endsWith('.tsx'));
}

export function getTestReadings(bookId: number = 1): ReadingRecord[] {
  return readJson<{ items: ReadingRecord[] }>(`public/data/readings/book-${bookId}.json`).items;
}

export function getTestGrammarParts(bookId: number = 1): InteractiveGrammarPart[] {
  return readJson<{ items: InteractiveGrammarPart[] }>(`public/data/grammar/book-${bookId}.json`).items;
}

export function getTestGrammarPart(partId: string, bookId: number = 1): InteractiveGrammarPart {
  const part = getTestGrammarParts(bookId).find((p) => p.id === partId);
  if (!part) throw new Error(`Test grammar part not found: ${partId}`);
  return part;
}

export function getTestReadingsForLesson(bookId: number, lessonId: number): ReadingRecord[] {
  return getTestReadings(bookId).filter((r) => r.lessonId === lessonId);
}

export function getTestGrammarPartsForLesson(bookId: number, lessonId: number): InteractiveGrammarPart[] {
  return getTestGrammarParts(bookId).filter((p) => p.lessonId === lessonId);
}

export const TEST_ALL_READINGS: ReadingRecord[] = getTestReadings(1);
export const TEST_INTERACTIVE_GRAMMAR_PARTS: InteractiveGrammarPart[] = getTestGrammarParts(1);

export function validateInteractiveLessons(
  parts: InteractiveGrammarPart[] = getTestGrammarParts(),
  readings: ReadingRecord[] = getTestReadings(),
) {
  return validateCore(parts, readings);
}

export function countFileLines(filePath: string): number {
  if (!fs.existsSync(filePath)) return -1;
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content) return 0;
  return content.split('\n').length;
}

export function listFilesRecursive(dir: string, filter?: (filePath: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath, filter));
    } else if (!filter || filter(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

export function listEmptyDirsRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const emptyDirs: string[] = [];

  if (entries.length === 0) {
    emptyDirs.push(dir);
    return emptyDirs;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDir = path.join(dir, entry.name);
      emptyDirs.push(...listEmptyDirsRecursive(subDir));
    }
  }
  return emptyDirs;
}

export function extractImportSources(fileContent: string): string[] {
  const sources: string[] = [];
  // Match standard ES6 imports: import ... from 'source' or import 'source'
  const importRegex = /(?:import\s+(?:[\w*\s{},$]+from\s+)?['"]([^'"]+)['"])|(?:export\s+(?:[\w*\s{},$]+from\s+)?['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(fileContent)) !== null) {
    const source = match[1] || match[2] || match[3];
    if (source) {
      sources.push(source);
    }
  }
  return sources;
}

export function extractMarkdownLinks(markdownContent: string): string[] {
  const links: string[] = [];
  // Match markdown links [label](target)
  const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(markdownContent)) !== null) {
    const target = match[1].trim();
    // Exclude anchor-only links and external urls
    if (!target.startsWith('#') && !target.startsWith('http://') && !target.startsWith('https://')) {
      // Strip anchor hashes if present
      const cleanTarget = target.split('#')[0];
      if (cleanTarget) {
        links.push(cleanTarget);
      }
    }
  }
  return links;
}
