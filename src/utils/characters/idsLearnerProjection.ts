import type {
  DecompositionRecordTarget,
  GlyphRenderStatus,
  LearnerCardNode,
  LearnerCharacterDecomposition,
  LearnerDecompositionNode,
  LearnerGlyphNode,
  NormalizedCharacterDecomposition,
  NormalizedDecompositionNode,
  ResolvedCharacterDecomposition,
  ResolvedDecompositionNode,
} from '../../types/decomposition';

export function getDecompositionLookupKey(locale: string, character: string): string {
  return `${locale}:${character}`;
}

export function resolveExplorableCharacterTree(
  sourceRecord: NormalizedCharacterDecomposition,
  records: ReadonlyMap<string, DecompositionRecordTarget>,
): ResolvedCharacterDecomposition {
  function resolveNode(node: NormalizedDecompositionNode): ResolvedDecompositionNode {
    const children = node.children.map(resolveNode);
    if (node.kind !== 'glyph') return { sourceNode: node, children };

    if (node.glyph === sourceRecord.character) {
      return { sourceNode: node, expansion: { kind: 'self-reference-suppressed' }, children };
    }

    const target = records.get(getDecompositionLookupKey(sourceRecord.locale, node.glyph));
    return {
      sourceNode: node,
      expansion: target ? { kind: 'expandable', target } : { kind: 'leaf' },
      children,
    };
  }

  return { sourceRecord, tree: resolveNode(sourceRecord.tree) };
}

export interface LearnerProjectionOptions {
  getGlyphRenderStatus?: (glyph: string, nodeId: string) => GlyphRenderStatus;
}

function projectNode(
  node: ResolvedDecompositionNode,
  options: LearnerProjectionOptions,
): LearnerDecompositionNode {
  const sourceNode = node.sourceNode;
  const children = node.children.map((child) => projectNode(child, options));
  if (sourceNode.kind === 'structure') {
    return {
      id: sourceNode.id,
      kind: 'structure',
      presentation: 'layout-only',
      operator: sourceNode.operator,
      children,
    };
  }
  if (sourceNode.kind === 'unencoded-component') {
    return {
      id: sourceNode.id,
      kind: 'unencoded-component',
      presentation: 'card',
      glyph: null,
      label: 'No glyph',
      componentSourceId: sourceNode.componentSourceId,
      children,
    };
  }
  if (sourceNode.kind === 'unknown-component') {
    return {
      id: sourceNode.id,
      kind: 'unknown-component',
      presentation: 'card',
      glyph: null,
      label: 'Unknown component',
      children,
    };
  }
  if (sourceNode.kind === 'source-entity') {
    return {
      id: sourceNode.id,
      kind: 'source-entity',
      presentation: 'card',
      glyph: null,
      label: 'Unresolved source component',
      entity: sourceNode.entity,
      children,
    };
  }
  return {
    id: sourceNode.id,
    kind: 'glyph',
    presentation: 'card',
    glyph: sourceNode.glyph,
    label: sourceNode.glyph,
    renderStatus: options.getGlyphRenderStatus?.(sourceNode.glyph, sourceNode.id) ?? 'unchecked',
    expansion: node.expansion ?? { kind: 'leaf' },
    children,
  };
}

export function projectLearnerDecomposition(
  decomposition: ResolvedCharacterDecomposition,
  options: LearnerProjectionOptions = {},
): LearnerCharacterDecomposition {
  const sourceTreeIsAtomicSelf = decomposition.tree.sourceNode.kind === 'glyph'
    && decomposition.tree.sourceNode.glyph === decomposition.sourceRecord.character
    && decomposition.tree.expansion?.kind === 'self-reference-suppressed';
  const root: LearnerGlyphNode = {
    id: `character:${decomposition.sourceRecord.locale}:${decomposition.sourceRecord.character}`,
    kind: 'glyph',
    presentation: 'card',
    glyph: decomposition.sourceRecord.character,
    label: decomposition.sourceRecord.character,
    renderStatus: options.getGlyphRenderStatus?.(
      decomposition.sourceRecord.character,
      decomposition.tree.sourceNode.id,
    ) ?? 'unchecked',
    expansion: { kind: 'leaf' },
    children: sourceTreeIsAtomicSelf ? [] : [projectNode(decomposition.tree, options)],
  };
  return { root };
}

/** Returns only the next card layer, traversing any number of layout-only nodes. */
export function getVisibleCardChildren(node: LearnerDecompositionNode): LearnerCardNode[] {
  return node.children.flatMap((child): LearnerCardNode[] => (
    child.presentation === 'card' ? [child] : getVisibleCardChildren(child)
  ));
}

export function collectLearnerCards(node: LearnerDecompositionNode): LearnerCardNode[] {
  const descendants = node.children.flatMap(collectLearnerCards);
  return node.presentation === 'card' ? [node, ...descendants] : descendants;
}
