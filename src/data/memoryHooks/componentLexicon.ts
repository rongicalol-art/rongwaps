import type { ComponentLexiconEntry } from '../../features/character-memory-hooks/model';

export const COMPONENT_LEXICON_VERSION = 'book1-pilot-v1';

function entry(
  glyph: string,
  label: string,
  options: { family?: string; pinyin?: string; roleHints?: ComponentLexiconEntry['roleHints'] } = {},
): ComponentLexiconEntry {
  return {
    key: `g:${glyph}`,
    glyph,
    family: options.family,
    roleHints: options.roleHints,
    senses: [{
      id: `${glyph}:core-v1`,
      label,
      pinyin: options.pinyin,
      sourceRefs: ['project-curated-component-labels-v1'],
      safeForMemoryAid: true,
    }],
  };
}

/**
 * Learner-facing component labels for the pilot. Role hints describe common
 * tendencies only; the planner never promotes them to a relationship role.
 */
export const COMPONENT_LEXICON: ComponentLexiconEntry[] = [
  entry('一', 'one'),
  entry('亻', 'person', { family: '人', roleHints: ['semantic'] }),
  entry('人', 'person', { roleHints: ['semantic'] }),
  entry('儿', 'person'),
  entry('冖', 'cover'),
  entry('口', 'mouth', { roleHints: ['semantic'] }),
  entry('土', 'earth'),
  entry('女', 'woman', { roleHints: ['semantic'] }),
  entry('子', 'child'),
  entry('忄', 'heart', { family: '心', roleHints: ['semantic'] }),
  entry('心', 'heart', { roleHints: ['semantic'] }),
  entry('手', 'hand', { roleHints: ['semantic'] }),
  entry('扌', 'hand', { family: '手', roleHints: ['semantic'] }),
  entry('日', 'sun'),
  entry('月', 'moon'),
  entry('木', 'tree'),
  entry('氵', 'water', { family: '水', roleHints: ['semantic'] }),
  entry('水', 'water', { roleHints: ['semantic'] }),
  entry('火', 'fire'),
  entry('灬', 'fire', { family: '火' }),
  entry('言', 'speech', { roleHints: ['semantic'] }),
  entry('辶', 'movement', { roleHints: ['semantic'] }),
  entry('門', 'door'),
  entry('馬', 'horse', { pinyin: 'mǎ', roleHints: ['phonetic'] }),
  entry('青', 'qīng', { pinyin: 'qīng', roleHints: ['phonetic'] }),
  entry('斤', 'axe', { pinyin: 'jīn' }),
  entry('乞', 'beg', { pinyin: 'qǐ' }),
  entry('曷', 'what', { pinyin: 'hé' }),
  entry('兌', 'exchange', { pinyin: 'duì' }),
  entry('耳', 'ear'),
  entry('黑', 'black'),
  entry('占', 'occupy'),
  entry('方', 'direction'),
  entry('干', 'dry'),
  entry('从', 'follow'),
  entry('爫', 'claw'),
];

export const COMPONENT_LEXICON_BY_KEY = new Map(
  COMPONENT_LEXICON.map((component) => [component.key, component]),
);
