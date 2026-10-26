/** Only accept local, known folder routes when returning from OAuth. */
export function parseFolderLinkPath(path: string | null): string | null {
  return path && (/^\/s\/[A-Za-z0-9_-]{8,16}$/.test(path) || /^\/join\/[A-Za-z0-9_-]{10,16}$/.test(path)) ? path : null;
}
