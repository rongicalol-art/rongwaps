import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { GrammarPractice, PracticeScene, SlotBuildItem } from '../../types/models';
import { cn } from '../../utils/cn';
import { AppIcon, IconActionButton, WorkspaceWindow } from '../../lib/widgets';
import { GrammarPracticeView } from './GrammarPracticeView';

/** Every authored book exercise, straight from content/grammar-practice (DEV gallery only). */
const SOURCES = import.meta.glob<Record<string, GrammarPractice>>('../../../content/grammar-practice/*.json', { eager: true, import: 'default' });

/** One slot-build item per new scene (moment, month, picture), so each can be eyeballed. */
const sceneItem = (id: string, scene: PracticeScene): SlotBuildItem => ({
  id,
  source: 'own',
  kind: 'slot-build',
  scene,
  lines: [{ segments: [{ type: 'text', traditional: '今天是' }, { type: 'slot', id: 'a', answers: ['星期五'] }, { type: 'text', traditional: '。' }] }],
  tiles: [{ traditional: '星期五', pinyin: 'xīngqīwǔ' }, { traditional: '星期六', pinyin: 'xīngqīliù' }],
  fallbackRepair: 'Check the day.',
  result: { traditional: '今天是星期五。', pinyin: 'Jīntiān shì xīngqīwǔ.', english: 'Today is Friday.' },
});
const SCENE_SAMPLES: GrammarPractice = {
  bookPage: 0,
  title: 'New scenes (sample)',
  items: [
    sceneItem('moment', { type: 'moment', moment: { date: { month: 10, day: 16 }, label: { traditional: '今天', pinyin: 'jīntiān', english: 'today' } } }),
    sceneItem('month', { type: 'month', year: 2026, month: 10, highlight: [16, 17] }),
    sceneItem('picture', { type: 'picture', page: 163, box: [0.1, 0.2, 0.8, 0.3], alt: 'Printed book page 163, top half' }),
  ],
};
const EXERCISES = [
  ...Object.values(SOURCES).flatMap((file) => Object.entries(file)).map(([pageId, practice]) => ({ pageId, practice })),
  { pageId: 'scene-samples', practice: SCENE_SAMPLES },
];

/**
 * DEV-only gallery (debug window, Ctrl+Shift+0 → UI Previews): run any grammar page's book
 * exercise from any item. Nothing here touches progress, SRS or sync.
 */
export function GrammarPracticePreview() {
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState({ exercise: 0, item: 0 });
  const [run, setRun] = useState(0);
  const [barHost, setBarHost] = useState<HTMLDivElement | null>(null);
  const [script, setScript] = useState<'traditional' | 'simplified'>('traditional');
  const current = EXERCISES[selected.exercise];
  if (!current) return null;
  const pick = (exercise: number, item: number) => { setSelected({ exercise, item }); setRun((n) => n + 1); };
  const chip = (active: boolean) => cn(
    'rounded-control border-2 px-3 py-1.5 text-sm font-extrabold focus-ring',
    active ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep' : 'border-ui-divider bg-ui-surface text-ui-ink',
  );

  const preview = (
    <div ref={setBarHost} role="region" aria-label="Grammar practice preview" className={focused
      ? 'relative min-h-0 flex-1 bg-ui-canvas'
      : 'relative h-[760px] w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-canvas'}>
      <div className="absolute inset-0 overflow-y-auto px-4 pb-40 pt-6 sm:px-8">
        <GrammarPracticeView
          key={`${selected.exercise}-${selected.item}-${run}`}
          practice={current.practice}
          initialIndex={selected.item}
          script={script}
          showPinyin={false}
          showTranslation={false}
          contextTokens={[]}
          onOpenWord={() => undefined}
          onComplete={() => pick(selected.exercise, 0)}
          barHost={barHost}
        />
      </div>
    </div>
  );

  if (focused) return createPortal(
    <WorkspaceWindow animateIn={false} tone="practice" className="workspace-window z-devtools" style={{ paddingLeft: 0 }} role="dialog" aria-modal="true" aria-label="Focused grammar preview">
      <div className="flex shrink-0 justify-end px-4 py-3 sm:px-8">
        <IconActionButton label="Close focused preview" onClick={() => setFocused(false)} icon={<AppIcon name="close" size={24} />} />
      </div>
      {preview}
    </WorkspaceWindow>, document.body,
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-extrabold text-ui-muted-strong">Grammar practice:</span>
        {EXERCISES.map(({ pageId, practice }, index) => (
          <button key={pageId} type="button" onClick={() => pick(index, 0)} className={chip(index === selected.exercise)}>
            {pageId.slice(0, 9)} · {practice.title}
          </button>
        ))}
        <button type="button" onClick={() => setScript((value) => (value === 'traditional' ? 'simplified' : 'traditional'))} className={chip(false)}>
          {script === 'traditional' ? '繁' : '简'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFocused(true)} className={chip(false)}>Focus preview</button>
        {current.practice.items.map((item, index) => (
          <button key={item.id} type="button" onClick={() => pick(selected.exercise, index)} className={chip(index === selected.item)}>
            {index + 1}. {item.kind}
          </button>
        ))}
      </div>
      {preview}
    </div>
  );
}
