import type { RongWapsCharacter } from '../lib/widgets/RongWapsCharacterPortrait';

export interface CharacterProfileInfo {
  id: RongWapsCharacter;
  nameTraditional: string;
  nameSimplified: string;
  pinyin: string;
  englishName: string;
  gender: 'female' | 'male';
  role: string;
  description: string;
}

export const CHARACTER_PROFILES: Record<RongWapsCharacter, CharacterProfileInfo> = {
  youmei: {
    id: 'youmei',
    nameTraditional: '小林友美',
    nameSimplified: '小林友美',
    pinyin: 'Xiǎolín Yǒuměi',
    englishName: 'Youmei',
    gender: 'female',
    role: 'Student (Japan)',
    description: 'Calm observer and frequent newcomer. Dark bob, coral cardigan over white blouse.',
  },
  zhongming: {
    id: 'zhongming',
    nameTraditional: '李中明',
    nameSimplified: '李中明',
    pinyin: 'Lǐ Zhōngmíng',
    englishName: 'Zhongming',
    gender: 'male',
    role: 'Student (Indonesia)',
    description: 'Curious connector. Textured wavy dark hair, yellow overshirt over blue t-shirt.',
  },
  yiwen: {
    id: 'yiwen',
    nameTraditional: '王宜文',
    nameSimplified: '王宜文',
    pinyin: 'Wáng Yíwén',
    englishName: 'Yiwen',
    gender: 'female',
    role: 'Student (USA)',
    description: 'Energetic guide. Dark wavy high ponytail, deep teal casual jacket.',
  },
  guoan: {
    id: 'guoan',
    nameTraditional: '馬國安',
    nameSimplified: '马国安',
    pinyin: 'Mǎ Guó’ān',
    englishName: 'Guoan',
    gender: 'male',
    role: 'Student',
    description: 'Practical supporter. Short dark layered hair, green hoodie under navy jacket.',
  },
  yuanzhen: {
    id: 'yuanzhen',
    nameTraditional: '陳元真',
    nameSimplified: '陈元真',
    pinyin: 'Chén Yuánzhēn',
    englishName: 'Yuanzhen',
    gender: 'female',
    role: 'Student (Taiwan)',
    description: 'Confident organizer. Dark shoulder bob, royal cobalt top with coral neck scarf.',
  },
  jiale: {
    id: 'jiale',
    nameTraditional: '高家樂',
    nameSimplified: '高家乐',
    pinyin: 'Gāo Jiālè',
    englishName: 'Jiale',
    gender: 'male',
    role: 'Student (UK)',
    description: 'Friendly analyst. Curly light-brown hair, burnt-orange sweater over white shirt.',
  },
  teacher: {
    id: 'teacher',
    nameTraditional: '林老師',
    nameSimplified: '林老师',
    pinyin: 'Lín Lǎoshī',
    englishName: 'Teacher',
    gender: 'female',
    role: 'Mandarin Instructor',
    description: 'Warm and encouraging teacher. Dark curled bob, royal blue cardigan over ivory top.',
  },
  parent: {
    id: 'parent',
    nameTraditional: '媽媽',
    nameSimplified: '妈妈',
    pinyin: 'Māma',
    englishName: 'Mother',
    gender: 'female',
    role: 'Parent / Mother',
    description: 'Gentle, nurturing mother. Dark wavy hair, warm coral ribbed knit sweater.',
  },
  doctor: {
    id: 'doctor',
    nameTraditional: '醫生',
    nameSimplified: '医生',
    pinyin: 'Yīshēng',
    englishName: 'Doctor',
    gender: 'male',
    role: 'Physician',
    description: 'Reassuring physician. Short parted dark hair, white lab coat, stethoscope, green shirt.',
  },
  cafeWorker: {
    id: 'cafeWorker',
    nameTraditional: '女店員',
    nameSimplified: '女店员',
    pinyin: 'Nǚ Diànyuán',
    englishName: 'Cafe Worker',
    gender: 'female',
    role: 'Barista / Shop Assistant',
    description: 'Cheerful shop clerk. Low bun, yellow bib apron over teal polo shirt.',
  },
  apartmentAgent: {
    id: 'apartmentAgent',
    nameTraditional: '房仲',
    nameSimplified: '房仲',
    pinyin: 'Fángzhòng',
    englishName: 'Apartment Agent',
    gender: 'male',
    role: 'Real Estate Agent',
    description: 'Outgoing realtor. Short styled hair, tan blazer over ivory polo shirt.',
  },
  neighbor: {
    id: 'neighbor',
    nameTraditional: '鄰居',
    nameSimplified: '邻居',
    pinyin: 'Línjū',
    englishName: 'Neighbor',
    gender: 'female',
    role: 'Neighbor',
    description: 'Kind older neighbor. Wavy silver-grey hair, olive cardigan over patterned blouse.',
  },
};

const SPEAKER_ALIASES: Record<string, RongWapsCharacter> = {
  // Youmei
  '友美': 'youmei',
  '小林友美': 'youmei',
  'youmei': 'youmei',
  'yǒuměi': 'youmei',

  // Zhongming
  '中明': 'zhongming',
  '李中明': 'zhongming',
  'zhongming': 'zhongming',
  'zhōngmíng': 'zhongming',

  // Yiwen
  '宜文': 'yiwen',
  '王宜文': 'yiwen',
  'yiwen': 'yiwen',
  'yíwén': 'yiwen',

  // Guoan
  '國安': 'guoan',
  '国安': 'guoan',
  '馬國安': 'guoan',
  '马国安': 'guoan',
  'guoan': 'guoan',
  'guó’ān': 'guoan',

  // Yuanzhen
  '元真': 'yuanzhen',
  '陳元真': 'yuanzhen',
  '陈元真': 'yuanzhen',
  'yuanzhen': 'yuanzhen',
  'yuánzhēn': 'yuanzhen',

  // Jiale
  '家樂': 'jiale',
  '家乐': 'jiale',
  '高家樂': 'jiale',
  '高家乐': 'jiale',
  'jiale': 'jiale',
  'jiālè': 'jiale',

  // Teacher
  '老師': 'teacher',
  '老师': 'teacher',
  '林老師': 'teacher',
  '林老师': 'teacher',
  'teacher': 'teacher',

  // Parent / Mom
  '媽媽': 'parent',
  '妈妈': 'parent',
  'parent': 'parent',
  'mother': 'parent',

  // Doctor
  '醫生': 'doctor',
  '医生': 'doctor',
  'doctor': 'doctor',

  // Cafe worker / clerk
  '女店員': 'cafeWorker',
  '女店员': 'cafeWorker',
  '店員': 'cafeWorker',
  '店员': 'cafeWorker',
  '服務生': 'cafeWorker',
  '服务生': 'cafeWorker',
  'cafeworker': 'cafeWorker',

  // Apartment agent
  '房仲': 'apartmentAgent',
  '房東': 'apartmentAgent',
  '房东': 'apartmentAgent',
  'apartmentagent': 'apartmentAgent',

  // Neighbor
  '鄰居': 'neighbor',
  '邻居': 'neighbor',
  'neighbor': 'neighbor',
};

/**
 * Resolves a dialogue speaker name to a known RongWaps character key.
 * Returns null if the speaker is unknown or a narrator.
 */
export function getCharacterForSpeaker(speaker?: string | null): RongWapsCharacter | null {
  if (!speaker) return null;
  const trimmed = speaker.trim();
  const lower = trimmed.toLowerCase();

  if (SPEAKER_ALIASES[trimmed]) {
    return SPEAKER_ALIASES[trimmed];
  }

  if (SPEAKER_ALIASES[lower]) {
    return SPEAKER_ALIASES[lower];
  }

  for (const [key, char] of Object.entries(SPEAKER_ALIASES)) {
    if (trimmed.includes(key)) {
      return char;
    }
  }

  return null;
}
