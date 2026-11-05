import { cn } from '../../../utils/cn';

const nianCompositeShot = new URL('../../../assets/images/landing/phone-nian-composite.webp', import.meta.url).href;

/** Real app screenshots (390×844 phone, light), one per headline feature. */
export const PHONE_SHOTS = [
  { src: new URL('../../../assets/images/landing/phone-read.webp', import.meta.url).href, label: 'Read along with the audio', alt: 'Book 1 Lesson 1 dialogue playing, with 同學 lit up as it is spoken' },
  { src: new URL('../../../assets/images/landing/phone-hook.webp', import.meta.url).href, label: 'Memory hooks', alt: 'Character breakdown of 她: its memory hook and its parts 女 and 也' },
  { src: new URL('../../../assets/images/landing/phone-test.webp', import.meta.url).href, label: 'TOCFL mock tests', alt: 'Lesson 1 mock test: TOCFL Band A, 20 questions' },
  { src: new URL('../../../assets/images/landing/phone-card.webp', import.meta.url).href, label: 'Flashcards', alt: 'Flashcard for 貼紙' },
];

const FRAME = 'block aspect-[390/844] overflow-hidden rounded-modal border-[6px] border-ui-ink-strong bg-ui-ink-strong';

/** A real app screenshot in a simple phone frame. */
export function PhoneShot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <span className={cn(FRAME, className)}>
      <img src={src} alt={alt} loading="lazy" decoding="async" className="size-full rounded-feature object-cover object-top" />
    </span>
  );
}

/**
 * Book 2 Lesson 14 has only vocabulary so far: its real header and art on top, with the
 * Grammar and Reading rows of Lesson 8 (same book theme) below. Replace with a real
 * screenshot once Lesson 14 has its own grammar and reading.
 */
export function NianLessonPhone({ className }: { className?: string }) {
  return (
    <PhoneShot
      src={nianCompositeShot}
      alt="Book 2 Lesson 14 in the app with Vocabulary, Grammar and Reading"
      className={className}
    />
  );
}
