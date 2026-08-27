import type { RuntimeVisibleChild } from '../../../character-decomposition/runtimeLoader';
import { canExpandRuntimeChild } from '../../hooks/useRuntimeDecompositionTree';

export interface RuntimeChildPresentation {
  title: string;
  subtitle?: string;
  pinyin?: string;
  meaning?: string;
  tone: 'glyph' | 'unencoded' | 'unknown' | 'entity';
  canExpand: boolean;
  navigable: boolean;
}

export function usesShapeFallback(presentation: RuntimeChildPresentation): boolean {
  return presentation.tone !== 'glyph';
}

export function presentRuntimeChild(
  child: RuntimeVisibleChild,
  metadata?: { pinyin?: string; meaning?: string },
): RuntimeChildPresentation {
  if (child.kind === 'glyph') {
    const pinyin = metadata?.pinyin?.trim();
    const meaning = metadata?.meaning?.trim();
    return {
      title: child.glyph ?? child.key.slice(2),
      subtitle: child.expansion === 'leaf'
        ? undefined
        : child.expansion === 'missing'
          ? 'No decomposition available'
          : child.expansion === 'error'
            ? 'Could not load decomposition'
            : undefined,
      ...(pinyin ? { pinyin } : {}),
      ...(meaning ? { meaning } : {}),
      tone: 'glyph',
      canExpand: canExpandRuntimeChild(child),
      navigable: true,
    };
  }

  if (child.kind === 'unencoded-component') {
    return {
      title: 'Unencoded part',
      subtitle: child.strokeCount
        ? `${child.strokeCount} stroke${child.strokeCount === 1 ? '' : 's'}`
        : undefined,
      tone: 'unencoded',
      canExpand: false,
      navigable: false,
    };
  }

  if (child.kind === 'unknown-component') {
    return {
      title: 'Unknown part',
      subtitle: undefined,
      tone: 'unknown',
      canExpand: false,
      navigable: false,
    };
  }

  return {
    title: 'Source-only part',
    subtitle: undefined,
    tone: 'entity',
    canExpand: false,
    navigable: false,
  };
}
