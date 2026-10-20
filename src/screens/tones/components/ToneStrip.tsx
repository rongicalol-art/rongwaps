import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PinyinTone } from '../../../utils/pinyin/pinyinTones';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { cn } from '../../../utils/cn';
import { AppIcon } from '../../../lib/widgets';
import {
  GUIDE_LEVELS, classifyStroke, contourPath, lerpContour, levelToY, resampleStroke, toneContour, yToLevel, type TonePoint,
} from '../utils/toneShapes';
import { humAt, stopHum } from '../utils/toneHum';
import type { ToneTarget } from '../utils/toneTargets';

/** A drawn syllable: the tone it read as, and the line (resampled) the learner drew. */
export interface ToneAttempt {
  drew: PinyinTone;
  ok: boolean;
  line: TonePoint[];
}

const LINE_PX = 6;
const DOT_PX = 14;
const COLUMN_MAX_PX = 176;
const MORPH_MS = 420;
const LINE_COLOR = 'var(--color-ui-ink-strong)';
const SHAPE_COLOR = 'var(--color-brand-primary)';
const MISS_COLOR = 'var(--color-feedback-danger)';
const TONE_NAMES: Record<PinyinTone, string> = { 1: 'flat', 2: 'rising', 3: 'dipping', 4: 'falling', 5: 'light' };

const TONE_CHANGE_RULES = [
  { label: '3 + 3', detail: 'The first is spoken as 2; both marks usually stay 3. 你好 nǐ hǎo → ní hǎo. Longer groups depend on how the phrase is grouped.' },
  { label: '3 + another tone', detail: 'The 3rd is often a low half-third in speech; its mark stays 3.' },
  { label: '不 bù', detail: 'Before a 4th tone, it rises to bú. Before other tones, it stays bù.' },
  { label: '一 yī', detail: 'Before a 4th-tone word it becomes yí; before 1st–3rd tones it becomes yì. It stays yī when counted by itself.' },
  { label: '4 + 4', detail: 'The first can sound shorter or less sharp; both marks stay 4.' },
  { label: 'Light tone', detail: 'An unmarked syllable is short and light; its pitch follows the syllable before it.' },
];

function toneMarkedSyllable(target: ToneTarget, tone: PinyinTone) {
  return target.base
    .split('/')
    .map((base) => numberToToneMarks(`${base}${tone}`))
    .join('/');
}

function getWordToneNotes(targets: ToneTarget[]) {
  return targets.flatMap((target, index) => {
    const next = targets[index + 1];
    if (!next) return [];

    if (target.written === 3 && next.written === 3) {
      return [`${target.char} is written with a 3rd tone, but it is spoken like a 2nd because it comes before another 3rd tone. ${next.char} stays 3rd, usually low here.`];
    }
    if (target.written === 3 && next.written !== 3) {
      return [`${target.char} is a 3rd tone before a different tone, so it is usually low and does not rise fully in natural speech. Its Pinyin mark stays 3rd.`];
    }
    if (target.char === '不' && target.written !== 5 && next.written === 4) {
      return ['不 rises before a 4th tone: bù → bú.'];
    }
    if (target.char === '一' && next.written >= 1 && next.written <= 4) {
      return [next.written === 4
        ? '一 changes from yī to yí before a 4th tone.'
        : '一 changes from yī to yì before a 1st, 2nd, or 3rd tone.'];
    }
    if (target.written === 4 && next.written === 4) {
      return ['These two 4th tones stay 4th; the first may sound a little shorter or softer.'];
    }
    return [];
  });
}

const strokePx = (tone: PinyinTone) => (tone === 5 ? DOT_PX : LINE_PX);
const glyphSize = (count: number) => (count <= 2 ? 'text-5xl md:text-6xl' : count === 3 ? 'text-4xl md:text-5xl' : 'text-3xl md:text-5xl');
const pinyinSize = (count: number) => (count <= 2 ? 'text-xl md:text-2xl' : 'text-base md:text-xl');

interface ToneColumnProps {
  target: ToneTarget;
  attempt?: ToneAttempt;
  active: boolean;
  /** Set on the active column: lets the keyboard (1–5) answer with a clean shape. */
  submitRef?: MutableRefObject<((tone: PinyinTone) => void) | null>;
  onDrawn: (attempt: ToneAttempt) => void;
}

/** One character's drawing pad: capture the line, read it, then settle it into the real tone shape. */
function ToneColumn({ target, attempt, active, submitRef, onDrawn }: ToneColumnProps) {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const liveRef = useRef<SVGPathElement>(null);
  const shapeRef = useRef<SVGPathElement>(null);
  const pointsRef = useRef<TonePoint[] | null>(null);
  const pointerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  /** Screen → pad coordinates, measured once per stroke (layout reads on every move are what lag low-end phones). */
  const matrixRef = useRef<DOMMatrix | null>(null);
  /** The live line's path data, appended to rather than rebuilt, and painted at most once a frame. */
  const liveDRef = useRef('');
  const paintRef = useRef<number | null>(null);
  /** The line has finished settling: draw the final shapes from props. The next pad is live as soon as a line is read. */
  const [settled, setSettled] = useState(Boolean(attempt));

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (paintRef.current !== null) cancelAnimationFrame(paintRef.current);
  }, []);

  const finish = useCallback((raw: readonly TonePoint[], drew: PinyinTone) => {
    const live = liveRef.current;
    const shape = shapeRef.current;
    if (!live || !shape || busyRef.current) return;
    busyRef.current = true;
    const line = resampleStroke(raw);
    const shapePoints = toneContour(target.spoken);
    const ok = drew === target.spoken;
    const settle = () => {
      live.getAnimations().forEach((a) => a.cancel());
      live.removeAttribute('d');
      setSettled(true);
    };
    onDrawn({ drew, ok, line });
    if (reduceMotion) { settle(); return; }

    if (ok) {
      // The line settles into the real shape (a neutral tone shrinks to its dot).
      const from = strokePx(drew);
      const to = strokePx(target.spoken);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / MORPH_MS);
        const e = 1 - (1 - t) ** 3;
        live.setAttribute('d', contourPath(lerpContour(line, shapePoints, e)));
        live.setAttribute('stroke', t > 0.4 ? SHAPE_COLOR : LINE_COLOR);
        live.setAttribute('stroke-width', String(from + (to - from) * e));
        frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
        if (t >= 1) settle();
      };
      frameRef.current = requestAnimationFrame(step);
      return;
    }

    // A miss: your line fades back and the real shape appears over it.
    live.setAttribute('d', contourPath(line));
    live.setAttribute('stroke', MISS_COLOR);
    live.setAttribute('stroke-width', String(strokePx(drew)));
    live.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: 300, fill: 'forwards' });
    shape.setAttribute('d', contourPath(shapePoints));
    shape.setAttribute('stroke', SHAPE_COLOR);
    shape.setAttribute('stroke-width', String(strokePx(target.spoken)));
    const length = shape.getTotalLength();
    const reveal = target.spoken === 5
      ? shape.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 200, fill: 'backwards' })
      : shape.animate(
        [{ strokeDasharray: `${length} ${length}`, strokeDashoffset: length }, { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 }],
        { duration: 480, delay: 200, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' },
      );
    reveal.finished.then(settle, settle);
  }, [onDrawn, reduceMotion, target.spoken]);

  const canSubmit = active && !attempt;
  useEffect(() => {
    if (!submitRef || !canSubmit) return undefined;
    submitRef.current = (tone) => finish(toneContour(tone), tone);
    return () => { submitRef.current = null; };
  }, [canSubmit, finish, submitRef]);

  const toLocal = (event: React.PointerEvent): TonePoint => {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrixRef.current ?? undefined);
    return [Math.max(2, Math.min(98, point.x)), Math.max(2, Math.min(98, point.y))];
  };

  const schedulePaint = () => {
    if (paintRef.current !== null) return;
    paintRef.current = requestAnimationFrame(() => {
      paintRef.current = null;
      const points = pointsRef.current;
      if (!points) return;
      liveRef.current?.setAttribute('d', liveDRef.current);
      humAt(yToLevel(points[points.length - 1][1]));
    });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!active || attempt || busyRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = event.pointerId;
    matrixRef.current = svgRef.current?.getScreenCTM()?.inverse() ?? null;
    const first = toLocal(event);
    pointsRef.current = [first];
    liveDRef.current = contourPath([first]);
    const live = liveRef.current!;
    live.setAttribute('d', liveDRef.current);
    live.setAttribute('stroke', LINE_COLOR);
    live.setAttribute('stroke-width', String(LINE_PX));
    humAt(yToLevel(first[1]));
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const points = pointsRef.current;
    if (!points || event.pointerId !== pointerRef.current) return;
    const next = toLocal(event);
    const last = points[points.length - 1];
    if (Math.hypot(next[0] - last[0], next[1] - last[1]) < 0.8) return;
    points.push(next);
    liveDRef.current += ` L${next[0].toFixed(1)} ${next[1].toFixed(1)}`;
    schedulePaint();
  };

  const onPointerEnd = (event: React.PointerEvent) => {
    const points = pointsRef.current;
    if (!points || event.pointerId !== pointerRef.current) return;
    pointsRef.current = null;
    if (paintRef.current !== null) { cancelAnimationFrame(paintRef.current); paintRef.current = null; }
    stopHum();
    finish(points, classifyStroke(points));
  };

  const done = Boolean(attempt);
  const final = settled && attempt;
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      aria-label={done ? `${target.char}: ${TONE_NAMES[target.spoken]} tone` : `Draw the tone of ${target.char}`}
      role="img"
      className={cn(
        'relative h-[140px] min-w-0 flex-1 touch-none select-none transition-colors duration-200 md:h-[176px]',
        'not-first:border-l-2 not-first:border-dashed not-first:border-ui-divider',
        active && !done ? 'cursor-crosshair bg-brand-primary-soft' : 'cursor-default',
      )}
    >
      <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        {GUIDE_LEVELS.map((level) => (
          <line
            key={level}
            x1="8" x2="92" y1={levelToY(level)} y2={levelToY(level)}
            strokeWidth={1.5} strokeDasharray="3 5" vectorEffect="non-scaling-stroke"
            className={active && !done ? 'stroke-brand-primary-soft-edge' : 'stroke-ui-divider'}
          />
        ))}
        {final && !final.ok && (
          <path
            d={contourPath(final.line)} fill="none" stroke={MISS_COLOR} strokeOpacity={0.35}
            strokeWidth={strokePx(final.drew)} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          ref={shapeRef}
          d={final ? contourPath(toneContour(target.spoken)) : undefined}
          stroke={final ? SHAPE_COLOR : undefined}
          strokeWidth={final ? strokePx(target.spoken) : undefined}
          fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        />
        <path ref={liveRef} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

interface ToneStripProps {
  targets: ToneTarget[];
  showPinyin: boolean;
  /** Bumped each time the word plays: the characters lift in turn, like a sung line. */
  singKey: number;
  onReplay: () => void;
  onSyllable: (target: ToneTarget, attempt: ToneAttempt) => void;
  onDone: (attempts: ToneAttempt[]) => void;
  /** Keys 1–5 answer the active syllable (off while something covers the screen). */
  keyboardEnabled?: boolean;
}

/**
 * The melody strip: the word on top (tap it to hear it again), and one joined pad per character to
 * draw its tone in, left to right.
 */
export function ToneStrip({ targets, showPinyin, singKey, onReplay, onSyllable, onDone, keyboardEnabled = true }: ToneStripProps) {
  const reduceMotion = useReducedMotion();
  const [showToneGuide, setShowToneGuide] = useState(false);
  const [attempts, setAttempts] = useState<ToneAttempt[]>([]);
  const attemptsRef = useRef<ToneAttempt[]>([]);
  const doneTimerRef = useRef<number | null>(null);
  const submitRef = useRef<((tone: PinyinTone) => void) | null>(null);
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const active = attempts.length;
  const finished = active >= targets.length;

  useEffect(() => {
    if (!singKey || reduceMotion) return undefined;
    const timers = targets.map((_, i) => window.setTimeout(() => {
      glyphRefs.current[i]?.animate(
        [{ transform: 'none' }, { transform: 'translateY(-5px)', offset: 0.4 }, { transform: 'none' }],
        { duration: 480, easing: 'ease-in-out' },
      );
    }, 120 + i * 440));
    return () => timers.forEach(window.clearTimeout);
  }, [reduceMotion, singKey, targets]);

  useEffect(() => {
    if (!keyboardEnabled || finished) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || !/^[1-5]$/.test(event.key)) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      submitRef.current?.(Number(event.key) as PinyinTone);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, keyboardEnabled]);

  useEffect(() => () => { if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current); }, []);

  const handleDrawn = useCallback((attempt: ToneAttempt) => {
    const next = [...attemptsRef.current, attempt];
    attemptsRef.current = next;
    setAttempts(next);
    onSyllable(targets[next.length - 1], attempt);
    if (next.length === targets.length) doneTimerRef.current = window.setTimeout(() => onDone(next), 750);
  }, [onDone, onSyllable, targets]);

  const wordToneNotes = getWordToneNotes(targets);

  return (
    <div className="flex w-full flex-col items-center gap-4 md:gap-5" style={{ maxWidth: targets.length * COLUMN_MAX_PX }}>
      <button
        type="button"
        onClick={onReplay}
        aria-label={`Hear ${targets.map((t) => t.char).join('')} again`}
        className="flex w-full rounded-feature py-1 focus-ring"
      >
        {targets.map((target, i) => {
          const attempt = attempts[i];
          return (
            <span key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                ref={(el) => { glyphRefs.current[i] = el; }}
                className={cn('font-chinese leading-none text-ui-ink-strong', glyphSize(targets.length))}
              >
                {target.char}
              </span>
              <span className={cn('h-[1.4em] whitespace-nowrap font-extrabold', pinyinSize(targets.length))}>
                {attempt ? (
                  <motion.span
                    initial={reduceMotion ? false : { y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
                    className="inline-block text-ui-ink-strong"
                  >
                    {target.syllable}
                  </motion.span>
                ) : (
                  <span className={cn('text-ui-muted-strong', !showPinyin && 'invisible')}>{target.base}</span>
                )}
              </span>
            </span>
          );
        })}
      </button>

      <div className="flex w-full overflow-hidden rounded-feature border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        {targets.map((target, i) => (
          <ToneColumn
            key={i}
            target={target}
            attempt={attempts[i]}
            active={i === active}
            submitRef={i === active ? submitRef : undefined}
            onDrawn={handleDrawn}
          />
        ))}
      </div>

      <div className="relative z-20 flex justify-center">
        <button
          type="button"
          onClick={() => setShowToneGuide((open) => !open)}
          aria-expanded={showToneGuide}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-2.5 text-sm font-extrabold text-ui-muted-strong transition-colors hover:bg-ui-hover focus-ring"
        >
          <AppIcon name="lightbulb" size={17} />
          Tone changes
        </button>
        {showToneGuide && (
          <section
            role="note"
            aria-label="Pinyin tone changes"
            data-no-screen-nav
            className="absolute bottom-[calc(100%+8px)] left-1/2 w-[min(92vw,28rem)] -translate-x-1/2 rounded-feature border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 text-left shadow-ambient-lg"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-ui-ink-strong">Why Pinyin and speech can differ</h3>
              <button
                type="button"
                onClick={() => setShowToneGuide(false)}
                aria-label="Close tone changes"
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ui-muted-strong hover:bg-ui-hover focus-ring"
              >
                <AppIcon name="close" size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm font-bold leading-snug text-ui-muted-strong">
              Pinyin usually keeps a character’s base tone even when its spoken pitch shifts. The marks help show the word; your voice follows the rules below.
            </p>
            {wordToneNotes.length > 0 && (
              <div className="mb-3 rounded-control bg-brand-primary-soft px-3 py-2.5 text-sm font-bold leading-snug text-ui-ink">
                <p className="font-black text-ui-ink-strong">In this word</p>
                <p className="mt-1 text-ui-muted-strong">
                  Written: {targets.map((target) => target.syllable).join(' ')}
                  {' · '}spoken: {targets.map((target) => toneMarkedSyllable(target, target.spoken)).join(' ')}
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  {wordToneNotes.map((note, index) => <li key={index}>{note}</li>)}
                </ul>
              </div>
            )}
            <p className="mb-2 text-xs font-bold leading-snug text-ui-muted-strong">
              Pinyin may also write 不 and 一 with their changed sounds: bú, yí, or yì.
            </p>
            <ul className="space-y-1.5 text-xs font-bold leading-snug text-ui-muted-strong">
              {TONE_CHANGE_RULES.map((rule) => (
                <li key={rule.label}>
                  <span className="font-black text-ui-ink-strong">{rule.label}:</span> {rule.detail}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
