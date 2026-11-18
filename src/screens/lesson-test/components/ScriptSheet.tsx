import { Drawer, SpeakerIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { AudioStep } from '../testAudioSequence';
import type { ScriptRow, TestScript } from '../testScript';
import { ChineseText } from './ChineseText';
import type { Script } from './ChoiceList';
import { TestSpeaker } from './TestSpeaker';

/** The pause between two lines when the whole script plays (the test's turn gap). */
const LINE_GAP_MS = 450;

export interface ScriptAudio {
  /** The script line being spoken (its row lights). */
  line: number | null;
  playing: boolean;
  say: (step: AudioStep) => void;
  playThrough: (steps: AudioStep[]) => void;
  stop: () => void;
}

interface ScriptSheetProps {
  open: boolean;
  onClose: () => void;
  script: TestScript;
  /** Traditional or simplified, as the learner reads. */
  scriptPreference: Script;
  audio: ScriptAudio;
}

/** Each line's clip in order, a short gap between, so the whole recording plays with its lines lit one by one. */
function playAllSteps(rows: ScriptRow[], scriptPreference: Script): AudioStep[] {
  return rows.flatMap((row, index) => (row.audio
    ? [{ pauseMs: LINE_GAP_MS }, { audio: row.audio, text: row.text[scriptPreference] ?? row.text.traditional, line: index }]
    : [])).slice(1);
}

function LineRow({ row, index, scriptPreference, speaking, onPlay }: { row: ScriptRow; index: number; scriptPreference: Script; speaking: boolean; onPlay: (index: number) => void }) {
  const zh = row.text[scriptPreference] ?? row.text.traditional;
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-xs font-chinese text-base transition-colors duration-200',
          speaking ? 'bg-brand-primary text-brand-on-primary' : row.answer ? 'bg-ui-surface text-brand-primary-text' : 'bg-brand-primary-wash text-brand-primary-text',
        )}
      >
        {speaking ? <SpeakerIcon status="playing" size={16} /> : row.badge}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-pretty font-chinese text-[19px] leading-snug text-ui-ink-strong"><ChineseText text={zh} /></span>
        {row.text.pinyin && <span className="text-[15px] font-bold leading-snug text-ui-muted-strong">{row.text.pinyin}</span>}
        {row.text.english && <span className="text-[15px] font-bold leading-snug text-ui-muted">{row.text.english}</span>}
      </span>
      {row.number !== undefined && (
        <span className="grid h-6.5 min-w-6.5 shrink-0 place-items-center self-start rounded-xs bg-feedback-success px-1.5 text-[13px] font-black tabular-nums text-ui-on-solid">
          {row.number}
        </span>
      )}
    </>
  );
  const rowClass = cn(
    'flex w-full gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-200',
    row.answer ? 'bg-feedback-success-surface' : speaking ? 'bg-brand-primary-wash' : '',
  );
  return row.audio ? (
    <button type="button" onClick={() => onPlay(index)} aria-label={`Play: ${zh}`} className={cn(rowClass, !row.answer && !speaking && 'hover:bg-ui-hover', 'focus-ring')}>
      {content}
    </button>
  ) : <div className={rowClass}>{content}</div>;
}

/**
 * The Fix round's Script: a sheet from the bottom on phones, a panel from the side on bigger screens. A recording
 * lists every line with its pinyin and English, the line that holds the answer marked; tap a line to hear it again,
 * or the speaker to hear them all, each lit as it is spoken. A text gives its pinyin and English.
 */
export function ScriptSheet({ open, onClose, script, scriptPreference, audio }: ScriptSheetProps) {
  const close = () => {
    audio.stop();
    onClose();
  };
  const play = (index: number) => {
    if (script.kind !== 'lines') return;
    const row = script.rows[index];
    if (audio.line === index) audio.stop();
    else audio.say({ audio: row.audio, text: row.text[scriptPreference] ?? row.text.traditional, line: index });
  };
  return (
    <Drawer
      isOpen={open}
      onClose={close}
      title="Script"
      closeLabel="Close the script"
      tone="surface"
      mdPlacement="side"
      phoneSheet
      heightClassName="max-h-[85dvh]"
      contentClassName="px-3 pb-6 md:px-4"
    >
      {script.kind === 'lines' ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-center pb-1">
            <TestSpeaker
              face={audio.playing ? 'voice' : null}
              playing={audio.playing}
              plays={0}
              maxPlays={null}
              onReplay={() => (audio.playing ? audio.stop() : audio.playThrough(playAllSteps(script.rows, scriptPreference)))}
            />
          </div>
          {script.intro && (
            <p className="pl-[3.25rem] pr-3 font-chinese text-base text-ui-muted-strong">
              <ChineseText text={script.intro[scriptPreference] ?? script.intro.traditional} />
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {script.rows.map((row, index) => (
              <LineRow key={index} row={row} index={index} scriptPreference={scriptPreference} speaking={audio.line === index} onPlay={play} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-3 pt-1">
          <div className="flex flex-col gap-2">
            {script.pinyin.map((paragraph, index) => (
              <p key={index} className="text-base font-bold leading-relaxed text-ui-muted-strong">{paragraph}</p>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {script.english.map((paragraph, index) => (
              <p key={index} className="text-base font-bold leading-relaxed text-ui-muted">{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}
