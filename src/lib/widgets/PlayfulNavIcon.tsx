import type { ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type PlayfulNavIconName = 'books' | 'dictionary' | 'library' | 'profile' | 'favorite';

interface PlayfulNavIconProps extends ImgHTMLAttributes<HTMLImageElement> {
  name: PlayfulNavIconName;
}

const navIconSrc: Record<PlayfulNavIconName, string> = {
  books: new URL('../../assets/icons/nav/icons8-finn-100.svg', import.meta.url).href,
  dictionary: new URL('../../assets/icons/nav/icons8-marceline-100.svg', import.meta.url).href,
  library: new URL('../../assets/icons/nav/icons8-jake-100.svg', import.meta.url).href,
  profile: new URL('../../assets/icons/nav/icons8-princess-bubblegum-100.svg', import.meta.url).href,
  favorite: new URL('../../assets/icons/nav/icons8-jake-100.svg', import.meta.url).href,
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
