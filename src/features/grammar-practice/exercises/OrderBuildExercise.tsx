import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ListenBuildItem, OrderBuildItem } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkOrderBuild } from '../../../utils/grammar/grammarPracticeSequence';
import { PracticeCharacterPrompt } from '../components/PracticeCharacterPrompt';
import { BUBBLE_TAIL, PracticeBubble } from '../components/PracticeBubble';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeScene } from '../components/PracticeScene';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { TileGhost } from '../components/TileGhost';
import { useTileDrag, type DragSource } from '../useTileDrag';
import { WORD_FLIGHT } from '../practiceMotion';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

const END_PUNCTUATION = /[。？！]$/;
const INNER_PUNCTUATION = /^[，、；：]/;

/** Positions (in word order) that the book's sentence follows with a comma, so the line can show it. */
export function commaAfter(sentence: string, order: string[]): Set<number> {
  const found = new Set<number>();
  let at = 0;
  order.forEach((word, position) => {
    const start = sentence.indexOf(word, at);
    if (start < 0) return;
    at = start + word.length;
    if (INNER_PUNCTUATION.test(sentence.slice(at))) found.add(position);
  });
  return found;
}

interface ParsedDialogue {
  type: 'incoming' | 'afterward';
  preface?: string;
  utterance: string;
  gloss?: string;
}

function parseDialogue(sub?: string, prompt?: string): ParsedDialogue | null {
  if (!sub) return null;

  // Check for afterward reply: "B replies afterward: ..." or "Your friend replies next: ..."
  const afterMatch = /^(?:.*?(?:replies afterward|replies next|replies)):\s*(.+)$/i.exec(sub);
  if (afterMatch) {
    return { type: 'afterward', utterance: afterMatch[1].trim() };
  }

  // Explicit "Start the chat" where sub is the friend answering afterward
  if (/^Start the chat/i.test(prompt ?? '')) {
    const zhMatch = /[\u4e00-\u9fa5][\u4e00-\u9fa5A-Za-z0-9\s,，、—…（）()]*[？?。！!]/.exec(sub);
    if (zhMatch) {
      return { type: 'afterward', utterance: zhMatch[0].trim() };
    }
  }

  // Check for Chinese sentence with optional leading English context and trailing gloss
  // Chinese sentence contains Hanzi and ends with Chinese punctuation ？ or 。 or ！ or ?
  const match = /^(.*?)([\u4e00-\u9fa5][\u4e00-\u9fa5A-Za-z0-9\s,，、—…（）()]*[？?。！!])(?:\s*(.*))?$/.exec(sub);
  if (match) {
    // If it's reading numbers e.g. "630,000：六十三萬 5,080", skip
    if (/[0-9]+[，,：:][\u4e00-\u9fa5]+/.test(sub)) return null;
    return {
      type: 'incoming',
      preface: match[1].trim() || undefined,
      utterance: match[2].trim(),
      gloss: match[3]?.trim() || undefined,
    };
  }

  return null;
}

/**
 * Build the sentence: the title says what to say, the words wait beneath the answer, and tapping
 * them lays them into the reply bubble (or on a free line when not a conversation). Tap a
 * placed word to take it back. `listen-build` is the same line with a recording above it
 * (`children`) in place of a picture.
 */
export function OrderBuildExercise({
  item, script, status, retryKey, showPinyin, contextTokens, onOpenWord, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult, children,
}: PracticeExerciseProps<OrderBuildItem | ListenBuildItem> & { children?: ReactNode }) {
  /** Tile indexes on the line, in order. */
  const [line, setLine] = useState<number[]>([]);
  const [byHand, setByHand] = useState<ReadonlySet<number>>(new Set());
  const locked = status !== 'idle';
  const ready = !locked && line.length > 0;
  const bank = item.tiles.map((_, index) => index).filter((index) => !line.includes(index));
  const layoutId = (tile: number) => byHand.has(tile) ? undefined : `${item.id}-tile-${tile}`;
  const order = line.map((tile) => item.tiles[tile].traditional);
  const verdict = checkOrderBuild(item, order);
  const misplaced = status === 'wrong' ? new Set(verdict.positions) : null;
  const dialogue = useMemo(() => parseDialogue(item.sub, item.prompt), [item.sub, item.prompt]);
  const end = textIn(item.accepted[0].sentence, script).match(END_PUNCTUATION)?.[0] ?? '';
  const placeholder = dialogue?.type === 'incoming' ? 'Drag words to reply…' : dialogue?.type === 'afterward' ? 'Drag words to ask…' : 'Drag words to build the sentence…';
  const commas = useMemo(() => commaAfter(item.accepted[0].sentence.traditional, item.accepted[0].order), [item.accepted]);

  useEffect(() => onReadyChange(ready), [onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready
      ? () => {
        onResult(verdict.correct && verdict.answer
          ? { correct: true, sentence: verdict.answer.sentence, note: verdict.note }
          : { correct: false, title: verdict.title, note: verdict.note });
      }
      : null;
    return () => { checkRef.current = null; };
  });

  // Try again: the line empties back into the word bank (the order is the answer, so start it fresh).
  useEffect(() => {
    if (retryKey > 0) { setLine([]); setByHand(new Set()); }
  }, [retryKey]);

  const add = (tile: number) => { if (!locked) setLine((previous) => [...previous, tile]); };
  const remove = (tile: number) => {
    if (locked) return;
    setByHand((previous) => new Set([...previous].filter((index) => index !== tile)));
    setLine((previous) => previous.filter((placed) => placed !== tile));
  };
  const handleDrop = (source: DragSource, target: string | null) => {
    if (locked) return;
    if (target === null) {
      if (source.kind === 'placed') remove(source.tile);
      return;
    }
    setByHand((previous) => new Set(previous).add(source.tile));
    setLine((previous) => {
      const next = previous.filter((tile) => tile !== source.tile);
      const before = target === 'end' ? -1 : next.indexOf(Number(target));
      next.splice(before < 0 ? next.length : before, 0, source.tile);
      return next;
    });
  };
  const { drag, bind } = useTileDrag({ disabled: locked, onDrop: handleDrop });
  useNumberKeySelection({ items: bank, onSelect: add, disabled: locked || shortcutsDisabled });

  const answerLine = (
    <div
      data-drop-slot={line.length === 0 ? 'end' : undefined}
      className={cn(
        'flex min-h-20 w-full flex-wrap items-center gap-x-1.5 border-b-2 py-3 transition-colors',
        status === 'idle' && 'border-ui-divider',
        status === 'correct' && 'border-feedback-success',
        status === 'wrong' && 'border-feedback-danger',
        drag?.over === 'end' && 'border-brand-primary bg-brand-primary-soft',
      )}
    >
      {line.length === 0 && <span className="text-base font-extrabold text-ui-muted-strong/60">{placeholder}</span>}
      {line.map((tile, position) => (
        <Fragment key={tile}>
        <motion.button
          type="button"
          layout="position"
          layoutId={layoutId(tile)}
          transition={WORD_FLIGHT}
          data-drop-slot={String(tile)}
          {...(locked ? undefined : bind({ kind: 'placed', tile, slotId: String(tile) }, textIn(item.tiles[tile], script)))}
          disabled={locked}
          onClick={() => remove(tile)}
          aria-label={`Take back ${textIn(item.tiles[tile], script)}`}
          className={cn(
            'flex select-none flex-col items-center rounded-xs px-1.5 py-0.5 text-brand-primary-deep focus-ring-inline enabled:hover:opacity-75',
            status === 'correct' && 'text-feedback-success-edge',
            misplaced?.has(position) && 'text-feedback-danger-edge',
            drag?.source.kind === 'placed' && drag.source.tile === tile && 'opacity-30',
            drag?.over === String(tile) && 'border-l-2 border-brand-primary bg-brand-primary-soft',
          )}
        >
          <span className="font-chinese text-2xl leading-[1.3] sm:text-3xl">{textIn(item.tiles[tile], script)}</span>
          {showPinyin && <span className="text-xs font-extrabold text-ui-muted-strong">{item.tiles[tile].pinyin}</span>}
        </motion.button>
        {commas.has(position) && (
          <span className={cn('-ml-1.5 py-0.5 font-chinese text-2xl leading-[1.3] sm:text-3xl', status === 'correct' ? 'text-feedback-success-edge' : 'text-brand-primary-deep')} aria-hidden="true">，</span>
        )}
        </Fragment>
      ))}
      {end && (
        <span className={cn('-ml-1.5 py-0.5 font-chinese text-2xl leading-[1.3] sm:text-3xl', status === 'correct' ? 'text-feedback-success-edge' : 'text-brand-primary-deep')} aria-hidden="true">{end}</span>
      )}
      {line.length > 0 && <span data-drop-slot="end" aria-hidden="true" className="min-h-10 w-10 shrink-0" />}
    </div>
  );

  const scene = item.kind === 'order-build' && item.scene ? (
    <PracticeScene
      scene={item.scene}
      arrived={status === 'correct'}
      renderChinese={(text) => (
        <ContextualChineseText text={textIn(text, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />
      )}
    />
  ) : null;
  const incoming = dialogue?.type === 'incoming' ? (
    <div className="flex min-w-0 flex-col gap-2 text-center">
      <div className="font-chinese text-2xl leading-relaxed text-ui-ink-strong sm:text-3xl">
        <ContextualChineseText text={dialogue.utterance} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />
      </div>
      <PracticePrompt sub={dialogue.gloss} />
    </div>
  ) : null;

  // The reply that came back is the prompt: read it, then ask what would get that answer.
  const reply = dialogue?.type === 'afterward' ? (
    <PracticeBubble className={BUBBLE_TAIL} side="them">
      <ContextualChineseText text={dialogue.utterance} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />
    </PracticeBubble>
  ) : null;

  return (
    <LayoutGroup id={`order-${item.id}`}>
      {dialogue ? (
        <div className="flex flex-col gap-4">
          {dialogue.preface && <PracticePrompt sub={dialogue.preface} />}
          {children}
          {scene ? incoming ? (
            <div className="flex flex-col items-center gap-3">
              {scene}
              {incoming}
            </div>
          ) : scene : incoming && (
            <PracticeCharacterPrompt status={status} waiting={line.length > 0}>
              <PracticeBubble className={BUBBLE_TAIL} side="them" notes={dialogue.gloss ? [dialogue.gloss] : []}>
                <ContextualChineseText text={dialogue.utterance} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />
              </PracticeBubble>
            </PracticeCharacterPrompt>
          )}

          {reply && (scene ? reply : <PracticeCharacterPrompt status={status} waiting={line.length > 0}>{reply}</PracticeCharacterPrompt>)}

          {answerLine}
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {!children && item.kind === 'order-build' && !item.scene ? (
            <PracticeCharacterPrompt status={status} waiting={line.length > 0}>
              <p className={cn(BUBBLE_TAIL, 'border-2 border-ui-divider bg-ui-surface px-5 py-3.5 text-lg font-extrabold text-ui-ink sm:text-xl')}>{item.sub ?? item.prompt}</p>
            </PracticeCharacterPrompt>
          ) : <PracticePrompt sub={item.sub} />}
          {children}
          {scene}
          {answerLine}
        </div>
      )}
      {trayHost && createPortal(
        bank.map((tile) => (
          <PracticeTileButton key={tile} tile={item.tiles[tile]} script={script} layoutId={layoutId(tile)}
            drag={locked ? undefined : bind({ kind: 'bank', tile }, textIn(item.tiles[tile], script))}
            carried={drag?.source.kind === 'bank' && drag.source.tile === tile}
            disabled={locked} onClick={() => add(tile)} />
        )),
        trayHost,
      )}
      <TileGhost drag={drag} />
    </LayoutGroup>
  );
}
