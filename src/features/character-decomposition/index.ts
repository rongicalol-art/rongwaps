export * from './lazyResolver';
export * from './runtimeLoader';
export * from './runtimeMode';
export * from './runtimePack';

/**
 * Runtime decomposition API consumed by the breakdown package (which
 * re-exports the runtime service helpers from its own public index). Exposed
 * explicitly so the public surface stays intentional; consumers must not
 * reach into `decompositionService` / `legacyProjection` directly (see
 * docs/ARCHITECTURE.md § Enforced boundaries).
 */
export {
  compareDecompositionRuntimes,
  createDecompositionRuntimeService,
  getDecompositionRuntimeService,
} from './decompositionService';
export type { DecompositionService } from './decompositionService';
export { projectLegacyDecomposition } from './legacyProjection';
