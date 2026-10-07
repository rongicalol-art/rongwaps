/**
 * @fileoverview Failure policy, custom error classes, and fallback logging.
 */

import { debugLogger, type DebugCategory } from '../utils/debug/debugLogger';

export class PackMissError extends Error {
  readonly packName: string;

  constructor(packName: string, message?: string) {
    super(message ?? `Static content pack "${packName}" not found.`);
    this.name = 'PackMissError';
    this.packName = packName;
  }
}

export class NetworkError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
  }
}

export class AuthRequiredError extends Error {
  constructor(action?: string) {
    super(action ? `Authentication required to perform: ${action}` : 'Authentication required.');
    this.name = 'AuthRequiredError';
  }
}

/**
 * Logs an error to debugLogger at warn level and returns the caller's fallback.
 * Documents intentional graceful degradation for safe recovery.
 */
export function logFallback<T>(
  category: DebugCategory,
  message: string,
  error: unknown,
  fallback: T,
  level: 'warn' | 'error' = 'warn',
): T {
  if (level === 'error') {
    debugLogger.error(category, message, error);
  } else {
    debugLogger.warn(category, message, error);
  }
  return fallback;
}
