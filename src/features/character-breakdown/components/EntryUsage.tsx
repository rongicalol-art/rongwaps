import { createContext, useContext, useState, type ReactNode } from 'react';
import { ActionButton, LevelTag } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import type { EntryGrammarLink, EntryPartner, EntrySplit } from '../../../utils/vocabulary/wordEntry';
import { SenseExample } from './SenseExample';
import { ShowMoreButton } from './v3/ShowMoreButton';

/**
 * Opens a grammar lesson at one point's page. Only the dictionary window
 * provides it: in a practice session a grammar link would pull the learner out,
 * so without it the word page shows no grammar links (never a dead button).
 */
export interface GrammarOpener {
  open: (partId: string, pageId: string) => void;
  /** False for a lesson this learner cannot open yet: its link is left out. */
  isOpenable: (bookId: number, lessonId: number) => boolean;
}

export const GrammarOpenerContext = createContext<GrammarOpener | null>(null);

/** Grammar links this learner can open; none without an opener. */
export function useOpenableGrammar(links: readonly EntryGrammarLink[] | undefined): { opener: GrammarOpener | null; links: EntryGrammarLink[] } {
  const opener = useContext(GrammarOpenerContext);
  return { opener, links: opener && links ? links.filter((link) => opener.isOpenable(link.bookId, link.lessonId)) : [] };
}

/** Grammar points first shown on a word page's "More grammar" list. */
const MORE_GRAMMAR_SHOWN = 3;

function UsageLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black uppercase tracking-widest text-ui-muted-strong">{children}</span>;
}

function GrammarLinkButton({ link, opener }: { link: EntryGrammarLink; opener: GrammarOpener }) {
  const simplified = useAppStore((state) => state.characterPreference) === 'simplified';
  const title = (simplified && link.titleSimplified) || link.title;
  return (
    <ActionButton
      variant="secondary"
      size="sm"
      fullWidth
      onClick={() => opener.open(link.partId, link.pageId)}
      aria-label={`Open the grammar lesson ${title}: ${link.english}`}
      className="justify-between gap-3 text-left normal-case tracking-normal"
    >
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <span className="font-chinese text-base font-bold leading-snug text-ui-ink-strong">{title}</span>
        <span className="text-xs font-bold leading-snug text-ui-muted-strong">{link.english}</span>
      </span>
      <LevelTag bookId={link.bookId} lessonId={link.lessonId} />
    </ActionButton>
  );
}

/** The grammar lesson that taught a sense, under that sense. */
export function SenseGrammar({ links }: { links: readonly EntryGrammarLink[] }) {
  const { opener, links: openable } = useOpenableGrammar(links);
  if (!opener || openable.length === 0) return null;
  return (
    <div className="col-start-2 flex min-w-0 flex-col gap-2">
      <UsageLabel>Grammar</UsageLabel>
      {openable.map((link) => <GrammarLinkButton key={link.pageId} link={link} opener={opener} />)}
    </div>
  );
}

/** How a separable verb splits: 上 ＿ 課, then book sentences with the halves picked out. */
export function SenseSplit({ split, speakerId }: { split: EntrySplit; speakerId: string }) {
  return (
    <div className="col-start-2 flex min-w-0 flex-col gap-2">
      <UsageLabel>Splits</UsageLabel>
      <span role="img" aria-label={`${split.first} … ${split.second}: words can go between`} className="flex items-center gap-2 font-chinese text-2xl leading-none text-ui-ink-strong">
        <span>{split.first}</span>
        <span aria-hidden className="h-5 w-10 border-b-[3px] border-brand-primary" />
        <span>{split.second}</span>
      </span>
      {split.examples.map((example, index) => (
        <SenseExample key={example.chinese} example={example} speakerId={`${speakerId}-split-${index}`} splitHalves={[split.first, split.second]} />
      ))}
    </div>
  );
}

/** Words a group's sense goes with (穿衣服, 喝咖啡): each opens the other word. */
export function GoesWith({ partners, onOpenWord }: { partners: readonly EntryPartner[]; onOpenWord: (word: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <UsageLabel>Goes with</UsageLabel>
      <div className="flex flex-wrap gap-2">
        {partners.map((partner) => (
          <ActionButton
            key={partner.phrase}
            variant="secondary"
            size="sm"
            onClick={() => onOpenWord(partner.word)}
            aria-label={`${partner.phrase}: open ${partner.word}`}
            className="font-chinese text-base font-bold normal-case tracking-normal"
            frontClassName="text-ui-ink-strong"
          >
            {partner.phrase}
          </ActionButton>
        ))}
      </div>
    </div>
  );
}

/** Grammar lessons about the word that sit under no single sense, after every meaning. */
export function MoreGrammar({ word, links, afterInline }: { word: string; links: readonly EntryGrammarLink[]; afterInline: boolean }) {
  const { opener, links: openable } = useOpenableGrammar(links);
  const [expanded, setExpanded] = useState(false);
  if (!opener || openable.length === 0) return null;
  const shown = expanded ? openable : openable.slice(0, MORE_GRAMMAR_SHOWN);
  return (
    <div className="flex min-w-0 flex-col gap-2 border-t-2 border-ui-divider pt-5">
      <UsageLabel>{afterInline ? `More grammar with ${word}` : `Grammar with ${word}`}</UsageLabel>
      {shown.map((link) => <GrammarLinkButton key={link.pageId} link={link} opener={opener} />)}
      {openable.length > shown.length && <ShowMoreButton label={`See all ${openable.length}`} onClick={() => setExpanded(true)} />}
    </div>
  );
}
