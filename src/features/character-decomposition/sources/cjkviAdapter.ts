import type { DecompositionSourceRef } from '../../../types/decomposition';
import {
  IdsParseError,
  STRICT_IDS_OPERAND_ADAPTER,
  normalizeIdsExpression,
  type IdsOperandAdapter,
} from '../../../utils/idsParser';
import type { AdaptedDecompositionRecord, SourceDiagnostic } from './types';

const CJKVI_UNENCODED_MARKERS = new Map<string, number>([
  ['①', 1], ['②', 2], ['③', 3], ['④', 4], ['⑤', 5],
  ['⑥', 6], ['⑦', 7], ['⑧', 8], ['⑨', 9], ['⑩', 10],
  ['⑪', 11], ['⑫', 12], ['⑬', 13], ['⑭', 14], ['⑮', 15],
  ['⑯', 16], ['⑰', 17], ['⑱', 18], ['⑲', 19], ['⑳', 20],
]);

export const CJKVI_OPERAND_ADAPTER: IdsOperandAdapter = {
  id: 'cjkvi-ids-v1',
  interpret(operand) {
    if (operand.tokenKind === 'source-entity') {
      if (/^&CDP-[^;]+;$/u.test(operand.token)) {
        return { kind: 'unencoded-component', componentSourceId: operand.token.slice(1, -1) };
      }
      return { kind: 'source-entity', entity: operand.token.slice(1, -1) };
    }

    const strokeCount = CJKVI_UNENCODED_MARKERS.get(operand.token);
    if (strokeCount !== undefined) {
      return {
        kind: 'unencoded-component',
        componentSourceId: `cjkvi:unencoded:${strokeCount}-stroke`,
        strokeCount,
      };
    }
    if (operand.token === '？' || operand.token === '?') {
      return { kind: 'unknown-component', componentSourceId: 'cjkvi:unknown' };
    }
    if ('αℓ△〇〢いよりコサスユキ𛂦'.includes(operand.token)) {
      return { kind: 'glyph', glyph: operand.token };
    }
    return STRICT_IDS_OPERAND_ADAPTER.interpret(operand);
  },
};

export interface CjkviRawAlternative {
  expression: string;
  regionalQualifiers: string[];
  fieldIndex: number;
  rawField: string;
}

export interface CjkviRawRecord {
  codePointId: string;
  character: string;
  rawLine: string;
  alternatives: CjkviRawAlternative[];
}

export interface CjkviAdapterOptions {
  sourceVersion: string;
  locale?: string;
  sourceId?: string;
}

export interface CjkviCharacterRecord {
  character: string;
  rawRecord: CjkviRawRecord;
  alternatives: AdaptedDecompositionRecord<CjkviRawRecord>[];
  selected: AdaptedDecompositionRecord<CjkviRawRecord> | null;
  selectionReason: 'explicit-taiwan' | 'neutral' | 'no-taiwan-compatible-variant';
  diagnostics: SourceDiagnostic[];
}

function parseAlternative(rawField: string, fieldIndex: number): CjkviRawAlternative {
  const qualifierMatch = rawField.match(/\[([^\]]+)\]$/u);
  const expression = qualifierMatch
    ? rawField.slice(0, qualifierMatch.index)
    : rawField;
  return {
    expression,
    regionalQualifiers: qualifierMatch ? [...qualifierMatch[1]] : [],
    fieldIndex,
    rawField,
  };
}

export function parseCjkviLine(rawLine: string): CjkviRawRecord | null {
  if (!rawLine.trim() || rawLine.startsWith('#')) return null;
  const fields = rawLine.split('\t');
  if (fields.length < 3) return null;
  return {
    codePointId: fields[0],
    character: fields[1],
    rawLine,
    alternatives: fields.slice(2).map((field, index) => parseAlternative(field, index)),
  };
}

function sourceRef(
  rawRecord: CjkviRawRecord,
  alternative: CjkviRawAlternative,
  options: CjkviAdapterOptions,
): DecompositionSourceRef {
  const qualifier = alternative.regionalQualifiers.join('') || 'neutral';
  return {
    id: options.sourceId ?? 'cjkvi-ids',
    name: 'CJKVI/CHISE IDS',
    version: options.sourceVersion,
    recordId: `${rawRecord.codePointId}:alt-${alternative.fieldIndex}:${qualifier}`,
  };
}

function adaptAlternative(
  rawRecord: CjkviRawRecord,
  alternative: CjkviRawAlternative,
  options: CjkviAdapterOptions,
): AdaptedDecompositionRecord<CjkviRawRecord> {
  const locale = options.locale ?? 'zh-Hant-TW';
  const source = sourceRef(rawRecord, alternative, options);
  const diagnostics: SourceDiagnostic[] = [];
  try {
    return {
      character: rawRecord.character,
      locale,
      regionalQualifiers: alternative.regionalQualifiers,
      source,
      rawRecord,
      rawIdsExpression: alternative.expression,
      normalized: normalizeIdsExpression(alternative.expression, {
        character: rawRecord.character,
        locale,
        dialect: 'unicode-ids-with-entities',
        operandAdapter: CJKVI_OPERAND_ADAPTER,
        source,
      }),
      diagnostics,
    };
  } catch (error) {
    diagnostics.push({
      code: error instanceof IdsParseError ? error.code : 'adapter-failure',
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
      tokenIndex: error instanceof IdsParseError ? error.tokenIndex : undefined,
    });
    return {
      character: rawRecord.character,
      locale,
      regionalQualifiers: alternative.regionalQualifiers,
      source,
      rawRecord,
      rawIdsExpression: alternative.expression,
      normalized: null,
      diagnostics,
    };
  }
}

/**
 * zh-Hant-TW policy: explicit T (including combined tags) first, then an
 * unqualified alternative. G/J/K-only alternatives are preserved but never
 * silently selected.
 */
export function adaptCjkviRecord(
  rawRecord: CjkviRawRecord,
  options: CjkviAdapterOptions,
): CjkviCharacterRecord {
  const alternatives = rawRecord.alternatives.map((alternative) => (
    adaptAlternative(rawRecord, alternative, options)
  ));
  const explicitTaiwan = alternatives.filter((record) => record.regionalQualifiers.includes('T'));
  const neutral = alternatives.filter((record) => record.regionalQualifiers.length === 0);
  const candidates = explicitTaiwan.length ? explicitTaiwan : neutral;
  const diagnostics: SourceDiagnostic[] = [];

  if (candidates.length > 1) {
    diagnostics.push({
      code: 'ambiguous-top-ranked-variant',
      severity: 'warning',
      message: `${candidates.length} alternatives share the highest Taiwan selection rank; file order is used for evaluation only.`,
    });
  }
  if (candidates.length === 0) {
    diagnostics.push({
      code: 'no-taiwan-compatible-variant',
      severity: 'warning',
      message: 'No [T] or unqualified alternative exists; another source must supply the Taiwan fallback.',
    });
  }

  return {
    character: rawRecord.character,
    rawRecord,
    alternatives,
    selected: candidates[0] ?? null,
    selectionReason: explicitTaiwan.length
      ? 'explicit-taiwan'
      : neutral.length
        ? 'neutral'
        : 'no-taiwan-compatible-variant',
    diagnostics,
  };
}

export function adaptCjkviText(text: string, options: CjkviAdapterOptions): CjkviCharacterRecord[] {
  const records: CjkviCharacterRecord[] = [];
  for (const line of text.split(/\r?\n/u)) {
    const rawRecord = parseCjkviLine(line);
    if (rawRecord) records.push(adaptCjkviRecord(rawRecord, options));
  }
  return records;
}
