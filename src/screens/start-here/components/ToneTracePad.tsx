import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../../utils/cn';
import type { ToneMark } from '../data/types';
import { CornerSpeaker } from './SpeakerControls';
import { DecomposedSyllable, TONE_NAMES, ToneContour } from './ToneContour';

interface ToneIntroViewProps {
  tone: ToneMark;
  audio: string;
  pinyin: string;
  hanzi?: string;
  meaning: string;
  onPlayAudio: (audioKey: string) => void;
}

export function ToneIntroView({ tone, audio, pinyin, hanzi, meaning, onPlayAudio }: ToneIntroViewProps) {

  return (
    <div className="relative flex flex-col items-center gap-3 rounded-feature border-[3px] border-b-[6px] border-ui-divider bg-ui-surface px-4 py-6">
      <CornerSpeaker onClick={() => onPlayAudio(audio)} label={`Play ${pinyin}`} />
      <ToneContour tone={tone} strokeWidth={6} className="h-[108px] w-[168px]" />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-[34px] font-extrabold leading-tight text-ui-ink-strong">{pinyin}</span>
        {hanzi && <span className="font-chinese text-[42px] font-bold leading-tight text-ui-ink-strong">{hanzi}</span>}
        <span className="text-[19px] font-extrabold text-ui-muted-strong">{meaning}</span>
      </div>
    </div>
  );
}

const TRACE_PATHS: Record<ToneMark, string> = {
  1: 'M40 52H260',
  2: 'M50 128L250 44',
  3: 'M40 122C110 152 190 152 260 144',
  4: 'M50 38L250 146',
};

interface SamplePt {
  x: number;
  y: number;
  len: number;
}

interface TraceViewProps {
  tone: ToneMark;
  audio: string;
  doneText: string;
  onPlayAudio: (audioKey: string) => void;
  onComplete: () => void;
}

export function TraceView({ tone, audio, doneText, onPlayAudio, onComplete }: TraceViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const guidePathRef = useRef<SVGPathElement | null>(null);
  const samplesRef = useRef<SamplePt[]>([]);
  const totalLenRef = useRef<number>(1);
  const draggingRef = useRef<boolean>(false);
  const downPtRef = useRef<{ x: number; y: number } | null>(null);

  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 40, y: 52 });
  const [totalLen, setTotalLen] = useState(220);

  useEffect(() => {
    setProgress(0);
    setDone(false);
    draggingRef.current = false;
    onPlayAudio(audio);

    const path = guidePathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    totalLenRef.current = len;
    setTotalLen(len);
    const pts: SamplePt[] = [];
    const steps = 64;
    for (let i = 0; i <= steps; i += 1) {
      const l = (len * i) / steps;
      const p = path.getPointAtLength(l);
      pts.push({ x: p.x, y: p.y, len: l });
    }
    samplesRef.current = pts;
    if (pts.length > 0) {
      setKnobPos({ x: pts[0].x, y: pts[0].y });
    }
  }, [tone, audio, onPlayAudio]);

  const toSvgCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 300,
      y: ((clientY - rect.top) / rect.height) * 180,
    };
  };

  const finishTrace = useCallback(() => {
    const pts = samplesRef.current;
    setProgress(1);
    setDone(true);
    if (pts.length > 0) {
      setKnobPos({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
    }
    onPlayAudio(audio);
    onComplete();
  }, [audio, onComplete, onPlayAudio]);

  const advanceNearPoint = (x: number, y: number, currentProgress: number) => {
    const pts = samplesRef.current;
    if (pts.length === 0) return;
    const currentIndex = Math.min(pts.length - 1, Math.round(currentProgress * (pts.length - 1)));
    let bestIndex = currentIndex;
    let bestDist = Infinity;
    const maxReach = Math.min(pts.length - 1, currentIndex + 10);
    for (let i = Math.max(0, currentIndex - 1); i <= maxReach; i += 1) {
      const d = Math.hypot(pts[i].x - x, pts[i].y - y);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }
    if (bestDist <= 56 && bestIndex > currentIndex) {
      const nextRatio = bestIndex / (pts.length - 1);
      if (nextRatio >= 0.88) {
        finishTrace();
      } else {
        setProgress(nextRatio);
        setKnobPos({ x: pts[bestIndex].x, y: pts[bestIndex].y });
      }
    }
  };

  const dashOffset = Math.max(0, totalLen * (1 - progress));

  return (
    <div className="relative flex flex-col items-center gap-3 rounded-feature border-[3px] border-b-[6px] border-ui-divider bg-ui-surface px-4 py-5">
      <CornerSpeaker onClick={() => onPlayAudio(audio)} label={`Hear tone ${tone}`} />
      <svg
        ref={svgRef}
        viewBox="0 0 300 180"
        tabIndex={0}
        role="slider"
        aria-label={`Trace tone ${tone} (${TONE_NAMES[tone]}). Press Space or drag along the glowing circle.`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (!done) finishTrace();
          }
        }}
        onPointerDown={(e) => {
          if (done) {
            onPlayAudio(audio);
            return;
          }
          const pt = toSvgCoords(e.clientX, e.clientY);
          if (!pt) return;
          draggingRef.current = true;
          downPtRef.current = pt;
          e.currentTarget.setPointerCapture(e.pointerId);
          advanceNearPoint(pt.x, pt.y, progress);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current || done) return;
          const pt = toSvgCoords(e.clientX, e.clientY);
          if (!pt) return;
          advanceNearPoint(pt.x, pt.y, progress);
        }}
        onPointerUp={(e) => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          const pt = toSvgCoords(e.clientX, e.clientY);
          const start = downPtRef.current;
          if (!done && pt && start && Math.hypot(pt.x - start.x, pt.y - start.y) < 10) {
            // Friendly tap-along support for mouse/switch accessibility
            const pts = samplesRef.current;
            const currentIndex = Math.round(progress * (pts.length - 1));
            const clickNear = pts.find((p, idx) => idx >= currentIndex && Math.hypot(p.x - pt.x, p.y - pt.y) < 48);
            if (clickNear) {
              finishTrace();
            }
          }
          downPtRef.current = null;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          downPtRef.current = null;
        }}
        className="block w-full cursor-pointer touch-none rounded-[18px] border-2 border-ui-divider bg-ui-canvas focus-ring"
      >
        <g className="stroke-ui-divider" strokeWidth={2} strokeDasharray="2 9" strokeLinecap="round">
          <line x1="24" y1="44" x2="276" y2="44" />
          <line x1="24" y1="92" x2="276" y2="92" />
          <line x1="24" y1="142" x2="276" y2="142" />
        </g>
        <path
          ref={guidePathRef}
          d={TRACE_PATHS[tone]}
          fill="none"
          className="stroke-ui-border opacity-55"
          strokeWidth={16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={TRACE_PATHS[tone]}
          fill="none"
          stroke={done ? 'var(--color-feedback-success)' : 'var(--color-brand-primary)'}
          strokeWidth={16}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={totalLen}
          strokeDashoffset={dashOffset}
        />
        <circle
          cx={knobPos.x}
          cy={knobPos.y}
          r={13}
          fill="var(--color-ui-surface)"
          stroke={done ? 'var(--color-feedback-success)' : 'var(--color-brand-primary)'}
          strokeWidth={6}
          className={!done ? 'sh-pad-knob' : undefined}
        />
      </svg>

      <p
        aria-live="polite"
        className={cn(
          'm-0 min-h-[28px] text-center text-[17px] font-extrabold transition-colors',
          done ? 'text-feedback-success-text' : 'text-ui-muted-strong',
        )}
      >
        {done ? doneText : 'Drag along the line from the pulsing dot.'}
      </p>
    </div>
  );
}

interface MarkCompareViewProps {
  tones: ToneMark[];
}

export function MarkCompareView({ tones }: MarkCompareViewProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 rounded-feature border-[3px] border-b-[6px] border-ui-divider bg-ui-surface px-5 py-6">
      {tones.map((t) => (
        <div key={t} className="flex flex-col items-center gap-2">
          <DecomposedSyllable
            finalPart="a"
            tone={t}
            litFin={false}
            litTone
            sizeClass="text-[76px] md:text-[84px]"
          />
          <ToneContour tone={t} toneColored className="h-[60px] w-[96px]" />
          <span className="text-sm font-black uppercase tracking-wider text-ui-muted-strong">{TONE_NAMES[t]}</span>
        </div>
      ))}
    </div>
  );
}
