import { AppIcon, SmartSentence, Skeleton, LevelTag } from '../../../lib/widgets';
import { playSentence } from '../../../services/audio/sentenceAudio';
import { useAppStore } from '../../../store/useAppStore';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import type { WordExample } from '../../../types/models';

const PLAY_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-colors hover:bg-ui-hover hover:text-brand-primary focus-ring';

/** Example sentences as flat rows with thin dividers. */
export function WordExamplesSection({
  examples,
  isLoading,
  word,
}: {
  examples: WordExample[];
  isLoading: boolean;
  word: string;
}) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-2" role="status" aria-label="Loading examples">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  return (
    <section aria-label="Example sentences" className="flex w-full flex-col">
      {examples.map((ex, idx) => (
        <div
          key={`${ex.chinese}-${idx}`}
          className="flex w-full flex-col gap-1 border-b-2 border-ui-divider py-4 first:pt-1 last:border-b-0 last:pb-0"
        >
          <div className="flex w-full items-start justify-between gap-3">
            <SmartSentence
              text={ex.chinese}
              highlightTerms={[word]}
              className="font-chinese text-xl font-bold leading-snug text-ui-ink sm:text-2xl"
            />
            <button
              type="button"
              aria-label={`Play the example sentence ${ex.chinese}`}
              onClick={() => { void playSentence(ex.chinese, ex.audio, characterPreference).catch(() => {}); }}
              className={PLAY_BUTTON}
            >
              <AppIcon name="audio" size={18} />
            </button>
          </div>
          {!hideExamplePinyin && ex.pinyin && (
            <p className="text-[13px] font-extrabold leading-tight text-brand-primary sm:text-sm">
              {numberToToneMarks(ex.pinyin)}
            </p>
          )}
          {ex.english && <p className="ui-translation text-sm leading-snug sm:text-base">{ex.english}</p>}
          <span className="mt-1 self-start"><LevelTag bookId={ex.sourceBookId} lessonId={ex.sourceLessonId} /></span>
        </div>
      ))}
    </section>
  );
}
