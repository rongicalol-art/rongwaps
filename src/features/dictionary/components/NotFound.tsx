import { AppIcon } from '../../../lib/widgets';

export function NotFound({ word }: { word: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ui-muted">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-ui-canvas">
        <AppIcon name="search" size={32} className="text-ui-muted opacity-80" />
      </div>
      <p className="mb-2 text-2xl font-extrabold text-ui-ink">Not Found</p>
      <p className="px-8 text-center text-[15px] font-bold text-ui-muted-strong">
        We couldn't find <span className="text-ui-ink">“{word}”</span> in the dictionary.
      </p>
    </div>
  );
}
