import {
  IDS_OPERATOR_ARITY,
  type DecompositionSourceRef,
  type IdsAstNode,
  type IdsOperandAstNode,
  type IdsOperator,
  type IdsParsingDialect,
  type NormalizedCharacterDecomposition,
  type NormalizedDecompositionNode,
} from '../../types/decomposition';

export type IdsParseErrorCode =
  | 'empty-expression'
  | 'unexpected-end'
  | 'trailing-token'
  | 'unterminated-entity'
  | 'source-entity-not-allowed'
  | 'invalid-operand'
  | 'limit-exceeded';

export class IdsParseError extends Error {
  constructor(
    readonly code: IdsParseErrorCode,
    message: string,
    readonly rawSource: string,
    readonly tokenIndex: number,
    readonly adapterId?: string,
  ) {
    super(message);
    this.name = 'IdsParseError';
  }
}

interface SourceToken {
  value: string;
  tokenIndex: number;
}

export interface ParseIdsOptions {
  dialect: IdsParsingDialect;
  maxDepth?: number;
  maxNodes?: number;
}

export type IdsOperandInterpretation =
  | { kind: 'glyph'; glyph: string }
  | { kind: 'unencoded-component'; componentSourceId: string; strokeCount?: number }
  | { kind: 'unknown-component'; componentSourceId?: string }
  | { kind: 'source-entity'; entity: string }
  | { kind: 'invalid'; reason: string };

/** Dataset conventions live here rather than in IDS syntax parsing. */
export interface IdsOperandAdapter {
  id: string;
  interpret(operand: IdsOperandAstNode): IdsOperandInterpretation;
}

export interface NormalizeIdsOptions extends ParseIdsOptions {
  character: string;
  locale: string;
  source: DecompositionSourceRef;
  operandAdapter: IdsOperandAdapter;
}

function tokenize(rawSource: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  let cursor = 0;

  while (cursor < rawSource.length) {
    const codePoint = rawSource.codePointAt(cursor);
    if (codePoint === undefined) break;
    const value = String.fromCodePoint(codePoint);

    if (/\s/u.test(value)) {
      cursor += value.length;
      continue;
    }

    if (value === '&') {
      const entityEnd = rawSource.indexOf(';', cursor + 1);
      if (entityEnd === -1) {
        throw new IdsParseError(
          'unterminated-entity',
          'Unterminated IDS source entity',
          rawSource,
          tokens.length,
        );
      }
      tokens.push({ value: rawSource.slice(cursor, entityEnd + 1), tokenIndex: tokens.length });
      cursor = entityEnd + 1;
      continue;
    }

    tokens.push({ value, tokenIndex: tokens.length });
    cursor += value.length;
  }

  return tokens;
}

function parseOperand(token: SourceToken, dialect: IdsParsingDialect, rawSource: string): IdsOperandAstNode {
  const isEntity = /^&[^;]+;$/u.test(token.value);
  if (isEntity && dialect !== 'unicode-ids-with-entities') {
    throw new IdsParseError(
      'source-entity-not-allowed',
      `IDS dialect ${dialect} does not allow source entities`,
      rawSource,
      token.tokenIndex,
    );
  }

  return {
    kind: 'operand',
    token: token.value,
    tokenIndex: token.tokenIndex,
    tokenKind: isEntity ? 'source-entity' : 'unicode-codepoint',
  };
}

export function parseIdsExpression(rawSource: string, options: ParseIdsOptions): IdsAstNode {
  const tokens = tokenize(rawSource);
  if (tokens.length === 0) {
    throw new IdsParseError('empty-expression', 'IDS expression is empty', rawSource, 0);
  }

  const maxDepth = options.maxDepth ?? 64;
  const maxNodes = options.maxNodes ?? 1_024;
  let cursor = 0;
  let nodeCount = 0;

  function parseNode(depth: number): IdsAstNode {
    if (depth > maxDepth || nodeCount >= maxNodes) {
      throw new IdsParseError(
        'limit-exceeded',
        `IDS expression exceeds parser limits (${maxDepth} depth, ${maxNodes} nodes)`,
        rawSource,
        cursor,
      );
    }

    const token = tokens[cursor];
    if (!token) {
      throw new IdsParseError(
        'unexpected-end',
        'IDS expression ended before every operator received its operands',
        rawSource,
        cursor,
      );
    }

    cursor += 1;
    nodeCount += 1;
    const arity = IDS_OPERATOR_ARITY[token.value as IdsOperator];
    if (!arity) return parseOperand(token, options.dialect, rawSource);

    return {
      kind: 'structure',
      operator: token.value as IdsOperator,
      tokenIndex: token.tokenIndex,
      children: Array.from({ length: arity }, () => parseNode(depth + 1)),
    };
  }

  const tree = parseNode(0);
  if (cursor !== tokens.length) {
    throw new IdsParseError(
      'trailing-token',
      `IDS expression contains an unexpected trailing token: ${tokens[cursor].value}`,
      rawSource,
      cursor,
    );
  }
  return tree;
}

export function isAllowedUnicodeIdsGlyph(token: string): boolean {
  const codePoint = token.codePointAt(0);
  if (codePoint === undefined || token.length !== String.fromCodePoint(codePoint).length) return false;

  return (
    (codePoint >= 0x2e80 && codePoint <= 0x2fdf)
    || (codePoint >= 0x31c0 && codePoint <= 0x31ee)
    || (codePoint >= 0x3400 && codePoint <= 0x4dbf)
    || (codePoint >= 0x4e00 && codePoint <= 0x9fff)
    || (codePoint >= 0xf900 && codePoint <= 0xfaff)
    || (codePoint >= 0x20000 && codePoint <= 0x323af)
    || (codePoint >= 0xe000 && codePoint <= 0xf8ff)
    || (codePoint >= 0xf0000 && codePoint <= 0xffffd)
    || (codePoint >= 0x100000 && codePoint <= 0x10fffd)
  );
}

function interpretStrictOperand(operand: IdsOperandAstNode): IdsOperandInterpretation {
  if (operand.tokenKind === 'source-entity') {
    return { kind: 'source-entity', entity: operand.token.slice(1, -1) };
  }
  if (!isAllowedUnicodeIdsGlyph(operand.token)) {
    return { kind: 'invalid', reason: `${operand.token} is not an allowed IDS glyph operand` };
  }
  return { kind: 'glyph', glyph: operand.token };
}

export const STRICT_IDS_OPERAND_ADAPTER: IdsOperandAdapter = {
  id: 'strict-unicode-ids',
  interpret: interpretStrictOperand,
};

function nodeId(source: DecompositionSourceRef, path: number[]): string {
  const namespace = [source.id, source.version, source.recordId].map(encodeURIComponent).join(':');
  return `${namespace}:${path.length ? path.join('.') : 'root'}`;
}

function normalizeNode(
  ast: IdsAstNode,
  options: NormalizeIdsOptions,
  path: number[],
  rawSource: string,
): NormalizedDecompositionNode {
  const id = nodeId(options.source, path);

  if (ast.kind === 'structure') {
    return {
      id,
      kind: 'structure',
      glyph: null,
      operator: ast.operator,
      rawToken: ast.operator,
      source: options.source,
      children: ast.children.map((child, index) => normalizeNode(child, options, [...path, index], rawSource)),
    };
  }

  const interpretation = options.operandAdapter.interpret(ast);
  if (interpretation.kind === 'invalid') {
    throw new IdsParseError(
      'invalid-operand',
      interpretation.reason,
      rawSource,
      ast.tokenIndex,
      options.operandAdapter.id,
    );
  }

  const base = { id, rawToken: ast.token, source: options.source, children: [] };
  if (interpretation.kind === 'unencoded-component') {
    return {
      ...base,
      kind: 'unencoded-component',
      glyph: null,
      componentSourceId: interpretation.componentSourceId,
      strokeCount: interpretation.strokeCount,
    };
  }
  if (interpretation.kind === 'unknown-component') {
    return {
      ...base,
      kind: 'unknown-component',
      glyph: null,
      componentSourceId: interpretation.componentSourceId,
    };
  }
  if (interpretation.kind === 'source-entity') {
    return { ...base, kind: 'source-entity', glyph: null, entity: interpretation.entity };
  }
  return { ...base, kind: 'glyph', glyph: interpretation.glyph };
}

export function normalizeIdsExpression(
  rawSource: string,
  options: NormalizeIdsOptions,
): NormalizedCharacterDecomposition {
  const ast = parseIdsExpression(rawSource, options);
  return {
    character: options.character,
    locale: options.locale,
    rawSource,
    dialect: options.dialect,
    adapterId: options.operandAdapter.id,
    source: options.source,
    tree: normalizeNode(ast, options, [], rawSource),
  };
}

