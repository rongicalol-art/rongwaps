import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PinyinTone } from '../../../utils/pinyin/pinyinTones';
import { cn } from '../../../utils/cn';
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

const TONE_CUES: Record<PinyinTone, string> = { 1: 'stays high.', 2: 'rises.', 3: 'dips.', 4: 'falls.', 5: 'is light.' };
const POSITION_NAMES = ['First', 'Second', 'Third', 'Fourth'];

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
  /** Unlock a missed syllable only after its correction has settled. */
  const [settled, setSettled] = useState(Boolean(attempt));

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (paintRef.current !== null) cancelAnimationFrame(paintRef.current);
    stopHum();
  }, []);

  const finish = useCallback((raw: readonly TonePoint[], drew: PinyinTone) => {
    const live = liveRef.current;
    const shape = shapeRef.current;
    if (!live || !shape || busyRef.current) return;
    busyRef.current = true;
    setSettled(false);
    const line = resampleStroke(raw);
    const shapePoints = toneContour(target.spoken);
    const ok = drew === target.spoken;
    const settle = () => {
      live.getAnimations().forEach((a) => a.cancel());
      live.removeAttribute('d');
      busyRef.current = false;
      setSettled(true);
    };
    onDrawn({ drew, ok, line });
    if (reduceMotion) { settle(); return; }

    // Your whole stroke becomes the spoken shape; a miss leaves a faint guide to redraw.
    const from = strokePx(drew);
    const to = strokePx(target.spoken);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / MORPH_MS);
      const e = 1 - (1 - t) ** 3;
      live.setAttribute('d', contourPath(lerpContour(line, shapePoints, e)));
      live.setAttribute('stroke', t > 0.4 ? SHAPE_COLOR : ok ? LINE_COLOR : MISS_COLOR);
      live.setAttribute('stroke-width', String(from + (to - from) * e));
      frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
      if (t >= 1) settle();
    };
    frameRef.current = requestAnimationFrame(step);
  }, [onDrawn, reduceMotion, target.spoken]);

  const retry = active && Boolean(attempt && !attempt.ok);
  const canSubmit = active && (!attempt || (retry && settled));
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
    if (!canSubmit || busyRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = event.pointerId;
    matrixRef.current = svgRef.current?.getScreenCTM()?.inverse() ?? null;
    const first = toLocal(event);
    pointsRef.current = [first];
    liveDRef.current = contourPath([first]);
    setSettled(false);
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

  const done = Boolean(attempt?.ok);
  const final = settled && attempt;
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={() => {
        pointsRef.current = null;
        pointerRef.current = null;
        liveRef.current?.removeAttribute('d');
        setSettled(Boolean(attempt));
        stopHum();
      }}
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
        <path
          ref={shapeRef}
          d={final || retry ? contourPath(toneContour(target.spoken)) : undefined}
          stroke={final || retry ? SHAPE_COLOR : undefined}
          strokeOpacity={retry ? 0.22 : 1}
          strokeWidth={final || retry ? strokePx(target.spoken) : undefined}
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
  const [attempts, setAttempts] = useState<ToneAttempt[]>([]);
  const attemptsRef = useRef<ToneAttempt[]>([]);
  const firstAttemptsRef = useRef<ToneAttempt[]>([]);
  const doneTimerRef = useRef<number | null>(null);
  const submitRef = useRef<((tone: PinyinTone) => void) | null>(null);
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const missed = attempts.findIndex((attempt) => !attempt.ok);
  const active = missed < 0 ? attempts.length : missed;
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

  const handleDrawn = useCallback((index: number, attempt: ToneAttempt) => {
    const next = [...attemptsRef.current];
    next[index] = attempt;
    firstAttemptsRef.current[index] ??= attempt;
    attemptsRef.current = next;
    setAttempts(next);
    if (attempt.ok) onSyllable(targets[index], attempt);
    else onReplay();
    if (next.length === targets.length && next.every((answer) => answer.ok)) {
      doneTimerRef.current = window.setTimeout(() => onDone(firstAttemptsRef.current), 750);
    }
  }, [onDone, onReplay, onSyllable, targets]);

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

      <div className="relative isolate w-full">
        <div className="flex w-full overflow-hidden rounded-feature border-2 border-b-[length:var(--depth-md)] border-transparent bg-ui-surface">
          {targets.map((target, i) => (
            <ToneColumn
              key={i}
              target={target}
              attempt={attempts[i]}
              active={i === active}
              submitRef={i === active ? submitRef : undefined}
              onDrawn={(attempt) => handleDrawn(i, attempt)}
            />
          ))}
        </div>
        {/* Keep the frame outside SVG clipping and above the pads during audio animation. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-feature border-2 border-b-[length:var(--depth-md)] border-ui-border"
        />
      </div>

      <p aria-live="polite" role="status" className="min-h-6 text-center text-base font-extrabold text-ui-ink-strong">
        {missed >= 0 ? `${POSITION_NAMES[missed]} tone ${TONE_CUES[targets[missed].spoken]}` : '\u00a0'}
      </p>
    </div>
  );
}
