import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Avatar, coverStyle, ProfileCoverGlyphs } from '../../../lib/widgets';
import { SAMPLE_BOOKS } from '../../../data/books';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../../shared/lobby';
import { lobby } from '../lobbyController';
import { whereLabel } from '../socialText';

const wordsArt = new URL('../../../assets/icons/flat/profile-words.svg', import.meta.url).href;
const charactersArt = new URL('../../../assets/icons/flat/profile-characters.svg', import.meta.url).href;
const flameArt = new URL('../../../assets/icons/flat/flame.svg', import.meta.url).href;
/** A classmate who doesn't answer in this time is shown without their card. */
const CARD_WAIT_MS = 6000;

/** A classmate's profile inside the people panel: cover, face, where they are, and their card's stats when shared. */
export function VisitProfile({ person, lesson, online }: { person: Person; lesson: number | null; online: boolean }) {
  const card = useAppStore((state) => state.socialCards[person.u]);
  const form = useAppStore((state) => state.characterPreference);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    setWaited(false);
    lobby.askCard(person.u);
    const timer = setTimeout(() => setWaited(true), CARD_WAIT_MS);
    return () => clearTimeout(timer);
  }, [person.u]);

  const loading = card === undefined && !waited;
  const shared = card ?? null;
  const preset = shared?.cv ?? 'plain';
  const book = SAMPLE_BOOKS.find((item) => item.id === shared?.b);
  const since = shared?.s ? new Date(shared.s).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : null;
  const where = whereLabel(person.l, person.a, person.l === lesson);
  const status = !online ? 'Not online right now' : where === 'Online' ? 'Online' : `Online · ${where}`;
  const stats = [
    { art: wordsArt, value: shared?.w, label: 'Words known' },
    { art: charactersArt, value: shared?.k, label: 'Characters' },
    { art: flameArt, value: shared?.st, label: 'Day streak' },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}>
      <div className="relative h-[120px] overflow-hidden rounded-feature bg-cover bg-center" style={coverStyle(preset, shared?.ci)}>
        {!shared?.ci && preset !== 'plain' && <ProfileCoverGlyphs form={form} className="px-5 py-2 text-4xl tracking-[0.45em]" />}
      </div>
      <Avatar name={person.n} color={person.c} src={person.i} size="xl" className="-mt-[46px] ml-4 h-[92px] w-[92px] text-4xl ring-[5px] ring-ui-practice-canvas" />
      <h3 className="mt-2.5 break-words text-2xl font-black leading-tight text-ui-ink-strong">{person.n}</h3>
      <p className="mt-1.5 flex items-center gap-2 text-sm font-extrabold text-ui-muted-strong">
        {online && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-feedback-success" />}
        {status}
      </p>
      {since && <p className="mt-1 text-sm font-extrabold text-ui-muted">Learning since {since}</p>}
      {book && (
        <span className="mt-3.5 inline-flex items-center gap-2 whitespace-nowrap rounded-sm border-2 border-ui-divider py-1 pl-1.5 pr-2.5 text-[13px] font-black text-ui-ink-strong">
          <i aria-hidden className="h-[21px] w-4 rounded-xs bg-brand-primary shadow-[inset_-3px_0_0_var(--color-brand-primary-edge)]" />
          {book.title}
        </span>
      )}
      {(loading || shared) && (
        <div className="mt-5 grid grid-cols-3 gap-2.5" aria-busy={loading}>
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col gap-2 rounded-control border-2 border-b-[5px] border-ui-divider bg-ui-surface p-3">
              <img src={stat.art} alt="" className="h-7 w-7" />
              <div>
                <b className="block text-xl font-black leading-tight text-ui-ink-strong tabular-nums">{stat.value ?? '—'}</b>
                <span className="mt-0.5 block text-[13px] font-extrabold text-ui-muted">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
