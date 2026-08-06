/**
 * Escapes a string so it can be safely embedded in a RegExp pattern.
 * Prevents user-supplied search input from throwing a SyntaxError
 * (e.g. `(`, `?`, `[`, `*`, `.`) or injecting unintended pattern logic.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}