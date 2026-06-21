export function getComponentsInfo(decomposition: string | null | undefined) {
  if (!decomposition) return { components: [], ids: null };
  const chars = Array.from(decomposition);
  const idsRegex = /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻]/;
  const idsChar = chars.find(c => idsRegex.test(c)) || null;
  const components = chars.filter(c => !idsRegex.test(c) && !/[\s！？?]/.test(c));
  return { components, ids: idsChar };
}
