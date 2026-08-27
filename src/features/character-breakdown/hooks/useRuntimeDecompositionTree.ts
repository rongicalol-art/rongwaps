import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getDecompositionRuntimeService,
  type DecompositionService,
} from '../../character-decomposition/decompositionService';
import type {
  RuntimeDirectChildrenResult,
  RuntimeVisibleChild,
} from '../../character-decomposition/runtimeLoader';

export interface RuntimeTreeNodeState {
  status: RuntimeDirectChildrenResult['status'] | 'idle' | 'loading';
  result?: RuntimeDirectChildrenResult;
  error?: Error;
}

export interface RuntimeDecompositionTreeState {
  service: DecompositionService;
  root: RuntimeTreeNodeState;
  nodes: Record<string, RuntimeTreeNodeState>;
  expanded: ReadonlySet<string>;
  toggle: (character: string) => void;
  retry: (character: string) => void;
}

function loadingState(): RuntimeTreeNodeState {
  return { status: 'loading' };
}

function resultState(result: RuntimeDirectChildrenResult): RuntimeTreeNodeState {
  return {
    status: result.status,
    result,
    error: result.error,
  };
}

export function canExpandRuntimeChild(child: RuntimeVisibleChild): boolean {
  return child.kind === 'glyph' && child.expansion === 'expandable' && Boolean(child.glyph);
}

export function useRuntimeDecompositionTree(character: string): RuntimeDecompositionTreeState {
  const service = useMemo(() => getDecompositionRuntimeService(), []);
  const [nodes, setNodes] = useState<Record<string, RuntimeTreeNodeState>>({});
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const generation = useRef(0);

  const loadNode = useCallback(async (target: string) => {
    if (!target) return;
    const requestGeneration = generation.current;
    setNodes((current) => ({ ...current, [target]: loadingState() }));
    try {
      const result = await service.getDirectVisibleChildren(target);
      if (generation.current !== requestGeneration) return;
      setNodes((current) => ({ ...current, [target]: resultState(result) }));
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      const normalized = error instanceof Error ? error : new Error(String(error));
      setNodes((current) => ({
        ...current,
        [target]: { status: 'error', error: normalized },
      }));
    }
  }, [service]);

  useEffect(() => {
    generation.current += 1;
    setNodes({});
    setExpanded(new Set());
    if (character) void loadNode(character);
  }, [character, loadNode]);

  const toggle = useCallback((target: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      const isOpening = !next.has(target);
      if (isOpening) next.add(target);
      else next.delete(target);
      return next;
    });

    if (!nodes[target]) void loadNode(target);
  }, [loadNode, nodes]);

  const retry = useCallback((target: string) => {
    void loadNode(target);
  }, [loadNode]);

  return {
    service,
    root: nodes[character] ?? { status: character ? 'loading' : 'missing' },
    nodes,
    expanded,
    toggle,
    retry,
  };
}
