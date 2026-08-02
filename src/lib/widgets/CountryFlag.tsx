import type { ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type CountryCode = 'GB' | 'ID' | 'JP' | 'US';

const FLAG_ASSETS: Record<CountryCode, { label: string; src: string }> = {
  GB: { label: 'United Kingdom', src: new URL('../../assets/flags/gb.png', import.meta.url).href },
  ID: { label: 'Indonesia', src: new URL('../../assets/flags/id.png', import.meta.url).href },
  JP: { label: 'Japan', src: new URL('../../assets/flags/jp.png', import.meta.url).href },
  US: { label: 'United States', src: new URL('../../assets/flags/us.png', import.meta.url).href },
};

export interface CountryFlagProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  code: CountryCode;
}

export function CountryFlag({ code, className, alt, ...props }: CountryFlagProps) {
  const flag = FLAG_ASSETS[code];

  return (
    <img
      src={flag.src}
      alt={alt ?? `${flag.label} flag`}
      className={cn('inline-block aspect-square w-6 shrink-0 object-cover', className)}
      draggable={false}
      {...props}
    />
  );
}
