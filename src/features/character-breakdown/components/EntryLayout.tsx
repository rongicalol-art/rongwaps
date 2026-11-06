import type { ReactNode, Ref } from 'react';

/**
 * The word page layout: the hero, then the character breakdown and memory
 * hook (`intro`), then the meanings. On wide screens the meanings sit left and
 * the tabs right; phones stack everything in that order. Without meanings it
 * stays one column.
 */
export function EntryLayout({ topRef, hero, intro, senses, aside }: {
  topRef?: Ref<HTMLDivElement>;
  hero: ReactNode;
  intro?: ReactNode;
  senses?: ReactNode;
  aside: ReactNode;
}) {
  const split = Boolean(senses);
  return (
    <div
      ref={topRef}
      className={`mx-auto grid w-full min-w-0 max-w-[50rem] scroll-mt-20 grid-cols-1 items-start gap-6 ${split ? 'lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-x-12 lg:gap-y-8' : ''}`}
    >
      <div className="min-w-0 lg:col-span-2">{hero}</div>
      {intro && <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">{intro}</div>}
      {split && <div className="min-w-0">{senses}</div>}
      <div className="flex min-w-0 flex-col gap-6">{aside}</div>
    </div>
  );
}
