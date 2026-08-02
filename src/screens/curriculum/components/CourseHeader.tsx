import { useState } from 'react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { AppIcon, CourseSwitcher, PlayfulNavIcon, Soft3DButton } from '../../../lib/widgets';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface CourseHeaderProps {
  activeBook: CourseBook;
  avatarUrl?: string;
  onBookChange: (id: number) => void;
  onProfileClick?: () => void;
}

export function CourseHeader({
  activeBook,
  avatarUrl,
  onBookChange,
  onProfileClick,
}: CourseHeaderProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherOptions = SAMPLE_BOOKS.map((book) => ({
    id: book.id,
    label: book.title,
    accentBackgroundClassName: book.accentBg,
    backgroundClassName: book.id === activeBook.id ? book.accentBgLight : 'bg-ui-surface',
    edgeClassName: book.id === activeBook.id ? book.buttonEdge : 'border-ui-border',
  }));

  const handleBookSelect = (id: number) => {
    onBookChange(id);
    setIsSwitcherOpen(false);
  };

  return (
    <header className="relative z-20 min-h-[350px] sm:min-h-[clamp(300px,30vw,390px)] xl:min-h-[215px]">
      <div className="absolute inset-x-12 top-4 flex justify-center sm:top-5 lg:top-6">
        <Soft3DButton
          type="button"
          variant="custom"
          depth="sm"
          aria-expanded={isSwitcherOpen}
          aria-label="Choose course"
          onClick={() => setIsSwitcherOpen((open) => !open)}
          className="w-auto flex-col gap-0 rounded-[14px] border-transparent bg-transparent px-4 py-1 text-ui-ink-strong shadow-none hover:scale-[1.01] hover:bg-ui-surface/65"
        >
          <span className="font-chinese text-[28px] font-bold leading-tight normal-case tracking-normal sm:text-[32px]">
            {'subtitle' in activeBook && typeof activeBook.subtitle === 'string'
              ? activeBook.subtitle
              : activeBook.title}
          </span>
          <span className="mt-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.19em] text-brand-primary sm:text-[13px]">
            {activeBook.title}
            <AppIcon name="expand" size={13} />
          </span>
          <span aria-hidden="true" className="mt-2 h-1 w-14 rounded-full bg-brand-primary" />
        </Soft3DButton>

        {isSwitcherOpen && (
          <CourseSwitcher
            options={switcherOptions}
            onSelect={handleBookSelect}
            display="labeled"
            className="absolute left-1/2 top-[calc(100%+10px)] z-40 w-[min(310px,calc(100vw-32px))] -translate-x-1/2 bg-ui-surface shadow-[0_14px_34px_rgba(47,50,55,0.14)]"
          />
        )}
      </div>

      <div className="absolute right-0 top-4 sm:top-5 lg:top-6">
        <Soft3DButton
          type="button"
          variant="custom"
          depth="sm"
          onClick={onProfileClick}
          className="h-12 w-12 overflow-hidden rounded-full border-brand-primary-edge bg-ui-surface/90 p-0 shadow-[0_5px_14px_rgba(47,50,55,0.10)] sm:h-14 sm:w-14"
          aria-label="Open profile"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <PlayfulNavIcon name="profile" className="h-10 w-10 sm:h-12 sm:w-12" />
          )}
        </Soft3DButton>
      </div>
    </header>
  );
}
