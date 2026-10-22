import { useEffect, useRef, useState } from 'react';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { ModeIcon } from '../../curriculum';
import type { ReadingRecord } from '../../../types/models';
import { GRAMMAR_WASH_CLASS } from '../utils/readerGrammarRanges';
import type { ReaderGrammarPoint, ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { playStudyWord, studyWordText } from '../utils/readerStudyWords';

type CharacterPreference = 'traditional' | 'simplified';

export interface ReaderSummaryProps {
  reading: ReadingRecord;
  characterPreference: CharacterPreference;
  /** Recording has played through: the summary celebrates and scrolls into view. */
  hasFinished: boolean;
  words: readonly ReaderStudyTargetWord[];
  grammarPoints: readonly ReaderGrammarPoint[];
  onPlayLine: (index: number) => void;
  /** Opens the grammar lesson page that teaches this point. */
  onOpenGrammar?: (partId: string, pageId: string) => void;
  /** Scrolls the reading to where the word appears. */
  onLocateWord: (word: ReaderStudyTargetWord) => void;
}

function WordRow({
  word,
  script,
  onLocate,
}: {
  word: ReaderStudyTargetWord;
  script: CharacterPreference;
  onLocate: () => void;
}) {
  return (
    <li className="flex items-center gap-3 border-t-2 border-ui-divider py-3">
      <button
        type="button"
        aria-label={`Show ${studyWordText(word, script)} in the dialogue`}
        onClick={onLocate}
        className="focus-ring-inline flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="min-w-16 font-chinese text-2xl font-semibold text-ui-ink-strong">{studyWordText(word, script)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-ui-ink">{word.pinyin}</span>
          <span className="block truncate text-sm font-bold text-ui-muted-strong">{word.english}</span>
        </span>
      </button>
      <IconActionButton
        variant="surface"
        label={`Play ${studyWordText(word, script)}`}
        icon={<AppIcon name="pronounce" size={20} />}
        onClick={() => playStudyWord(word, script)}
      />
    </li>
  );
}

/** The example sentence lines of a grammar point, its pattern washed in the same purple as the text. */
function grammarExamples(reading: ReadingRecord, point: ReaderGrammarPoint, script: CharacterPreference) {
  const byLine = new Map<number, { charStart: number; charEnd: number }[]>();
  for (const match of point.matches) {
    byLine.set(match.paragraphIndex, [...(byLine.get(match.paragraphIndex) ?? []), match]);
  }
  return [...byLine.entries()].sort(([a], [b]) => a - b).map(([lineIndex, ranges]) => ({
    lineIndex,
    text: reading.paragraphs[lineIndex]?.[script] ?? '',
    ranges: ranges.sort((a, b) => a.charStart - b.charStart),
  }));
}

function GrammarRow({
  reading,
  point,
  script,
  onPlayLine,
  onOpenGrammar,
}: {
  reading: ReadingRecord;
  point: ReaderGrammarPoint;
  script: CharacterPreference;
  onPlayLine: (index: number) => void;
  onOpenGrammar?: (partId: string, pageId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const examples = grammarExamples(reading, point, script);

  return (
    <li className="border-t-2 border-ui-divider">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="focus-ring-inline flex w-full items-center gap-3 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-chinese text-base font-black text-ui-ink-strong">{point.pattern}</span>
          <span className="block truncate text-sm font-bold text-ui-muted-strong">{point.titleEnglish}</span>
        </span>
        <AppIcon name="dropdown" size={20} className={cn('shrink-0 text-ui-muted transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3 pb-4">
          <p className="text-sm font-bold leading-relaxed text-ui-ink">{point.explanation}</p>
          {onOpenGrammar && (
            <button
              type="button"
              onClick={() => onOpenGrammar(point.partId, point.id)}
              className="focus-ring-inline self-start text-sm font-extrabold text-brand-primary hover:text-brand-primary-edge"
            >
              Open lesson
            </button>
          )}
          {examples.map(({ lineIndex, text, ranges }) => (
            <button
              key={lineIndex}
              type="button"
              onClick={() => onPlayLine(lineIndex)}
              className="focus-ring-inline flex items-center gap-3 text-left"
            >
              <AppIcon name="pronounce" size={18} className="shrink-0 text-ui-muted" />
              <span className="font-chinese text-lg font-semibold text-ui-ink-strong">
                {ranges.reduce<{ nodes: React.ReactNode[]; at: number }>(
                  (acc, range, i) => ({
                    at: range.charEnd,
                    nodes: [
                      ...acc.nodes,
                      text.slice(acc.at, range.charStart),
                      <mark key={i} className={cn('rounded px-0.5 text-ui-ink-strong', GRAMMAR_WASH_CLASS)}>
                        {text.slice(range.charStart, range.charEnd)}
                      </mark>,
                    ],
                  }),
                  { nodes: [], at: 0 },
                ).nodes}
                {text.slice(ranges[ranges.length - 1]?.charEnd ?? 0)}
              </span>
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/** A collapsed-by-default container: title row with a chevron, rows inside separated by dividers. */
function SummarySection({ title, mode, count, children }: { title: string; mode: 'vocab' | 'grammar'; count: number; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-ui-divider bg-ui-surface">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="focus-ring-inline flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <ModeIcon mode={mode} playKey={0} motion="none" className="h-8 w-8" />
        <h2 className="flex-1 font-sans text-lg font-black text-ui-ink-strong">{title}</h2>
        <span className="font-sans text-sm font-extrabold text-ui-muted-strong">{count}</span>
        <AppIcon name="dropdown" size={20} className={cn('shrink-0 text-ui-muted transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="px-4">{children}</div>}
    </div>
  );
}

/**
 * What this dialogue teaches, at the foot of the reading: the part's new words
 * (tap the speaker to hear one) and its grammar patterns (tap for the explanation and
 * the lines that use it). When the recording finishes, the page glides here.
 */
export function ReaderSummary({
  reading,
  characterPreference,
  hasFinished,
  words,
  grammarPoints,
  onPlayLine,
  onOpenGrammar,
  onLocateWord,
}: ReaderSummaryProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!hasFinished) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [hasFinished]);

  if (words.length === 0 && grammarPoints.length === 0) return null;

  return (
    <section ref={ref} className="mt-12 flex scroll-mt-24 flex-col gap-4 border-t-2 border-ui-divider pt-8" aria-label="What this dialogue teaches">
      {words.length > 0 && (
        <SummarySection title="New words" mode="vocab" count={words.length}>
          <ul>
            {words.map((word) => (
              <WordRow key={word.id} word={word} script={characterPreference} onLocate={() => onLocateWord(word)} />
            ))}
          </ul>
        </SummarySection>
      )}
      {grammarPoints.length > 0 && (
        <SummarySection title="Grammar" mode="grammar" count={grammarPoints.length}>
          <ul>
            {grammarPoints.map((point) => (
              <GrammarRow key={point.id} reading={reading} point={point} script={characterPreference} onPlayLine={onPlayLine} onOpenGrammar={onOpenGrammar} />
            ))}
          </ul>
        </SummarySection>
      )}
    </section>
  );
}
