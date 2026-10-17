import { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { PracticeLine, SlotBuildItem } from '../../../types/models';
import { checkSlotBuild, practiceSlots, slotBuildResult } from '../../../utils/grammar/grammarPracticeCheck';
import { InlineBlank, type BlankState } from '../components/InlineBlank';
import { PracticeBubble } from '../components/PracticeBubble';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeScene } from '../components/PracticeScene';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { TileGhost } from '../components/TileGhost';
import { useTileDrag, type DragSource } from '../useTileDrag';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

const LEADING_CLOSING = /^[。？！，」]+/;

/**
 * Fill the blanks from the dock (book pictures, "complete the sentence"). A plain
 * item is one sentence under its picture; an item whose lines have speakers is a
 * chat, with the learner's line (`me`) as the blue bubble.
 */
export function SlotBuildExercise({
  item, script, status, retryKey, contextTokens, onOpenWord, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult,
}: PracticeExerciseProps<SlotBuildItem>) {
  const slots = useMemo(() => practiceSlots(item), [item]);
  /** Slot id → tile index. */
  const [placed, setPlaced] = useState<Record<string, number>>({});
  /** Tiles dropped by hand: they settle in place instead of flying in from the dock. */
  const [byHand, setByHand] = useState<ReadonlySet<number>>(new Set());
  const locked = status !== 'idle';
  const gaps = item.gaps === true;
  const nextSlot = gaps ? undefined : slots.find((slot) => placed[slot.id] === undefined);
  const ready = gaps ? Object.keys(placed).length > 0 : !nextSlot;
  const used = new Set(Object.values(placed));
  const bank = item.tiles.map((_, index) => index).filter((index) => !used.has(index));
  const tileText = (index: number) => item.tiles[index].traditional;
  const isRight = (slotId: string) => slots.find((slot) => slot.id === slotId)?.answers.includes(tileText(placed[slotId])) ?? false;
  const layoutId = (tile: number) => (byHand.has(tile) ? undefined : `${item.id}-tile-${tile}`);

  useEffect(() => onReadyChange(ready && !locked), [locked, onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready && !locked
      ? () => {
        const answer = Object.fromEntries(slots.map((slot) => [slot.id, placed[slot.id] === undefined ? undefined : tileText(placed[slot.id])]));
        const verdict = checkSlotBuild(item, answer);
        onResult(verdict.correct
          ? { correct: true, sentence: slotBuildResult(item, answer), note: verdict.note }
          : { correct: false, title: verdict.title, note: verdict.note });
      }
      : null;
    return () => { checkRef.current = null; };
  });

  // Try again: wrong words go back to the dock, right ones stay.
  useEffect(() => {
    if (retryKey === 0) return;
    setByHand(new Set());
    setPlaced((previous) => Object.fromEntries(Object.entries(previous).filter(([slotId, tile]) =>
      slots.find((slot) => slot.id === slotId)?.answers.includes(item.tiles[tile].traditional))));
  }, [item.tiles, retryKey, slots]);

  const place = (tile: number) => {
    if (locked || !nextSlot || used.has(tile)) return;
    setPlaced((previous) => ({ ...previous, [nextSlot.id]: tile }));
  };
  /** Place-the-word: the one tile moves to the tapped gap. */
  const putInGap = (slotId: string) => {
    if (!locked) setPlaced({ [slotId]: 0 });
  };
  const takeBack = (slotId: string) => {
    if (locked) return;
    const tile = placed[slotId];
    if (tile !== undefined) setByHand((previous) => new Set([...previous].filter((index) => index !== tile)));
    setPlaced((previous) => {
      const next = { ...previous };
      delete next[slotId];
      return next;
    });
  };
  /** A dragged word was let go: onto a spot (place or swap it) or away from the sentence (back to the dock). */
  const handleDrop = (source: DragSource, slotId: string | null) => {
    if (locked) return;
    if (slotId === null) {
      if (source.kind === 'placed') takeBack(source.slotId);
      return;
    }
    setByHand((previous) => new Set(previous).add(source.tile));
    if (gaps) {
      setPlaced({ [slotId]: 0 });
      return;
    }
    setPlaced((previous) => {
      const next = { ...previous };
      const displaced = previous[slotId];
      if (source.kind === 'placed') {
        delete next[source.slotId];
        if (displaced !== undefined) next[source.slotId] = displaced;
      }
      next[slotId] = source.tile;
      return next;
    });
  };
  const { drag, bind } = useTileDrag({ disabled: locked, onDrop: handleDrop });
  useNumberKeySelection({ items: bank, onSelect: place, disabled: locked || shortcutsDisabled });

  const blankState = (slotId: string): BlankState => {
    if (placed[slotId] === undefined) return slotId === nextSlot?.id && !locked ? 'next' : 'empty';
    if (status === 'idle') return 'filled';
    return status === 'correct' || isRight(slotId) ? 'correct' : 'wrong';
  };

  // A closing mark never wraps alone: it stays with the blank or character before it.
  const renderLine = (line: PracticeLine, tone: 'plain' | 'onPrimary') => line.segments.map((segment, index) => {
    const previous = line.segments[index - 1];
    if (segment.type === 'text') {
      const full = textIn(segment, script);
      const text = previous?.type === 'slot' ? full.replace(LEADING_CLOSING, '') : full;
      return text && <ContextualChineseText key={index} text={text} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />;
    }
    const tile = placed[segment.id];
    const next = line.segments[index + 1];
    const closing = next?.type === 'text' ? textIn(next, script).match(LEADING_CLOSING)?.[0] : undefined;
    const blank = (
      <InlineBlank
        key={segment.id}
        tone={tone}
        state={blankState(segment.id)}
        gap={gaps}
        onSelect={gaps && !locked ? () => putInGap(segment.id) : undefined}
        selectLabel={gaps ? `Put ${textIn(item.tiles[0], script)} here` : undefined}
        slotId={segment.id}
        openFor={drag?.over === segment.id ? drag.width : undefined}
        word={tile === undefined ? undefined : {
          text: textIn(item.tiles[tile], script),
          layoutId: layoutId(tile),
          onTakeBack: () => takeBack(segment.id),
          disabled: locked,
          drag: locked ? undefined : bind({ kind: 'placed', tile, slotId: segment.id }, textIn(item.tiles[tile], script)),
          carried: drag?.source.kind === 'placed' && drag.source.slotId === segment.id,
        }}
      />
    );
    return closing ? <span key={segment.id} className="whitespace-nowrap">{blank}{closing}</span> : blank;
  });

  const dialogue = item.lines.some((line) => line.speaker);
  // The book prints its gloss after the question, so it rides under the last line before the reply.
  const glossLine = item.lines.findLastIndex((line) => !line.me);
  const gloss = item.glossary?.map((entry) => `${textIn(entry, script)} ${entry.pinyin} · ${entry.english}`) ?? [];

  return (
    <LayoutGroup id={`slot-build-${item.id}`}>
      <div className="flex flex-col gap-7">
        <PracticePrompt prompt={item.prompt} sub={item.sub} />
        {item.scene && (
          <PracticeScene
            scene={item.scene}
            arrived={status === 'correct'}
            renderChinese={(text) => <ContextualChineseText text={textIn(text, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />}
          />
        )}
        {dialogue ? (
          <div className="flex flex-col gap-3">
            {item.lines.map((line, index) => (
              <Fragment key={index}>
                {line.me && index > 0 && <span className="h-2" aria-hidden="true" />}
                <PracticeBubble side={line.me ? 'me' : 'them'} notes={index === glossLine ? gloss : []}>
                  {renderLine(line, line.me ? 'onPrimary' : 'plain')}
                </PracticeBubble>
              </Fragment>
            ))}
          </div>
        ) : (
          item.lines.map((line, index) => (
            <p key={index} className="text-center font-chinese text-3xl leading-[1.7] text-ui-ink-strong sm:text-4xl">{renderLine(line, 'plain')}</p>
          ))
        )}
      </div>
      {trayHost && createPortal(
        bank.map((tile) => (
          <PracticeTileButton
            key={tile}
            tile={item.tiles[tile]}
            script={script}
            layoutId={layoutId(tile)}
            drag={locked ? undefined : bind({ kind: 'bank', tile }, textIn(item.tiles[tile], script))}
            carried={drag?.source.kind === 'bank' && drag.source.tile === tile}
            disabled={locked}
            onClick={() => (gaps ? undefined : place(tile))}
          />
        )),
        trayHost,
      )}
      <TileGhost drag={drag} />
    </LayoutGroup>
  );
}
