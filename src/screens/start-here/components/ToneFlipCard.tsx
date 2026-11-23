import { useEffect, useState } from 'react';
import { cn } from '../../../utils/cn';
import type { ToneMark } from '../data/types';
import { ToneContour } from './ToneContour';

interface FlipPairOption {
  id: string;
  chipPinyin: string;
  chipHanzi: string;
  changed: boolean;
  firstTone: ToneMark;
  firstPinyin: string;
  firstHanzi: string;
  secondTone: ToneMark;
  secondPinyin: string;
  secondHanzi: string;
  meaning: string;
  audio: string;
  note: string;
}

const FLIP_DATA: Record<'bu' | 'yi' | 't3t3', { baseHanzi: string; basePinyin: string; baseTone: ToneMark; baseAudio: string; hint: string; options: FlipPairOption[] }> = {
  bu: {
    baseHanzi: '不',
    basePinyin: 'bù',
    baseTone: 4,
    baseAudio: 'bu4',
    hint: 'Tap a word to put after 不',
    options: [
      { id: 'shi', chipPinyin: 'shì', chipHanzi: '是', changed: true, firstTone: 2, firstPinyin: 'bú', firstHanzi: '不', secondTone: 4, secondPinyin: 'shì', secondHanzi: '是', meaning: 'is not', audio: 'bu2+shi4', note: 'Before a falling tone, 不 rises to bú.' },
      { id: 'hao', chipPinyin: 'hǎo', chipHanzi: '好', changed: false, firstTone: 4, firstPinyin: 'bù', firstHanzi: '不', secondTone: 3, secondPinyin: 'hǎo', secondHanzi: '好', meaning: 'not good', audio: 'bu4+w:hao', note: 'Before a 3rd tone, 不 stays falling.' },
      { id: 'he', chipPinyin: 'hē', chipHanzi: '喝', changed: false, firstTone: 4, firstPinyin: 'bù', firstHanzi: '不', secondTone: 1, secondPinyin: 'hē', secondHanzi: '喝', meaning: 'not drink', audio: 'bu4+he1', note: 'Before a 1st tone, 不 stays bù.' },
      { id: 'lai', chipPinyin: 'lái', chipHanzi: '來', changed: false, firstTone: 4, firstPinyin: 'bù', firstHanzi: '不', secondTone: 2, secondPinyin: 'lái', secondHanzi: '來', meaning: 'not come', audio: 'bu4+lai2', note: 'Before a 2nd tone, 不 stays bù.' },
    ],
  },
  yi: {
    baseHanzi: '一',
    basePinyin: 'yī',
    baseTone: 1,
    baseAudio: 'yi1',
    hint: 'Tap a word to put after 一',
    options: [
      { id: 'yigong', chipPinyin: 'gòng', chipHanzi: '共', changed: true, firstTone: 2, firstPinyin: 'yí', firstHanzi: '一', secondTone: 4, secondPinyin: 'gòng', secondHanzi: '共', meaning: 'altogether', audio: 'w:yigong', note: 'Before a falling tone, 一 rises to yí, just like 不.' },
      { id: 'yiqi', chipPinyin: 'qǐ', chipHanzi: '起', changed: true, firstTone: 4, firstPinyin: 'yì', firstHanzi: '一', secondTone: 3, secondPinyin: 'qǐ', secondHanzi: '起', meaning: 'together', audio: 'w:yiqi', note: 'Before tone 3, 一 falls to yì.' },
      { id: 'yixie', chipPinyin: 'xiē', chipHanzi: '些', changed: true, firstTone: 4, firstPinyin: 'yì', firstHanzi: '一', secondTone: 1, secondPinyin: 'xiē', secondHanzi: '些', meaning: 'some', audio: 'w:yixie', note: 'Before tone 1, 一 falls to yì.' },
      { id: 'nian', chipPinyin: 'nián', chipHanzi: '年', changed: true, firstTone: 4, firstPinyin: 'yì', firstHanzi: '一', secondTone: 2, secondPinyin: 'nián', secondHanzi: '年', meaning: 'one year', audio: 'yi4+nian2', note: 'Before tone 2, 一 falls to yì.' },
    ],
  },
  t3t3: {
    baseHanzi: '你',
    basePinyin: 'nǐ',
    baseTone: 3,
    baseAudio: 'w:ni',
    hint: 'Tap a pair to hear how two 3rd tones sound together',
    options: [
      { id: 'nihao', chipPinyin: 'hǎo', chipHanzi: '好', changed: true, firstTone: 2, firstPinyin: 'ní', firstHanzi: '你', secondTone: 3, secondPinyin: 'hǎo', secondHanzi: '好', meaning: 'hello', audio: 'ni2+w:hao', note: 'Two 3rd tones in a row: the first rises to a 2nd tone (ní hǎo).' },
      { id: 'keyi', chipPinyin: 'yǐ', chipHanzi: '以', changed: true, firstTone: 2, firstPinyin: 'ké', firstHanzi: '可', secondTone: 3, secondPinyin: 'yǐ', secondHanzi: '以', meaning: 'can / may', audio: 'w:keyi', note: 'Two 3rd tones: kě yǐ sounds like ké yǐ.' },
      { id: 'shuiguo', chipPinyin: 'guǒ', chipHanzi: '果', changed: true, firstTone: 2, firstPinyin: 'shuí', firstHanzi: '水', secondTone: 3, secondPinyin: 'guǒ', secondHanzi: '果', meaning: 'fruit', audio: 'w:shuiguo', note: 'shuǐ guǒ sounds like shuí guǒ.' },
      { id: 'laoshi', chipPinyin: 'shī', chipHanzi: '師', changed: false, firstTone: 3, firstPinyin: 'lǎo', firstHanzi: '老', secondTone: 1, secondPinyin: 'shī', secondHanzi: '師', meaning: 'teacher', audio: 'w:laoshi', note: 'Before a 1st tone, lǎo stays low (half 3rd tone).' },
    ],
  },
};

interface ToneFlipCardProps {
  kind: 'bu' | 'yi' | 't3t3';
  need: number;
  onPlayAudio: (audioKey: string) => void;
  onComplete: () => void;
}

export function ToneFlipCard({ kind, need, onPlayAudio, onComplete }: ToneFlipCardProps) {
  const cfg = FLIP_DATA[kind];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [triedIds, setTriedIds] = useState<Set<string>>(() => new Set());
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setSelectedId(null);
    setTriedIds(new Set());
  }, [kind]);

  const active = cfg.options.find((o) => o.id === selectedId) ?? null;

  const handleSelect = (opt: FlipPairOption) => {
    setSelectedId(opt.id);
    setAnimKey((n) => n + 1);
    onPlayAudio(opt.audio);
    if (triedIds.has(opt.id)) return;
    const tried = new Set(triedIds).add(opt.id);
    setTriedIds(tried);
    if (tried.size === need) onComplete();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-2 rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface px-4 py-5">
        <div className="flex min-h-[168px] items-end justify-center gap-4">
          <div key={`${active?.id ?? 'base'}-${animKey}`} className="flex min-w-25 flex-col items-center">
            <ToneContour
              tone={active ? active.firstTone : cfg.baseTone}
              toneColored={Boolean(active?.changed)}
              className={cn('h-12 w-19', active?.changed && 'sh-flip-in')}
            />
            <span
              style={{ color: active?.changed ? 'var(--sh-tone)' : undefined }}
              className={cn('text-2xl font-black leading-tight', !active?.changed && 'text-ui-ink-strong', active?.changed && 'sh-flip-in')}
            >
              {active ? active.firstPinyin : cfg.basePinyin}
            </span>
            <span className="font-chinese text-[68px] font-bold leading-[1.1] text-ui-ink-strong">
              {active ? active.firstHanzi : cfg.baseHanzi}
            </span>
          </div>

          <div className={cn('flex min-w-25 flex-col items-center', !active && 'text-ui-divider')}>
            {active ? (
              <>
                <ToneContour tone={active.secondTone} className="h-12 w-19" />
                <span className="text-2xl font-black leading-tight text-ui-ink-strong">{active.secondPinyin}</span>
                <span className="font-chinese text-[68px] font-bold leading-[1.1] text-ui-ink-strong">{active.secondHanzi}</span>
              </>
            ) : (
              <>
                <div className="h-12" />
                <span className="text-2xl font-black leading-tight text-ui-divider">?</span>
                <span className="font-chinese text-[68px] font-bold leading-[1.1] text-ui-divider">□</span>
              </>
            )}
          </div>
        </div>

        <p className="m-0 min-h-[26px] text-center text-base font-extrabold text-ui-muted-strong">
          {active ? `${active.meaning} — ${active.note}` : cfg.hint}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cfg.options.map((opt) => {
          const isOn = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt)}
              className={cn(
                'flex cursor-pointer flex-col items-center rounded-compact border-2 border-b-[length:var(--depth-lg)] px-1 pb-2 pt-1.5 transition-[transform,border-color,background-color] duration-100 active:mb-0.75 active:translate-y-0.75 active:border-b-2 focus-ring',
                isOn
                  ? 'border-brand-primary bg-brand-primary-soft'
                  : triedIds.has(opt.id)
                    ? 'border-brand-primary-soft-edge bg-ui-surface'
                    : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
              )}
            >
              <span className="text-base font-extrabold text-ui-muted-strong">{opt.chipPinyin}</span>
              <span className="font-chinese text-3xl font-bold leading-[1.15] text-ui-ink-strong">{opt.chipHanzi}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
