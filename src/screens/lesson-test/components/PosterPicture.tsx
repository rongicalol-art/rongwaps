import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon, IconActionButton, WorkspaceWindow } from '../../../lib/widgets';
import { testPicture } from '../testPictures';

/**
 * A reading printed as the real object (a poster, a sign, a timetable): the picture on a quiet card, its whole
 * width. A tap opens it full size; on a phone it is then wider than the screen and pans, so long notices read
 * at a comfortable size.
 */
export function PosterPicture({ name, alt }: { name: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const src = testPicture(name);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt}. Show it full size`}
        className="focus-ring relative block w-full cursor-zoom-in rounded-feature border-2 border-ui-divider bg-ui-surface p-2"
      >
        {/* The box keeps its 4:3 shape before the picture loads, so the answers never jump. */}
        <img src={src} alt="" draggable={false} className="block aspect-[4/3] h-auto w-full select-none rounded-control object-contain" />
        <span aria-hidden className="absolute bottom-4 right-4 grid size-9 place-items-center rounded-compact border-2 border-ui-border bg-ui-surface text-ui-ink">
          <AppIcon name="zoom" size={18} />
        </span>
      </button>
      {open && createPortal(
        // A detail over the test window, the way the dictionary opens over a window: the sidebar stays.
        <WorkspaceWindow layer="window-detail" role="dialog" aria-modal="true" aria-label={alt}>
          <div className="flex shrink-0 justify-end px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
            {/* Focus lands on Close: the viewer is modal, and Escape or this button closes it. */}
            <IconActionButton autoFocus label="Close" size="lg" variant="surface" icon={<AppIcon name="close" size={22} />} onClick={() => setOpen(false)} />
          </div>
          {/* Phones: the picture at reading size, wider than the screen, panned with a finger. Wide screens: fitted. */}
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 md:grid md:place-items-center">
            <img src={src} alt={alt} draggable={false} className="block h-auto w-[44rem] max-w-none select-none rounded-control md:max-h-[calc(100dvh-7rem)] md:w-auto md:max-w-full" />
          </div>
        </WorkspaceWindow>,
        document.body,
      )}
    </>
  );
}
