/** Keep the chosen picker card on screen while the first question and its audio prepare. */
export function beginQuizLaunch(picker: HTMLElement, selected: HTMLElement) {
  cancelQuizLaunch();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  // Fast opens land on the first prompt and own the fade; slower opens dissolve into the preparation screen.
  window.setTimeout(() => {
    if (!snapshot.isConnected || snapshot.getAnimations().length) return;
    const fade = snapshot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out', fill: 'forwards' });
    fade.finished.then(() => snapshot.remove(), () => snapshot.remove());
  }, 450);
}

export function cancelQuizLaunch() {
  document.querySelectorAll('[data-quiz-launch]').forEach((element) => element.remove());
}
