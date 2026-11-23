/**
 * Verified Book 1 / Book 2 / Book 3 trimmed vocabulary recordings used in Start Here.
 * Single-character CNS clips (`e1-4`, `lu1-4`, `nu2-4`, `luan2-3`) have known upstream
 * recording mismatches and are explicitly excluded; use the verified `w:*` book words
 * or `getPronunciationAudioIndex()` for valid CNS syllables.
 */
export const WORD_AUDIO_MAP: Record<string, string> = {
  // Lesson 0 introduction words
  'w:laoshi': 'vocabulary-trimmed/v1/B1L00-1-01-c217a5a4a115.mp3',
  'w:xuesheng': 'vocabulary-trimmed/v1/B1L00-1-02-3e79202e413a.mp3',
  'w:ni': 'vocabulary-trimmed/v1/B1L00-1-03-a4c8ecf72b8d.mp3',
  'w:wo': 'vocabulary-trimmed/v1/B1L00-1-04-ffdd2c389999.mp3',
  'w:ta': 'vocabulary-trimmed/v1/B1L00-1-05-54a3c3c35ff0.mp3',
  'w:shi': 'vocabulary-trimmed/v1/B1L00-1-06-d0cb00c436db.mp3',
  'w:nimen': 'vocabulary-trimmed/v1/B1L00-1-07-23e8f7080c04.mp3',
  'w:women': 'vocabulary-trimmed/v1/B1L00-1-08-9c606eafe396.mp3',
  'w:tamen': 'vocabulary-trimmed/v1/B1L00-1-09-0c19ec5dbadd.mp3',
  'w:ren': 'vocabulary-trimmed/v1/B1L00-1-10-24ec6609806c.mp3',
  'w:xiansheng': 'vocabulary-trimmed/v1/B1L00-1-11-278c1984a6ea.mp3',
  'w:xiaojie': 'vocabulary-trimmed/v1/B1L00-1-12-eabb3c7ea0aa.mp3',
  'w:taitai': 'vocabulary-trimmed/v1/B1L00-1-13-e7ba0a79b8e4.mp3',

  // Book-teacher words for broken CNS syllables & natural tone-3 words / multi-syllable words
  'w:e': 'vocabulary-trimmed/v1/B1L04-1-09-858eef09ce65.mp3',
  'w:lu': 'vocabulary-trimmed/v1/B3L01-1-12-e077865fa278.mp3',
  'w:hao': 'vocabulary-trimmed/v1/B1L01-2-08-6167db404de6.mp3',
  'w:lao': 'vocabulary-trimmed/v1/B1L08-3-02-fc8b51f95c60.mp3',
  'w:kou': 'vocabulary-trimmed/v1/B2L14-2-11-eb25f2958495.mp3',
  'w:qing': 'vocabulary-trimmed/v1/B1L03-3-01-d1feefd00872.mp3',
  'w:xiao': 'vocabulary-trimmed/v1/B1L03-1-17-f97e0ead3935.mp3',
  'w:nv': 'vocabulary-trimmed/v1/B1L04-2-07-ccc71289fa0e.mp3',
  'w:yu': 'vocabulary-trimmed/v1/B1L16-1-23-98a3c9e8bf2e.mp3',
  'w:ma': 'vocabulary-trimmed/v1/B1L15-1-19-dc2d1d21245a.mp3',
  'w:xiexie': 'vocabulary-trimmed/v1/B1L01-3-09-6808ff251c06.mp3',
  'w:shuiguo': 'vocabulary-trimmed/v1/B1L01-3-05-0e90a22ebc86.mp3',
  'w:keyi': 'vocabulary-trimmed/v1/B1L06-2-14-8f0310fdbdab.mp3',
  'w:bukeqi': 'vocabulary-trimmed/v1/B1L01-3-10-b3a325e57a1f.mp3',
  'w:yiqi': 'vocabulary-trimmed/v1/B1L03-1-20-b8fcdd1b1a98.mp3',
  'w:yixie': 'vocabulary-trimmed/v1/B1L03-1-12-e4279fcc5901.mp3',
  'w:yigong': 'vocabulary-trimmed/v1/B1L04-2-15-2ffb2d46cbb2.mp3',
  'w:bucuo': 'vocabulary-trimmed/v1/B1L05-1-07-5c9e3f79d00a.mp3',
};

/** CNS single-syllable pack keys with known wrong vowel/recording in the upstream pack. */
export const EXCLUDED_CNS_KEYS = new Set([
  'e1', 'e2', 'e3', 'e4',
  'lu1', 'lu2', 'lu3', 'lu4',
  'nu2', 'nu3', 'nu4',
  'luan2', 'luan3',
]);
