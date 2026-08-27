/**
 * Compatibility projection for the Make Me a Hanzi-shaped legacy records.
 *
 * This is intentionally not the canonical IDS parser. It exists only at the
 * legacy runtime boundary so old packs/database rows keep their historical
 * direct-component behavior while V3 uses the normalized runtime tree.
 */
export interface LegacyDecompositionProjection {
  components: string[];
  operator: string | null;
}

const IDS_OPERATOR_RE = /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻]/u;
const NON_COMPONENT_RE = /[\s！？?]/u;

export function projectLegacyDecomposition(
  decomposition: string | null | undefined,
): LegacyDecompositionProjection {
  if (!decomposition) return { components: [], operator: null };
  const characters = Array.from(decomposition);
  return {
    operator: characters.find((character) => IDS_OPERATOR_RE.test(character)) ?? null,
    components: characters.filter(
      (character) => !IDS_OPERATOR_RE.test(character) && !NON_COMPONENT_RE.test(character),
    ),
  };
}
