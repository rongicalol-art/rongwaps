import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { FIRE, FIRE_DROP, LOW_BURN, SETTLED_FIRE, firePaths, fireTip, track, type FireTracks } from '../streakFire';

const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const RISE = 'cubic-bezier(.16,1,.3,1)';
const BLOCK = 'cubic-bezier(.2,.8,.2,1)';
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const POP: Keyframe[] = [{ opacity: 0, transform: 'translateY(14px) scale(.7)' }, { opacity: 1, transform: 'none' }];
const PRESS: Keyframe[] = [{ transform: 'none' }, { transform: 'translateY(3px)' }, { transform: 'none' }];
const DROP_SVG = `<svg viewBox="${FIRE_DROP.viewBox}" style="position:absolute;left:-9px;top:-20px;width:18px;height:28px;overflow:visible" aria-hidden="true"><path class="fill-streak" d="${FIRE_DROP.body}"/><path class="fill-streak-glow" d="${FIRE_DROP.gold}"/></svg>`;
const BIT = 'pointer-events-none absolute left-0 top-0 opacity-0';
const dot = (size: number, fill: string, radius = '50%') => `<i class="${fill}" style="position:absolute;width:${size}px;height:${size}px;margin:${-size / 2}px;border-radius:${radius}"></i>`;
const EMBER_FILLS = ['bg-streak', 'bg-streak-glow', 'bg-streak-core', 'bg-streak-edge'];
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const round1 = (value: number) => Math.round(value * 10) / 10;

export interface StreakMomentProps {
  /** The streak including today. */
  streak: number;
  /** Monday to Sunday: studied that day. Today is already true. */
  week: boolean[];
  /** 0 = Monday. */
  todayIndex: number;
  onContinue: () => void;
}

/**
 * Plays once a day after the first finished session, when the streak goes up. The fire catches low over
 * yesterday's number and throws a piece of itself to today's circle; the landing gives today its check,
 * rolls the number and makes the fire roar, then Continue rises (~3.3s). A tap skips to the end.
 * Laid out as a sibling of Session complete, so Continue does not move between the two.
 */
export function StreakMoment({ streak, week, todayIndex, onContinue }: StreakMomentProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const next = String(streak);
  const prev = String(streak - 1).padStart(next.length, ' ');

  const rootRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<SVGSVGElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<() => void>(() => {});
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  useLayoutEffect(() => {
    const root = rootRef.current, fx = fxRef.current, glow = glowRef.current, flame = flameRef.current, num = numRef.current;
    const title = titleRef.current, weekEl = weekRef.current, button = buttonRef.current;
    if (!flame) return undefined;
    const paths = Array.from(flame.querySelectorAll('path'));
    const paint = (tracks: FireTracks, time: number, noise: number) => firePaths(tracks, time, noise).forEach((d, i) => paths[i]?.setAttribute('d', d));
    if (reduceMotion) { paint(SETTLED_FIRE, 0, 400); return undefined; }
    if (!root || !fx || !glow || !num || !title || !weekEl || !button) return undefined;

    // Measure before anything is animated: where the fire stands, and where today's circle is.
    const rootBox = root.getBoundingClientRect();
    const at = (el: Element) => { const b = el.getBoundingClientRect(); return { x: b.left - rootBox.left, y: b.top - rootBox.top + root.scrollTop, w: b.width, h: b.height }; };
    const f = at(flame);
    const unit = f.w / FIRE.VIEW_BOX[2];
    const ox = f.x + f.w / 2, oy = f.y + f.h - (FIRE.VIEW_BOX[1] + FIRE.VIEW_BOX[3]) * unit; // the base of the fire
    const today = weekEl.querySelector<HTMLElement>('[data-today]');
    const todayDot = today?.querySelector<HTMLElement>('[data-dot]');
    if (!today || !todayDot) return undefined;
    const target = at(todayDot);
    const css = getComputedStyle(root);
    const hot = { core: css.getPropertyValue('--color-streak-core').trim(), gold: css.getPropertyValue('--color-streak-glow').trim(), streak: css.getPropertyValue('--color-streak').trim(), text: css.getPropertyValue('--color-streak-text').trim() };

    const anims: Animation[] = [];
    let dead = false, skipped = false, frame = 0;
    const A = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const anim = el.animate(keyframes, { fill: 'both', ...options });
      anims.push(anim);
      return anim;
    };
    const bit = (html: string, layer: HTMLElement = fx) => { const el = document.createElement('div'); el.className = BIT; el.innerHTML = html; layer.append(el); return el; };
    /** A day circle fills from its centre, then its check pops. */
    const fillDot = (day: Element, delay: number, big: boolean) => {
      const fill = day.querySelector('[data-fill]'), check = day.querySelector('[data-check]');
      if (fill) A(fill, [{ transform: 'scale(0)' }, { transform: `scale(${big ? 1.3 : 1.18})`, offset: 0.55 }, { transform: 'scale(1)' }], { delay, duration: big ? 420 : 300, easing: 'ease-out' });
      if (check) A(check, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'none' }], { delay: delay + (big ? 130 : 90), duration: big ? 300 : 220, easing: SPRING });
    };

    // Beats, in ms.
    const past = Array.from(weekEl.querySelectorAll('[data-past]'));
    past.forEach((day, i) => fillDot(day, 820 + i * 55, false));
    const pastEnd = past.length ? 820 + (past.length - 1) * 55 + 300 : 820;
    const crouch = Math.max(1200, pastEnd + 70); // the fire gathers itself
    const release = crouch + 300, flyMs = 480;
    const land = release + flyMs - 10;
    const roll = land + 70;
    const tracks: FireTracks = {
      g: track([[70, 0], [330, 1.2], [480, 0.94], [620, 1]]), // it catches from nothing, with a jump
      e: track([[roll, LOW_BURN], [roll + 180, 1.6], [roll + 520, 0.9], [roll + 800, 1]]), // and roars when today counts
      h: track([[crouch, 1], [crouch + 200, 0.74], [crouch + 320, 1.26], [crouch + 520, 1]]),
      w: track([[crouch, 1], [crouch + 200, 1.13], [crouch + 320, 0.86], [crouch + 520, 1]]),
    };
    const started = performance.now();
    const draw = () => {
      if (dead) return;
      const now = performance.now() - started;
      paint(tracks, skipped ? Infinity : now, now);
      frame = requestAnimationFrame(draw);
    };
    draw();

    // A spark at the base, and the fire jumps up out of it.
    A(bit(dot(14, 'bg-streak-core')), [
      { opacity: 0, transform: `translate(${ox}px, ${oy - 4}px) scale(0)` },
      { opacity: 1, transform: `translate(${ox}px, ${oy - 6}px) scale(1.5)`, offset: 0.4 },
      { opacity: 0, transform: `translate(${ox}px, ${oy - 14}px) scale(.2)` },
    ], { duration: 320, easing: 'ease-out' });
    A(num, POP, { delay: 330, duration: 520, easing: SPRING });
    Array.from(title.children).forEach((word, i) => A(word, POP, { delay: 460 + i * 110, duration: 520, easing: SPRING }));
    A(weekEl, [
      { opacity: 0, transform: 'translateY(28px) scale(.92)' },
      { opacity: 1, transform: 'translateY(-4px) scale(1.02)', offset: 0.45 },
      { opacity: 1, transform: 'none' },
    ], { delay: 620, duration: 520, easing: BLOCK });

    // The throw: a piece of the tip breaks off and falls to today's circle on a true arc, tail behind it.
    const tip = fireTip(tracks, release, release);
    const p0 = { x: ox + tip.x * unit, y: oy - tip.y * unit };
    const p2 = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
    const p1 = { x: p0.x + (p2.x - p0.x) * 0.42, y: p0.y - 96 };
    const STEPS = 22;
    let angle = -Math.PI;
    const path = Array.from({ length: STEPS + 1 }, (_, i) => {
      const u = i / STEPS;
      const x = (1 - u) * (1 - u) * p0.x + 2 * u * (1 - u) * p1.x + u * u * p2.x;
      const y = (1 - u) * (1 - u) * p0.y + 2 * u * (1 - u) * p1.y + u * u * p2.y;
      const vx = (1 - u) * (p1.x - p0.x) + u * (p2.x - p1.x), vy = (1 - u) * (p1.y - p0.y) + u * (p2.y - p1.y);
      let a = Math.atan2(-vx, vy);
      while (a - angle > Math.PI) a -= Math.PI * 2;
      while (a - angle < -Math.PI) a += Math.PI * 2;
      angle = a;
      return { u, x, y, a };
    });
    A(bit(DROP_SVG), path.map((p) => ({
      offset: p.u,
      opacity: p.u < 0.06 || p.u > 0.97 ? 0 : 1,
      transform: `translate(${round1(p.x)}px, ${round1(p.y)}px) rotate(${p.a.toFixed(3)}rad) scale(${round1(p.u < 0.2 ? 0.5 + 3.5 * p.u : 1.2 - (0.45 * (p.u - 0.2)) / 0.8)})`,
    })), { delay: release, duration: flyMs, easing: 'linear' });
    [0.62, 0.44, 0.3].forEach((size, k) => A(bit(dot(12, 'bg-streak')), path.map((p) => ({
      offset: p.u,
      opacity: p.u < 0.06 || p.u > 0.94 ? 0 : 0.85 - k * 0.2,
      transform: `translate(${round1(p.x)}px, ${round1(p.y)}px) scale(${round1(size * (1 - 0.4 * p.u))})`,
    })), { delay: release + 42 * (k + 1), duration: flyMs, easing: 'linear' }));

    // The landing: today's circle catches hot and cools, a ring pulses out, the day squashes, the card takes the hit.
    fillDot(today, land, true);
    const todayFill = today.querySelector('[data-fill]'), pulse = today.querySelector('[data-pulse]');
    if (todayFill) A(todayFill, [{ backgroundColor: hot.core }, { backgroundColor: hot.gold, offset: 0.35 }, { backgroundColor: hot.streak }], { delay: land, duration: 620, easing: 'ease-out', fill: 'none' });
    if (pulse) A(pulse, [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.2)' }], { delay: land, duration: 580, easing: 'ease-out' });
    A(today, [{ transform: 'none' }, { transform: 'translateY(4px) scale(1.1, .9)', offset: 0.3 }, { transform: 'translateY(-3px) scale(.97, 1.05)', offset: 0.62 }, { transform: 'none' }], { delay: land, duration: 440, easing: 'ease-out', fill: 'none' });
    A(weekEl, PRESS, { delay: land, duration: 170, easing: 'ease-out', fill: 'none' });

    // The number rolls (only the digits that change, right to left) and arrives hot; its landing presses the words under it.
    const columns = Array.from(num.querySelectorAll<HTMLElement>('[data-roll]')).reverse();
    columns.forEach((column, i) => {
      const delay = roll + i * 55;
      const [oldDigit, newDigit] = Array.from(column.children);
      if (column.hasAttribute('data-grow')) A(column, [{ width: '0em' }, { width: '.64em' }], { delay, duration: 260, easing: RISE });
      A(oldDigit, [{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }], { delay, duration: 240, easing: 'cubic-bezier(.5,0,.8,.4)' });
      A(newDigit, [{ transform: 'translateY(110%)' }, { transform: 'translateY(-7%)', offset: 0.6 }, { transform: 'translateY(0)' }], { delay, duration: 500, easing: BLOCK });
    });
    const landed = roll + Math.max(0, columns.length - 1) * 55 + 280;
    A(num, [{ transform: 'none' }, { transform: 'scale(1.12, .88)', offset: 0.3 }, { transform: 'scale(.95, 1.06)', offset: 0.65 }, { transform: 'none' }], { delay: landed, duration: 460, easing: 'ease-out', fill: 'none' });
    A(num, [{ color: hot.core }, { color: hot.gold, offset: 0.3 }, { color: hot.text }], { delay: roll + 120, duration: 760, easing: 'ease-out', fill: 'none' });
    A(title, PRESS, { delay: landed + 60, duration: 180, easing: 'ease-out', fill: 'none' });

    // The roar: a glow, pieces of fire thrown outward, embers lifting off.
    const halo = bit('<i style="position:absolute;left:-110px;top:-110px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--color-streak) 46%,transparent),transparent 66%)"></i>', glow);
    const cy = oy - FIRE.H * 0.5 * unit;
    A(halo, [
      { opacity: 0, transform: `translate(${ox}px, ${cy}px) scale(.5)` },
      { opacity: 1, transform: `translate(${ox}px, ${cy}px) scale(1.1)`, offset: 0.35 },
      { opacity: 0, transform: `translate(${ox}px, ${cy}px) scale(1.45)` },
    ], { delay: roll + 40, duration: 1150, easing: 'ease-out' });
    const PIECES = 9;
    for (let i = 0; i < PIECES; i++) {
      const a = (-104 + (208 * i) / (PIECES - 1)) * (Math.PI / 180) + (hash(i + streak) - 0.5) * 0.2;
      const reach = (i % 2 ? 92 : 68) * (0.9 + 0.3 * hash(i * 7));
      const frameAt = (r: number, scale: number, opacity: number): Keyframe => ({ opacity, transform: `translate(${round1(ox + Math.sin(a) * r)}px, ${round1(cy - Math.cos(a) * r)}px) rotate(${(a + Math.PI).toFixed(3)}rad) scale(${scale})` });
      A(bit(DROP_SVG), [frameAt(26, 0.3, 0), { ...frameAt(reach * 0.72, 1, 1), offset: 0.38 }, frameAt(reach, 0, 1)], { delay: roll + 60 + (i % 3) * 30, duration: 600, easing: 'cubic-bezier(.15,.7,.3,1)' });
    }
    const top = oy - FIRE.H * 0.8 * unit;
    for (let i = 0; i < 12; i++) {
      const size = 5 + ((i * 7) % 5);
      const ember = bit(dot(size, EMBER_FILLS[i % 4], i % 3 ? '50%' : '2px'));
      const x0 = ox + ((i * 37) % 60) - 30, drift = ((i * 53) % 56) - 28, rise = 74 + ((i * 29) % 70);
      A(ember, [
        { opacity: 0, transform: `translate(${x0}px, ${top}px) scale(.4)` },
        { opacity: 1, transform: `translate(${x0 + drift * 0.4}px, ${top - rise * 0.45}px) scale(1)`, offset: 0.3 },
        { opacity: 0, transform: `translate(${x0 + drift}px, ${top - rise}px) scale(.5)` },
      ], { delay: roll + 90 + ((i * 61) % 260), duration: 900 + ((i * 43) % 400), easing: 'cubic-bezier(.2,.6,.3,1)' });
    }
    const shine = weekEl.querySelector('[data-shine]');
    if (shine) A(shine, [{ translate: '-120% 0' }, { translate: '120% 0' }], { delay: roll + 460, duration: 600, easing: 'ease-in-out' });
    A(button, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: landed + 300, duration: 450, easing: RISE });

    // A tap anywhere skips to the finished screen; the fire keeps burning.
    skipRef.current = () => {
      if (dead || skipped) return;
      skipped = true;
      anims.forEach((anim) => anim.finish());
    };
    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      anims.forEach((anim) => anim.cancel());
      fx.replaceChildren();
      glow.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the moment is built once per mount
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return;
      event.preventDefault();
      continueRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      ref={rootRef}
      onPointerDown={(event) => { if (!(event.target as HTMLElement).closest('button')) skipRef.current(); }}
      className="absolute inset-0 flex flex-col items-center overflow-y-auto overscroll-contain px-4 pb-sheet-safe md:pb-14"
    >
      <div className="my-auto flex w-full shrink-0 flex-col items-center">
        {/* Same hero box as Session complete, so the two screens line up. */}
        <div
          className="relative mt-[clamp(12px,2.5dvh,24px)] flex h-[var(--bb)] w-full shrink-0 flex-col items-center justify-end"
          style={{ '--bb': 'clamp(190px,25dvh,260px)' } as CSSProperties}
        >
          <svg
            ref={flameRef}
            viewBox={FIRE.VIEW_BOX.join(' ')}
            preserveAspectRatio="xMidYMax meet"
            aria-hidden
            className="relative block shrink-0 overflow-visible"
            style={{ zIndex: 2, width: 'calc(var(--bb) * .49)', height: 'calc(var(--bb) * .56)' }}
          >
            <path className="fill-streak" /><path className="fill-streak-glow" /><path className="fill-streak-core" />
          </svg>
          <div
            ref={numRef}
            role="status"
            aria-label={`${streak} day streak`}
            className="relative -mt-0.5 inline-flex font-black tabular-nums text-streak-text"
            style={{ zIndex: 3, fontSize: 'calc(var(--bb) * .36)', lineHeight: 1.16 }}
          >
            {Array.from(next).map((digit, i) => {
              const old = prev[i];
              const rolls = old !== digit && !reduceMotion;
              return (
                <span
                  key={i}
                  data-roll={rolls ? '' : undefined}
                  data-grow={rolls && old === ' ' ? '' : undefined}
                  className="relative block shrink-0 overflow-hidden text-center"
                  style={{ width: '.64em', height: '1.16em' }}
                >
                  {rolls ? (
                    <>
                      <span className="block w-full">{old === ' ' ? '' : old}</span>
                      <span className="absolute left-0 top-0 block w-full" style={{ transform: 'translateY(110%)' }}>{digit}</span>
                    </>
                  ) : <span className="block w-full">{digit}</span>}
                </span>
              );
            })}
          </div>
        </div>

        <h1 ref={titleRef} aria-hidden className="flex flex-wrap justify-center gap-[0.3em] text-center text-[28px] font-black text-ui-ink-strong md:text-[34px]">
          <span className="inline-block">day</span><span className="inline-block">streak</span>
        </h1>

        <div
          ref={weekRef}
          className="relative z-10 mt-7 grid w-full max-w-[360px] grid-cols-7 items-center gap-1.5 overflow-hidden rounded-control border-2 border-ui-divider bg-ui-surface p-2.5 md:mt-8 md:max-w-[440px]"
          style={{ '--bb': 'clamp(190px,25dvh,260px)', minHeight: 'calc(var(--bb) * .4)' } as CSSProperties}
        >
          {DAYS.map((letter, i) => {
            const isToday = i === todayIndex;
            const studied = Boolean(week[i]) || isToday;
            // Before the entrance a studied day shows empty; reduced motion shows the finished week.
            const rest: CSSProperties | undefined = reduceMotion ? undefined : { transform: 'scale(0)' };
            return (
              <div
                key={i}
                data-today={isToday ? '' : undefined}
                data-past={studied && !isToday ? '' : undefined}
                aria-label={`${DAY_NAMES[i]}${studied ? ', studied' : ''}${isToday ? ', today' : ''}`}
                className={`flex flex-col items-center gap-1.5 text-xs font-black leading-4 ${isToday ? 'text-streak-text' : 'text-ui-muted'}`}
              >
                <span data-dot className={`relative grid place-items-center rounded-full bg-ui-hover ${isToday ? 'outline outline-2 outline-streak' : ''}`} style={{ width: 'calc(var(--bb) * .145)', height: 'calc(var(--bb) * .145)', outlineOffset: 3 }}>
                  {studied && <span data-fill className="absolute inset-0 rounded-full bg-streak" style={rest} />}
                  {studied && <span data-check className="relative grid place-items-center text-ui-on-solid" style={reduceMotion ? undefined : { opacity: 0 }}><AppIcon name="check" size={16} /></span>}
                  {isToday && <span data-pulse className="absolute rounded-full border-2 border-streak opacity-0" style={{ inset: -5 }} />}
                </span>
                {letter}
              </div>
            );
          })}
          <span
            data-shine
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-[120%]"
            style={{ background: 'linear-gradient(100deg, transparent 30%, var(--color-streak-shine) 50%, transparent 70%)' }}
          />
        </div>

        <div aria-hidden className="h-8 shrink-0 md:h-10" />
        <div ref={buttonRef} className="w-full max-w-md md:max-w-[340px]">
          <ActionButton size="lg" fullWidth onClick={onContinue}>
            <span>Continue</span>
          </ActionButton>
        </div>
      </div>

      {/* Placed in px from the screen's corner: the glow sits behind the fire; sparks, the thrown piece and embers above everything. */}
      {!reduceMotion && <div ref={glowRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-[1] h-0 w-0" />}
      {!reduceMotion && <div ref={fxRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 h-0 w-0" />}
    </div>
  );
}
