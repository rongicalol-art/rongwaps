import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { cn } from '../../../utils/cn';
import type { MouthSoundId } from '../data/types';
import {
  CALM_POSE,
  computeMouthPaths,
  IN_MATRIX,
  lerpVec,
  MOUTH_SOUNDS,
  poseToVec,
  ringSpot,
  type MouthPose,
} from './mouthGeometry';
import './mouthIllustration.css';

export interface MouthShowOptions {
  silent?: boolean;
  externalAudio?: boolean;
  after?: 'calm' | 'pose';
}

export interface MouthHandle {
  show: (id: MouthSoundId, opts?: MouthShowOptions) => void;
  rest: () => void;
  /** Put the gold ring on a named spot (see `ringSpot`), or hide it with null. */
  mark: (spot: string | null) => void;
}

interface MouthStageProps {
  onPlayAudio?: (audioKey: string) => void;
  className?: string;
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const MouthStage = forwardRef<MouthHandle, MouthStageProps>(function MouthStage({ onPlayAudio, className }, ref) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const tgId = `${uid}-tg`;
  const ngId = `${uid}-ng`;
  const frameId = `${uid}-frame`;
  const upClipId = `${uid}-up`;
  const lowClipId = `${uid}-low`;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const jawSkinRef = useRef<SVGGElement | null>(null);
  const gapRef = useRef<SVGPathElement | null>(null);
  const velRef = useRef<SVGPathElement | null>(null);
  const airinRef = useRef<SVGPathElement | null>(null);
  const jawTRef = useRef<SVGGElement | null>(null);
  const tongueRef = useRef<SVGPathElement | null>(null);
  const shineRef = useRef<SVGPathElement | null>(null);
  const tlineRef = useRef<SVGPathElement | null>(null);
  const hyoidRef = useRef<SVGGElement | null>(null);
  const jawInRef = useRef<SVGGElement | null>(null);
  const lowPadRef = useRef<SVGPathElement | null>(null);
  const lowClipRef = useRef<SVGPathElement | null>(null);
  const lowRimRef = useRef<SVGPathElement | null>(null);
  const lowerRef = useRef<SVGPathElement | null>(null);
  const upPadRef = useRef<SVGPathElement | null>(null);
  const upClipRef = useRef<SVGPathElement | null>(null);
  const upRimRef = useRef<SVGPathElement | null>(null);
  const upperRef = useRef<SVGPathElement | null>(null);
  const airRef = useRef<SVGGElement | null>(null);
  const ringRef = useRef<SVGGElement | null>(null);
  const ringAtRef = useRef<string | null>(null);

  const curVecRef = useRef<number[]>(poseToVec(CALM_POSE));
  const rafRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);
  const playAudioRef = useRef(onPlayAudio);
  playAudioRef.current = onPlayAudio;

  const initialPaths = useMemo(() => computeMouthPaths(poseToVec(CALM_POSE)), []);

  const applyVec = (vec: number[]) => {
    curVecRef.current = vec;
    const p = computeMouthPaths(vec);
    tongueRef.current?.setAttribute('d', p.tongueD);
    tlineRef.current?.setAttribute('d', p.tongueD);
    shineRef.current?.setAttribute('d', p.shineD);
    upPadRef.current?.setAttribute('d', p.upPadD);
    upClipRef.current?.setAttribute('d', p.upPadD);
    upRimRef.current?.setAttribute('d', p.upRimD);
    upperRef.current?.setAttribute('d', p.upperD);
    lowPadRef.current?.setAttribute('d', p.lowPadD);
    lowClipRef.current?.setAttribute('d', p.lowPadD);
    lowRimRef.current?.setAttribute('d', p.lowRimD);
    lowerRef.current?.setAttribute('d', p.lowerD);
    jawSkinRef.current?.setAttribute('transform', p.jawSkinTransform);
    jawInRef.current?.setAttribute('transform', p.jawTransform);
    jawTRef.current?.setAttribute('transform', p.jawTransform);
    hyoidRef.current?.setAttribute('transform', p.hyoidTransform);
    gapRef.current?.setAttribute('d', p.gapD);
    velRef.current?.setAttribute('d', p.velD);
    if (airinRef.current) airinRef.current.style.opacity = p.airInOpacity;
    airRef.current?.setAttribute('transform', p.airTransform);
  };

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const animateTo = (pose: MouthPose, ms: number) => {
    window.cancelAnimationFrame(rafRef.current);
    const a = curVecRef.current.slice();
    const b = poseToVec(pose);
    if (reduceMotion() || !ms) {
      applyVec(b);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / ms);
      applyVec(lerpVec(a, b, u));
      if (u < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      }
    };
    rafRef.current = window.requestAnimationFrame(step);
  };

  const setAirFx = (kind: string) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.classList.remove('air-on');
    svg.dataset.air = '';
    void svg.getBoundingClientRect();
    svg.dataset.air = kind;
    if (kind) svg.classList.add('air-on');
  };

  const airOff = () => {
    svgRef.current?.classList.remove('air-on');
  };

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    applyVec(curVecRef.current);
    return () => {
      clearTimers();
      window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    show(id, opts = {}) {
      const spec = MOUTH_SOUNDS[id];
      if (!spec) return;
      clearTimers();
      if (svgRef.current) {
        svgRef.current.dataset.paper = spec.paper ? '1' : '';
      }
      setAirFx('');

      let t = 0;
      if (spec.pre) {
        animateTo(spec.pre, 220);
        t = 430;
        later(() => animateTo(spec.pose, 260), t);
      } else {
        animateTo(spec.pose, 250);
      }

      if (opts.silent) return;

      const at = spec.pre ? 120 : 260;
      if (!opts.externalAudio) later(() => playAudioRef.current?.(spec.au), at);

      const settle = (ms: number) =>
        later(() => {
          airOff();
          animateTo(opts.after === 'pose' ? spec.pose : CALM_POSE, 550);
        }, ms);

      if (!spec.v || !spec.tm) {
        if (spec.air) {
          const airKind = spec.air;
          later(() => setAirFx(airKind), t + 270);
        }
        settle(at + (spec.end ?? 800) + 450);
        return;
      }

      const [on, end] = spec.tm;
      const stop = Boolean(spec.paper);
      const nasal = spec.air === 'nose';
      if (!stop && spec.air) {
        const airKind = spec.air;
        later(() => setAirFx(airKind), at);
      }
      const vowelPose = spec.v[0];
      later(() => {
        if (stop && spec.air) setAirFx(spec.air);
        animateTo(nasal ? { ...vowelPose, vel: 1 } : vowelPose, stop ? 110 : 160);
      }, at + on - (stop ? 25 : 70));

      if (!stop && spec.air) {
        later(airOff, at + Math.max(on + (nasal ? 350 : 250), nasal ? 750 : 650));
      }
      if (spec.v[1]) {
        const secondPose = spec.v[1];
        later(() => animateTo(secondPose, 200), at + on + (end - on) * 0.45);
      }
      settle(at + end + 450);
    },
    rest() {
      clearTimers();
      airOff();
      animateTo(CALM_POSE, 400);
    },
    // Glides to a new spot; fades in only when it was hidden, so it never blinks.
    mark(spot) {
      const svg = svgRef.current, ring = ringRef.current;
      const at = spot ? ringSpot(spot) : null;
      if (!svg || !ring) return;
      if (!at) {
        svg.classList.remove('m-hit');
        ringAtRef.current = null;
        return;
      }
      const move = `translate(${at[0]}px, ${at[1]}px) scale(.52)`;
      if (!ringAtRef.current) {
        ring.style.transition = 'none';
        ring.style.transform = move;
        void ring.getBoundingClientRect();
        ring.style.transition = '';
        svg.classList.add('m-hit');
      } else {
        ring.style.transform = move;
      }
      ringAtRef.current = spot;
    },
  }));

  return (
    <div className={cn('m-stage', className)}>
      <svg
        ref={svgRef}
        className="m-portrait"
        viewBox="-10 170 220 172"
        role="img"
        aria-label="Cutaway profile of a speaker showing lips, teeth, tongue, and roof of the mouth"
      >
        <defs>
          <linearGradient id={tgId} gradientUnits="userSpaceOnUse" x1="92" y1="254" x2="120" y2="330">
            <stop offset="0" className="m-stop-tg1" />
            <stop offset=".5" className="m-stop-tg2" />
            <stop offset=".78" className="m-stop-tg3" />
            <stop offset="1" className="m-stop-tg3" />
          </linearGradient>
          <linearGradient id={ngId} gradientUnits="userSpaceOnUse" x1="0" y1="247" x2="0" y2="262">
            <stop offset="0" className="m-stop-ng1" />
            <stop offset="1" className="m-stop-ng2" />
          </linearGradient>
          <clipPath id={frameId}>
            <rect x="-10" y="170" width="220" height="172" />
          </clipPath>
          <clipPath id={upClipId}>
            <path ref={upClipRef} d={initialPaths.upPadD} />
          </clipPath>
          <clipPath id={lowClipId}>
            <path ref={lowClipRef} d={initialPaths.lowPadD} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${frameId})`}>
          {/* neck */}
          <path className="m-skin" d="M84 330Q100 340 104 364L236 364L236 266L186 266Z" />
          {/* lower jaw */}
          <g transform={IN_MATRIX}>
            <g ref={jawSkinRef} transform={initialPaths.jawSkinTransform}>
              <path
                className="m-jaw-shadow"
                d="M74 398L150 400Q214 395 236 374L244 386Q218 417 150 421Q104 421 86 404Z"
              />
              <path
                className="m-skin"
                d="M70 314L62 339Q52 353 54.5 370Q58 394 80 398L150 398Q220 392 244 366L258 300L262 262L100 280Z"
              />
            </g>
          </g>
          {/* head */}
          <path
            className="m-skin"
            d="M76 164Q66 172 66 180Q66 186 71 190L47 231Q38 237 38 243Q39 249 47 250L60 253.6L66 266L86 273L186 268L236 280L236 164Z"
          />
          {/* hair, ear, eye */}
          <path
            className="m-hair"
            d="M124 164Q146 178 166 184Q180 190 183 214L191 212Q190 190 198 182Q212 170 228 181L236 190L236 164Z"
          />
          <path className="m-hair" d="M228 198Q235 232 227 264L236 270L236 190Z" />
          <path
            className="m-ear"
            d="M190 210Q190 181 208 180Q228 182 226 212Q224 240 210 254Q198 260 194 246Q190 230 190 210Z"
          />
          <path className="m-ear-line" d="M198 208Q204 191 216 200Q221 216 212 232M202 220Q209 223 206 234" />
          <path className="m-nose-line" d="M50 247Q56 243 60 250" />
          <path className="m-eye-white" d="M86 199Q98 188 114 196Q104 206 86 199Z" />
          <circle cx="98" cy="197" r="5" className="m-eye-iris" />
          <circle cx="96.5" cy="195.4" r="1.4" className="m-eye-white" />
          <path className="m-brow" d="M84 199Q98 186 117 195" />
          <path className="m-brow-top" d="M80 181Q98 171 123 178" />
          {/* cutaway interior */}
          <path
            className="m-flesh"
            d="M72 229Q64.5 233.5 61.8 240Q59.4 245.5 61.2 249.6L61.8 254.4L66 263L70 272L118 292L139 330L139 366L186.5 366L185.4 326L183.6 273.2L181.8 242Q178.8 227.6 164.4 226.4L118.8 224.6L85.2 225.2Q76.5 225.2 72 229Z"
          />
          <path
            className="m-edge"
            d="M61.2 249.6Q59.4 245.5 61.8 240Q64.5 233.5 72 229Q76.5 225.2 85.2 225.2L118.8 224.6L164.4 226.4Q178.8 227.6 181.8 242L183.6 273.2L185.4 326L186.5 366M139 336L139 366"
          />
          {/* nose passage */}
          <path
            fill={`url(#${ngId})`}
            d="M66 251.5Q62 247.5 66.5 243Q78 236.6 96 236L136 236Q152 236.5 159 241Q162.5 247 164.3 259L164.4 265L123 265L124.5 257Q123.5 250.6 117 249.8L100 249.4Q84 249.4 73 252.4Q69 254 66 251.5Z"
          />
          {/* mouth & throat */}
          <path
            className="m-dark"
            d="M66.5 268L74.3 267.4C75.3 267.8 76.2 268.5 77.2 268.5C78.2 268.5 79.3 268.2 80.2 267.4C81.1 266.6 81.7 265.5 82.4 264.6C83.1 263.7 83.5 262.7 84.2 261.8C85.1 260.8 86.2 259.9 87.6 259.1C89 258.3 90.7 257.6 92.6 257C94.7 256.4 97.3 255.8 100 255.5C103.1 255.2 106.9 255.3 110 255.3C113 255.4 115.6 255.6 118 256C120.4 256.4 122.4 257.1 124.5 257.6L164.2 258L165.6 300L167 366L153.5 366L153.5 334L139 328L88 326L74 312L67.5 285L66.5 268Z"
          />
          <path ref={gapRef} className="m-dark" d={initialPaths.gapD} />
          <path ref={velRef} className="m-vel" d={initialPaths.velD} />
          {/* hard roof */}
          <path
            className="m-bone"
            d="M69.6 258.5C71 254 78 251.8 96 251.7L117 252Q121 252.6 121.6 254.4L104 253.7C93 253.8 88 255.6 84.8 257.8C82 260 80.5 263 78 264.2C74.6 265.2 70.4 263.2 69.6 258.5Z"
          />
          <path
            ref={airinRef}
            className="m-airin"
            d="M160 318C161 290 163 268 158 250C153 242 142 242.6 128 242.6L92 243Q76 243.6 68 248.4"
            style={{ opacity: 0 }}
          />
          {/* top tooth & gum */}
          <path
            className="m-tooth"
            d="M67.2 264.6C65.8 269 64.4 274 64 277.6Q64.1 279.1 65.5 278.7C68 276.8 70.4 274.4 72.2 271.8C73.6 270 74.4 268.4 74.2 266.4Q70.6 263 67.2 264.6Z"
          />
          <path
            className="m-gum"
            d="M66.8 266Q70.4 263.7 74.3 267.4C75.3 267.8 76.2 268.5 77.2 268.5C78.2 268.5 79.3 268.2 80.2 267.4C81.1 266.6 81.7 265.5 82.4 264.6C83.1 263.7 83.5 262.7 84.2 261.8C85.1 260.8 86.2 259.9 87.6 259.1C89 258.3 90.7 257.6 92.6 257C94.7 256.4 97.3 255.8 100 255.5C103.1 255.2 106.9 255.3 110 255.3C113 255.4 115.6 255.6 118 256C120.4 256.4 122.4 257.1 124.5 257.6L124.2 254.8C112 253.2 102 252.9 94 254C88.5 255 85.5 257.8 83 260.6C80.5 263.6 78 265.4 74.5 264.6C71 263.8 69 262 67.4 262.6Z"
          />
          {/* tongue */}
          <g ref={jawTRef} transform={initialPaths.jawTransform}>
            <path className="m-dark" d="M65.8 279.8L100 270L150 280L150 320L84 320L67 291Z" />
            <path
              className="m-under"
              d="M79 304C84 299 91 294.5 99 291C108 287.5 120 286 132 286.5C142 287 150 289 153.4 292L153.6 326L88 324Z"
            />
          </g>
          <path ref={tongueRef} fill={`url(#${tgId})`} d={initialPaths.tongueD} />
          <path ref={shineRef} className="m-tshine" d={initialPaths.shineD} />
          <path ref={tlineRef} className="m-tline" d={initialPaths.tongueD} />
          <g ref={hyoidRef} transform={initialPaths.hyoidTransform}>
            <path
              className="m-flesh"
              d="M108 337C118 335.5 125 329.5 131 326C134 324.4 136 323.6 138 323C141.5 322.2 144 321 146.6 321C149 321 150 321.6 150.6 322.2C152 323.4 153 324.6 153.2 326L153.5 366L139 366L139 334Z"
            />
            <path
              className="m-epi"
              d="M149.8 322C151.8 315 154.2 308 155.6 302.4Q157 301 157.2 303.4C156.8 311 155 318 153.4 324.8Z"
            />
          </g>
          {/* lower jaw interior + lower lip */}
          <g ref={jawInRef} transform={initialPaths.jawTransform}>
            <path
              className="m-tooth"
              d="M68 279Q67 279.1 67 280.4C66.6 283.4 66.3 286.6 66.3 291L73.4 290.8C73.6 288 73.3 286 72.4 284.2C71.3 282.2 69.7 280.6 68 279Z"
            />
            <path ref={lowPadRef} className="m-flesh" d={initialPaths.lowPadD} />
            <path
              className="m-bone"
              d="M68.3 292.4C66.5 298 66 306 66.8 313.6C67.7 320.6 71.6 324 76.4 322.8C80.3 321.6 80.9 316.6 80 311.6C78.8 304.6 76.2 297.6 73.2 292.2Q70.7 290.8 68.3 292.4Z"
            />
            <path className="m-gumline" d="M66.3 290.7Q69.8 292.4 73.5 290.5" />
            <g clipPath={`url(#${lowClipId})`}>
              <path ref={lowRimRef} className="m-rim" d={initialPaths.lowRimD} />
              <path ref={lowerRef} className="m-lip" d={initialPaths.lowerD} />
            </g>
          </g>
          {/* upper lip */}
          <path ref={upPadRef} className="m-flesh" d={initialPaths.upPadD} />
          <g clipPath={`url(#${upClipId})`}>
            <path ref={upRimRef} className="m-rim" d={initialPaths.upRimD} />
            <path ref={upperRef} className="m-lip" d={initialPaths.upperD} />
          </g>
          {/* shirt */}
          <path className="m-shirt" d="M92 364Q122 346 160 351L236 334L236 364Z" />
          <path className="m-collar" d="M101 361Q126 349 160 352L234 336" />
          <g transform={IN_MATRIX}>
            <g ref={airRef} className="m-air" transform={initialPaths.airTransform}>
              <path className="a-main" d="M30 0L-78 0" />
              <path className="a-side" d="M30 -8L-64 -36" />
              <path className="a-side" d="M30 8L-64 36" />
            </g>
            <g className="m-paper">
              <path d="M-36 236h22c3 44-5 88 2 136h-22c-7-48 1-92-2-136Z" />
              <path className="m-clip" d="M-38 236h26" />
            </g>
          </g>
        </g>
        <g ref={ringRef} className="m-ring">
          <circle r="22" className="m-ring-edge" />
          <circle r="22" className="m-ring-gold" />
        </g>
      </svg>
    </div>
  );
});

interface MouthLabViewProps {
  sounds: MouthSoundId[];
  first: MouthSoundId;
  activeSound?: MouthSoundId | null;
  quiet?: boolean;
  onPlayAudio: (audioKey: string) => void;
  mouthRef?: React.RefObject<MouthHandle | null>;
}

export function MouthLabView({
  sounds,
  first,
  activeSound,
  quiet = true,
  onPlayAudio,
  mouthRef: externalRef,
}: MouthLabViewProps) {
  const internalRef = useRef<MouthHandle | null>(null);
  const stageRef = externalRef ?? internalRef;
  const [selected, setSelected] = useState<MouthSoundId>(first);
  const [caption, setCaption] = useState<string>('Tap a sound.');

  useEffect(() => {
    setSelected(first);
    setCaption(MOUTH_SOUNDS[first]?.cue ?? 'Tap a sound.');
  }, [first, stageRef]);

  useEffect(() => {
    if (activeSound && MOUTH_SOUNDS[activeSound]) {
      setSelected(activeSound);
      setCaption(MOUTH_SOUNDS[activeSound].cue);
    }
  }, [activeSound]);

  const handleChipClick = (id: MouthSoundId) => {
    setSelected(id);
    setCaption(MOUTH_SOUNDS[id]?.cue ?? '');
    stageRef.current?.show(id);
    stageRef.current?.mark(id);
  };

  return (
    <div className="sh-mouth-wrap">
      <div className={cn('mouth', quiet && 'm-quiet')}>
        <MouthStage ref={stageRef} onPlayAudio={onPlayAudio} />
        <div className="m-side">
          <div className="m-chips">
            <div className="m-row">
              {sounds.map((id) => {
                const isSelected = selected === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleChipClick(id)}
                    className={cn(
                      'min-h-13 min-w-14.5 cursor-pointer rounded-compact border-2 border-b-[length:var(--depth-lg)] px-3 text-2xl font-black transition-[transform,border-color,background-color] duration-100 active:mb-0.75 active:translate-y-0.75 active:border-b-2 focus-ring',
                      isSelected
                        ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep'
                        : 'border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover',
                    )}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
          </div>
          {!quiet && (
            <p className="min-h-[3em] text-center text-base font-extrabold text-ui-muted-strong md:text-left" aria-live="polite">
              {caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export interface MouthQuizOption {
  label: string;
  sound: MouthSoundId;
  right?: boolean;
  say: string;
}

interface MouthQuizViewProps {
  ask: string;
  options: MouthQuizOption[];
  onPlayAudio: (audioKey: string) => void;
  onAnsweredCorrect?: () => void;
}

export function MouthQuizView({ ask, options, onPlayAudio, onAnsweredCorrect }: MouthQuizViewProps) {
  const stageRef = useRef<MouthHandle | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [feedbackSay, setFeedbackSay] = useState<string>('');

  useEffect(() => {
    setPickedIndex(null);
    setFeedbackSay('');
    stageRef.current?.rest();
  }, [ask]);

  const handlePick = (opt: MouthQuizOption, index: number) => {
    setPickedIndex(index);
    setFeedbackSay(opt.say);
    stageRef.current?.show(opt.sound);
    if (opt.right) {
      onAnsweredCorrect?.();
    }
  };

  return (
    <div className="sh-mouth-wrap">
      <div className="mouth m-quiz">
        <MouthStage ref={stageRef} onPlayAudio={onPlayAudio} />
        <div className="m-side">
          <div className="flex w-full flex-col gap-2">
            {options.map((opt, idx) => {
              const isPicked = pickedIndex === idx;
              const isRight = isPicked && opt.right;
              const isWrong = isPicked && !opt.right;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handlePick(opt, idx)}
                  className={cn(
                    'flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded-compact border-2 border-b-[length:var(--depth-lg)] px-3 py-2 text-left text-lg font-extrabold transition-[transform,border-color,background-color] duration-100 active:mb-0.75 active:translate-y-0.75 active:border-b-2 focus-ring',
                    isRight
                      ? 'border-feedback-success bg-feedback-success-surface text-feedback-success-text'
                      : isWrong
                        ? 'border-feedback-danger bg-feedback-danger-surface text-feedback-danger-text'
                        : 'border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5.5 shrink-0 items-center justify-center rounded-[8px] border-2 text-xs font-black',
                      isRight
                        ? 'border-feedback-success text-feedback-success-text'
                        : isWrong
                          ? 'border-feedback-danger text-feedback-danger-text'
                          : 'border-ui-border text-ui-muted-strong',
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="flex-1 leading-snug">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="min-h-[3em] text-center text-lg font-extrabold text-ui-muted-strong md:text-left" aria-live="polite">
            {feedbackSay || 'Tap an answer.'}
          </p>
        </div>
      </div>
    </div>
  );
}
