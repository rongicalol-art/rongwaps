import { useEffect, useMemo, useState } from 'react';
import { PracticeChoiceButton } from '../../../features/practice';
import { AppIcon, ActionButton, IconActionButton } from '../../../lib/widgets';
import type { MockTestAttempt, MockTestRecord } from '../../../store/slices/mockTestSlice';
import type { LessonTestPart } from '../../../types/lessonTest';
import type { MockConfig, MockKind } from '../../../utils/mockTest/mockRun';
import type { MockLength } from '../../../utils/mockTest/recipes';
import { MOCK_KINDS, kindLabel, levelText } from './mockTestText';

interface MockTestStartProps {
  /** The kinds the pool can run now (a band opens when its questions exist). */
  kinds: MockKind[];
  /** A test left unfinished: Continue picks it up. */
  saved: MockTestAttempt | null;
  /** The last finished test: Same again starts another like it. */
  last: MockTestRecord | null;
  onStart: (config: MockConfig) => void;
  onContinue: () => void;
  onClose: () => void;
}

const SKILLS: ReadonlyArray<{ label: string; parts: LessonTestPart[] }> = [
  { label: 'Listening + Reading', parts: ['listening', 'reading'] },
  { label: 'Listening', parts: ['listening'] },
  { label: 'Reading', parts: ['reading'] },
];

/** How long a test takes, said plainly. */
const LENGTHS: ReadonlyArray<{ length: MockLength; label: string; detail: (skills: number) => string }> = [
  { length: 'quick', label: 'Quick', detail: (skills) => (skills === 2 ? '15 minutes' : '8 minutes') },
  { length: 'full', label: 'Full', detail: (skills) => `Like the real exam · ${skills === 2 ? '2 hours' : '1 hour'}` },
];

function Tile({ index, label, detail, onPick }: { index: number; label: string; detail?: string; onPick: () => void }) {
  return (
    <PracticeChoiceButton index={index} onClick={onPick}>
      <span className="block text-xl font-black text-ui-ink-strong">{label}</span>
      {detail && <span className="mt-0.5 block text-sm font-bold text-ui-muted-strong">{detail}</span>}
    </PracticeChoiceButton>
  );
}

/**
 * Three questions, one per screen: which test (the adaptive one, or a band), which skills, how long. The last tap
 * starts the test. Under the first question: Continue for a test left unfinished, or Same again after a finished one.
 */
export function MockTestStart({ kinds, saved, last, onStart, onContinue, onClose }: MockTestStartProps) {
  const [kind, setKind] = useState<MockKind | null>(null);
  const [parts, setParts] = useState<LessonTestPart[] | null>(null);
  const step = kind === null ? 0 : parts === null ? 1 : 2;
  const tiles = useMemo(() => {
    if (step === 0) return MOCK_KINDS.filter((entry) => kinds.includes(entry.kind)).map((entry) => ({ label: entry.label, detail: entry.detail, pick: () => setKind(entry.kind) }));
    if (step === 1) return SKILLS.map((entry) => ({ label: entry.label, detail: undefined, pick: () => setParts(entry.parts) }));
    return LENGTHS.map((entry) => ({ label: entry.label, detail: entry.detail(parts!.length), pick: () => onStart({ kind: kind!, parts: parts!, length: entry.length }) }));
  }, [kind, kinds, onStart, parts, step]);
  const back = () => (step === 2 ? setParts(null) : setKind(null));

  // 1, 2, 3… press the tiles, as on answer choices.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const tile = tiles[Number(event.key) - 1];
      if (!tile) return;
      event.preventDefault();
      tile.pick();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tiles]);

  const again = last && kinds.includes(last.kind) ? last : null;
  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain px-5 pb-10">
      <div className="mx-auto grid w-full max-w-md shrink-0 grid-cols-[2.5rem_1fr_2.5rem] items-center pt-3">
        {step === 0
          ? <IconActionButton variant="quiet" icon={<AppIcon name="close" size={22} />} label="Close" onClick={onClose} />
          : <IconActionButton variant="quiet" icon={<AppIcon name="back" size={22} />} label="Back" onClick={back} />}
        {kind && <h2 className="text-center text-lg font-black text-ui-ink-strong">{kindLabel(kind)}</h2>}
      </div>
      <div className="mx-auto my-auto flex w-full max-w-md shrink-0 flex-col gap-4 py-6">
        {step === 0 && <h1 className="mb-1 text-3xl font-black leading-tight text-ui-ink-strong">TOCFL mock test</h1>}
        <div key={step} className="flex flex-col gap-2.5">
          {tiles.map((tile, index) => <Tile key={tile.label} index={index} label={tile.label} detail={tile.detail} onPick={tile.pick} />)}
        </div>
        {step === 0 && saved && (
          <ActionButton size="lg" fullWidth className="mt-2" onClick={onContinue}>Continue test</ActionButton>
        )}
        {step === 0 && !saved && again && (
          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            edgeColor="var(--color-ui-border)"
            className="mt-2"
            onClick={() => onStart({ kind: again.kind, parts: again.parts, length: again.length })}
          >
            Same again · {levelText(again)}
          </ActionButton>
        )}
      </div>
    </div>
  );
}
