import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ListenBuildItem, OrderBuildItem } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkOrderBuild } from '../../../utils/grammar/grammarPracticeSequence';
import { PracticeCharacterPrompt } from '../components/PracticeCharacterPrompt';
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

/** Keep instructions and role/selection context; omit a question already displayed in Chinese. */
export function orderBuildHeading(item: OrderBuildItem): string | undefined {
  const dialogue = parseDialogue(item.sub, item.prompt);
  const translatedQuestion = /^(?:Does|Do|Is|Are|Where|What|How|Who|When|Which|Can)\b[^?]+\?(?:\s*Answer from the picture\.)?$/i.test(item.prompt ?? '');
  if (item.scene && dialogue?.type === 'incoming' && /[？?]$/.test(dialogue.utterance) && translatedQuestion) {
    return 'Answer from the picture';
  }
  return !item.scene && !item.sub && item.prompt ? 'Build a sentence' : item.prompt;
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
  const locked = status !== 'idle';
  const ready = !locked && line.length > 0;
  const bank = item.tiles.map((_, index) => index).filter((index) => !line.includes(index));
  const layoutId = (tile: number) => `${item.id}-tile-${tile}`;
  const order = line.map((tile) => item.tiles[tile].traditional);
  const verdict = checkOrderBuild(item, order);
  const misplaced = status === 'wrong' ? new Set(verdict.positions) : null;
  const dialogue = useMemo(() => parseDialogue(item.sub, item.prompt), [item.sub, item.prompt]);
  const end = textIn(item.accepted[0].sentence, script).match(END_PUNCTUATION)?.[0] ?? '';
  const placeholder = dialogue?.type === 'incoming' ? 'Tap words to reply…' : 'Tap words to build the sentence…';

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
    if (retryKey > 0) setLine([]);
  }, [retryKey]);

  const add = (tile: number) => { if (!locked) setLine((previous) => [...previous, tile]); };
  const remove = (tile: number) => { if (!locked) setLine((previous) => previous.filter((placed) => placed !== tile)); };
  useNumberKeySelection({ items: bank, onSelect: add, disabled: locked || shortcutsDisabled });

  const answerLine = (
    <div
      className={cn(
        'flex min-h-20 w-full flex-wrap items-center gap-x-1.5 border-b-2 py-3 transition-colors',
        status === 'idle' && 'border-ui-divider',
        status === 'correct' && 'border-feedback-success',
        status === 'wrong' && 'border-feedback-danger',
      )}
    >
      {line.length === 0 && <span className="text-sm font-bold text-ui-muted">{placeholder}</span>}
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
            'flex select-none flex-col items-center rounded-xs px-1.5 py-0.5 text-brand-primary-deep focus-ring-inline enabled:hover:opacity-75',
            status === 'correct' && 'text-feedback-success-edge',
            misplaced?.has(position) && 'text-feedback-danger-edge',
          )}
        >
          <span className="font-chinese text-2xl leading-[1.3] sm:text-3xl">{textIn(item.tiles[tile], script)}</span>
          {showPinyin && <span className="text-xs font-bold text-ui-muted-strong">{item.tiles[tile].pinyin}</span>}
        </motion.button>
      ))}
      {status === 'correct' && end && (
        <span className="font-chinese text-2xl leading-[1.3] text-feedback-success-edge sm:text-3xl" aria-hidden="true">{end}</span>
      )}
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
    <div className="flex min-w-0 flex-col gap-2 text-center sm:text-left">
      <div className="font-chinese text-2xl leading-relaxed text-ui-ink-strong sm:text-3xl">
        <ContextualChineseText text={dialogue.utterance} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />
      </div>
      <PracticePrompt sub={dialogue.gloss} />
    </div>
  ) : null;

  return (
    <LayoutGroup id={`order-${item.id}`}>
      {dialogue ? (
        <div className="flex flex-col gap-4">
          {dialogue.preface && <PracticePrompt sub={dialogue.preface} />}
          {children}
          {scene ? incoming ? (
            <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-8">
              {scene}
              {incoming}
            </div>
          ) : scene : incoming && (
            <PracticeCharacterPrompt status={status} waiting={line.length > 0}>
              <PracticeBubble className="relative max-w-full rounded-control rounded-bl-control before:absolute before:-left-2 before:top-7 before:size-4 before:rotate-45 before:border-b-2 before:border-l-2 before:border-ui-divider before:bg-ui-surface" side="them" notes={dialogue.gloss ? [dialogue.gloss] : []}>
                <ContextualChineseText text={dialogue.utterance} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />
              </PracticeBubble>
            </PracticeCharacterPrompt>
          )}

          <span className="h-1" aria-hidden="true" />

          {answerLine}

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
          {!children && item.kind === 'order-build' && !item.scene ? (
            <PracticeCharacterPrompt status={status} waiting={line.length > 0}>
              <PracticePrompt sub={item.sub ?? item.prompt} />
            </PracticeCharacterPrompt>
          ) : <PracticePrompt sub={item.sub} />}
          {children}
          {scene}
          {answerLine}
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
