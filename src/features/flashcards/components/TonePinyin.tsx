import { useMemo } from 'react';
import { segmentPinyinTones, type PinyinTone } from '../../../utils/pinyin/pinyinTones';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';

/** Tone → text color. Shared by the pinyin row and the matching characters. */
export const TONE_TEXT_CLASS: Record<PinyinTone, string> = {
  1: 'text-tone-1',
  2: 'text-tone-2',
  3: 'text-tone-3',
  4: 'text-tone-4',
  5: 'text-tone-5',
};

interface TonePinyinProps {
  pinyin: string;
  colored: boolean;
}

/** Pinyin with each syllable in its tone color; separators and unknown runs stay plain. */
export function TonePinyin({ pinyin, colored }: TonePinyinProps) {
  const segments = useMemo(() => (colored ? segmentPinyinTones(pinyin) : null), [pinyin, colored]);
  if (!segments) return <>{numberToToneMarks(pinyin)}</>;
  return (
    <>
      {segments.map((segment, i) => (
        <span key={i} className={segment.tone ? TONE_TEXT_CLASS[segment.tone] : undefined}>
          {segment.text}
        </span>
      ))}
    </>
  );
}
