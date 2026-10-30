import { cn } from '../../../utils/cn';

const lessonShot = new URL('../../../assets/images/landing/phone-lesson.webp', import.meta.url).href;
const nianCompositeShot = new URL('../../../assets/images/landing/phone-nian-composite.webp', import.meta.url).href;

export const PHONE_SHOTS = [
  { src: lessonShot, alt: 'Book 2 Lesson 8 window with Vocabulary, Grammar and Reading' },
  { src: new URL('../../../assets/images/landing/phone-card.webp', import.meta.url).href, alt: 'Flashcard for 貼紙' },
  { src: new URL('../../../assets/images/landing/phone-examples.webp', import.meta.url).href, alt: 'Interactive grammar pattern table for 叫、姓、是' },
  { src: new URL('../../../assets/images/landing/phone-write.webp', import.meta.url).href, alt: 'Stroke order for 貼' },
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
