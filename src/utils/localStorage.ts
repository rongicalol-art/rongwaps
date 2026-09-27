/**
 * Safe localStorage gateway.
 *
 * Centralizes browser storage access with comprehensive try/catch guards
 * for private browsing, quota exhaustion, and SSR/node environments.
 */

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readString(key: string, fallback: string | null = null): string | null {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const value = storage.getItem(key);
    return value !== null ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function readBoolean(key: string, fallback: boolean): boolean {
  const saved = readString(key);
  return saved === null ? fallback : saved === 'true';
}

export function writeBoolean(key: string, value: boolean): void {
  writeString(key, String(value));
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readString(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    writeString(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function remove(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
