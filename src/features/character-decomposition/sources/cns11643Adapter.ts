import type { DecompositionSourceRef } from '../../../types/decomposition';
import type { AdaptedDecompositionRecord, SourceDiagnostic } from './types';

export interface Cns11643BulkFiles {
  unicodeMappings: string[];
  component: string;
  componentRef: string;
  phonetic: string;
  pinyinTables?: string[];
  radical: string;
  source: string;
  stroke: string;
  strokeSequence: string;
}

export interface Cns11643AdapterOptions {
  sourceVersion: string;
  locale?: string;
  sourceId?: string;
}

export interface CnsComponentReference {
  id: string;
  cnsCode: string | null;
  unicodeCodePoint: string | null;
  glyph: string | null;
}

export interface Cns11643RawRecord {
  cnsCode: string;
  unicodeCodePoint: string;
  unicodeMappingLine: string;
  componentLines: string[];
  phoneticLines: string[];
  radicalLines: string[];
  sourceLines: string[];
  strokeLines: string[];
  strokeSequenceLines: string[];
}

export interface Cns11643Record extends AdaptedDecompositionRecord<Cns11643RawRecord> {
  cnsCode: string;
  unicodeCodePoint: string;
  zhuyin: string[];
  romanizations: string[][];
  radicalNumbers: number[];
  strokeCounts: number[];
  strokeSequences: string[];
  components: CnsComponentReference[];
  identitySources: string[];
}

function parseLines(text: string): string[] {
  return text.split(/\r?\n/u).filter(Boolean);
}

function groupByFirstColumn(text: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const line of parseLines(text)) {
    const key = line.split('\t', 1)[0];
    const existing = grouped.get(key);
    if (existing) existing.push(line);
    else grouped.set(key, [line]);
  }
  return grouped;
}

function values(lines: string[]): string[] {
  return lines.flatMap((line) => line.split('\t').slice(1)).filter(Boolean);
}

function parseComponentReferences(text: string): Map<string, CnsComponentReference> {
  const references = new Map<string, CnsComponentReference>();
  for (const line of parseLines(text)) {
    const [id, cnsCode, unicodeCodePoint, glyph] = line.split('\t');
    references.set(id, {
      id,
      cnsCode: cnsCode || null,
      unicodeCodePoint: unicodeCodePoint || null,
      glyph: glyph || null,
    });
  }
  return references;
}

function parseRomanizationTables(tables: string[]): Map<string, string[][]> {
  const result = new Map<string, string[][]>();
  for (const table of tables) {
    for (const line of parseLines(table)) {
      const [zhuyin, ...romanizations] = line.split('\t');
      if (!zhuyin || romanizations.length === 0) continue;
      const existing = result.get(zhuyin);
      if (existing) existing.push(romanizations);
      else result.set(zhuyin, [romanizations]);
    }
  }
  return result;
}

function sourceRef(cnsCode: string, options: Cns11643AdapterOptions): DecompositionSourceRef {
  return {
    id: options.sourceId ?? 'cns11643-open-data',
    name: 'CNS11643 Chinese Standard Interchange Code',
    version: options.sourceVersion,
    recordId: cnsCode,
  };
}

export function adaptCns11643Bulk(
  files: Cns11643BulkFiles,
  options: Cns11643AdapterOptions,
): Cns11643Record[] {
  const componentByCode = groupByFirstColumn(files.component);
  const phoneticByCode = groupByFirstColumn(files.phonetic);
  const radicalByCode = groupByFirstColumn(files.radical);
  const sourceByCode = groupByFirstColumn(files.source);
  const strokeByCode = groupByFirstColumn(files.stroke);
  const strokeSequenceByCode = groupByFirstColumn(files.strokeSequence);
  const componentReferences = parseComponentReferences(files.componentRef);
  const romanizationByZhuyin = parseRomanizationTables(files.pinyinTables ?? []);
  const locale = options.locale ?? 'zh-Hant-TW';
  const records: Cns11643Record[] = [];

  for (const mappingText of files.unicodeMappings) {
    for (const unicodeMappingLine of parseLines(mappingText)) {
      const [cnsCode, unicodeCodePoint] = unicodeMappingLine.split('\t');
      const codePoint = Number.parseInt(unicodeCodePoint, 16);
      if (!cnsCode || !Number.isFinite(codePoint) || codePoint > 0x10ffff) continue;

      const character = String.fromCodePoint(codePoint);
      const componentLines = componentByCode.get(cnsCode) ?? [];
      const phoneticLines = phoneticByCode.get(cnsCode) ?? [];
      const radicalLines = radicalByCode.get(cnsCode) ?? [];
      const sourceLines = sourceByCode.get(cnsCode) ?? [];
      const strokeLines = strokeByCode.get(cnsCode) ?? [];
      const strokeSequenceLines = strokeSequenceByCode.get(cnsCode) ?? [];
      const componentIds = values(componentLines).flatMap((value) => value.split(',')).filter(Boolean);
      const zhuyin = values(phoneticLines);
      const diagnostics: SourceDiagnostic[] = [{
        code: 'no-recursive-decomposition',
        severity: 'info',
        message: 'CNS bulk components are flat attributes and are not converted into an IDS tree.',
      }];

      records.push({
        character,
        locale,
        regionalQualifiers: ['TW'],
        source: sourceRef(cnsCode, options),
        rawRecord: {
          cnsCode,
          unicodeCodePoint,
          unicodeMappingLine,
          componentLines,
          phoneticLines,
          radicalLines,
          sourceLines,
          strokeLines,
          strokeSequenceLines,
        },
        rawIdsExpression: null,
        normalized: null,
        diagnostics,
        cnsCode,
        unicodeCodePoint,
        zhuyin,
        romanizations: zhuyin.flatMap((reading) => romanizationByZhuyin.get(reading) ?? []),
        radicalNumbers: values(radicalLines).map(Number).filter(Number.isFinite),
        strokeCounts: values(strokeLines).map(Number).filter(Number.isFinite),
        strokeSequences: values(strokeSequenceLines),
        components: componentIds.map((id) => componentReferences.get(id) ?? {
          id,
          cnsCode: null,
          unicodeCodePoint: null,
          glyph: null,
        }),
        identitySources: values(sourceLines),
      });
    }
  }

  return records;
}
