export function resolveDesignTokenColor(token: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;

  const customProperty = token.match(/^var\((--[^)]+)\)$/)?.[1];
  if (!customProperty) return token;

  return getComputedStyle(document.documentElement).getPropertyValue(customProperty).trim() || fallback;
}
