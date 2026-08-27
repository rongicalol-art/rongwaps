export const IDS_OPERATOR_ARITY = {
  '⿰': 2,
  '⿱': 2,
  '⿲': 3,
  '⿳': 3,
  '⿴': 2,
  '⿵': 2,
  '⿶': 2,
  '⿷': 2,
  '⿸': 2,
  '⿹': 2,
  '⿺': 2,
  '⿻': 2,
  '⿼': 2,
  '⿽': 2,
  '⿾': 1,
  '⿿': 1,
  '㇯': 2,
} as const;

export type IdsOperator = keyof typeof IDS_OPERATOR_ARITY;
export type IdsParsingDialect = 'unicode-ids' | 'unicode-ids-with-entities';

/** Stable identity for one source record, independent of its parser dialect. */
export interface DecompositionSourceRef {
  id: string;
  name: string;
  version: string;
  recordId: string;
}

export type IdsOperandTokenKind = 'unicode-codepoint' | 'source-entity';

export interface IdsStructureAstNode {
  kind: 'structure';
  operator: IdsOperator;
  tokenIndex: number;
  children: IdsAstNode[];
}

/** Source-neutral syntax. Dataset conventions are interpreted after parsing. */
export interface IdsOperandAstNode {
  kind: 'operand';
  token: string;
  tokenIndex: number;
  tokenKind: IdsOperandTokenKind;
}

export type IdsAstNode = IdsStructureAstNode | IdsOperandAstNode;

interface NormalizedNodeBase {
  id: string;
  rawToken: string;
  source: DecompositionSourceRef;
}

export interface GlyphDecompositionNode extends NormalizedNodeBase {
  kind: 'glyph';
  glyph: string;
  children: NormalizedDecompositionNode[];
}

export interface UnencodedComponentNode extends NormalizedNodeBase {
  kind: 'unencoded-component';
  glyph: null;
  componentSourceId: string;
  strokeCount?: number | null;
  children: NormalizedDecompositionNode[];
}

export interface UnknownComponentNode extends NormalizedNodeBase {
  kind: 'unknown-component';
  glyph: null;
  componentSourceId?: string | null;
  children: NormalizedDecompositionNode[];
}

/** An entity whose graphical meaning has not been asserted by a source adapter. */
export interface SourceEntityDecompositionNode extends NormalizedNodeBase {
  kind: 'source-entity';
  glyph: null;
  entity: string;
  children: NormalizedDecompositionNode[];
}

export interface StructuralDecompositionNode extends NormalizedNodeBase {
  kind: 'structure';
  glyph: null;
  operator: IdsOperator;
  children: NormalizedDecompositionNode[];
}

export type NormalizedDecompositionNode =
  | GlyphDecompositionNode
  | UnencodedComponentNode
  | UnknownComponentNode
  | SourceEntityDecompositionNode
  | StructuralDecompositionNode;

/** The canonical, non-recursively-resolved interpretation of one source record. */
export interface NormalizedCharacterDecomposition {
  character: string;
  locale: string;
  rawSource: string;
  dialect: IdsParsingDialect;
  adapterId: string;
  source: DecompositionSourceRef;
  tree: NormalizedDecompositionNode;
}

export interface DecompositionRecordTarget {
  character: string;
  locale: string;
  source: DecompositionSourceRef;
}

export type GlyphExpansion =
  | { kind: 'leaf' }
  | { kind: 'expandable'; target: DecompositionRecordTarget }
  | { kind: 'self-reference-suppressed' };

export interface ResolvedDecompositionNode {
  sourceNode: NormalizedDecompositionNode;
  expansion?: GlyphExpansion;
  children: ResolvedDecompositionNode[];
}

/** Derived navigation metadata over a source record; it does not inline other records. */
export interface ResolvedCharacterDecomposition {
  sourceRecord: NormalizedCharacterDecomposition;
  tree: ResolvedDecompositionNode;
}

export type GlyphRenderStatus = 'unchecked' | 'renderable' | 'font-missing';

interface LearnerNodeBase {
  id: string;
  children: LearnerDecompositionNode[];
}

export interface LearnerStructureNode extends LearnerNodeBase {
  kind: 'structure';
  presentation: 'layout-only';
  operator: IdsOperator;
}

export interface LearnerGlyphNode extends LearnerNodeBase {
  kind: 'glyph';
  presentation: 'card';
  glyph: string;
  label: string;
  renderStatus: GlyphRenderStatus;
  expansion: GlyphExpansion;
}

export interface LearnerUnencodedComponentNode extends LearnerNodeBase {
  kind: 'unencoded-component';
  presentation: 'card';
  glyph: null;
  label: 'No glyph';
  componentSourceId: string;
}

export interface LearnerUnknownComponentNode extends LearnerNodeBase {
  kind: 'unknown-component';
  presentation: 'card';
  glyph: null;
  label: 'Unknown component';
}

export interface LearnerSourceEntityNode extends LearnerNodeBase {
  kind: 'source-entity';
  presentation: 'card';
  glyph: null;
  label: 'Unresolved source component';
  entity: string;
}

export type LearnerCardNode =
  | LearnerGlyphNode
  | LearnerUnencodedComponentNode
  | LearnerUnknownComponentNode
  | LearnerSourceEntityNode;

export type LearnerDecompositionNode = LearnerStructureNode | LearnerCardNode;

export interface LearnerCharacterDecomposition {
  root: LearnerGlyphNode;
}
