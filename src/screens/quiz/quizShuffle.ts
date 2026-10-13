import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** The top card of the Cards done shuffle (a fixed clone in document.body), handed to the first quiz question. */
export interface QuizHandoff {
  ghost: HTMLElement;
  rect: DOMRect;
  /** The word on the card; the quiz lands it only when its first prompt is the same word. */
  front: string;
}

const GLIDE_MS = 640;
const GLIDE_EASE = 'cubic-bezier(.22,1,.36,1)';
const CHOICES_DELAY_MS = 120;
const CHOICES_STAGGER_MS = 60;
const CHOICES_MS = 480;
const RISE_EASE = 'cubic-bezier(.16,1,.3,1)';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fades the ghost out and removes it (fallback when there is nothing to land on). */
export function fadeOutGhost(ghost: HTMLElement) {
  if (!ghost.isConnected) return;
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
  const abort = () => {
    timers.forEach(window.clearTimeout);
    anims.forEach((a) => a.cancel());
    if (prompt) prompt.style.opacity = '';
    ghost.remove();
  };

  const glyphs = prompt ? promptGlyphs(prompt) : [];
  const ghostWord = ghost.querySelector<HTMLElement>('[data-clone-word]');
  const sameWord = glyphs.map((g) => g.textContent).join('') === Array.from(front).join('');
  if (!ghost.isConnected || prefersReducedMotion() || !prompt || !ghostWord || glyphs.length === 0 || !sameWord) {
    if (ghost.isConnected) fadeOutGhost(ghost);
    riseIn(grid, 0, 8, 140);
    if (prompt) riseIn(prompt, 0, 8, 140);
    onDone();
    return abort;
  }

  // The real card waits (invisible, in place) until the ghost has become it.
  prompt.style.opacity = '0';
  const rects = glyphs.map((g) => g.getBoundingClientRect());
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const font = parseFloat(getComputedStyle(glyphs[0]).fontSize);
  const chars = glyphs.length;
  // Gap between the real glyphs (em), so the ghost word is spaced exactly like the prompt.
  const gapEm = chars > 1 && font > 0 ? Math.max(0, ((right - left) - chars * font) / (chars - 1) / font) : 0;
  const to = prompt.getBoundingClientRect();
  const ps = getComputedStyle(prompt);
  const gs = getComputedStyle(ghost);
  const wordNow = getComputedStyle(ghostWord);
  const widths = (c: CSSStyleDeclaration) => `${c.borderTopWidth} ${c.borderRightWidth} ${c.borderBottomWidth} ${c.borderLeftWidth}`;

  const play = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, { fill: 'both', ...options });
    anims.push(a);
    return a;
  };
  const glide = play(ghost, [
    { left: gs.left, top: gs.top, width: gs.width, height: gs.height, borderWidth: widths(gs), borderRadius: gs.borderTopLeftRadius },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderWidth: widths(ps), borderRadius: ps.borderTopLeftRadius },
  ], { duration: GLIDE_MS, easing: GLIDE_EASE });
  play(ghostWord, [
    { fontSize: wordNow.fontSize, columnGap: '0em' },
    { fontSize: `${font}px`, columnGap: `${gapEm}em` },
  ], { duration: GLIDE_MS, easing: GLIDE_EASE });

  // Answers rise from where the deck was.
  const choices = Array.from(grid.children) as HTMLElement[];
  choices.forEach((c, i) => {
    anims.push(c.animate(
      [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }],
      { delay: CHOICES_DELAY_MS + i * CHOICES_STAGGER_MS, duration: CHOICES_MS, easing: RISE_EASE, fill: 'backwards' },
    ));
  });

  glide.finished.then(() => {
    // The real prompt replaces the ghost in the same frame.
    prompt.style.opacity = '';
    ghost.remove();
  }, () => {});
  timers.push(window.setTimeout(onDone, Math.max(GLIDE_MS, CHOICES_DELAY_MS + Math.max(0, choices.length - 1) * CHOICES_STAGGER_MS + CHOICES_MS)));
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

/** Keep the chosen picker card on screen while the first question and its audio prepare. */
export function beginQuizLaunch(picker: HTMLElement, selected: HTMLElement) {
  cancelQuizLaunch();
  if (prefersReducedMotion()) return;
  selected.setAttribute('data-quiz-launch-card', '');
  const snapshot = picker.cloneNode(true) as HTMLElement;
  selected.removeAttribute('data-quiz-launch-card');
  const rect = picker.getBoundingClientRect();
  snapshot.setAttribute('data-quiz-launch', '');
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.inert = true;
  Object.assign(snapshot.style, {
    position: 'fixed', inset: 'auto', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, margin: '0',
    background: 'var(--color-ui-canvas)', pointerEvents: 'none', zIndex: '100',
  });
  document.body.appendChild(snapshot);
  // A failed load exposes the normal retry/skip screen rather than covering it indefinitely.
  window.setTimeout(() => snapshot.remove(), 8000);
}

export function cancelQuizLaunch() {
  document.querySelectorAll('[data-quiz-launch]').forEach((element) => element.remove());
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
  const selectedStyle = getComputedStyle(selected);
  const promptStyle = getComputedStyle(prompt);
  surface.setAttribute('data-quiz-launch', '');
  surface.setAttribute('aria-hidden', 'true');
  surface.inert = true;
  Object.assign(surface.style, {
    position: 'fixed', inset: 'auto', left: `${from.left}px`, top: `${from.top}px`,
    width: `${from.width}px`, height: `${from.height}px`, margin: '0',
    pointerEvents: 'none', zIndex: '101', overflow: 'hidden',
  });
  selected.style.visibility = 'hidden';
  // Change the art into the actual character, tile or speaker while the card is moving.
  const oldArt = selected.cloneNode(true) as HTMLElement;
  Object.assign(oldArt.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', visibility: 'visible', margin: '0' });
  const content = Array.from(surface.children) as HTMLElement[];
  content.forEach((element) => element.animate([{ opacity: 0 }, { opacity: 1 }], { delay: 60, duration: 180, fill: 'backwards' }));
  surface.appendChild(oldArt);
  oldArt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
  document.body.appendChild(surface);
  const animation = surface.animate([
    { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: selectedStyle.borderRadius },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: promptStyle.borderRadius },
  ], { duration: GLIDE_MS, easing: GLIDE_EASE, fill: 'forwards' });
  const outgoing = snapshot.animate([
    { opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-16px)' },
  ], { duration: 240, easing: GLIDE_EASE, fill: 'forwards' });
  outgoing.finished.then(() => snapshot.remove(), () => snapshot.remove());
  surface.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 420, duration: 220, fill: 'forwards' });
  question.animate([{ opacity: 0 }, { opacity: 1 }], { delay: 360, duration: 280, fill: 'backwards', easing: 'ease-out' });
  const answers = Array.from(question.querySelectorAll<HTMLElement>('button')).filter((element) => element !== prompt && !prompt.contains(element));
  answers.forEach((choice, index) => {
    riseIn(choice as HTMLElement, 440 + index * 45, 18, 320);
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
  };
  animation.finished.then(() => {
    surface.remove();
    window.setTimeout(finish, Math.max(0, 440 + Math.max(0, answers.length - 1) * 45 + 320 - GLIDE_MS));
  }, finish);
  return true;
}
