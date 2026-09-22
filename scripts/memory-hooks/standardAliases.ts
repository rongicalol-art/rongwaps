/**
 * Standard radical aliases mapping Kangxi compatibility ideographs and radical
 * variants to standard Han characters (and vice-versa).
 *
 * This enables memory hooks to use clean, standard Han characters (e.g. 艹 instead
 * of compatibility 艹, 竹 instead of ⺮, 足 instead of 𧾷) while strictly satisfying
 * the decomposition tree coverage and component ordering rules.
 */

export const STANDARD_RADICAL_ALIASES: Record<string, string[]> = {
  // Grass crown variants (艹 = U+FA5D Kangxi compatibility radical)
  '艹': ['艹', '⺾', '艸'],
  '艹': ['艹', '⺾', '艸'],
  '⺾': ['艹', '艹', '艸'],
  '艸': ['艹', '⺾', '艹'],

  // Bamboo radical
  '⺮': ['竹'],
  '竹': ['⺮'],

  // Foot radical
  '𧾷': ['足'],
  '足': ['𧾷'],

  // Sheep / ram variants
  '𦍌': ['羊'],
  '𦍒': ['羊'],
  '羊': ['𦍌', '𦍒'],

  // Flesh / meat vs moon
  '⺼': ['肉', '月'],
  '肉': ['⺼', '月'],

  // Hand radical
  '扌': ['手'],
  '手': ['扌'],

  // Water radical
  '氵': ['水', '氺'],
  '氺': ['水', '氵'],
  '水': ['氵', '氺'],

  // Dog radical
  '犭': ['犬'],
  '犬': ['犭'],

  // Heart variants
  '忄': ['心', '𢛳', '㣺'],
  '心': ['忄', '𢛳', '㣺'],
  '𢛳': ['心', '忄', '㣺'],
  '㣺': ['心', '忄', '𢛳'],

  // Altar / Spirit radical
  '礻': ['示'],
  '示': ['礻'],

  // Clothing radical
  '衤': ['衣'],
  '衣': ['衤'],

  // Movement / Walk radical
  '辶': ['辵'],
  '辵': ['辶'],

  // Person variants
  '亻': ['人'],
  '人': ['亻'],
  '𠈌': ['人'],

  // Knife radical
  '刂': ['刀', '⺈'],
  '⺈': ['刀', '刂'],

  // Gold / Metal radical
  '釒': ['金'],
  '金': ['釒'],

  // Silk variants
  '糹': ['糸', '纟'],
  '糸': ['糹', '纟'],

  // Door variants
  '戶': ['户', '戸'],
  '户': ['戶', '戸'],

  // Seal radical variants
  '㔾': ['卩'],
  '卩': ['㔾'],

  // Container / Crossing variants
  '㐅': ['乂'],
  '乂': ['㐅'],

  // Flat / horizontal stroke variants (㇀ = CJK stroke T / flat stroke)
  '㇀': ['一'],
  '一': ['㇀'],

  // Wood variants
  '朩': ['木'],
  '木': ['朩'],

  // Frame / Zhou variants
  '⺆': ['冂'],
  '冂': ['⺆'],
  '𠮷': ['吉'],
  '吉': ['𠮷'],

  // Silk / tangled thread variants
  '𢇇': ['糹', '糸'],
  '㡭': ['糹', '糸'],
  '䜌': ['糹', '糸'],

  // Mound variants
  '𠂤': ['阜'],

  // Fire / Cover variants
  '𤇾': ['火', '冖'],

  // Esteem / Mouth / Top variants
  '𫩠': ['尚', '口'],

  // Tooth variants
  '𠚕': ['止', '凵'],

  // Water / Basin / Earth variants
  '𥁕': ['皿'],
  '𡌥': ['土'],

  // Feather / Sun variants
  '𦐇': ['日', '羽'],

  // Clean / Brush variants
  '𭴘': ['聿', '皿'],

  // Cart / Seal variants
  '𨊠': ['車', '卩'],

  // Arrow / Reach variants
  '𠫔': ['至', '一', '厶'],

  // Child / newborn variants
  '𠫓': ['亠', '厶', '儿'],

  // Steady / Heart variants
  '㥯': ['心'],

  // Weapon / bent coil variant for 弟 / 第
  '𢎨': ['弔', '弓', '戈', '矛'],
  '弔': ['𢎨'],

  // Hair curls / brain components for 腦
  '𡿺': ['巛', '囟'],

  // Beard strands for 而
  '𦓐': ['𦉫', '冂', '丨'],
};

/**
 * Returns all canonical and sanctioned alias forms for a given glyph.
 */
export function getGlyphAliases(glyph: string): string[] {
  return STANDARD_RADICAL_ALIASES[glyph] ?? [];
}

/**
 * Checks if two glyphs are equivalent either directly or through standard radical aliases.
 */
export function areGlyphsEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  const aliases = STANDARD_RADICAL_ALIASES[a];
  return Boolean(aliases && aliases.includes(b));
}
