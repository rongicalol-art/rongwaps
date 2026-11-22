/**
 * Brotli level for a `/data` file: 6 builds fast. The search files get 11: every phone that searches downloads
 * them once and whole (the dictionary index is 4.1 MB at 6 and 3.3 MB at 11).
 */
export const brotliQuality = (path: string) => /\/search\/[^/]+\.json$/.test(path) ? 11 : 6;
