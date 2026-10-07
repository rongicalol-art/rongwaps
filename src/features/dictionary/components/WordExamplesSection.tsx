import { AppIcon, SectionEyebrow, SmartSentence, Skeleton, LevelTag } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { SAMPLE_BOOKS } from '../../../data/books';
import type { WordExample } from '../../../types/models';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

const PLAY_BUTTON =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-ui-canvas focus-ring';

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
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const voice = characterPreference === 'traditional' ? 'zh-TW-HsiaoChenNeural' : 'zh-CN-XiaoxiaoNeural';

  if (!isLoading && examples.length === 0) return null;

  return (
    <section aria-labelledby="word-examples-heading" className="flex w-full flex-col gap-3">
      <SectionEyebrow
        id="word-examples-heading"
        title="In Context"
        count={isLoading ? undefined : examples.length}
      />
      <div className="flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
        {isLoading ? (
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          examples.map((ex, idx) => {
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
                    className="font-chinese text-xl font-bold leading-normal text-ui-ink sm:text-2xl"
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
                {!hideExamplePinyin && ex.pinyin && (
                  <p className={`text-base font-bold leading-snug ${activeBook.accent}`}>
                    {numberToToneMarks(ex.pinyin)}
                  </p>
                )}
                {ex.english && (
                  <p className="ui-translation text-sm sm:text-base">
                    {ex.english}
                  </p>
                )}
                <span><LevelTag bookId={ex.sourceBookId} lessonId={ex.sourceLessonId} /></span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
