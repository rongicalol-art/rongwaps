import { useState } from 'react';
import { Drawer, DrawerTitle, SpeakerIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { cn } from '../../../utils/cn';
import type { AudioStep } from '../testAudioSequence';
import type { ScriptRow, TestScript } from '../testScript';
import type { Script } from './ChoiceList';
import { LinePlay } from './LinePlay';
import { PinyinText } from './PinyinText';
import { TestLookup } from './TestLookup';
import { TestSpeaker } from './TestSpeaker';
import { ViewSwitch } from './ViewSwitch';

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

interface Shown { pinyin: boolean; english: boolean }

function LineRow({ row, index, scriptPreference, shown, speaking, onPlay }: { row: ScriptRow; index: number; scriptPreference: Script; shown: Shown; speaking: boolean; onPlay: (index: number) => void }) {
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
        <span className={cn('text-pretty font-chinese text-[19px] text-ui-ink-strong', shown.pinyin ? 'leading-[1.8]' : 'leading-snug')}>
          <PinyinText text={zh} pinyin={row.text.pinyin} show={shown.pinyin} />
          {row.audio && <LinePlay text={zh} speaking={speaking} tinted={Boolean(row.answer)} onPress={() => onPlay(index)} />}
        </span>
        {shown.english && row.text.english && <span className="text-[15px] font-bold leading-snug text-ui-muted">{row.text.english}</span>}
      </span>
      {row.number !== undefined && (
        <span className="grid h-6.5 min-w-6.5 shrink-0 place-items-center self-start rounded-xs bg-feedback-success px-1.5 text-[13px] font-black tabular-nums text-ui-on-solid">
          {row.number}
        </span>
      )}
    </>
  );
  // A tap on a word looks it up; anywhere else on the row plays the line (its play button too).
  return (
    <div
      onClick={row.audio ? () => onPlay(index) : undefined}
      className={cn(
        'flex w-full gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-200',
        row.answer ? 'bg-feedback-success-surface' : speaking ? 'bg-brand-primary-wash' : row.audio && 'hover:bg-ui-hover',
        row.audio && 'cursor-pointer',
      )}
    >
      {content}
    </div>
  );
}

/**
 * The Fix round's Script: a sheet from the bottom on phones, a panel from the side on bigger screens. A recording
 * lists every line (Chinese only to start; the Pinyin and English switches add the pinyin over it and its meaning), the line that holds the answer marked; tap a line's play button (or its row) to hear it again,
 * or the speaker to hear them all, each lit as it is spoken. A text gives its pinyin and English. Its words can be
 * looked up; the sheet steps aside while the dictionary is open and comes back after.
 */
export function ScriptSheet({ open, onClose, script, scriptPreference, audio }: ScriptSheetProps) {
  const lookingUp = useAppStore((state) => state.dictionaryWord !== null);
  // Chinese only to start, as in Scripts & answers; the switches stay as set for the rest of the round.
  const [shown, setShown] = useState<Shown>({ pinyin: false, english: false });
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
      isOpen={open && !lookingUp}
      onClose={close}
      title={(
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
          <DrawerTitle>Script</DrawerTitle>
          {script.kind === 'lines' && (
            <div className="ml-auto flex gap-2">
              <ViewSwitch label="Pinyin" on={shown.pinyin} onToggle={() => setShown((now) => ({ ...now, pinyin: !now.pinyin }))} />
              <ViewSwitch label="English" on={shown.english} onToggle={() => setShown((now) => ({ ...now, english: !now.english }))} />
            </div>
          )}
        </div>
      )}
      closeLabel="Close the script"
      tone="surface"
      mdPlacement="side"
      phoneSheet
      heightClassName="max-h-[85dvh]"
      contentClassName="px-3 pb-6 md:px-4"
    >
      <TestLookup onOpen={audio.stop}>
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
            <p className={cn('pl-[3.25rem] pr-3 font-chinese text-base text-ui-muted-strong', shown.pinyin && 'leading-[1.8]')}>
              <PinyinText text={script.intro[scriptPreference] ?? script.intro.traditional} pinyin={script.intro.pinyin} show={shown.pinyin} />
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {script.rows.map((row, index) => (
              <LineRow key={index} row={row} index={index} scriptPreference={scriptPreference} shown={shown} speaking={audio.line === index} onPlay={play} />
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
      </TestLookup>
    </Drawer>
  );
}
