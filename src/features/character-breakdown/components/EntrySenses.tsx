import { useEffect, useState, type ReactNode } from 'react';
import { LevelTag, SpeakerIcon, TranslationLines } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useAudioPending } from '../../../hooks/useAudioPending';
import { playSentence } from '../../../services/audio/sentenceAudio';
import { formatPosLabel } from '../../../utils/vocabulary/posLabels';
import { isBoundForm, senseText, type EntryExample, type EntryReading, type EntrySense, type WordEntry } from '../../../utils/vocabulary/wordEntry';
import { ShowMoreButton } from './v3/ShowMoreButton';

/** Dictionary senses shown before "Show all"; course senses always show. */
const DICTIONARY_SENSES_SHOWN = 5;

function SenseExample({ example, speakerId }: { example: EntryExample; speakerId: string }) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const speaker = useAudioPending();
  return (
    <div className="col-start-2 flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-start gap-1">
        <span className="font-chinese text-lg font-bold leading-snug text-ui-ink-strong sm:text-xl">{example.chinese}</span>
        <button
          type="button"
          aria-label={`Play the example sentence ${example.chinese}`}
          onClick={() => { speaker.claim(speakerId); void playSentence(example.chinese, example.audio, characterPreference).catch(() => {}); }}
          className="-my-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-colors hover:bg-ui-hover hover:text-brand-primary focus-ring"
        >
          <SpeakerIcon status={speaker.status(speakerId)} size={16} />
        </button>
      </div>
      {!hideExamplePinyin && example.pinyin && (
        <span className="text-sm font-bold leading-snug text-ui-muted-strong">{example.pinyin}</span>
      )}
      <span className="ui-translation text-sm leading-snug sm:text-base">
        <TranslationLines text={example.english} />
      </span>
      {example.credit && <TatoebaCredit credit={example.credit} />}
    </div>
  );
}

/** Attribution a Tatoeba sentence needs (CC BY): a quiet link to the sentence and its authors. */
function TatoebaCredit({ credit }: { credit: string }) {
  const ids = [...credit.matchAll(/#(\d+)/g)].map((match) => match[1]);
  const authors = [...credit.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]).join(', ');
  const sentenceId = ids[ids.length - 1];
  if (!sentenceId) return null;
  return (
    <a
      href={`https://tatoeba.org/en/sentences/show/${sentenceId}`}
      target="_blank"
      rel="noreferrer"
      title={authors ? `Sentence by ${authors} on Tatoeba (CC BY 2.0 FR)` : 'Sentence from Tatoeba (CC BY 2.0 FR)'}
      className="w-fit rounded-xs text-xs font-bold text-ui-muted hover:underline focus-ring-inline"
    >
      Tatoeba{authors ? ` · ${authors}` : ''}
    </a>
  );
}

function SenseItem({ sense, number, simple, speakerId, onOpenWord }: {
  sense: EntrySense;
  number: number;
  simple: boolean;
  speakerId: string;
  onOpenWord: (word: string) => void;
}) {
  const text = senseText(sense, simple);
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2.5 gap-y-1.5">
      <span aria-hidden className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-xs border-2 border-ui-border text-xs font-black text-ui-muted-strong">
        {number}
      </span>
      <div className="flex min-h-6 min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {sense.ref ? (
          <button
            type="button"
            onClick={() => onOpenWord(sense.ref!.word)}
            className="rounded-xs text-left text-base font-extrabold leading-snug text-brand-primary-text hover:underline focus-ring-inline sm:text-lg"
          >
            {text}
          </button>
        ) : (
          <span className="text-base font-extrabold leading-snug text-ui-ink-strong sm:text-lg">{text}</span>
        )}
        {isBoundForm(sense) && <span className="text-sm font-bold text-ui-muted">only in words</span>}
        {sense.course && <LevelTag bookId={sense.course.bookId} lessonId={sense.course.lessonId} />}
      </div>
      {sense.example && <SenseExample example={sense.example} speakerId={speakerId} />}
    </li>
  );
}

function ReadingSenses({ word, reading, lead, onSelectReading, onOpenWord }: {
  word: string;
  reading: EntryReading;
  lead: boolean;
  onSelectReading: (key: string) => void;
  onOpenWord: (word: string) => void;
}) {
  const simple = useAppStore((state) => state.simpleDefinitions);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [word, reading.key]);
  const taught = reading.cards.length > 0;
  let number = 0;

  return (
    <div className={`flex min-w-0 flex-col gap-4 ${lead ? '' : 'border-t-2 border-ui-divider pt-5'}`}>
      {!lead && (
        <button
          type="button"
          onClick={() => onSelectReading(reading.key)}
          aria-label={`Show ${word} read ${reading.pinyin} first`}
          className="-ml-1 flex w-fit items-center gap-2 rounded-compact px-1 py-0.5 transition-colors hover:bg-ui-hover focus-ring"
        >
          <span className="font-chinese text-2xl leading-none text-ui-ink-strong">{word}</span>
          <span className="text-xl font-black leading-none text-brand-primary-text">{reading.pinyin}</span>
          {reading.cards[0] && <LevelTag bookId={reading.cards[0].bookId} lessonId={reading.cards[0].lessonId} />}
        </button>
      )}
      {reading.groups.map((group, groupIndex) => {
        const label = formatPosLabel(group.pos) ?? (taught ? 'Other meanings' : null);
        const capped = group.pos === null && !expanded && group.senses.length > DICTIONARY_SENSES_SHOWN + 1;
        const senses = capped ? group.senses.slice(0, DICTIONARY_SENSES_SHOWN) : group.senses;
        return (
          <div key={`${group.pos ?? 'dictionary'}-${groupIndex}`} className="flex min-w-0 flex-col gap-3">
            {label && <h3 className="text-xs font-black uppercase tracking-widest text-ui-muted-strong">{label}</h3>}
            <ol className="flex min-w-0 flex-col gap-3">
              {senses.map((sense, senseIndex) => {
                number += 1;
                return (
                  <SenseItem
                    key={`${sense.text}-${senseIndex}`}
                    sense={sense}
                    number={number}
                    simple={simple}
                    speakerId={`${reading.key}-${groupIndex}-${senseIndex}`}
                    onOpenWord={onOpenWord}
                  />
                );
              })}
            </ol>
            {capped && (
              <ShowMoreButton label={`Show all ${group.senses.length}`} onClick={() => setExpanded(true)} />
            )}
          </div>
        );
      })}
      {reading.measureWords.length > 0 && (
        <NoteLine label="Measure word">
          {reading.measureWords.map((measure) => (
            <span key={measure.char} className="inline-flex items-baseline gap-1">
              <span className="font-chinese text-base text-ui-ink">{measure.char}</span>
              {measure.pinyin && <span>{measure.pinyin}</span>}
            </span>
          ))}
        </NoteLine>
      )}
      {reading.otherReading && (
        <NoteLine label={reading.otherReading.region}>
          <span className="text-base font-extrabold text-ui-ink">{reading.otherReading.pinyin}</span>
        </NoteLine>
      )}
    </div>
  );
}

/** A quiet labelled line under a reading's meanings: its measure words, its reading in the other standard. */
function NoteLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-bold text-ui-muted-strong">
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      {children}
    </p>
  );
}

/**
 * Every meaning of a word, Pleco style: the lead reading's senses, numbered
 * and grouped by the book's part of speech (the lesson that teaches a sense
 * marked on it, with its example), then each other reading. Readings that only
 * point elsewhere ("used in 嗎啡") share one quiet line at the end.
 */
export function EntrySenses({ entry, leadKey, onSelectReading, onOpenWord }: {
  entry: WordEntry;
  leadKey?: string;
  onSelectReading: (key: string) => void;
  onOpenWord: (word: string) => void;
}) {
  const lead = entry.readings.find((reading) => reading.key === leadKey) ?? entry.readings[0];
  if (!lead) return null;
  const others = entry.readings.filter((reading) => reading !== lead && !reading.reference);
  const pointers = entry.readings.filter((reading) => reading !== lead && reading.reference);

  return (
    <section aria-label={`Meanings of ${entry.word}`} className="flex min-w-0 flex-col gap-5">
      <ReadingSenses word={entry.word} reading={lead} lead onSelectReading={onSelectReading} onOpenWord={onOpenWord} />
      {others.map((reading) => (
        <ReadingSenses key={reading.key} word={entry.word} reading={reading} lead={false} onSelectReading={onSelectReading} onOpenWord={onOpenWord} />
      ))}
      {pointers.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-ui-divider pt-4 text-sm font-bold text-ui-muted-strong">
          {pointers.map((reading) => {
            const sense = reading.groups[0]?.senses[0];
            return (
              <span key={reading.key} className="inline-flex flex-wrap items-baseline gap-1.5">
                <span className="font-black text-brand-primary-text">{reading.pinyin}</span>
                {sense?.ref ? (
                  <button type="button" onClick={() => onOpenWord(sense.ref!.word)} className="rounded-xs hover:underline focus-ring-inline">{sense.text}</button>
                ) : (
                  <span>{sense?.text}</span>
                )}
              </span>
            );
          })}
        </p>
      )}
    </section>
  );
}
