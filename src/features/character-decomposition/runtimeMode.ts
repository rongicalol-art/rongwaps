export type DecompositionRuntimeMode = 'legacy' | 'v3';

export interface DecompositionRuntimeEnvironment {
  DEV?: boolean;
  PROD?: boolean;
  MODE?: string;
  VITE_DECOMPOSITION_RUNTIME?: string;
  VITE_DECOMPOSITION_RUNTIME_ALLOW_CANDIDATE?: string;
  VITE_DECOMPOSITION_RUNTIME_PACK_BASE_PATH?: string;
  /** Local filesystem path consumed only by the Vite development pack bridge. */
  VITE_DECOMPOSITION_RUNTIME_PACK_DIR?: string;
}

function getEnvironment(): DecompositionRuntimeEnvironment {
  const viteEnvironment = (import.meta as ImportMeta & { env?: DecompositionRuntimeEnvironment }).env;
  if (viteEnvironment) return viteEnvironment;
  const nodeEnvironment = typeof process !== 'undefined' ? process.env.NODE_ENV : undefined;
  return { MODE: nodeEnvironment, DEV: nodeEnvironment !== 'production', PROD: nodeEnvironment === 'production' };
}

/** Explicit development-only switch. Production always selects legacy. */
export function getDecompositionRuntimeMode(
  environment: DecompositionRuntimeEnvironment = getEnvironment(),
): DecompositionRuntimeMode {
  const isDevelopment = environment.DEV === true || (
    environment.PROD !== true && environment.MODE !== 'production'
  );
  return isDevelopment && environment.VITE_DECOMPOSITION_RUNTIME === 'v3' ? 'v3' : 'legacy';
}

export function allowsDevelopmentCandidatePack(
  environment: DecompositionRuntimeEnvironment = getEnvironment(),
): boolean {
  return getDecompositionRuntimeMode(environment) === 'v3'
    && environment.VITE_DECOMPOSITION_RUNTIME_ALLOW_CANDIDATE === 'true';
}

export function getRuntimePackBasePath(
  environment: DecompositionRuntimeEnvironment = getEnvironment(),
): string | undefined {
  return environment.VITE_DECOMPOSITION_RUNTIME_PACK_BASE_PATH;
}
