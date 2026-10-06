import type { ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type PlayfulNavIconName =
  | 'books' | 'dictionary' | 'library' | 'profile' | 'favorite'
  | 'flashcards' | 'quiz' | 'listening' | 'writing' | 'global' | 'curriculum' | 'grammar' | 'hint' | 'reading' | 'reference' | 'reward' | 'review' | 'settings';

interface PlayfulNavIconProps extends ImgHTMLAttributes<HTMLImageElement> {
  name: PlayfulNavIconName;
}

const navIconSrc: Record<PlayfulNavIconName, string> = {
  books: new URL('../../assets/icons/flat/book.svg', import.meta.url).href,
  dictionary: new URL('../../assets/icons/flat/compass.svg', import.meta.url).href,
  library: new URL('../../assets/icons/flat/folder-orange.svg', import.meta.url).href,
  profile: new URL('../../assets/icons/flat/profile-pink.svg', import.meta.url).href,
  favorite: new URL('../../assets/icons/flat/heart.svg', import.meta.url).href,
  flashcards: new URL('../../assets/icons/flat/layers.svg', import.meta.url).href,
  quiz: new URL('../../assets/icons/flat/puzzle.svg', import.meta.url).href,
  listening: new URL('../../assets/icons/flat/headphone.svg', import.meta.url).href,
  writing: new URL('../../assets/icons/flat/pencil.svg', import.meta.url).href,
  global: new URL('../../assets/icons/flat/globe.svg', import.meta.url).href,
  curriculum: new URL('../../assets/icons/flat/book.svg', import.meta.url).href,
  grammar: new URL('../../assets/icons/flat/light-bulb.svg', import.meta.url).href,
  hint: new URL('../../assets/icons/flat/light-bulb.svg', import.meta.url).href,
  reading: new URL('../../assets/icons/flat/bubbles-alt.svg', import.meta.url).href,
  reference: new URL('../../assets/icons/flat/book.svg', import.meta.url).href,
  reward: new URL('../../assets/icons/flat/star.svg', import.meta.url).href,
  review: new URL('../../assets/icons/flat/dashboard.svg', import.meta.url).href,
  settings: new URL('../../assets/icons/flat/cog.svg', import.meta.url).href,
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
