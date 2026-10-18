export type DecompositionRuntimeMode = 'legacy' | 'v3';

/** Served only when the published runtime pack is authentic and publishable. */
export const PRODUCTION_RUNTIME_PACK_BASE_PATH = '/data/decomposition-runtime';

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

export function getEnvironment(): DecompositionRuntimeEnvironment {
  const viteEnvironment = (import.meta as ImportMeta & { env?: DecompositionRuntimeEnvironment }).env;
  if (viteEnvironment) return viteEnvironment;
  const nodeEnvironment = typeof process !== 'undefined' ? process.env.NODE_ENV : undefined;
  return { MODE: nodeEnvironment, DEV: nodeEnvironment !== 'production', PROD: nodeEnvironment === 'production' };
}

function isProductionEnvironment(environment: DecompositionRuntimeEnvironment): boolean {
  return environment.PROD === true || environment.MODE === 'production';
}

/**
 * The published runtime pack is the default; `VITE_DECOMPOSITION_RUNTIME=legacy`
 * is the rollback switch. Production safety does not live here: the pack
 * manifest's license gate does. `RuntimePackLoader` refuses non-publishable
 * packs in production, so a development candidate can never serve production
 * traffic. Development and test builds additionally require the explicit
 * candidate opt-in below before any pack is used at all.
 */
export function getDecompositionRuntimeMode(
  environment: DecompositionRuntimeEnvironment = getEnvironment(),
): DecompositionRuntimeMode {
  return environment.VITE_DECOMPOSITION_RUNTIME === 'legacy' ? 'legacy' : 'v3';
}

export function allowsDevelopmentCandidatePack(
  environment: DecompositionRuntimeEnvironment = getEnvironment(),
): boolean {
  return getDecompositionRuntimeMode(environment) === 'v3'
    && environment.VITE_DECOMPOSITION_RUNTIME_ALLOW_CANDIDATE === 'true'
    && !isProductionEnvironment(environment);
}

export function getRuntimePackBasePath(
  environment: DecompositionRuntimeEnvironment = getEnvironment(),
): string | undefined {
  if (environment.VITE_DECOMPOSITION_RUNTIME_PACK_BASE_PATH) {
    return environment.VITE_DECOMPOSITION_RUNTIME_PACK_BASE_PATH;
  }
  return isProductionEnvironment(environment) ? PRODUCTION_RUNTIME_PACK_BASE_PATH : undefined;
}
