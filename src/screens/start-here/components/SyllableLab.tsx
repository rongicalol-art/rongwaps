import { useEffect, useState } from 'react';
import { cn } from '../../../utils/cn';
import type { ToneMark } from '../data/types';
import { CenterSpeaker, CornerSpeaker } from './SpeakerControls';
import { applyToneToFinal, DecomposedSyllable, ToneContour, ToneMarkGlyph } from './ToneContour';

type SlotPart = 'ini' | 'fin' | 'tone';

const SLOT_LABELS: Record<SlotPart, string> = {
  ini: 'Initial',
  fin: 'Final',
  tone: 'Tone',
};

function SlotBox({
  part,
  lit,
  open = true,
  value,
  toneValue,
  onClick,
}: {
  part: SlotPart;
  lit: boolean;
  open?: boolean;
  value?: string;
  toneValue?: ToneMark;
  onClick?: () => void;
}) {
  const colorStyle = lit
    ? {
        borderColor: `var(--sh-${part})`,
        backgroundColor: `var(--sh-${part}-soft)`,
        color: `var(--sh-${part})`,
      }
    : undefined;

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      style={colorStyle}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-[14px] border-2 border-b-4 bg-ui-surface px-1 py-2 transition-[transform,border-color,background-color] duration-150 focus-ring',
        !lit && (open ? 'border-ui-border border-b-[5px]' : 'border-ui-divider'),
        onClick && open && 'cursor-pointer active:mb-[3px] active:translate-y-[3px] active:border-b-2',
        !onClick && 'cursor-default',
      )}
    >
      <span
        style={{ color: lit ? `var(--sh-${part})` : undefined }}
        className={cn('flex h-[38px] items-center text-[28px] font-black', lit ? '' : open ? 'text-ui-ink-strong' : 'text-ui-divider')}
      >
        {part === 'tone' && toneValue ? <ToneMarkGlyph tone={toneValue} className="h-[17px] w-[34px]" /> : value || '—'}
      </span>
      <span
        style={{ color: lit ? `var(--sh-${part})` : undefined }}
        className={cn('text-[12px] font-extrabold uppercase tracking-[0.12em]', !lit && 'text-ui-muted')}
      >
        {SLOT_LABELS[part]}
      </span>
    </button>
  );
}

interface PiecesViewProps {
  initial: string;
  finalPart: string;
  tone: ToneMark;
  audio: string;
  noAuto?: boolean;
  lines: [string, string, string, string];
  onCaptionChange: (caption: string) => void;
  onPlayAudio: (audioKey: string) => void;
}

export function PiecesView({ initial, finalPart, tone, audio, noAuto, lines, onPlayAudio, onCaptionChange }: PiecesViewProps) {
  const [selected, setSelected] = useState<SlotPart | null>(null);

  useEffect(() => {
    setSelected(null);
    if (!noAuto) onPlayAudio(audio);
  }, [initial, finalPart, tone, audio, noAuto, onPlayAudio]);

  const selectPart = (part: SlotPart) => {
    const next = selected === part ? null : part;
    setSelected(next);
    onCaptionChange(lines[next === 'ini' ? 1 : next === 'fin' ? 2 : next === 'tone' ? 3 : 0]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col items-center gap-4 rounded-feature border-[3px] border-b-[6px] border-ui-divider bg-ui-surface px-4 py-6">
        <CornerSpeaker onClick={() => onPlayAudio(audio)} label="Hear syllable" />
        <DecomposedSyllable
          initial={initial}
          finalPart={finalPart}
          tone={tone}
          litIni={selected === null || selected === 'ini'}
          litFin={selected === null || selected === 'fin'}
          litTone={selected === null || selected === 'tone'}
          onTapPart={selectPart}
        />
        <div className="grid w-full grid-cols-3 gap-2">
          <SlotBox part="ini" lit={selected === null || selected === 'ini'} value={initial || '—'} onClick={() => selectPart('ini')} />
          <SlotBox part="fin" lit={selected === null || selected === 'fin'} value={finalPart} onClick={() => selectPart('fin')} />
          <SlotBox part="tone" lit={selected === null || selected === 'tone'} toneValue={tone} onClick={() => selectPart('tone')} />
        </div>
      </div>
    </div>
  );
}

interface SplitViewProps {
  initial: string;
  finalPart: string;
  tone: ToneMark;
  audio: string;
  onPlayAudio: (audioKey: string) => void;
  onComplete: () => void;
}

export function SplitView({ initial, finalPart, tone, audio, onPlayAudio, onComplete }: SplitViewProps) {
  const [found, setFound] = useState<Set<SlotPart>>(() => new Set());
  const allFound = found.size === 3;

  useEffect(() => {
    setFound(new Set());
    onPlayAudio(audio);
  }, [initial, finalPart, tone, audio, onPlayAudio]);

  const reveal = (part: SlotPart) => {
    if (found.has(part)) return;
    const next = new Set(found).add(part);
    setFound(next);
    if (next.size === 3) {
      onPlayAudio(audio);
      onComplete();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className={cn('relative flex flex-col items-center gap-4 rounded-feature border-[3px] border-b-[6px] border-ui-divider bg-ui-surface px-4 py-6', allFound && 'sh-pop')}>
        <CornerSpeaker onClick={() => onPlayAudio(audio)} label="Hear syllable" />
        <DecomposedSyllable
          initial={initial}
          finalPart={finalPart}
          tone={tone}
          litIni={found.has('ini')}
          litFin={found.has('fin')}
          litTone={found.has('tone')}
          onTapPart={reveal}
        />
        <div className="grid w-full grid-cols-3 gap-2">
          <SlotBox part="ini" lit={found.has('ini')} value={found.has('ini') ? initial || '—' : '?'} onClick={() => reveal('ini')} />
          <SlotBox part="fin" lit={found.has('fin')} value={found.has('fin') ? finalPart : '?'} onClick={() => reveal('fin')} />
          <SlotBox
            part="tone"
            lit={found.has('tone')}
            toneValue={found.has('tone') ? tone : undefined}
            value="?"
            onClick={() => reveal('tone')}
          />
        </div>
      </div>
      <p className="m-0 min-h-[28px] text-center text-[18px] font-black text-ui-ink-strong" aria-live="polite">
        {allFound ? 'Split into initial, final, and tone.' : `Tap the 3 parts of the syllable (${found.size}/3).`}
      </p>
    </div>
  );
}

interface BuildViewProps {
  audio: string;
  target: [string, string, ToneMark];
  inis: string[];
  fins: string[];
  tones: ToneMark[];
  doneText: string;
  displayPinyin?: string;
  dropDots?: boolean;
  onPlayAudio: (audioKey: string) => void;
  onComplete: () => void;
}

export function BuildView({
  audio,
  target,
  inis,
  fins,
  tones,
  doneText,
  displayPinyin,
  dropDots,
  onPlayAudio,
  onComplete,
}: BuildViewProps) {
  const [targetIni, targetFin, targetTone] = target;
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [wrongKey, setWrongKey] = useState<string | null>(null);

  useEffect(() => {
    setStep(0);
    setWrongKey(null);
    onPlayAudio(audio);
  }, [audio, targetIni, targetFin, targetTone, onPlayAudio]);

  const triggerWrong = (key: string) => {
    setWrongKey(key);
    window.setTimeout(() => setWrongKey((cur) => (cur === key ? null : cur)), 320);
  };

  const pickIni = (val: string) => {
    if (step !== 0) return;
    if (val === targetIni) {
      setStep(1);
    } else {
      triggerWrong(`ini-${val}`);
    }
  };

  const pickFin = (val: string) => {
    if (step !== 1) return;
    if (val === targetFin) {
      setStep(2);
    } else {
      triggerWrong(`fin-${val}`);
    }
  };

  const pickTone = (val: ToneMark) => {
    if (step !== 2) return;
    if (val === targetTone) {
      setStep(3);
      onPlayAudio(audio);
      onComplete();
    } else {
      triggerWrong(`tone-${val}`);
    }
  };

  const finalDisplay = step >= 3 && displayPinyin ? displayPinyin : `${targetIni}${applyToneToFinal(targetFin, targetTone)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className={cn('relative flex flex-col items-center gap-4 rounded-feature border-[3px] border-b-[6px] border-ui-divider bg-ui-surface px-4 py-5', step === 3 && 'sh-pop')}>
        <CenterSpeaker onClick={() => onPlayAudio(audio)} label="Hear target syllable" />

        {step === 0 ? (
          <div className="flex h-[108px] items-center justify-center text-[82px] font-extrabold text-ui-divider select-none">
            ···
          </div>
        ) : (
          <DecomposedSyllable
            initial={step >= 1 ? targetIni : ''}
            finalPart={step >= 2 ? targetFin : ''}
            tone={step >= 3 ? targetTone : null}
            litIni={step >= 1}
            litFin={step >= 2}
            litTone={step >= 3}
            dropDots={Boolean(dropDots && step >= 3)}
            sizeClass="text-[84px] md:text-[96px]"
          />
        )}

        <div className="grid w-full grid-cols-3 gap-2">
          <SlotBox part="ini" lit={step >= 1} open={step === 0} value={step >= 1 ? targetIni || '—' : '?'} />
          <SlotBox part="fin" lit={step >= 2} open={step === 1} value={step >= 2 ? targetFin : '?'} />
          <SlotBox
            part="tone"
            lit={step >= 3}
            open={step === 2}
            toneValue={step >= 3 ? targetTone : undefined}
            value="?"
          />
        </div>
      </div>

      <p className="m-0 min-h-[28px] text-center text-[19px] font-black text-ui-ink-strong" aria-live="polite">
        {step === 0 && (
          <>
            1. Pick the <span style={{ color: 'var(--sh-ini)' }}>initial</span>
          </>
        )}
        {step === 1 && (
          <>
            2. Pick the <span style={{ color: 'var(--sh-fin)' }}>final</span>
          </>
        )}
        {step === 2 && (
          <>
            3. Pick the <span style={{ color: 'var(--sh-tone)' }}>tone</span>
          </>
        )}
        {step === 3 && <span className="text-feedback-success-text">{doneText || finalDisplay}</span>}
      </p>

      {step < 3 && (
        <div className="flex min-h-[63px] gap-2.5">
          {step === 0 &&
            inis.map((val) => {
              const key = `ini-${val}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickIni(val)}
                  aria-label={val || 'No initial'}
                  className={cn(
                    'flex min-h-[58px] flex-1 cursor-pointer items-center justify-center rounded-[14px] border-2 border-b-[5px] bg-ui-surface text-[26px] font-black text-ui-ink-strong transition-[transform,border-color] duration-100 hover:bg-ui-hover active:mb-[3px] active:translate-y-[3px] active:border-b-2 focus-ring',
                    wrongKey === key ? 'sh-shake border-feedback-danger' : 'border-ui-border',
                  )}
                >
                  {val || '—'}
                </button>
              );
            })}

          {step === 1 &&
            fins.map((val) => {
              const key = `fin-${val}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickFin(val)}
                  className={cn(
                    'flex min-h-[58px] flex-1 cursor-pointer items-center justify-center rounded-[14px] border-2 border-b-[5px] bg-ui-surface text-[26px] font-black text-ui-ink-strong transition-[transform,border-color] duration-100 hover:bg-ui-hover active:mb-[3px] active:translate-y-[3px] active:border-b-2 focus-ring',
                    wrongKey === key ? 'sh-shake border-feedback-danger' : 'border-ui-border',
                  )}
                >
                  {val}
                </button>
              );
            })}

          {step === 2 &&
            tones.map((t) => {
              const key = `tone-${t}`;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`Tone ${t}`}
                  onClick={() => pickTone(t)}
                  className={cn(
                    'flex min-h-[58px] flex-1 cursor-pointer items-center justify-center rounded-[14px] border-2 border-b-[5px] bg-ui-surface text-ui-ink-strong transition-[transform,border-color] duration-100 hover:bg-ui-hover active:mb-[3px] active:translate-y-[3px] active:border-b-2 focus-ring',
                    wrongKey === key ? 'sh-shake border-feedback-danger' : 'border-ui-border',
                  )}
                >
                  <ToneContour tone={t} showStaff={false} className="h-[24px] w-[44px]" />
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
