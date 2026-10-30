import { lazy, Suspense, useState } from 'react';
import { PlayfulNavIcon } from '../../../lib/widgets';
import { PracticeChoiceButton } from '../../../features/practice';
import { DEMOS, type DemoId } from '../landingContent';
import { CardsDemo } from '../demos/CardsDemo';
const QuizDemo = lazy(() => import('../demos/QuizDemo').then((m) => ({ default: m.QuizDemo })));
const TonesDemo = lazy(() => import('../demos/TonesDemo').then((m) => ({ default: m.TonesDemo })));
const DictionaryDemo = lazy(() => import('../demos/DictionaryDemo').then((m) => ({ default: m.DictionaryDemo })));
const GrammarDemo = lazy(() => import('../demos/GrammarDemo').then((m) => ({ default: m.GrammarDemo })));
const PartyDemo = lazy(() => import('../demos/PartyDemo').then((m) => ({ default: m.PartyDemo })));
const CharactersDemo = lazy(() => import('../demos/CharactersDemo').then((m) => ({ default: m.CharactersDemo })));

const DEMO_VIEW: Record<DemoId, React.ComponentType<object>> = {
  cards: CardsDemo, quiz: QuizDemo, tones: TonesDemo, dictionary: DictionaryDemo, grammar: GrammarDemo, party: PartyDemo, characters: CharactersDemo,
};

/** Playable samples of the app's study modes, using Book 1 Lessons 1–2. */
export function TryIt() {
  const [active, setActive] = useState<DemoId>('cards');
  const demo = DEMOS.find((d) => d.id === active) ?? DEMOS[0];
  const View = DEMO_VIEW[active];
  return (
    <div>
      <div role="tablist" aria-label="Study modes" className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:justify-center lg:px-0">
        {DEMOS.map(({ id, label, icon }) => (
          <PracticeChoiceButton key={id} compact role="tab" aria-selected={id === active} state={id === active ? 'selected' : 'idle'} onClick={() => setActive(id)} className="w-auto shrink-0">
            <span className="flex items-center gap-2 pr-1 font-black">
              <PlayfulNavIcon name={icon} className="size-6" />
              {label}
            </span>
          </PracticeChoiceButton>
        ))}
      </div>
      <div className="relative mx-auto mt-4 max-w-3xl rounded-modal border-[8px] border-ui-ink-strong bg-ui-ink-strong lg:mt-6 lg:border-[12px]">
        <span aria-hidden="true" className="absolute left-1/2 top-[-5px] size-1.5 -translate-x-1/2 rounded-full bg-ui-muted lg:top-[-7px]" />
        <div role="tabpanel" aria-label={demo.title} className="relative flex min-h-[28rem] flex-col items-center justify-center overflow-hidden rounded-feature bg-ui-practice-canvas px-4 py-8 lg:min-h-[32rem] lg:px-10 lg:py-10">
          <Suspense fallback={<div />}>
            <View key={active} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
