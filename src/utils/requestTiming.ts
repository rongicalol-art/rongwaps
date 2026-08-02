const isDevelopment = Boolean(import.meta.env?.DEV);

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export async function timeDataRequest<T>(
  label: string,
  request: () => PromiseLike<T>,
): Promise<T> {
  const startedAt = now();

  try {
    return await request();
  } finally {
    if (isDevelopment) {
      const durationMs = Math.round(now() - startedAt);
      console.debug(`[Data request] ${label}: ${durationMs}ms`);
    }
  }
}
