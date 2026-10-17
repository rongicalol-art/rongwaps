import type { ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type PlayfulNavIconName =
  | 'books' | 'dictionary' | 'library' | 'profile' | 'favorite'
  | 'flashcards' | 'quiz' | 'listening' | 'writing' | 'tones' | 'global' | 'curriculum' | 'grammar' | 'grammarBook' | 'hint' | 'reading' | 'reference' | 'reward' | 'review' | 'settings'
  | 'meaning' | 'characters' | 'trueFalse' | 'build';

interface PlayfulNavIconProps extends ImgHTMLAttributes<HTMLImageElement> {
  name: PlayfulNavIconName;
}

// Keep the artwork in cacheable image files instead of embedding every icon in boot JS.
const navIconSrc: Record<PlayfulNavIconName, string> = {
  books: new URL('../../assets/icons/flat/book.svg?no-inline', import.meta.url).href,
  dictionary: new URL('../../assets/icons/flat/compass.svg?no-inline', import.meta.url).href,
  library: new URL('../../assets/icons/flat/folder-orange.svg?no-inline', import.meta.url).href,
  profile: new URL('../../assets/icons/flat/profile-pink.svg?no-inline', import.meta.url).href,
  favorite: new URL('../../assets/icons/flat/heart.svg?no-inline', import.meta.url).href,
  flashcards: new URL('../../assets/icons/flat/layers.svg?no-inline', import.meta.url).href,
  quiz: new URL('../../assets/icons/flat/puzzle.svg?no-inline', import.meta.url).href,
  listening: new URL('../../assets/icons/flat/headphone.svg?no-inline', import.meta.url).href,
  writing: new URL('../../assets/icons/flat/pencil.svg?no-inline', import.meta.url).href,
  tones: new URL('../../assets/icons/flat/mixer.svg?no-inline', import.meta.url).href,
  global: new URL('../../assets/icons/flat/globe.svg?no-inline', import.meta.url).href,
  curriculum: new URL('../../assets/icons/flat/book.svg?no-inline', import.meta.url).href,
  grammar: new URL('../../assets/icons/flat/light-bulb.svg?no-inline', import.meta.url).href,
  grammarBook: new URL('../../assets/icons/flat/book-bookmark.svg?no-inline', import.meta.url).href,
  hint: new URL('../../assets/icons/flat/light-bulb.svg?no-inline', import.meta.url).href,
  reading: new URL('../../assets/icons/flat/bubbles-alt.svg?no-inline', import.meta.url).href,
  reference: new URL('../../assets/icons/flat/book.svg?no-inline', import.meta.url).href,
  reward: new URL('../../assets/icons/flat/star.svg?no-inline', import.meta.url).href,
  review: new URL('../../assets/icons/flat/dashboard.svg?no-inline', import.meta.url).href,
  settings: new URL('../../assets/icons/flat/cog.svg?no-inline', import.meta.url).href,
  meaning: new URL('../../assets/icons/flat/tag.svg?no-inline', import.meta.url).href,
  characters: new URL('../../assets/icons/flat/stamp.svg?no-inline', import.meta.url).href,
  trueFalse: new URL('../../assets/icons/flat/sign-check.svg?no-inline', import.meta.url).href,
  build: new URL('../../assets/icons/flat/brick.svg?no-inline', import.meta.url).href,
};

export function PlayfulNavIcon({ name, className, alt = '', ...props }: PlayfulNavIconProps) {
  return (
    <img
      src={navIconSrc[name]}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={cn(
        'h-10 w-10 shrink-0 object-contain',
        className
      )}
      draggable={false}
      {...props}
    />
  );
}
