import { getReadingIllustration } from '../../../data/readingIllustrations';
import type { ReadingRecord } from '../../../types/models';

/** Dialogue number as the title ("Dialogue 2") and the book's setting as the subtitle ("在教室"). */
function getSceneTitles(reading: ReadingRecord): { title?: string; subtitle?: string } {
  return {
    title: reading.title.split(' · ').at(-1),
    subtitle: reading.setting.split(' · ')[0],
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
            <p className="mt-1 font-chinese-sans text-lg font-semibold text-ui-muted-strong">{subtitle}</p>
          )}
        </div>
      )}
    </header>
  );
}
