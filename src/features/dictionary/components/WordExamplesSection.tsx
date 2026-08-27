import { AppIcon, SectionEyebrow, SmartSentence, Skeleton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { numberToToneMarks } from '../../../utils/pinyin';
import { SAMPLE_BOOKS } from '../../../data/books';
import type { WordExample } from '../hooks/useWordExtras';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

const PLAY_BUTTON =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-ui-canvas focus-visible:ring-4 focus-visible:ring-brand-primary/25';

export function WordExamplesSection({
  examples,
  isLoading,
  word,
  activeBook,
}: {
  examples: WordExample[];
  isLoading: boolean;
  word: string;
  activeBook: CourseBook;
}) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  const voice = characterPreference === 'traditional' ? 'zh-TW-HsiaoChenNeural' : 'zh-CN-XiaoxiaoNeural';

  if (!isLoading && examples.length === 0) return null;

  return (
    <section aria-labelledby="word-examples-heading" className="flex w-full flex-col gap-3">
      <SectionEyebrow
        id="word-examples-heading"
        title="In Context"
        count={isLoading ? undefined : examples.length}
      />
      <div className="flex w-full flex-col overflow-hidden rounded-feature bg-ui-surface shadow-[0_3px_0_var(--color-ui-divider)]">
        {isLoading ? (
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          examples.map((ex, idx) => {
            const book = SAMPLE_BOOKS.find((b) => b.id === ex.sourceBookId);
            const dotClass = book?.accentBg ?? activeBook.accentBg;
            return (
              <div
                key={`${ex.chinese}-${idx}`}
                className={`relative flex w-full flex-col gap-1.5 p-5 sm:p-6 ${
                  idx < examples.length - 1 ? 'border-b-2 border-ui-divider' : ''
                }`}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <SmartSentence
                    text={ex.chinese}
                    highlightTerms={[word]}
                    className="font-chinese text-[20px] font-bold leading-normal text-ui-ink sm:text-[22px]"
                  />
                  <button
                    type="button"
                    aria-label={`Play the example sentence ${ex.chinese}`}
                    onClick={() => audioService.speakNeural(ex.chinese, voice).catch(() => {})}
                    className={`${PLAY_BUTTON} text-brand-primary`}
                  >
                    <AppIcon name="audio" size={17} />
                  </button>
                </div>
                {ex.pinyin && (
                  <p className={`text-[16px] font-bold leading-snug ${activeBook.accent} sm:text-[17px]`}>
                    {numberToToneMarks(ex.pinyin)}
                  </p>
                )}
                {ex.english && (
                  <p className="text-[15px] font-semibold leading-relaxed text-ui-muted sm:text-[16px]">
                    {ex.english}
                  </p>
                )}
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-ui-muted">
                  <span>B{ex.sourceBookId} · L{ex.sourceLessonId}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
