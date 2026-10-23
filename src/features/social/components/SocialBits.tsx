import type { ReactNode } from 'react';
import { AppIcon, Avatar, IconActionButton } from '../../../lib/widgets';
import { SAMPLE_LESSONS } from '../../../data/books';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../../shared/lobby';
import { whereLabel } from '../socialText';

/** Mutes cheer and invite pop-ups and the unread dot. */
export function MuteButton() {
  const muted = useAppStore((state) => state.socialMuted);
  const setMuted = useAppStore((state) => state.setSocialMuted);
  return (
    <IconActionButton
      size="md"
      label={muted ? 'Unmute notifications' : 'Mute notifications'}
      title={muted ? 'Notifications muted' : 'Mute notifications'}
      aria-pressed={muted}
      onClick={() => setMuted(!muted)}
      icon={<AppIcon name={muted ? 'bellOff' : 'bell'} size={20} />}
    />
  );
}

/** One person: face with live dot, name, where they are; `action` sits on the right. */
export function PersonRow({ person, lesson, action }: { person: Person; lesson: number | null; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-ui-divider py-3 last:border-b-0">
      <Avatar name={person.n} color={person.c} size="lg" src={person.i} live />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-black text-ui-ink-strong">{person.n}</span>
        <span className="block truncate text-sm font-bold text-ui-muted">{whereLabel(person.l, person.a, person.l === lesson)}</span>
      </span>
      {action}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm font-bold text-ui-muted">{children}</p>;
}

/** Panel header row: one quiet title, the bell on the right (the drawer adds its close button). */
export function PanelTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mr-1 flex min-w-0 flex-1 items-center gap-2">
      <h2 className="min-w-0 flex-1 truncate text-xl font-black text-ui-ink-strong">{eyebrow ? `${eyebrow} · ${title}` : title}</h2>
      <MuteButton />
    </div>
  );
}

/** "LESSON 1" + "The New Classmate" for a lesson key (`bookId * 100 + lessonId`). */
export function lessonHeading(lesson: number | null): { eyebrow?: string; title: string } {
  if (lesson === null) return { title: 'Study together' };
  const book = Math.floor(lesson / 100);
  const id = lesson % 100;
  if (id === 0) return { eyebrow: 'Introduction', title: 'Getting Started' };
  const entry = book === 1 ? SAMPLE_LESSONS.find((item) => item.id === id) : undefined;
  return { eyebrow: `${book > 1 ? `Book ${book} · ` : ''}Lesson ${id}`, title: entry ? entry.title.split('·')[0].trim() : `Lesson ${id}` };
}

/** Underlined text tabs, same look as the lesson window's part tabs; a count or a new-message dot can ride after a label. */
export function PanelTabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: ReadonlyArray<{ id: T; label: string; count?: number; dot?: boolean }>; value: T; onChange: (id: T) => void; label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="grid grid-flow-col auto-cols-fr border-b-2 border-ui-divider">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative -mb-0.5 flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] px-1 py-3 text-base font-black outline-none transition-colors focus-ring-inline ${active ? 'border-brand-primary text-ui-ink-strong' : 'border-transparent text-ui-muted hover:text-ui-muted-strong'}`}
          >
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && <span className="text-sm font-extrabold text-ui-muted">{tab.count}</span>}
            {tab.dot && <span aria-label="New messages" className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-primary" />}
          </button>
        );
      })}
    </div>
  );
}
