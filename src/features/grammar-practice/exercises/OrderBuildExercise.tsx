import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ListenBuildItem, OrderBuildItem } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkOrderBuild } from '../../../utils/grammar/grammarPracticeSequence';
import { PracticeBubble } from '../components/PracticeBubble';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeScene } from '../components/PracticeScene';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { WORD_FLIGHT } from '../practiceMotion';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

const END_PUNCTUATION = /[。？！]$/;

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
 * Build the sentence: the title says what to say, the words wait in the dock, and tapping
 * them lays them into the reply bubble (or on a free line when not a conversation). Tap a
 * placed word to take it back. `listen-build` is the same line with a recording above it
 * (`children`) in place of a picture.
 */
export function OrderBuildExercise({
  item, script, status, retryKey, showPinyin, contextTokens, onOpenWord, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult, children,
}: PracticeExerciseProps<OrderBuildItem | ListenBuildItem> & { children?: ReactNode }) {
  /** Tile indexes on the line, in order. */
  const [line, setLine] = useState<number[]>([]);
  const locked = status !== 'idle';
  const ready = !locked && line.length > 0;
  const bank = item.tiles.map((_, index) => index).filter((index) => !line.includes(index));
  const layoutId = (tile: number) => `${item.id}-tile-${tile}`;
  const order = line.map((tile) => item.tiles[tile].traditional);
  const verdict = checkOrderBuild(item, order);
  const misplaced = status === 'wrong' ? new Set(verdict.positions) : null;
  const dialogue = useMemo(() => parseDialogue(item.sub, item.prompt), [item.sub, item.prompt]);
  const end = textIn(item.accepted[0].sentence, script).match(END_PUNCTUATION)?.[0] ?? '';
  const placeholder = dialogue?.type === 'incoming' ? 'Tap words to reply…' : 'Tap words to send…';

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

  // Try again: the line empties back into the dock (the order is the answer, so start it fresh).
  useEffect(() => {
    if (retryKey > 0) setLine([]);
  }, [retryKey]);

  const add = (tile: number) => { if (!locked) setLine((previous) => [...previous, tile]); };
  const remove = (tile: number) => { if (!locked) setLine((previous) => previous.filter((placed) => placed !== tile)); };
  useNumberKeySelection({ items: bank, onSelect: add, disabled: locked || shortcutsDisabled });

  return (
    <LayoutGroup id={`order-${item.id}`}>
      {dialogue ? (
        <div className="flex flex-col gap-4">
          {dialogue.preface && <PracticePrompt sub={dialogue.preface} />}
          {children}
          {item.kind === 'order-build' && item.scene && (
            <PracticeScene
              scene={item.scene}
              arrived={status === 'correct'}
              renderChinese={(text) => (
                <ContextualChineseText
                  text={textIn(text, script)}
                  tokens={contextTokens}
                  characterPreference={script}
                  onOpenWord={onOpenWord}
                />
              )}
            />
          )}

          {dialogue.type === 'incoming' && (
            <PracticeBubble side="them" notes={dialogue.gloss ? [dialogue.gloss] : []}>
              <ContextualChineseText
                text={dialogue.utterance}
                tokens={contextTokens}
                characterPreference={script}
                onOpenWord={onOpenWord}
              />
            </PracticeBubble>
          )}

          <span className="h-1" aria-hidden="true" />

          {/* Learner's reply bubble */}
          {line.length === 0 ? (
            <div
              className={cn(
                'flex min-h-14 min-w-36 max-w-[88%] self-end items-center gap-2 rounded-feature rounded-br-xs px-5 py-3.5 border-2 border-dashed border-brand-primary-soft-edge bg-ui-surface text-ui-muted transition-colors',
              )}
            >
              <span className="inline-block h-4 w-0.5 animate-pulse bg-brand-primary" aria-hidden="true" />
              <span className="text-sm font-bold text-ui-muted">{placeholder}</span>
            </div>
          ) : (
            <div
              className={cn(
                'flex min-h-14 max-w-[88%] self-end flex-wrap items-center gap-1.5 rounded-feature rounded-br-xs px-5 py-3.5 transition-colors shadow-xs',
                status === 'idle' && 'bg-brand-primary text-brand-on-primary',
                status === 'correct' && 'bg-feedback-success text-brand-on-primary',
                status === 'wrong' && 'bg-feedback-danger text-brand-on-primary',
              )}
            >
              {line.map((tile, position) => (
                <motion.button
                  key={tile}
                  type="button"
                  layout="position"
                  layoutId={layoutId(tile)}
                  transition={WORD_FLIGHT}
                  disabled={locked}
                  onClick={() => remove(tile)}
                  aria-label={`Take back ${textIn(item.tiles[tile], script)}`}
                  className={cn(
                    'flex select-none flex-col items-center rounded-control px-2 py-0.5 focus-ring-inline enabled:hover:opacity-85 bg-brand-on-primary/15 text-brand-on-primary',
                    misplaced?.has(position) && 'bg-white/30 text-white ring-1 ring-white/60',
                  )}
                >
                  <span className="font-chinese text-2xl leading-[1.3] sm:text-3xl">{textIn(item.tiles[tile], script)}</span>
                  {showPinyin && <span className="text-xs font-bold text-brand-on-primary/80">{item.tiles[tile].pinyin}</span>}
                </motion.button>
              ))}
              {status === 'correct' && end && (
                <span className="font-chinese text-2xl leading-[1.3] text-brand-on-primary sm:text-3xl" aria-hidden="true">
                  {end}
                </span>
              )}
            </div>
          )}

          {status === 'correct' && dialogue.type === 'afterward' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PracticeBubble side="them">
                <ContextualChineseText
                  text={dialogue.utterance}
                  tokens={contextTokens}
                  characterPreference={script}
                  onOpenWord={onOpenWord}
                />
              </PracticeBubble>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          <PracticePrompt sub={item.sub} />
          {children}
          {item.kind === 'order-build' && item.scene && (
            <PracticeScene
              scene={item.scene}
              arrived={status === 'correct'}
              renderChinese={(text) => (
                <ContextualChineseText
                  text={textIn(text, script)}
                  tokens={contextTokens}
                  characterPreference={script}
                  onOpenWord={onOpenWord}
                />
              )}
            />
          )}
          <div
            className={cn(
              'flex min-h-24 flex-wrap items-end justify-center gap-x-1.5 border-b-[3px] pb-2 transition-colors',
              status === 'idle' && 'border-ui-divider',
              status === 'correct' && 'border-feedback-success',
              status === 'wrong' && 'border-feedback-danger',
            )}
          >
            {line.map((tile, position) => (
              <motion.button
                key={tile}
                type="button"
                layout="position"
                layoutId={layoutId(tile)}
                transition={WORD_FLIGHT}
                disabled={locked}
                onClick={() => remove(tile)}
                aria-label={`Take back ${textIn(item.tiles[tile], script)}`}
                className={cn(
                  'flex select-none flex-col items-center rounded-control px-1.5 py-0.5 focus-ring-inline enabled:hover:opacity-75',
                  status === 'correct' && 'text-feedback-success-edge',
                  misplaced?.has(position) && 'text-feedback-danger-edge',
                )}
              >
                <span className="font-chinese text-3xl leading-[1.3] sm:text-4xl">{textIn(item.tiles[tile], script)}</span>
                {showPinyin && <span className="text-xs font-bold text-ui-muted-strong">{item.tiles[tile].pinyin}</span>}
              </motion.button>
            ))}
          </div>
        </div>
      )}
      {trayHost && createPortal(
        bank.map((tile) => (
          <PracticeTileButton key={tile} tile={item.tiles[tile]} script={script} layoutId={layoutId(tile)} disabled={locked} onClick={() => add(tile)} />
        )),
        trayHost,
      )}
    </LayoutGroup>
  );
}
