/**
 * Public pages ship prerendered HTML in `#prerender` (scripts/build/prerender.ts) so crawlers
 * and first visits see the page before the app loads. The live page removes it once it has
 * rendered; until then index.html keeps `#root` hidden behind it.
 */
export function dismissPrerender() {
  document.getElementById('prerender')?.remove();
  document.documentElement.classList.remove('prerendered');
}
