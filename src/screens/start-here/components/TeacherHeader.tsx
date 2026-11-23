import teacherImg from '../../../assets/images/start-here-teacher.webp';
import { SpeakerIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { parseTalkLine } from '../data/talkParser';
import type { MouthSoundId } from '../data/types';

interface NarrationProps {
  lines: string[];
  activeLine: number;
  speaking: boolean;
  onSelectLine: (lineIndex: number) => void;
  onReplayCurrentLine: () => void;
  onPlayClip: (key: string, isMouth: boolean, soundId?: MouthSoundId) => void;
}

export function TeacherHeader(props: NarrationProps | { prompt: string }) {
  const narration = 'lines' in props ? props : null;
  const prompt = 'prompt' in props ? props.prompt : null;
  const lines = narration?.lines ?? [];
  const safeIdx = Math.min(narration?.activeLine ?? 0, lines.length - 1);
  const segments = safeIdx < 0 ? [] : parseTalkLine(lines[safeIdx]);
  const portraitClass = cn(
    'size-14 shrink-0 overflow-hidden rounded-full border-2 bg-[var(--sh-pfp)]',
    narration?.speaking ? 'border-brand-primary' : 'border-ui-border',
  );
  const portrait = <img src={teacherImg} alt="" className="h-full w-full object-cover" />;

  return (
    <div className="flex flex-none justify-center px-4 pt-1">
      <div className="flex w-full max-w-[520px] items-start gap-2.5">
        {narration ? (
          <button type="button" onClick={narration.onReplayCurrentLine} aria-label="Replay teacher explanation"
            className={cn(portraitClass, 'cursor-pointer transition-colors focus-ring')}>
            {portrait}
          </button>
        ) : <div className={portraitClass}>{portrait}</div>}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            className="min-h-[77px] w-full rounded-control border-2 border-b-4 border-ui-divider border-b-ui-border bg-ui-surface px-4 py-2.5 text-left"
          >
            <p className="m-0 text-[18px] font-bold leading-[1.42] text-ui-ink-strong">
              {prompt}
              {segments.map((seg, idx) => {
                if (seg.kind === 'text') {
                  return (
                    <span key={`t-${idx}`}>
                      {seg.runs.map((run, rIdx) =>
                        run.bold ? (
                          <strong key={`r-${rIdx}`} className="font-black text-brand-primary-deep">
                            {run.text}
                          </strong>
                        ) : (
                          <span key={`r-${rIdx}`}>{run.text}</span>
                        ),
                      )}{' '}
                    </span>
                  );
                }

                return (
                  <button
                    key={`c-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      narration?.onPlayClip(seg.key, seg.isMouth, seg.isMouth ? (seg.key as MouthSoundId) : undefined);
                    }}
                    className="mx-0.5 inline-flex h-[28px] cursor-pointer items-center gap-1 rounded-[9px] border-2 border-b-4 border-brand-primary-soft-edge bg-brand-primary-soft px-2 align-[2px] text-[16px] font-black leading-none text-brand-primary-deep transition-transform duration-75 active:translate-y-[2px] active:border-b-2 focus-ring"
                  >
                    <SpeakerIcon className="size-4 shrink-0" />
                    <span>{seg.label}</span>
                  </button>
                );
              })}
            </p>
          </div>

          {lines.length > 1 && (
            <div className="flex items-center justify-end gap-1.5 px-1" aria-label="Explanation steps">
              {lines.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => narration?.onSelectLine(idx)}
                  aria-label={`Teacher line ${idx + 1} of ${lines.length}`}
                  aria-pressed={idx === safeIdx}
                  className={cn(
                    'h-2 cursor-pointer rounded-full transition-all focus-ring',
                    idx === safeIdx ? 'w-5 bg-brand-primary' : 'w-2 bg-ui-divider hover:bg-ui-border',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
