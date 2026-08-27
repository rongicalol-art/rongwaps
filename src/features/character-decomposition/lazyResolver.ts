import type {
  NormalizedCharacterDecomposition,
  NormalizedDecompositionNode,
} from '../../types/decomposition';

export type ResolverLookupResult =
  | { status: 'available'; record: NormalizedCharacterDecomposition }
  | { status: 'missing-decomposition'; reason: 'record-not-found' | 'no-expression' }
  | { status: 'deferred' };

export interface DecompositionRecordProvider {
  lookup(character: string, locale: string): ResolverLookupResult | Promise<ResolverLookupResult>;
}

export type LazyGlyphResolution =
  | { kind: 'unresolved' }
  | { kind: 'leaf' }
  | { kind: 'missing-decomposition'; reason: 'record-not-found' | 'no-expression' }
  | { kind: 'expandable'; targetRecordId: string }
  | { kind: 'cycle'; character: string }
  | { kind: 'max-depth'; maximumDepth: number };

export interface LazyExplorableNode {
  sourceNode: NormalizedDecompositionNode;
  resolution?: LazyGlyphResolution;
  children: LazyExplorableNode[];
}

export interface LazyExplorableRecord {
  sourceRecord: NormalizedCharacterDecomposition;
  tree: LazyExplorableNode;
}

export interface ResolverExpansionContext {
  ancestry: string[];
  depth: number;
}

export interface ResolverExpansionResult {
  resolution: LazyGlyphResolution;
  record?: LazyExplorableRecord;
}

function isAtomicSelfRecord(record: NormalizedCharacterDecomposition): boolean {
  return record.tree.kind === 'glyph'
    && record.tree.glyph === record.character
    && record.tree.children.length === 0;
}

function wrapNode(
  node: NormalizedDecompositionNode,
  recordCharacter: string,
): LazyExplorableNode {
  return {
    sourceNode: node,
    resolution: node.kind === 'glyph'
      ? node.glyph === recordCharacter ? { kind: 'leaf' } : { kind: 'unresolved' }
      : undefined,
    children: node.children.map((child) => wrapNode(child, recordCharacter)),
  };
}

export function createLazyExplorableRecord(
  sourceRecord: NormalizedCharacterDecomposition,
): LazyExplorableRecord {
  return { sourceRecord, tree: wrapNode(sourceRecord.tree, sourceRecord.character) };
}

export class LazyDecompositionResolver {
  constructor(
    private readonly provider: DecompositionRecordProvider,
    readonly maximumDepth = 8,
  ) {
    if (!Number.isInteger(maximumDepth) || maximumDepth < 1) {
      throw new Error('maximumDepth must be a positive integer');
    }
  }

  createRoot(sourceRecord: NormalizedCharacterDecomposition): LazyExplorableRecord {
    return createLazyExplorableRecord(sourceRecord);
  }

  async expandGlyph(
    node: LazyExplorableNode,
    locale: string,
    context: ResolverExpansionContext,
  ): Promise<ResolverExpansionResult> {
    if (node.sourceNode.kind !== 'glyph') {
      throw new Error('Only glyph nodes can resolve another character record');
    }

    const character = node.sourceNode.glyph;
    if (context.ancestry.includes(character)) {
      return { resolution: { kind: 'cycle', character } };
    }
    if (context.depth >= this.maximumDepth) {
      return { resolution: { kind: 'max-depth', maximumDepth: this.maximumDepth } };
    }

    const lookup = await this.provider.lookup(character, locale);
    if (lookup.status === 'deferred') return { resolution: { kind: 'unresolved' } };
    if (lookup.status === 'missing-decomposition') {
      return { resolution: { kind: 'missing-decomposition', reason: lookup.reason } };
    }
    if (isAtomicSelfRecord(lookup.record)) {
      return { resolution: { kind: 'leaf' }, record: createLazyExplorableRecord(lookup.record) };
    }

    return {
      resolution: {
        kind: 'expandable',
        targetRecordId: lookup.record.source.recordId,
      },
      record: createLazyExplorableRecord(lookup.record),
    };
  }
}
