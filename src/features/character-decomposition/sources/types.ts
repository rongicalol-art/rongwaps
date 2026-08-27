import type {
  DecompositionSourceRef,
  NormalizedCharacterDecomposition,
} from '../../../types/decomposition';

export type SourceDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface SourceDiagnostic {
  code: string;
  severity: SourceDiagnosticSeverity;
  message: string;
  tokenIndex?: number;
}

export interface AdaptedDecompositionRecord<TRaw = unknown> {
  character: string;
  locale: string;
  regionalQualifiers: string[];
  source: DecompositionSourceRef;
  rawRecord: TRaw;
  rawIdsExpression: string | null;
  normalized: NormalizedCharacterDecomposition | null;
  diagnostics: SourceDiagnostic[];
}

export function sourceRecordKey(source: DecompositionSourceRef): string {
  return `${source.id}:${source.version}:${source.recordId}`;
}
