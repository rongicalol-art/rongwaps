/** Brotli level for a `/data` file: 6 builds fast; every phone downloads the common words, so they get 11 (~15% smaller). */
export const brotliQuality = (path: string) => path.endsWith('/search/common-words.json') ? 11 : 6;
