import { useEffect, useMemo, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { AppIcon, SpeakerIcon } from '../../../lib/widgets';
import { fetchVocabulary } from '../../../services/vocabularyService';
import { useAppStore } from '../../../store/useAppStore';
import { cn } from '../../../utils/cn';
import type { CharPartEntry } from '../data/types';
import { CenterSpeaker, CornerSpeaker } from './SpeakerControls';

interface CharPartsViewProps {
  items: CharPartEntry[];
  onPlayAudio: (audioKey: string) => void;
}

const ROLE_STYLES = {
  meaning: {
    style: { borderColor: 'var(--sh-ini)', backgroundColor: 'var(--sh-ini-soft)', color: 'var(--sh-ini)' },
    label: 'Meaning clue',
  },
  sound: {
    style: { borderColor: 'var(--sh-fin)', backgroundColor: 'var(--sh-fin-soft)', color: 'var(--sh-fin)' },
    label: 'Sound clue',
  },
  part: {
    style: undefined,
    label: 'Part',
  },
} as const;

export function CharPartsView({ items, onPlayAudio }: CharPartsViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    setSelectedIdx(0);
  }, [items, onPlayAudio]);

  const active = items[selectedIdx] ?? items[0];

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    if (items[idx]?.audio) {
      onPlayAudio(items[idx].audio);
    }
  };

  if (!active) return null;

  return (
    <div className="flex flex-col gap-3">
      {items.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {items.map((item, idx) => {
            const isSel = idx === selectedIdx;
            return (
              <button
                key={`${item.hanzi}-${idx}`}
                type="button"
                onClick={() => handleSelect(idx)}
                className={cn(
                  'flex min-w-[78px] cursor-pointer flex-col items-center rounded-compact border-2 tactile [--tactile-depth:var(--depth-lg)] px-3 py-2 transition-[transform,border-color,background-color] duration-100 focus-ring',
                  isSel
                    ? 'border-brand-primary bg-brand-primary-soft'
                    : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
                )}
              >
                <span className="font-chinese text-[30px] font-bold leading-tight text-ui-ink-strong">
                  {item.hanzi}
                </span>
                <span className="text-xs font-extrabold text-ui-muted-strong">{item.pinyin}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-3 rounded-feature border-[3px] border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface px-5 py-6">
        <CornerSpeaker onClick={() => onPlayAudio(active.audio)} label={`Hear ${active.hanzi}`} />

        <div className="flex flex-col items-center text-center">
          <span className="font-chinese text-[78px] font-bold leading-none text-ui-ink-strong md:text-[88px]">
            {active.hanzi}
          </span>
          <span className="mt-2 text-2xl font-black text-ui-ink-strong">{active.pinyin}</span>
          <span className="text-lg font-bold text-ui-muted-strong">{active.meaning}</span>
        </div>

        {active.highlightPart && (
          <div className="rounded-sm border-2 border-brand-primary-soft-edge bg-brand-primary-soft px-3 py-1 text-sm font-black text-brand-primary-deep">
            Spot the part: <span className="font-chinese text-lg">{active.highlightPart}</span>
          </div>
        )}

        {active.breakdown && active.breakdown.length > 0 && (
          <div className="grid w-full gap-2 pt-1 sm:grid-cols-2">
            {active.breakdown.map((piece, pIdx) => {
              const roleMeta = ROLE_STYLES[piece.role];
              return (
                <div
                  key={`${piece.glyph}-${pIdx}`}
                  className="flex items-center gap-3 rounded-compact border-2 border-ui-divider bg-ui-canvas px-3 py-2"
                >
                  <span
                    style={roleMeta.style}
                    className={cn(
                      'font-chinese flex size-11 shrink-0 items-center justify-center rounded-sm border-2 text-2xl font-bold',
                      piece.role === 'part' && 'border-ui-border bg-ui-surface text-ui-ink-strong',
                    )}
                  >
                    {piece.glyph}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-black uppercase tracking-wider text-ui-muted">
                      {roleMeta.label}
                    </span>
                    <span className="block text-base font-extrabold leading-snug text-ui-ink-strong">
                      {piece.hint}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface WordToken {
  hanzi: string;
  pinyin: string;
  id: string;
}

interface SentenceBuildViewProps {
  english: string;
  audio: string;
  target: Array<{ hanzi: string; pinyin: string }>;
  distractors: Array<{ hanzi: string; pinyin: string }>;
  onPlayAudio: (audioKey: string) => void;
  onComplete: () => void;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function SentenceBuildView({
  english,
  audio,
  target,
  distractors,
  onPlayAudio,
  onComplete,
}: SentenceBuildViewProps) {
  const bank = useMemo<WordToken[]>(() => {
    const raw: WordToken[] = [...target, ...distractors].map((item, idx) => ({
      ...item,
      id: `${idx}-${item.hanzi}`,
    }));
    let seed = hashSeed(english + target.map((t) => t.hanzi).join(''));
    const copy = raw.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [english, target, distractors]);

  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'right'>('idle');

  useEffect(() => {
    setPickedIds([]);
    setStatus('idle');
    onPlayAudio(audio);
  }, [english, audio, onPlayAudio]);

  const pickedTokens = pickedIds
    .map((id) => bank.find((t) => t.id === id))
    .filter((t): t is WordToken => Boolean(t));

  const addToken = (id: string) => {
    if (status === 'right' || pickedIds.includes(id)) return;
    const next = [...pickedIds, id];
    setPickedIds(next);
    // The sentence checks itself once every slot is filled (no separate Check button).
    if (next.length === target.length) checkSentence(next);
    else setStatus('idle');
  };

  const removeToken = (id: string) => {
    if (status === 'right') return;
    setStatus('idle');
    setPickedIds((prev) => prev.filter((item) => item !== id));
  };

  const checkSentence = (ids: string[]) => {
    const attempt = ids.map((id) => bank.find((t) => t.id === id)?.hanzi ?? '').join('');
    const expected = target.map((t) => t.hanzi).join('');
    if (attempt === expected) {
      setStatus('right');
      onPlayAudio(audio);
      onComplete();
    } else {
      setStatus('wrong');
      window.setTimeout(() => setStatus((cur) => (cur === 'wrong' ? 'idle' : cur)), 900);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 rounded-control border-2 border-ui-border bg-ui-surface px-4 py-4 text-center">
        <span className="text-xs font-black uppercase tracking-widest text-ui-muted">Build this sentence</span>
        <span className="text-2xl font-black text-ui-ink-strong">“{english}”</span>
        <CenterSpeaker onClick={() => onPlayAudio(audio)} label="Hear the sentence" />
      </div>

      {/* Answer tray */}
      <div
        className={cn(
          'flex min-h-[78px] flex-wrap items-center justify-center gap-2 rounded-control border-2 px-3 py-3 transition-colors',
          status === 'right'
            ? 'border-feedback-success bg-feedback-success-surface'
            : status === 'wrong'
              ? 'sh-shake border-feedback-danger bg-feedback-danger-surface'
              : 'border-dashed border-ui-border bg-ui-surface/60',
        )}
      >
        {pickedTokens.length === 0 ? (
          <span className="text-sm font-extrabold text-ui-muted">Tap words below in order</span>
        ) : (
          pickedTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              disabled={status === 'right'}
              onClick={() => removeToken(token.id)}
              className={cn(
                'flex flex-col items-center rounded-compact border-2 border-b-4 px-3 py-1.5 transition-colors focus-ring',
                status === 'right'
                  ? 'border-feedback-success bg-ui-surface text-feedback-success-text'
                  : 'cursor-pointer border-brand-primary bg-brand-primary-soft text-ui-ink-strong',
              )}
            >
              <span className="text-xs font-extrabold text-ui-muted-strong">{token.pinyin}</span>
              <span className="font-chinese text-2xl font-bold leading-tight">{token.hanzi}</span>
            </button>
          ))
        )}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap justify-center gap-2">
        {bank.map((token) => {
          const used = pickedIds.includes(token.id);
          return (
            <button
              key={token.id}
              type="button"
              disabled={used || status === 'right'}
              onClick={() => addToken(token.id)}
              className={cn(
                'flex flex-col items-center rounded-compact border-2 tactile [--tactile-depth:var(--depth-lg)] px-3.5 py-2 transition-[transform,opacity] duration-100 focus-ring',
                used
                  ? 'cursor-default border-ui-divider bg-ui-divider/40 opacity-30'
                  : 'cursor-pointer border-ui-border bg-ui-surface text-ui-ink-strong hover:bg-ui-hover',
              )}
            >
              <span className="text-xs font-extrabold text-ui-muted-strong">{token.pinyin}</span>
              <span className="font-chinese text-2xl font-bold leading-tight">{token.hanzi}</span>
            </button>
          );
        })}
      </div>

      {/* One reserved line for the result, so nothing below the words moves. */}
      <p className="m-0 flex min-h-7 items-center justify-center gap-2 text-center text-lg font-extrabold" aria-live="polite">
        {status === 'wrong' && <span className="text-feedback-danger-text">Not quite. Tap a word in the tray to take it out.</span>}
        {status === 'right' && (
          <span className="inline-flex items-center gap-2 text-feedback-success-text">
            <AppIcon name="check" className="size-5 shrink-0" />
            {target.map((t) => t.pinyin).join(' ')}: “{english}”
          </span>
        )}
      </p>
    </div>
  );
}

interface VocabCardsViewProps {
  cardIds: string[];
  caption?: string;
  onPlayAudio: (audioKey: string) => void;
  onAllHeard?: () => void;
}

function cardToWordKey(cardId: string): string {
  const suffix = cardId.slice(-2);
  const map: Record<string, string> = {
    '01': 'w:laoshi',
    '02': 'w:xuesheng',
    '03': 'w:ni',
    '04': 'w:wo',
    '05': 'w:ta',
    '06': 'w:shi',
    '07': 'w:nimen',
    '08': 'w:women',
    '09': 'w:tamen',
    '10': 'w:ren',
    '11': 'w:xiansheng',
    '12': 'w:xiaojie',
    '13': 'w:taitai',
  };
  return map[suffix] ?? 'w:ni';
}

export function VocabCardsView({ cardIds, caption, onPlayAudio, onAllHeard }: VocabCardsViewProps) {
  const characterPreference = useAppStore((s) => s.characterPreference);
  const simpleDefinitions = useAppStore((s) => s.simpleDefinitions);
  const [cardsById, setCardsById] = useState<Map<string, Flashcard> | null>(null);
  const [heardIds, setHeardIds] = useState<Set<string>>(() => new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setHeardIds(new Set());
    setPlayingId(null);
    void fetchVocabulary(1).then((cards) => {
      if (!active) return;
      const lesson0 = cards.filter((c) => c.lessonId === 0 || c.id.startsWith('B1L00-'));
      setCardsById(new Map(lesson0.map((c) => [c.id, c])));
    }).catch(() => {
      if (active) setCardsById(new Map());
    });
    return () => {
      active = false;
    };
  }, [cardIds]);

  const tapCard = (id: string) => {
    setPlayingId(id);
    onPlayAudio(cardToWordKey(id));
    window.setTimeout(() => setPlayingId((cur) => (cur === id ? null : cur)), 850);
    const heard = new Set(heardIds).add(id);
    setHeardIds(heard);
    if (heard.size === cardIds.length && heardIds.size < cardIds.length) onAllHeard?.();
  };

  if (!cardsById || cardIds.some((id) => !cardsById.has(id))) {
    return <p role="status" className="text-center text-ui-muted-strong">
      {cardsById ? 'Words could not load. Go back and reopen this lesson to try again.' : 'Loading words…'}
    </p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {caption && (
        <p className="m-0 text-center text-base font-bold text-ui-muted-strong">{caption}</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cardIds.map((id) => {
          const card = cardsById?.get(id);
          const hanzi = card
            ? characterPreference === 'simplified'
              ? card.simplified ?? card.front
              : card.traditional ?? card.front
            : '…';
          const pinyin = card?.pinyin ?? '';
          const english = card ? (simpleDefinitions && card.simple ? card.simple : card.back) : 'Loading…';
          const isHeard = heardIds.has(id);
          const isPlaying = playingId === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => tapCard(id)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-control border-2 tactile [--tactile-depth:var(--depth-lg)] px-4 py-3 text-left transition-[transform,border-color,background-color] duration-100 focus-ring',
                isPlaying || isHeard
                  ? 'border-brand-primary bg-brand-primary-soft'
                  : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-chinese text-4xl font-bold leading-none text-ui-ink-strong">
                    {hanzi}
                  </span>
                  <span className="text-xl font-black text-brand-primary-deep">{pinyin}</span>
                </div>
                <span className="mt-1 block truncate text-base font-extrabold text-ui-muted-strong">
                  {english}
                </span>
              </div>
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-sm',
                  isPlaying || isHeard ? 'text-brand-primary' : 'text-ui-muted',
                )}
              >
                {isHeard && !isPlaying ? (
                  <AppIcon name="check" className="size-5 text-feedback-success-text" />
                ) : (
                  <SpeakerIcon className="size-5" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
