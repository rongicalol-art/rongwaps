import { rectMorphFrames } from '../../utils/browser/rectMorph';
import { cancelQuizLaunch } from '../../features/practice';
export { beginQuizLaunch, cancelQuizLaunch } from '../../features/practice';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** The top card of the Cards done shuffle (a fixed clone in document.body), handed to the first quiz question. */
export interface QuizHandoff {
  ghost: HTMLElement;
  rect: DOMRect;
  /** The word on the card; the quiz lands it only when its first prompt is the same word. */
  front: string;
}

const GLIDE_MS = 480;
const GLIDE_EASE = 'cubic-bezier(.22,1,.36,1)';
const REVIEW_GLIDE_MS = 420;
const REVIEW_ANSWERS_DELAY_MS = 220;
const REVIEW_ANSWERS_MS = 260;
const RISE_EASE = 'cubic-bezier(.16,1,.3,1)';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fades the ghost out and removes it (fallback when there is nothing to land on). */
export function fadeOutGhost(ghost: HTMLElement) {
  if (!ghost.isConnected) return;
  if (prefersReducedMotion()) { ghost.remove(); return; }
  const anim = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
  anim.finished.then(() => ghost.remove(), () => ghost.remove());
}

/** Fade-up entrance that is invisible from the first frame (fill: backwards). */
export function riseIn(el: HTMLElement, delay: number, y: number, duration = 480) {
  if (prefersReducedMotion()) return;
  el.animate(
    [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }],
    { delay, duration, easing: RISE_EASE, fill: 'backwards' },
  );
}

/** The prompt word's glyphs (the quiz marks its hanzi prompt with `data-quiz-word`). */
function promptGlyphs(prompt: HTMLElement) {
  return Array.from(prompt.querySelectorAll<HTMLElement>('[data-quiz-word] *')).filter(
    (el) => el.childElementCount === 0 && /[㐀-鿿]/.test(el.textContent ?? ''),
  );
}

/** Plays the landing; returns an abort that cancels everything, shows the real prompt and removes the ghost. */
function runLanding(
  { ghost, front }: QuizHandoff,
  grid: HTMLElement,
  prompt: HTMLElement | null,
  onDone: () => void,
) {
  const anims: Animation[] = [];
  const timers: number[] = [];
  let wordClone: HTMLElement | null = null;
  let incomingClone: HTMLElement | null = null;
  const abort = () => {
    timers.forEach(window.clearTimeout);
    anims.forEach((a) => a.cancel());
    if (prompt) prompt.style.opacity = '';
    ghost.remove();
    wordClone?.remove();
    incomingClone?.remove();
  };

  const ghostWord = ghost.querySelector<HTMLElement>('[data-clone-word]');
  if (!ghost.isConnected || prefersReducedMotion() || !prompt || !ghostWord) {
    if (ghost.isConnected) fadeOutGhost(ghost);
    riseIn(grid, 0, 8, 140);
    if (prompt) riseIn(prompt, 0, 8, 140);
    onDone();
    return abort;
  }

  // Read the settled destination before creating or styling any animation layers.
  const from = ghost.getBoundingClientRect();
  const to = prompt.getBoundingClientRect();
  if (!to.width || !to.height) { fadeOutGhost(ghost); onDone(); return abort; }
  const ps = getComputedStyle(prompt);
  const wordFrom = ghostWord.getBoundingClientRect();
  const startFont = parseFloat(getComputedStyle(ghostWord).fontSize);
  const glyphs = promptGlyphs(prompt);
  const sameWord = glyphs.length > 0 && glyphs.map((g) => g.textContent).join('') === front;
  const rects = sameWord ? glyphs.map((g) => g.getBoundingClientRect()) : [];
  const font = sameWord ? parseFloat(getComputedStyle(glyphs[0]).fontSize) : startFont;
  const left = sameWord ? Math.min(...rects.map((r) => r.left)) : to.left;
  const right = sameWord ? Math.max(...rects.map((r) => r.right)) : to.right;
  const wordToX = (left + right) / 2;
  const wordToY = sameWord
    ? (Math.min(...rects.map((r) => r.top)) + Math.max(...rects.map((r) => r.bottom))) / 2
    : to.top + to.height / 2;
  const gapEm = sameWord && glyphs.length > 1 && font > 0
    ? Math.max(0, ((right - left) - glyphs.length * font) / (glyphs.length - 1) / font) : 0;

  wordClone = ghostWord.cloneNode(true) as HTMLElement;
  Object.assign(wordClone.style, {
    position: 'fixed', left: `${wordToX}px`, top: `${wordToY}px`, width: 'max-content',
    fontSize: `${font}px`, columnGap: `${gapEm}em`, margin: '0',
    pointerEvents: 'none', zIndex: ghost.style.zIndex || '9999', transformOrigin: 'center',
  });
  wordClone.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wordClone);
  ghostWord.style.visibility = 'hidden';
  ghost.inert = true;
  Object.assign(ghost.style, {
    left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
    borderWidth: `${ps.borderTopWidth} ${ps.borderRightWidth} ${ps.borderBottomWidth} ${ps.borderLeftWidth}`,
    borderRadius: ps.borderTopLeftRadius, transformOrigin: 'top left',
  });
  prompt.style.opacity = '0';
  const play = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions = {}) => {
    const animation = el.animate(frames, { duration: REVIEW_GLIDE_MS, easing: GLIDE_EASE, fill: 'both', ...options });
    anims.push(animation);
  };
  play(ghost, rectMorphFrames(from, to));
  play(wordClone, [
    { transform: `translate(-50%,-50%) translate(${wordFrom.left + wordFrom.width / 2 - wordToX}px,${wordFrom.top + wordFrom.height / 2 - wordToY}px) scale(${startFont / font})` },
    { transform: 'translate(-50%,-50%)' },
  ]);

  if (!sameWord) {
    // Crossfade content on the same paper, never a second bordered card.
    incomingClone = prompt.cloneNode(true) as HTMLElement;
    incomingClone.inert = true;
    incomingClone.setAttribute('aria-hidden', 'true');
    Object.assign(incomingClone.style, {
      position: 'fixed', left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
      margin: '0', background: 'transparent', borderColor: 'transparent', boxShadow: 'none',
      opacity: '1', transform: 'none', pointerEvents: 'none', zIndex: ghost.style.zIndex || '9999',
    });
    document.body.appendChild(incomingClone);
    play(wordClone, [{ opacity: 1 }, { opacity: 0 }], { delay: 160, duration: 180, easing: 'linear' });
    play(incomingClone, [{ opacity: 0 }, { opacity: 1 }], { delay: 220, duration: 200, easing: 'linear', fill: 'backwards' });
  }

  // One answer group, one motion clock: no per-button stagger or repeated layout.
  play(grid, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { delay: REVIEW_ANSWERS_DELAY_MS, duration: REVIEW_ANSWERS_MS, fill: 'backwards' });
  timers.push(window.setTimeout(() => {
    prompt.style.opacity = '';
    ghost.remove(); wordClone?.remove(); incomingClone?.remove();
  }, REVIEW_GLIDE_MS));
  timers.push(window.setTimeout(onDone, REVIEW_ANSWERS_DELAY_MS + REVIEW_ANSWERS_MS));
  return abort;
}

/**
 * Runs the landing once on mount when a handoff is present. Returns `busy` (choices are not
 * clickable until it finishes). Safe under StrictMode's mount/unmount/mount.
 */
export function useQuizShuffle(
  handoff: QuizHandoff | null,
  gridRef: RefObject<HTMLElement | null>,
  promptRef: RefObject<HTMLElement | null>,
) {
  const [busy, setBusy] = useState(Boolean(handoff));
  const started = useRef(false);
  const abortRef = useRef<(() => void) | null>(null);
  const abortTimer = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!handoff) return undefined;
    window.clearTimeout(abortTimer.current);
    if (!started.current && gridRef.current) {
      started.current = true;
      abortRef.current = runLanding(handoff, gridRef.current, promptRef.current, () => setBusy(false));
    }
    return () => {
      abortTimer.current = window.setTimeout(() => abortRef.current?.(), 0);
    };
  }, [handoff, gridRef, promptRef]);

  return busy;
}

/** The selected card grows into the first prompt; answers arrive after the card begins landing. */
export function landQuizLaunch(question: HTMLElement): boolean {
  const snapshot = document.querySelector<HTMLElement>('[data-quiz-launch]');
  const selected = snapshot?.querySelector<HTMLElement>('[data-quiz-launch-card]');
  if (!snapshot || !selected) return false;
  if (prefersReducedMotion()) {
    cancelQuizLaunch();
    return false;
  }
  const prompt = question.querySelector<HTMLElement>('[data-quiz-launch-target], [data-quiz-card]') ?? question;
  const from = selected.getBoundingClientRect();
  const to = prompt.getBoundingClientRect();
  // Format entrances briefly translate their wrapper; land at its settled position.
  for (let element: HTMLElement | null = prompt; element && element !== question; element = element.parentElement) {
    const transform = getComputedStyle(element).transform;
    if (transform === 'none') continue;
    const matrix = new DOMMatrixReadOnly(transform);
    to.x -= matrix.m41;
    to.y -= matrix.m42;
  }
  const surface = prompt.cloneNode(true) as HTMLElement;
  surface.setAttribute('data-quiz-launch', '');
  surface.setAttribute('aria-hidden', 'true');
  surface.inert = true;
  Object.assign(surface.style, {
    position: 'fixed', inset: 'auto', left: `${from.left}px`, top: `${from.top}px`,
    width: `${from.width}px`, height: `${from.height}px`, margin: '0',
    pointerEvents: 'none', zIndex: '101', overflow: 'hidden',
  });
  selected.style.visibility = 'hidden';
  // Paper, incoming content and outgoing art are separate layers. Glyphs scale
  // uniformly while the paper changes aspect ratio; no layout per frame.
  const contentLayer = surface.cloneNode(true) as HTMLElement;
  Object.assign(surface.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, padding: '0', transformOrigin: 'top left' });
  surface.replaceChildren();
  Object.assign(contentLayer.style, {
    left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
    borderColor: 'transparent', background: 'none', overflow: 'visible', transformOrigin: 'center',
  });
  const dx = from.left + from.width / 2 - to.left - to.width / 2;
  const dy = from.top + from.height / 2 - to.top - to.height / 2;
  contentLayer.animate([
    { transform: `translate(${dx}px,${dy}px) scale(${Math.min(from.width / to.width, from.height / to.height)})` },
    { transform: 'none' },
  ], { duration: GLIDE_MS, easing: GLIDE_EASE, fill: 'backwards' });
  contentLayer.animate([{ opacity: 0 }, { opacity: 1 }], { delay: 60, duration: 180, fill: 'backwards' });
  const oldArt = selected.cloneNode(true) as HTMLElement;
  Object.assign(oldArt.style, { position: 'fixed', inset: 'auto', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, visibility: 'visible', margin: '0', pointerEvents: 'none', zIndex: '102', transformOrigin: 'center' });
  oldArt.setAttribute('data-quiz-launch', '');
  oldArt.setAttribute('aria-hidden', 'true');
  oldArt.inert = true;
  oldArt.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${-dx}px,${-dy}px)` }], { duration: 180, fill: 'forwards' });
  document.body.append(surface, contentLayer, oldArt);
  // Real size, border and radius (not a scale), so the paper keeps true corners while its shape changes.
  const edge = (el: HTMLElement) => {
    const cs = getComputedStyle(el);
    return { borderWidth: `${cs.borderTopWidth} ${cs.borderRightWidth} ${cs.borderBottomWidth} ${cs.borderLeftWidth}`, borderRadius: cs.borderTopLeftRadius };
  };
  const box = (r: DOMRect) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const animation = surface.animate(
    [{ ...box(from), ...edge(selected) }, { ...box(to), ...edge(prompt) }],
    { duration: GLIDE_MS, easing: GLIDE_EASE, fill: 'forwards' },
  );
  const outgoing = snapshot.animate([
    { opacity: 1 }, { opacity: 0 },
  ], { duration: 160, easing: 'ease-out', fill: 'forwards' });
  outgoing.finished.then(() => snapshot.remove(), () => snapshot.remove());
  [surface, contentLayer].forEach((layer) => layer.animate([{ opacity: 1 }, { opacity: 0 }], { delay: GLIDE_MS - 40, duration: 80, fill: 'forwards' }));
  question.animate([{ opacity: 0 }, { opacity: 1 }], { delay: 120, duration: 160, fill: 'backwards', easing: 'linear' });
  const answers = Array.from(question.querySelectorAll<HTMLElement>('button')).filter((element) => element !== prompt && !prompt.contains(element));
  answers.forEach((choice, index) => {
    riseIn(choice as HTMLElement, 300 + index * 35, 14, 280);
  });
  const blockedKeys = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter' || /^[1-9]$/.test(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  question.inert = true;
  window.addEventListener('keydown', blockedKeys, true);
  const finish = () => {
    question.inert = false;
    window.removeEventListener('keydown', blockedKeys, true);
    surface.remove();
    contentLayer.remove();
    oldArt.remove();
  };
  animation.finished.then(() => {
    surface.remove();
    contentLayer.remove();
    oldArt.remove();
    window.setTimeout(finish, Math.max(0, 300 + Math.max(0, answers.length - 1) * 35 + 280 - GLIDE_MS));
  }, finish);
  return true;
}
