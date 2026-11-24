import { useEffect, useState } from 'react';
import { getPronunciationAudioIndex } from '../../../services/pronunciationAudio';
import { ActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { EXCLUDED_CNS_KEYS } from '../data/audioMap';
import type { StartHereScreen } from '../data/types';

const tones = [1, 2, 3, 4] as const;

type Chart = Extract<StartHereScreen, { k: 'chart' }>;
const standalone: Record<string, string> = { i: 'yi', u: 'wu', ü: 'yu' };

export function PinyinChartView({ chart, onPlayAudio, onComplete }: {
  chart: Chart;
  onPlayAudio: (key: string) => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState<Map<string, string>>();
  const [heard, setHeard] = useState('');
  const [tone, setTone] = useState(1);
  const [hunt, setHunt] = useState(0);
  const [wrong, setWrong] = useState('');
  const target = chart.huntTargets?.[hunt];

  useEffect(() => {
    let mounted = true;
    void getPronunciationAudioIndex().then((clips) => {
      if (mounted) setIndex(clips);
    }).catch(() => {
      if (mounted) setIndex(new Map());
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-3">
      {target && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-extrabold text-ui-ink-strong">Find {target.label} ({hunt + 1}/{chart.huntTargets?.length})</p>
          <ActionButton variant="secondary" onClick={() => onPlayAudio(target.audio)}>Listen</ActionButton>
        </div>
      )}
      {chart.fullChart && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Recording tone">
          <span className="font-extrabold text-ui-ink-strong">Tone</span>
          {tones.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tone === value}
              className={cn('size-9 rounded-sm border border-ui-border font-extrabold focus-ring',
                tone === value ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep' : 'bg-ui-surface')}
              onClick={() => setTone(value)}
            >{value}</button>
          ))}
        </div>
      )}
      {chart.huntTargets && !target && <p role="status">You found every sound.</p>}
      {wrong && <p role="status" className="text-feedback-danger-text">You picked {wrong}. Listen and try again.</p>}
      {!index?.size ? (
        <p role="status">{index ? 'The pinyin recordings could not load.' : 'Loading pinyin recordings…'}</p>
      ) : (
        <div className="max-h-[46dvh] overflow-auto rounded-control border border-ui-border bg-ui-surface" tabIndex={0} aria-label="Scrollable pinyin chart">
          <table className="min-w-full border-separate border-spacing-0 text-center text-sm">
            <thead className="sticky top-0 z-10 bg-ui-hover">
              <tr><th className="sticky left-0 z-20 bg-ui-hover px-2" scope="col">Initial</th>
                {chart.cols.map((final) => <th key={final} scope="col" className="px-2 py-2">{final}</th>)}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((initial) => (
                <tr key={initial}>
                  <th scope="row" className="sticky left-0 z-[5] bg-ui-hover px-2">{initial || 'None'}</th>
                  {chart.cols.map((final) => {
                    const joined = initial + final;
                    const syllable = chart.spellOverrides?.[joined] ?? (initial ? joined : standalone[final] ?? final);
                    const valid = !(/^[jqx]$/.test(initial) && final.startsWith('u'));
                    const key = valid && [tone, ...tones.filter((value) => value !== tone)].map((value) => syllable + value)
                      .find((candidate) => index.has(candidate) && !EXCLUDED_CNS_KEYS.has(candidate));
                    const verified = joined === 'e' ? 'w:e' : joined === 'lü' ? 'w:lu' : undefined;
                    const audio = key || (valid ? verified : undefined);
                    const recording = target?.syllable === syllable ? target.audio
                      : chart.fullChart && key !== syllable + tone ? undefined : audio;
                    return (
                      <td key={final} className="border-b border-r border-ui-divider p-0.5">
                        {audio && (
                          <button
                            type="button"
                            aria-pressed={heard === syllable}
                            disabled={!recording}
                            title={recording ? undefined : `No tone ${tone} recording`}
                            className={cn('min-h-9 min-w-10 rounded-sm px-1 font-extrabold hover:bg-ui-hover disabled:opacity-45 focus-ring',
                              heard === syllable ? 'bg-brand-primary-soft text-brand-primary-deep' :
                              (chart.fresh.includes(initial) || chart.fresh.includes(final)) ? 'text-brand-primary-deep' : 'text-ui-ink-strong')}
                            onClick={() => {
                              if (!recording) return;
                              setHeard(syllable);
                              setWrong('');
                              if (syllable !== target?.syllable) {
                                if (target) setWrong(syllable);
                                onPlayAudio(recording);
                                return;
                              }
                              onPlayAudio(target.audio);
                              setHunt(hunt + 1);
                              if (hunt + 1 === chart.huntTargets?.length) onComplete();
                            }}
                          >
                            {syllable}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
