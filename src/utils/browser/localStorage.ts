/**
 * Safe localStorage gateway.
 *
 * Centralizes browser storage access with comprehensive try/catch guards
 * for private browsing, quota exhaustion, and SSR/node environments.
 */

import { debugLogger } from '../debug/debugLogger';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    // Graceful degradation: window.localStorage blocked in third-party or restricted context
    debugLogger.warn('App', 'localStorage access unavailable', error);
    return null;
  }
}

export function readString(key: string, fallback: string | null = null): string | null {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const value = storage.getItem(key);
    return value !== null ? value : fallback;
  } catch (error) {
    // Graceful degradation: storage read access denied
    debugLogger.warn('App', `localStorage read failed for "${key}"`, error);
    return fallback;
  }
}

export function writeString(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (error) {
    // Graceful degradation: quota exceeded or storage write restricted
    debugLogger.warn('App', `localStorage write failed for "${key}"`, error);
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
  } catch (error) {
    // Graceful degradation: JSON syntax error in stored value falls back to default
    debugLogger.warn('App', `Stored JSON unparseable for "${key}"`, error);
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    writeString(key, JSON.stringify(value));
  } catch (error) {
    // Graceful degradation: serialization error or quota exceeded
    debugLogger.warn('App', `Value not serializable for "${key}"`, error);
  }
}

export function remove(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    // Graceful degradation: storage remove access denied
    debugLogger.warn('App', `localStorage remove failed for "${key}"`, error);
  }
}
