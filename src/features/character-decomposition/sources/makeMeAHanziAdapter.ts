import type { DecompositionSourceRef } from '../../../types/decomposition';
import {
  IdsParseError,
  STRICT_IDS_OPERAND_ADAPTER,
  normalizeIdsExpression,
  type IdsOperandAdapter,
} from '../../../utils/idsParser';
import type { AdaptedDecompositionRecord, SourceDiagnostic } from './types';

export interface MakeMeAHanziRawRecord {
  character: string;
  decomposition: string | null;
  radical?: string | null;
  pinyin?: string[] | string | null;
  definition?: string | null;
  components_historical?: string[] | null;
  [key: string]: unknown;
}

export interface MakeMeAHanziAdapterOptions {
  sourceVersion: string;
  locale?: string;
  sourceId?: string;
}

export const MAKE_ME_A_HANZI_OPERAND_ADAPTER: IdsOperandAdapter = {
  id: 'makemeahanzi-ids-v1',
  interpret(operand) {
    if (operand.tokenKind === 'unicode-codepoint' && (operand.token === '？' || operand.token === '?')) {
      return { kind: 'unknown-component', componentSourceId: 'makemeahanzi:unknown' };
    }
    return STRICT_IDS_OPERAND_ADAPTER.interpret(operand);
  },
};

function sourceRef(recordId: string, options: MakeMeAHanziAdapterOptions): DecompositionSourceRef {
  return {
    id: options.sourceId ?? 'makemeahanzi-dictionary',
    name: 'Make Me a Hanzi dictionary data',
    version: options.sourceVersion,
    recordId,
  };
}

export function adaptMakeMeAHanziRecord(
  rawRecord: MakeMeAHanziRawRecord,
  options: MakeMeAHanziAdapterOptions,
): AdaptedDecompositionRecord<MakeMeAHanziRawRecord> {
  const locale = options.locale ?? 'zh-Hans';
  const source = sourceRef(rawRecord.character, options);
  const diagnostics: SourceDiagnostic[] = [];
  const rawIdsExpression = rawRecord.decomposition?.trim() || null;

  if (!rawIdsExpression) {
    diagnostics.push({
      code: 'missing-decomposition',
      severity: 'info',
      message: 'The Make Me a Hanzi record has no decomposition expression.',
    });
    return {
      character: rawRecord.character,
      locale,
      regionalQualifiers: [],
      source,
      rawRecord,
      rawIdsExpression: null,
      normalized: null,
      diagnostics,
    };
  }

  if (rawIdsExpression.startsWith('？') || rawIdsExpression.startsWith('?')) {
    diagnostics.push({
      code: 'unknown-whole-decomposition',
      severity: 'warning',
      message: 'A leading question mark means the complete decomposition is unavailable.',
    });
    return {
      character: rawRecord.character,
      locale,
      regionalQualifiers: [],
      source,
      rawRecord,
      rawIdsExpression,
      normalized: null,
      diagnostics,
    };
  }

  try {
    return {
      character: rawRecord.character,
      locale,
      regionalQualifiers: [],
      source,
      rawRecord,
      rawIdsExpression,
      normalized: normalizeIdsExpression(rawIdsExpression, {
        character: rawRecord.character,
        locale,
        dialect: 'unicode-ids',
        operandAdapter: MAKE_ME_A_HANZI_OPERAND_ADAPTER,
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
      regionalQualifiers: [],
      source,
      rawRecord,
      rawIdsExpression,
      normalized: null,
      diagnostics,
    };
  }
}

export function adaptMakeMeAHanziRecords(
  rawRecords: MakeMeAHanziRawRecord[],
  options: MakeMeAHanziAdapterOptions,
): AdaptedDecompositionRecord<MakeMeAHanziRawRecord>[] {
  return rawRecords.map((record) => adaptMakeMeAHanziRecord(record, options));
}
