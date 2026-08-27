import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { AppIcon, SectionEyebrow, Skeleton } from '../../../../lib/widgets';
import { numberToToneMarks } from '../../../../utils/pinyin';
import type { RuntimeVisibleChild } from '../../../character-decomposition/runtimeLoader';
import { useRuntimeCharacterMetadata, type RuntimeCharacterMetadata } from '../../hooks/useRuntimeCharacterMetadata';
import { useRuntimeDecompositionTree, type RuntimeTreeNodeState } from '../../hooks/useRuntimeDecompositionTree';
import { getMultipleBreakdowns } from '../../../../services/breakdownService';
import { CharacterGlyph } from '../breakdown/CharacterGlyph';
import { presentRuntimeChild, usesShapeFallback, type RuntimeChildPresentation } from './runtimeTreeView';

const MAX_UI_TREE_DEPTH = 8;
type RuntimeTreeMode = 'summary' | 'tree';

interface BranchProps {
  children: RuntimeVisibleChild[];
  nodes: Record<string, RuntimeTreeNodeState>;
  expanded: ReadonlySet<string>;
  metadata: ReadonlyMap<string, RuntimeCharacterMetadata>;
  ancestry: string[];
  depth: number;
  reduceMotion: boolean;
  onToggle: (character: string) => void;
  onRetry: (character: string) => void;
  onGlyphClick?: (character: string) => void;
  onGlyphIntent?: (character: string) => void;
  mode: RuntimeTreeMode;
}

function groupClasses(mode: RuntimeTreeMode, childCount: number, depth: number): string {
  return mode === 'summary'
    ? depth === 0
      ? `grid w-full min-w-0 items-start gap-3 ${childCount === 1 ? 'grid-cols-1' : 'grid-cols-2'}`
      : 'flex min-w-0 flex-col gap-2 pl-3'
    : 'flex min-w-0 flex-row items-start justify-center gap-4 overflow-x-auto px-1 pb-2';
}

function toneClasses(presentation: RuntimeChildPresentation, mode: RuntimeTreeMode): string {
  if (mode === 'summary') return 'bg-ui-surface hover:bg-ui-surface-hover';
  if (presentation.tone === 'unencoded') return 'border-feedback-warning/40 bg-feedback-warning/10';
  if (presentation.tone === 'unknown' || presentation.tone === 'entity') return 'border-ui-divider/80 bg-ui-canvas/65';
  return 'border-ui-border bg-ui-surface hover:border-brand-primary/55 hover:bg-ui-surface-hover';
}

function RuntimeBranch({ children, ...props }: BranchProps) {
  return (
    <div className={groupClasses(props.mode, children.length, props.depth)}>
      {children.map((child, index) => (
        <RuntimeTreeNode
          key={`${child.key}-${index}`}
          child={child}
          nodeId={`${props.ancestry.join('-')}-${child.key}-${props.depth}-${index}`.replace(/[^a-z0-9-]+/giu, '-')}
          {...props}
        />
      ))}
    </div>
  );
}

function NodeMessage({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'danger' }) {
  return <p role={tone === 'danger' ? 'alert' : undefined} className={`py-2 text-xs font-bold ${tone === 'danger' ? 'text-feedback-danger' : 'text-ui-muted'}`}>{children}</p>;
}

function RuntimeTreeNode({ child, nodes, expanded, metadata, ancestry, depth, reduceMotion, onToggle, onRetry, onGlyphClick, onGlyphIntent, mode, nodeId }: Omit<BranchProps, 'children'> & { child: RuntimeVisibleChild; nodeId: string }) {
  const target = child.glyph;
  const presentation = presentRuntimeChild(child, target ? metadata.get(target) : undefined);
  const nodeState = target ? nodes[target] : undefined;
  const isExpanded = Boolean(target && expanded.has(target));
  const cycleBlocked = Boolean(target && ancestry.includes(target));
  const depthBlocked = depth >= MAX_UI_TREE_DEPTH;
  const canExpand = presentation.canExpand && !cycleBlocked && !depthBlocked;
  const regionId = target ? `runtime-decomposition-${nodeId}` : undefined;
  const result = nodeState?.result;
  const useShapeMark = usesShapeFallback(presentation);
  const treeWidthClass = isExpanded
    ? 'min-w-[300px] max-w-[420px] flex-[2] basis-0 sm:min-w-[360px]'
    : depth > 0
      ? 'min-w-[128px] max-w-[220px] flex-1 basis-0 sm:min-w-[150px]'
      : 'min-w-[140px] max-w-[240px] flex-1 basis-0 sm:min-w-[168px]';
  const summaryCardClass = depth > 0
    ? 'flex min-h-[64px] items-center rounded-compact px-3 py-2 shadow-[0_2px_0_var(--color-ui-divider)] active:translate-y-px active:shadow-[0_1px_0_var(--color-ui-divider)]'
    : 'flex min-h-[74px] items-center px-3.5 py-2.5 shadow-[0_3px_0_var(--color-ui-divider)] active:translate-y-[1px] active:shadow-[0_2px_0_var(--color-ui-divider)]';

  return (
    <div className={`relative ${mode === 'summary' ? 'min-w-0' : treeWidthClass}`}>
      <article className={`relative rounded-control transition-[background-color,transform,box-shadow] ${mode === 'summary' ? `${summaryCardClass} ${isExpanded ? 'ring-2 ring-brand-primary/20' : ''}` : 'border-2'} ${presentation.navigable ? `${mode === 'tree' ? 'min-h-[104px] px-4 py-3 shadow-[0_var(--depth-compact)_0_var(--color-ui-divider)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-ui-divider)]' : ''} ${toneClasses(presentation, mode)}` : mode === 'summary' ? 'bg-ui-surface/65' : 'min-h-[76px] border-dashed border-ui-border bg-ui-surface/70 px-3 py-3'}`}>
        {presentation.navigable && target ? (
          <>
            <button type="button" onPointerEnter={() => onGlyphIntent?.(target)} onFocus={() => onGlyphIntent?.(target)} onClick={() => onGlyphClick?.(target)} aria-label={`Open breakdown for ${target}`} className="absolute inset-0 z-0 rounded-control outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25" />
            {mode === 'summary' ? (
              <div className={`pointer-events-none relative z-[1] flex h-full min-w-0 max-w-full items-center gap-3 text-left ${canExpand ? 'pr-8' : ''}`}>
                {useShapeMark ? (
                  <>
                    <span className={`flex shrink-0 items-center justify-center text-ui-muted-strong ${depth > 0 ? 'w-10' : 'w-11'}`}><AppIcon name="breakdown" size={22} /></span>
                    <span className="text-xs font-extrabold text-ui-muted-strong">Shape</span>
                  </>
                ) : (
                  <>
                    <CharacterGlyph character={presentation.title} className={`flex shrink-0 items-center justify-center leading-none text-ui-ink-strong ${depth > 0 ? 'w-10 text-[30px]' : 'w-11 text-[34px]'}`} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {presentation.pinyin && <span className="truncate text-xs font-extrabold leading-tight text-brand-primary">{numberToToneMarks(presentation.pinyin)}</span>}
                      {presentation.meaning ? <span className="line-clamp-2 text-[11px] font-bold leading-snug text-ui-muted">{presentation.meaning}</span> : <span className="text-[11px] font-bold leading-snug text-ui-muted">No meaning recorded</span>}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className={`pointer-events-none relative z-[1] flex h-full min-w-0 max-w-full flex-col justify-center text-left ${canExpand ? 'pr-7' : ''}`}>
                {useShapeMark ? <span className="flex items-center gap-2 text-ui-muted-strong"><AppIcon name="breakdown" size={depth > 0 ? 21 : 25} /><span className="text-xs font-extrabold">Shape</span></span> : <CharacterGlyph character={presentation.title} className={`leading-none text-ui-ink-strong ${depth > 0 ? 'text-[34px]' : 'text-[40px]'}`} />}
                {presentation.pinyin || presentation.meaning ? <span className="mt-1 flex min-w-0 items-baseline gap-1.5">
                {presentation.pinyin && <span className="shrink-0 text-[11px] font-extrabold text-brand-primary">{numberToToneMarks(presentation.pinyin)}</span>}
                {presentation.meaning && <span className="truncate text-[11px] font-bold text-ui-muted">{presentation.meaning}</span>}
                </span> : <span className="mt-1 text-[11px] font-bold text-ui-muted">No meaning recorded</span>}
              </div>
            )}
          </>
        ) : mode === 'summary' ? (
          <div className="pointer-events-none relative z-[1] flex h-full min-w-0 max-w-full items-center gap-3 text-left">
            <span className={`flex shrink-0 items-center justify-center text-ui-muted-strong ${depth > 0 ? 'w-10' : 'w-11'}`}><AppIcon name="breakdown" size={22} /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[11px] font-bold leading-snug text-ui-muted">No glyph for this</span>
            </span>
          </div>
        ) : (
          <div className="pointer-events-none relative z-[1] flex h-full min-w-0 max-w-full flex-col justify-center text-left">
            <span className="flex items-center justify-start text-ui-muted-strong"><AppIcon name="breakdown" size={22} /></span>
            <span className="mt-1 text-[11px] font-bold text-ui-muted">No glyph for this</span>
          </div>
        )}
        {canExpand && target && <button type="button" aria-expanded={isExpanded} aria-controls={regionId} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${target}`} onPointerEnter={() => onGlyphIntent?.(target)} onFocus={() => onGlyphIntent?.(target)} onClick={() => onToggle(target)} className={`absolute right-1.5 top-1.5 z-10 flex h-9 w-9 items-center justify-center text-ui-muted outline-none transition-[color,transform] hover:text-brand-primary focus-visible:rounded-compact focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${isExpanded ? 'rotate-180 text-brand-primary' : ''}`}><AppIcon name="expand" size={16} /></button>}
      </article>
      <AnimatePresence initial={false}>
        {isExpanded && target && <motion.div id={regionId} role="region" aria-label={`Decomposition of ${target}`} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }} transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }} className={mode === 'summary' ? 'mt-2 overflow-hidden' : 'mt-4 overflow-hidden rounded-control border border-ui-divider bg-ui-canvas/70 p-3 sm:p-4'}>
          {nodeState?.status === 'loading' && <div className="flex items-center gap-2 py-2 text-[11px] font-bold text-ui-muted" role="status"><Skeleton className="h-3 w-12" /> Loading</div>}
          {nodeState?.status === 'error' && <NodeMessage tone="danger">Could not load. <button type="button" onClick={() => onRetry(target)} className="underline underline-offset-2">Retry</button></NodeMessage>}
          {nodeState?.status === 'missing' && <NodeMessage>No decomposition available.</NodeMessage>}
          {nodeState?.status === 'found' && result && result.children.length > 0 && <RuntimeBranch children={result.children} nodes={nodes} expanded={expanded} metadata={metadata} ancestry={[...ancestry, target]} depth={depth + 1} reduceMotion={reduceMotion} onToggle={onToggle} onRetry={onRetry} onGlyphClick={onGlyphClick} onGlyphIntent={onGlyphIntent} mode={mode} />}
          {nodeState?.status === 'found' && result?.children.length === 0 && <NodeMessage>No visible components.</NodeMessage>}
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

function RootState({ state, retry, character }: { state: RuntimeTreeNodeState; retry: () => void; character: string }) {
  if (state.status === 'loading') return <div className="grid grid-cols-2 gap-3" role="status" aria-label="Loading character structure"><Skeleton className="h-[74px] rounded-compact" /><Skeleton className="h-[74px] rounded-compact" /></div>;
  if (state.status === 'error') return <NodeMessage tone="danger">Could not load this breakdown. <button type="button" onClick={retry} className="underline underline-offset-2">Retry</button></NodeMessage>;
  if (state.status === 'missing') return <NodeMessage>No decomposition available for {character}.</NodeMessage>;
  if (state.status === 'leaf') return <NodeMessage>{character} is already a basic component.</NodeMessage>;
  if (state.result?.children.length === 0) return <NodeMessage>No visible components.</NodeMessage>;
  return null;
}

export function V3RuntimeTree({ character, onGlyphClick, mode = 'summary', onSeeTree, showHeading = true }: { character: string; onGlyphClick?: (character: string) => void; mode?: RuntimeTreeMode; onSeeTree?: () => void; showHeading?: boolean }) {
  const { service, root, nodes, expanded, toggle, retry } = useRuntimeDecompositionTree(character);
  const metadata = useRuntimeCharacterMetadata(nodes);
  const reduceMotion = Boolean(useReducedMotion());
  const children = root.status === 'found' ? root.result?.children : undefined;
  const prepareGlyph = (target: string) => {
    void service.prefetch([target]);
    void getMultipleBreakdowns([target]);
  };
  return (
    <section aria-labelledby={showHeading ? 'v3-decomposition-heading' : undefined} aria-label={showHeading ? undefined : `Parts of ${character}`} data-testid="v3-decomposition-tree" className="min-w-0">
      {showHeading && <SectionEyebrow
        id="v3-decomposition-heading"
        title="Breakdown"
        className="mb-3"
        action={children && children.length > 0 && onSeeTree ? (
          <button type="button" onClick={onSeeTree} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary outline-none transition-colors hover:bg-brand-primary/10 focus-visible:ring-4 focus-visible:ring-brand-primary/25"><AppIcon name="breakdown" size={16} />See tree</button>
        ) : undefined}
      />}
      <div className="min-w-0">
          {children && children.length > 0 ? <RuntimeBranch children={children} nodes={nodes} expanded={expanded} metadata={metadata} ancestry={[character]} depth={0} reduceMotion={reduceMotion} onToggle={toggle} onRetry={retry} onGlyphClick={onGlyphClick} onGlyphIntent={prepareGlyph} mode={mode} /> : <RootState state={root} retry={() => retry(character)} character={character} />}
      </div>
    </section>
  );
}
