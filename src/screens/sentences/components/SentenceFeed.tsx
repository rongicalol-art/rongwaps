import { memo, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { alignSentenceSyllables } from '../../../utils/pinyin/pinyinTones';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { splitDialogueTurns, splitTranslationLines } from '../../../utils/lesson/dialogueTurns';
import { cn } from '../../../utils/cn';
import { sentenceText, type SentenceSession } from '../hooks/useSentenceSession';
import type { LessonSentence } from '../hooks/useLessonSentences';

const HAN = /\p{Script=Han}/u;
/** How long a press must last before it peeks a character's pinyin instead of tapping. */
const PEEK_DELAY_MS = 280;

/** Which characters belong to one of the deck's words (longest words claim first). */
function highlightMask(text: string, terms: readonly string[]): boolean[] {
  const mask = new Array<boolean>(Array.from(text).length).fill(false);
  const chars = Array.from(text);
  for (const term of terms) {
    const termChars = Array.from(term);
    if (termChars.length === 0) continue;
    for (let i = 0; i + termChars.length <= chars.length; i += 1) {
      if (termChars.every((char, offset) => chars[i + offset] === char)) mask.fill(true, i, i + termChars.length);
    }
  }
  return mask;
}

interface SentenceCardProps {
  sentence: LessonSentence;
  text: string;
  highlightTerms: readonly string[];
  focused: boolean;
  /** Steps away from the focused card: further cards fade more. */
  distance: number;
  open: boolean;
  hard: boolean;
  onTap: () => void;
  onToggleHard: () => void;
  onCharTap: (char: string) => void;
}

const SentenceCard = memo(function SentenceCard({
  sentence, text, highlightTerms, focused, distance, open, hard, onTap, onToggleHard, onCharTap,
}: SentenceCardProps) {
  const reduceMotion = useReducedMotion();
  const { record } = sentence;
  const chars = useMemo(() => Array.from(text), [text]);
  const codeUnitToCharIndex = useMemo(() => {
    const map = new Map<number, number>();
    let cu = 0;
    chars.forEach((ch, idx) => {
      map.set(cu, idx);
      cu += ch.length;
    });
    map.set(cu, chars.length);
    return map;
  }, [chars]);
  const turns = useMemo(() => splitDialogueTurns(text), [text]);
  const syllables = useMemo(() => alignSentenceSyllables(text, record.pinyin), [text, record.pinyin]);
  const highlighted = useMemo(() => highlightMask(text, highlightTerms), [text, highlightTerms]);
  /** Every character has its own syllable: an open card stacks pinyin over each one. */
  const isAligned = Boolean(syllables);
  const stacked = open && isAligned;
  const [peek, setPeek] = useState<number | null>(null);
  const peekTimerRef = useRef<number | null>(null);
  /** A press that peeked must not also count as a tap when it lifts. */
  const peekedRef = useRef(false);

  const endPress = () => {
    if (peekTimerRef.current !== null) window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = null;
    setPeek(null);
  };
  useEffect(() => endPress, []);

  const startPress = (index: number) => (event: PointerEvent) => {
    if (!focused || stacked || !syllables?.[index]) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    peekedRef.current = false;
    peekTimerRef.current = window.setTimeout(() => {
      peekedRef.current = true;
      setPeek(index);
    }, PEEK_DELAY_MS);
  };

  return (
    <article
      onClick={() => {
        if (peekedRef.current) { peekedRef.current = false; return; }
        onTap();
      }}
      aria-current={focused ? 'true' : undefined}
      className={cn(
        'w-full cursor-pointer select-none rounded-feature border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-5 py-5 transition-[opacity,scale] duration-300 ease-out [-webkit-touch-callout:none] sm:px-7 sm:py-6',
        !focused && 'scale-[0.96]',
        !focused && (distance === 1 ? 'opacity-40' : 'opacity-15'),
      )}
    >
      {hard && !open && (
        <AppIcon name="bookmarkFilled" size={16} className="float-right ml-3 mt-1 text-brand-primary" aria-label="Marked hard" />
      )}
      <p lang="zh" className={cn('font-chinese text-[24px] text-ui-ink-strong sm:text-[30px]', stacked ? 'leading-[2.1]' : 'leading-[1.75]')}>
        {(turns ?? [{ speaker: null, start: 0, end: text.length }]).map((turn) => {
          const fromIdx = codeUnitToCharIndex.get(turn.start) ?? 0;
          const toIdx = codeUnitToCharIndex.get(turn.end) ?? chars.length;
          const wideLabel = (turn.speaker?.length ?? 0) > 1;
          return (
            <span
              key={turn.start}
              className={cn(
                'block',
                turn.speaker && (wideLabel ? 'pl-[2.2em]' : 'pl-[1.2em]'),
              )}
            >
              {turn.speaker && (
                <span
                  className={cn(
                    'inline-block font-sans',
                    wideLabel ? '-ml-[2.2em] min-w-[2.2em] pr-1' : '-ml-[1.2em] min-w-[1.2em]',
                  )}
                >
                  <span className="text-[0.6em] font-black text-ui-muted">{turn.speaker}</span>
                </span>
              )}
              {chars.slice(fromIdx, toIdx).map((char, offset) => {
                const index = fromIdx + offset;
                const isHan = HAN.test(char);
                return (
                  <span
                    key={index}
                    onPointerDown={isHan ? startPress(index) : undefined}
                    onPointerUp={endPress}
                    onPointerLeave={endPress}
                    onPointerCancel={endPress}
                    onContextMenu={(event) => event.preventDefault()}
                    onClick={open && isHan ? (event) => {
                      event.stopPropagation();
                      if (peekedRef.current) { peekedRef.current = false; return; }
                      onCharTap(char);
                    } : undefined}
                    className={cn(
                      'relative',
                      highlighted[index] && 'text-brand-primary-text',
                      open && isHan && 'rounded-xs transition-colors hover:bg-brand-primary/10',
                    )}
                  >
                    {stacked && isHan ? (
                      <ruby className="[ruby-align:center]">
                        {char}
                        <rt className="pb-0.5 font-sans text-[11px] font-semibold tracking-normal text-ui-ink sm:text-[13px]">{syllables?.[index]?.text}</rt>
                      </ruby>
                    ) : char}
                    {peek === index && syllables?.[index] && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xs bg-ui-surface px-1 font-sans text-sm font-semibold leading-tight text-ui-ink">
                        {syllables[index]?.text}
                      </span>
                    )}
                  </span>
                );
              })}
            </span>
          );
        })}
      </p>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t-2 border-ui-divider pt-3">
              {record.pinyin && !isAligned && (
                <p className="mb-1 text-base font-medium leading-snug text-ui-ink sm:text-lg">{numberToToneMarks(record.pinyin)}</p>
              )}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                <p className="ui-translation min-w-0 text-base sm:text-lg">
                  {splitTranslationLines(record.english).map((line, i) => (
                    <span key={i} className={line.label ? 'block pl-[1.2em]' : 'block'}>
                      {line.label && (
                        <span className="-ml-[1.2em] inline-block min-w-[1.2em] font-sans text-xs font-black text-ui-muted">
                          {line.label}
                        </span>
                      )}
                      {line.text}
                    </span>
                  ))}
                </p>
                <div className="-mr-2 flex shrink-0 items-center gap-1 self-end">
                  <button
                    type="button"
                    aria-pressed={hard}
                    onClick={(event) => { event.stopPropagation(); onToggleHard(); }}
                    className={cn(
                      'flex h-9 items-center gap-1.5 rounded-compact px-2.5 text-sm font-extrabold transition-colors focus-ring',
                      hard ? 'bg-brand-primary/10 text-brand-primary-text' : 'text-ui-muted-strong hover:bg-ui-hover',
                    )}
                  >
                    <AppIcon name={hard ? 'bookmarkFilled' : 'bookmark'} size={16} />
                    <span>Hard</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
});

interface SentenceFeedProps {
  session: SentenceSession;
  highlightTerms: readonly string[];
  /** Tap a character on an open card. */
  onOpenCharacter: (char: string) => void;
  /** Keys and Flow pause while an overlay (the breakdown) is on top. */
  isOverlayOpen?: boolean;
}

/**
 * The sentence feed: one card in focus, its neighbours faded. Native scroll snapping moves it on
 * swipe, wheel and touchpad; keys and Flow scroll it programmatically.
 */
export function SentenceFeed({ session, highlightTerms, onOpenCharacter, isOverlayOpen = false }: SentenceFeedProps) {
  const { deck, current, currentIndex, openIds, hardIds, goTo, next, play, toggleOpen, toggleHard, pauseFlow } = session;
  const characterPreference = useAppStore((state) => state.characterPreference);
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  /** Set when the focus came from the learner's own scroll, so the feed doesn't scroll it again. */
  const fromScrollRef = useRef(false);
  const hasPositionedRef = useRef(false);
  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;

  // The card crossing the scroller's middle line is the focused one.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = Number((entry.target as HTMLElement).dataset.index);
        if (Number.isNaN(index) || index === indexRef.current) continue;
        fromScrollRef.current = true;
        goTo(index);
      }
    }, { root, rootMargin: '-50% 0px -50% 0px' });
    cardRefs.current.forEach((node) => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [deck, goTo]);

  // Keys, Flow and taps on faded cards move the focus: bring that card to the middle.
  useEffect(() => {
    if (fromScrollRef.current) { fromScrollRef.current = false; return; }
    const node = cardRefs.current[currentIndex];
    const root = scrollerRef.current;
    if (!node || !root) return;
    const instant = reduceMotion || !hasPositionedRef.current;
    hasPositionedRef.current = true;
    // Only the feed scrolls: scrollIntoView would also scroll every ancestor.
    root.scrollTo({ top: node.offsetTop + node.offsetHeight / 2 - root.clientHeight / 2, behavior: instant ? 'auto' : 'smooth' });
  }, [currentIndex, deck, reduceMotion]);

  useEffect(() => {
    if (isOverlayOpen) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      // The practice modal itself is a dialog and holds focus, so only nested dialogs and menus block keys.
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]:not(#global-activity-modal), [role="menu"]')) return;
      if (document.querySelector('[role="dialog"][aria-label^="Lesson "]')) return;
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === ' ' || event.key === 'Enter') {
        const button = target instanceof HTMLElement ? target.closest('button') : null;
        // Hard keeps native activation; Enter also activates the focused Play button.
        // Space on the Play dock still reveals the sentence, so suppress its audio-only click.
        if (button && (event.key === 'Enter' || scrollerRef.current?.contains(button))) return;
        event.preventDefault();
        if (event.repeat) return;
        button?.blur();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        pauseFlow();
        next();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        pauseFlow();
        goTo(Math.max(0, currentIndex - 1));
      } else if (event.key === ' ') {
        event.preventDefault();
        pauseFlow();
        // Opening a card also plays it; Space again closes it.
        if (current && !openIds.has(current.record.id) && current.record.audio) void play(current);
        toggleOpen();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        pauseFlow();
        if (current?.record.audio) void play(current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, currentIndex, goTo, isOverlayOpen, next, openIds, pauseFlow, play, toggleOpen]);

  return (
    <div
      ref={scrollerRef}
      onPointerDown={pauseFlow}
      onWheel={pauseFlow}
      className="relative h-full snap-y snap-mandatory overflow-y-auto [container-type:size] [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 sm:px-6">
        <div aria-hidden="true" className="h-[calc(50cqh-4.5rem)] shrink-0" />
        {deck.map((sentence, index) => (
          <div key={sentence.record.id} ref={(node) => { cardRefs.current[index] = node; }} data-index={index} className="snap-center">
            <SentenceCard
              sentence={sentence}
              text={sentenceText(sentence, characterPreference)}
              highlightTerms={highlightTerms}
              focused={index === currentIndex}
              distance={Math.abs(index - currentIndex)}
              open={openIds.has(sentence.record.id)}
              hard={hardIds.has(sentence.record.id)}
              onTap={index === currentIndex ? toggleOpen : () => goTo(index)}
              onToggleHard={() => toggleHard(sentence.record.id)}
              onCharTap={onOpenCharacter}
            />
          </div>
        ))}
        <div aria-hidden="true" className="h-[calc(50cqh-4.5rem)] shrink-0" />
      </div>
    </div>
  );
}
