import type { NormalizedDecompositionNode } from '../../types/decomposition';

/**
 * Compact, source-record-local tree representation used by the Phase 4
 * candidate packs. A glyph never contains another character's decomposition;
 * expansion is resolved by character key at load time.
 */
export type RuntimeTreeNode =
  | ['s', string, RuntimeTreeNode[]]
  | ['g', string]
  | ['g', string, RuntimeTreeNode[]]
  | ['u', string]
  | ['u', string, number]
  | ['?', string?]
  | ['e', string];

export type RuntimeComponentKey = string;

export function encodeRuntimeTree(node: NormalizedDecompositionNode): RuntimeTreeNode {
  const children = node.children.map(encodeRuntimeTree);

  if (node.kind === 'structure') return ['s', node.operator, children];
  if (node.kind === 'glyph') {
    return children.length > 0 ? ['g', node.glyph, children] : ['g', node.glyph];
  }
  if (node.kind === 'unencoded-component') {
    return node.strokeCount == null
      ? ['u', node.componentSourceId]
      : ['u', node.componentSourceId, node.strokeCount];
  }
  if (node.kind === 'unknown-component') {
    return node.componentSourceId ? ['?', node.componentSourceId] : ['?'];
  }
  return ['e', node.entity];
}

export function runtimeNodeChildren(node: RuntimeTreeNode): RuntimeTreeNode[] {
  if (node[0] === 's') return node[2];
  if (node[0] === 'g' && node.length === 3) return node[2];
  return [];
}

export function runtimeComponentKey(node: RuntimeTreeNode): RuntimeComponentKey {
  switch (node[0]) {
    case 'g': return `g:${node[1]}`;
    case 'u': return `u:${node[1]}`;
    case '?': return node[1] ? `?:${node[1]}` : '?';
    case 'e': return `e:${node[1]}`;
    case 's': throw new Error('Structure nodes are layout-only and cannot be component keys.');
  }
}

/** Returns only the next learner-visible card layer, traversing structures. */
export function getRuntimeDirectComponentKeys(root: RuntimeTreeNode): RuntimeComponentKey[] {
  return runtimeNodeChildren(root).flatMap((child) => (
    child[0] === 's'
      ? getRuntimeDirectComponentKeys(child)
      : [runtimeComponentKey(child)]
  ));
}

export function walkRuntimeTree(root: RuntimeTreeNode): RuntimeTreeNode[] {
  return [root, ...runtimeNodeChildren(root).flatMap(walkRuntimeTree)];
}
