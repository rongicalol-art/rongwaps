import type { ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type PlayfulNavIconName =
  | 'learn' | 'dictionary' | 'library' | 'profile' | 'favorite' | 'practiceHub' | 'pinyinPractice'
  | 'flashcards' | 'quiz' | 'listening' | 'writing' | 'tones' | 'global' | 'curriculum' | 'grammar' | 'grammarBook' | 'studyBook' | 'hint' | 'reading' | 'reference' | 'reward' | 'review' | 'settings'
  | 'meaning' | 'characters' | 'trueFalse' | 'build' | 'tonesPractice' | 'challenge';

interface PlayfulNavIconProps extends ImgHTMLAttributes<HTMLImageElement> {
  name: PlayfulNavIconName;
}

// Keep the artwork in cacheable image files instead of embedding every icon in boot JS.
const navIconSrc: Record<PlayfulNavIconName, string> = {
  learn: new URL('../../assets/icons/flat/learn.svg?no-inline', import.meta.url).href,
  dictionary: new URL('../../assets/icons/flat/dictionary.svg?no-inline', import.meta.url).href,
  library: new URL('../../assets/icons/flat/folder-orange.svg?no-inline', import.meta.url).href,
  profile: new URL('../../assets/icons/flat/profile-pink.svg?no-inline', import.meta.url).href,
  favorite: new URL('../../assets/icons/flat/heart.svg?no-inline', import.meta.url).href,
  practiceHub: new URL('../../assets/icons/flat/practice-hub.svg?no-inline', import.meta.url).href,
  pinyinPractice: new URL('../../assets/icons/flat/pinyin-practice.svg?no-inline', import.meta.url).href,
  flashcards: new URL('../../assets/icons/flat/layers.svg?no-inline', import.meta.url).href,
  quiz: new URL('../../assets/icons/flat/puzzle.svg?no-inline', import.meta.url).href,
  listening: new URL('../../assets/icons/flat/headphone.svg?no-inline', import.meta.url).href,
  writing: new URL('../../assets/icons/flat/pencil.svg?no-inline', import.meta.url).href,
  tones: new URL('../../assets/icons/flat/mixer.svg?no-inline', import.meta.url).href,
  tonesPractice: new URL('../../assets/icons/flat/tones-practice.svg?no-inline', import.meta.url).href,
  challenge: new URL('../../assets/icons/flat/lightning.svg?no-inline', import.meta.url).href,
  global: new URL('../../assets/icons/flat/globe.svg?no-inline', import.meta.url).href,
  curriculum: new URL('../../assets/icons/flat/book.svg?no-inline', import.meta.url).href,
  grammar: new URL('../../assets/icons/flat/light-bulb.svg?no-inline', import.meta.url).href,
  grammarBook: new URL('../../assets/icons/flat/book-bookmark.svg?no-inline', import.meta.url).href,
  studyBook: new URL('../../assets/icons/flat/book-gold.svg?no-inline', import.meta.url).href,
  hint: new URL('../../assets/icons/flat/light-bulb.svg?no-inline', import.meta.url).href,
  reading: new URL('../../assets/icons/flat/post-it.svg?no-inline', import.meta.url).href,
  reference: new URL('../../assets/icons/flat/book.svg?no-inline', import.meta.url).href,
  reward: new URL('../../assets/icons/flat/star.svg?no-inline', import.meta.url).href,
  review: new URL('../../assets/icons/flat/dashboard.svg?no-inline', import.meta.url).href,
  settings: new URL('../../assets/icons/flat/cog.svg?no-inline', import.meta.url).href,
  meaning: new URL('../../assets/icons/flat/tag.svg?no-inline', import.meta.url).href,
  characters: new URL('../../assets/icons/flat/profile-characters.svg?no-inline', import.meta.url).href,
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
