import type { RongWapsCharacter } from '../../types/models';

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
  tomoko: {
    id: 'tomoko', nameTraditional: '朋子', nameSimplified: '朋子', pinyin: 'Péngzǐ',
    englishName: 'Tomoko', gender: 'female', role: 'Student',
    description: 'Short dark tousled pixie, round glasses and coral blazer.',
  },
  dongxian: {
    id: 'dongxian', nameTraditional: '東賢', nameSimplified: '东贤', pinyin: 'Dōngxián',
    englishName: 'Dongxian', gender: 'male', role: 'Actor',
    description: 'Swept black waves, tapered face and purple overshirt.',
  },
  shawn: {
    id: 'shawn', nameTraditional: '尚恩', nameSimplified: '尚恩', pinyin: 'Shàngēn',
    englishName: 'Shawn', gender: 'male', role: 'Student',
    description: 'Rounded golden curls, broad face and teal overshirt.',
  },
  mary: {
    id: 'mary', nameTraditional: '瑪莉', nameSimplified: '玛莉', pinyin: 'Mǎlì',
    englishName: 'Mary', gender: 'female', role: 'Student',
    description: 'Auburn waves, gold hoop earrings and mustard cardigan.',
  },
  fangcao: {
    id: 'fangcao', nameTraditional: '芳草', nameSimplified: '芳草', pinyin: 'Fāngcǎo',
    englishName: 'Fangcao', gender: 'female', role: 'Student',
    description: 'Long black side braid and orange-red cardigan.',
  },
  jiahao: {
    id: 'jiahao', nameTraditional: '家豪', nameSimplified: '家豪', pinyin: 'Jiāháo',
    englishName: 'Jiahao', gender: 'male', role: 'Job applicant',
    description: 'Rounded black curly crop and emerald jacket.',
  },
  mingzhe: {
    id: 'mingzhe', nameTraditional: '明哲', nameSimplified: '明哲', pinyin: 'Míngzhé',
    englishName: 'Mingzhe', gender: 'male', role: 'Student',
    description: 'Neat dark side part, rectangular glasses and cobalt shirt.',
  },
  managerWang: {
    id: 'managerWang', nameTraditional: '王經理', nameSimplified: '王经理', pinyin: 'Wáng Jīnglǐ',
    englishName: 'Manager Wang', gender: 'female', role: 'Manager',
    description: 'Dark low bun and navy blazer over mint blouse.',
  },
  officeStaff: {
    id: 'officeStaff', nameTraditional: '職員', nameSimplified: '职员', pinyin: 'Zhíyuán',
    englishName: 'Office Staff', gender: 'male', role: 'Receptionist',
    description: 'Neat dark crop and navy vest over pale teal shirt.',
  },
};

const SPEAKER_ALIASES: Record<string, RongWapsCharacter> = {
  // Book 3 cast and office dialogue speakers.
  '朋子': 'tomoko',
  'tomoko': 'tomoko',
  '東賢': 'dongxian',
  '东贤': 'dongxian',
  'dongxian': 'dongxian',
  '尚恩': 'shawn',
  'shawn': 'shawn',
  '瑪莉': 'mary',
  '玛莉': 'mary',
  'mary': 'mary',
  '芳草': 'fangcao',
  'fangcao': 'fangcao',
  '家豪': 'jiahao',
  'jiahao': 'jiahao',
  '明哲': 'mingzhe',
  'mingzhe': 'mingzhe',
  '王經理': 'managerWang',
  '王经理': 'managerWang',
  'manager wang': 'managerWang',
  '職員': 'officeStaff',
  '职员': 'officeStaff',
  'office staff': 'officeStaff',
  '林家豪': 'jiahao',
  '林 家豪': 'jiahao',
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
