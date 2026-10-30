import { getReadingIllustration } from '../../../data/readingIllustrations';
import type { ReadingRecord } from '../../../types/models';

/** Show the English title and its Chinese counterpart for Book 2 readings. */
function getSceneTitles(reading: ReadingRecord): { title?: string; subtitle?: string } {
  const titleParts = reading.title.split(' · ');
  return {
    title: titleParts.at(-1),
    subtitle: reading.bookId === 2 && titleParts.length >= 3
      ? titleParts[1]
      : reading.setting.split(' · ')[0],
  };
}

/**
 * The reading's scene at the top of the text: the picture at its native ratio
 * spanning the text column, and the title.
 */
export function ReaderSceneIntro({
  reading,
  showTitle = false,
}: {
  reading: ReadingRecord;
  showTitle?: boolean;
}) {
  const illustration = getReadingIllustration(reading.id);
  const { title, subtitle } = getSceneTitles(reading);

  return (
    <header className="mb-10 flex flex-col gap-4 sm:mb-12">
      {illustration && (
        <div data-scene-hero className="aspect-[2048/1143] w-full overflow-hidden rounded-feature bg-ui-surface">
          <img
            src={illustration.url}
            alt={illustration.alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="block h-full w-full select-none object-cover"
          />
        </div>
      )}
      {showTitle && title && (
        <div className="px-1">
          <h1 className="font-sans text-2xl font-black text-ui-ink-strong sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 font-chinese text-lg font-semibold text-ui-muted-strong">{subtitle}</p>
          )}
        </div>
      )}
    </header>
  );
}
