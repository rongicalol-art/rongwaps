import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionButton, AppIcon, SegmentedControl, SmartSentence } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { playSentence } from '../../../services/audio/sentenceAudio';
import { readString, writeString } from '../../../utils/browser/localStorage';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { cn } from '../../../utils/cn';
import type { LessonSentence, SentenceKind } from '../hooks/useLessonSentences';

/** How much shows under each sentence; each level adds to the one before. */
type Reveal = 'hanzi' | 'pinyin' | 'english';
const REVEAL_KEY = 'sentences.reveal';
const REVEAL_OPTIONS = [
  { value: 'hanzi', label: <span className="font-chinese-sans">汉字</span> },
  { value: 'pinyin', label: 'Pinyin' },
  { value: 'english', label: 'English' },
] satisfies { value: Reveal; label: React.ReactNode }[];

const SECTION_LABEL: Record<SentenceKind, string> = { dialogue: 'Dialogue', reading: 'Reading', example: 'Examples' };
/** Breath between sentences while playing them all. */
const PLAY_ALL_GAP_MS = 700;

function readReveal(): Reveal {
  const saved = readString(REVEAL_KEY);
  return saved === 'pinyin' || saved === 'english' ? saved : 'hanzi';
}

interface SentenceListProps {
  sentences: LessonSentence[];
  /** The deck's words, highlighted in every sentence. */
  highlightTerms: string[];
}

/** The sentence reader: Play all, the reveal switch, and the book-ordered rows with their recordings. */
export function SentenceList({ sentences, highlightTerms }: SentenceListProps) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  const [reveal, setReveal] = useState<Reveal>(readReveal);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  /** Bumped on every play or stop, so a finished clip from an older request changes nothing. */
  const playTokenRef = useRef(0);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const textOf = useCallback((sentence: LessonSentence) => (
    characterPreference === 'simplified' && sentence.record.simplified ? sentence.record.simplified : sentence.record.traditional
  ), [characterPreference]);

  const stop = useCallback(() => {
    playTokenRef.current += 1;
    audioService.stop();
    setPlayingId(null);
    setIsPlayingAll(false);
  }, []);
  useEffect(() => () => { playTokenRef.current += 1; audioService.stop(); }, []);

  const playOne = useCallback((sentence: LessonSentence) => {
    const token = ++playTokenRef.current;
    setIsPlayingAll(false);
    setPlayingId(sentence.record.id);
    void playSentence(textOf(sentence), sentence.record.audio, characterPreference).catch(() => {}).then(() => {
      if (playTokenRef.current === token) setPlayingId(null);
    });
  }, [characterPreference, textOf]);

  const playAll = useCallback(async () => {
    const token = ++playTokenRef.current;
    setIsPlayingAll(true);
    for (const sentence of sentences) {
      if (!sentence.record.audio) continue;
      setPlayingId(sentence.record.id);
      rowRefs.current.get(sentence.record.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      await playSentence(textOf(sentence), sentence.record.audio, characterPreference).catch(() => {});
      if (playTokenRef.current !== token) return;
      await new Promise((resolve) => window.setTimeout(resolve, PLAY_ALL_GAP_MS));
      if (playTokenRef.current !== token) return;
    }
    setPlayingId(null);
    setIsPlayingAll(false);
  }, [characterPreference, sentences, textOf]);

  const changeReveal = (next: Reveal) => {
    setReveal(next);
    writeString(REVEAL_KEY, next);
  };

  const hasAudio = sentences.some((sentence) => sentence.record.audio);
  const showPinyin = reveal !== 'hanzi';
  const showEnglish = reveal === 'english';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-40 sm:px-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent pb-5 pt-2">
        {hasAudio ? (
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={isPlayingAll ? stop : () => { void playAll(); }}
            className="gap-2 normal-case tracking-normal"
          >
            <AppIcon name={isPlayingAll ? 'pause' : 'play'} size={16} />
            <span>{isPlayingAll ? 'Stop' : 'Play all'}</span>
          </ActionButton>
        ) : <span />}
        <SegmentedControl<Reveal>
          value={reveal}
          onChange={changeReveal}
          ariaLabel="Show under each sentence"
          layoutId="sentences-reveal"
          options={REVEAL_OPTIONS}
          className="w-auto"
        />
      </div>

      {(['dialogue', 'reading', 'example'] as const).map((kind) => {
        const group = sentences.filter((sentence) => sentence.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} aria-label={SECTION_LABEL[kind]} className="mb-8">
            <h2 className="mb-1 text-sm font-black text-ui-muted-strong">{SECTION_LABEL[kind]}</h2>
            <ul className="flex flex-col">
              {group.map((sentence) => {
                const { record } = sentence;
                const isPlaying = playingId === record.id;
                return (
                  <li
                    key={record.id}
                    ref={(node) => { if (node) rowRefs.current.set(record.id, node); else rowRefs.current.delete(record.id); }}
                    className={cn(
                      '-mx-3 flex items-start gap-3 border-b-2 border-ui-divider px-3 py-4 transition-colors last:border-b-0',
                      isPlaying && 'bg-brand-primary/[0.07]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      {sentence.speaker && (
                        <p className="mb-0.5 font-chinese-sans text-sm font-semibold text-ui-muted">{sentence.speaker}</p>
                      )}
                      <SmartSentence
                        text={textOf(sentence)}
                        highlightTerms={highlightTerms}
                        characterPreference={characterPreference}
                        className="font-chinese text-[20px] font-bold leading-relaxed text-ui-ink-strong sm:text-[22px]"
                      />
                      {showPinyin && record.pinyin && (
                        <p className="mt-1 text-sm font-semibold leading-snug tracking-wide text-ui-muted-strong sm:text-[15px]">
                          {numberToToneMarks(record.pinyin)}
                        </p>
                      )}
                      {showEnglish && record.english && (
                        <p className="ui-translation mt-1 text-sm sm:text-[15px]">{record.english}</p>
                      )}
                    </div>
                    {record.audio && (
                      <button
                        type="button"
                        aria-label={`Play ${textOf(sentence)}`}
                        onClick={() => (isPlaying ? stop() : playOne(sentence))}
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-compact transition-colors focus-ring',
                          isPlaying ? 'bg-brand-primary/10 text-brand-primary' : 'text-ui-muted hover:bg-ui-hover hover:text-brand-primary',
                        )}
                      >
                        <AppIcon name="audio" size={18} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
