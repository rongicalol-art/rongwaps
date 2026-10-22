import { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { PracticeLine, SlotBuildItem } from '../../../types/models';
import { checkSlotBuild, practiceSlots, slotBuildResult } from '../../../utils/grammar/grammarPracticeCheck';
import { InlineBlank, type BlankState } from '../components/InlineBlank';
import { BUBBLE_TAIL, PracticeBubble } from '../components/PracticeBubble';
import { PracticeCharacterPrompt } from '../components/PracticeCharacterPrompt';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeScene } from '../components/PracticeScene';
import { sceneFirstPicture } from '../components/PictureScene';
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
  /** Place-the-words: the dock word waiting to be dropped into a gap. */
  const [picked, setPicked] = useState<number | null>(null);
  const nextSlot = gaps ? undefined : slots.find((slot) => placed[slot.id] === undefined);
  /** Words that belong somewhere in the sentence (the rest are wrong words). */
  const gapsToFill = item.tiles.filter((tile) => slots.some((slot) => slot.answers.includes(tile.traditional))).length;
  // Check is offered as soon as one word is placed; an unfinished answer is "not yet", never right.
  const ready = Object.keys(placed).length > 0;
  const unfinished = gaps && Object.keys(placed).length < gapsToFill;
  const used = new Set(Object.values(placed));
  const bank = item.tiles.map((_, index) => index).filter((index) => !used.has(index));
  const tileText = (index: number) => item.tiles[index].traditional;
  const isRight = (slotId: string) => slots.find((slot) => slot.id === slotId)?.answers.includes(tileText(placed[slotId])) ?? false;
  const layoutId = (tile: number) => (byHand.has(tile) ? undefined : `${item.id}-tile-${tile}`);

  useEffect(() => onReadyChange(ready && !locked), [locked, onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready && !locked
      ? () => {
        if (unfinished) {
          onResult({ correct: false, title: 'Not finished yet', note: 'Place every word first, then check.' });
          return;
        }
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
    setPicked(null);
    setPlaced((previous) => Object.fromEntries(Object.entries(previous).filter(([slotId, tile]) =>
      slots.find((slot) => slot.id === slotId)?.answers.includes(item.tiles[tile].traditional))));
  }, [item.tiles, retryKey, slots]);

  const place = (tile: number) => {
    if (locked || !nextSlot || used.has(tile)) return;
    setPlaced((previous) => ({ ...previous, [nextSlot.id]: tile }));
  };
  /** Place-the-words: the picked word (else the first in the dock) goes to the tapped gap; a word already there goes back. */
  const putInGap = (slotId: string) => {
    if (locked) return;
    const tile = picked !== null && !used.has(picked) ? picked : bank[0] ?? (item.tiles.length === 1 ? 0 : undefined);
    if (tile === undefined) return;
    setPlaced((previous) => {
      const next = Object.fromEntries(Object.entries(previous).filter(([, other]) => other !== tile));
      next[slotId] = tile;
      return next;
    });
    setPicked(null);
  };
  /** Tapping a dock word in a place-the-words item picks it (tap again to put it down). */
  const pick = (tile: number) => {
    if (!locked) setPicked((current) => (current === tile ? null : tile));
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
    setPicked(null);
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
  useNumberKeySelection({ items: bank, onSelect: gaps ? pick : place, disabled: locked || shortcutsDisabled });

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
        selectLabel={gaps ? `Put ${textIn(item.tiles[picked !== null && !used.has(picked) ? picked : bank[0] ?? 0], script)} here` : undefined}
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

  const sceneFirst = item.scene?.type === 'picture' && Boolean(sceneFirstPicture(item.scene));
  const dialogue = item.lines.some((line) => line.speaker);
  /** The friend's messages before your first reply: the character says them. */
  const leading = item.lines.slice(0, Math.max(0, item.lines.findIndex((line) => line.me)));
  // The gloss rides under the line that holds the glossed word (else under the last line before the reply).
  const glossed = item.glossary?.[0]?.traditional;
  const glossIndex = glossed === undefined
    ? -1
    : item.lines.findIndex((line) => line.segments.some((segment) => segment.type === 'text' && segment.traditional.includes(glossed)));
  const glossLine = glossIndex >= 0 ? glossIndex : item.lines.findLastIndex((line) => !line.me);
  const gloss = item.glossary?.map((entry) => `${textIn(entry, script)} ${entry.pinyin} · ${entry.english}`) ?? [];

  const sceneNode = item.scene ? (
    <PracticeScene
      scene={item.scene}
      arrived={status === 'correct'}
      renderChinese={(text) => <ContextualChineseText text={textIn(text, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />}
    />
  ) : null;
  // In a dialogue the character holds the picture up beside her message, instead of it taking its own row above.
  const sceneBeside = Boolean(sceneNode) && !sceneFirst && dialogue && leading.length > 0;

  return (
    <LayoutGroup id={`slot-build-${item.id}`}>
      <div className={sceneFirst ? "flex flex-col gap-5" : "flex flex-col gap-7"}>
        {!dialogue && <PracticePrompt sub={item.sub} />}
        {!sceneBeside && sceneNode}
        {sceneFirst ? item.lines.map((line, index) => (
          <Fragment key={index}>
            <div className="flex flex-col items-center gap-1">
              <p className="text-center font-chinese text-2xl leading-[1.7] text-ui-ink-strong sm:text-3xl">{renderLine(line, 'plain')}</p>
              {index === glossLine && gloss.map((note) => <p key={note} className="text-sm font-extrabold text-ui-muted-strong">{note}</p>)}
            </div>
          </Fragment>
        )) : dialogue ? (
          <div className="flex flex-col gap-3">
            {leading.length > 0 && (
              <PracticeCharacterPrompt status={status} waiting={ready}>
                <div className="flex flex-col items-start gap-2">
                  {sceneBeside && <div className="mb-1 self-stretch">{sceneNode}</div>}
                  {leading.map((line, index) => (
                    <PracticeBubble key={index} side="them" className={index === 0 ? BUBBLE_TAIL : undefined} notes={index === glossLine ? gloss : []}>
                      {renderLine(line, 'plain')}
                    </PracticeBubble>
                  ))}
                </div>
              </PracticeCharacterPrompt>
            )}
            {item.lines.slice(leading.length).map((line, offset) => {
              const index = leading.length + offset;
              return (
                <Fragment key={index}>
                  {line.me && index > 0 && <span className="h-2" aria-hidden="true" />}
                  <PracticeBubble side={line.me ? 'me' : 'them'} notes={index === glossLine ? gloss : []}>
                    {renderLine(line, line.me ? 'onPrimary' : 'plain')}
                  </PracticeBubble>
                </Fragment>
              );
            })}
          </div>
        ) : (
          item.lines.map((line, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <p className="text-center font-chinese text-3xl leading-[1.7] text-ui-ink-strong sm:text-4xl">{renderLine(line, 'plain')}</p>
              {index === glossLine && gloss.map((note) => <p key={note} className="text-sm font-extrabold text-ui-muted-strong">{note}</p>)}
            </div>
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
            selected={gaps && picked === tile}
            onClick={() => (gaps ? (bank.length > 1 ? pick(tile) : undefined) : place(tile))}
          />
        )),
        trayHost,
      )}
      <TileGhost drag={drag} />
    </LayoutGroup>
  );
}
