import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { InteractiveGrammarPage } from '../../../types/models';

interface GrammarNextUpTeaserProps {
  nextPage: InteractiveGrammarPage;
}

export function GrammarNextUpTeaser({ nextPage }: GrammarNextUpTeaserProps) {
  const outerRef = useRef<HTMLParagraphElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const firstCopy = inner.firstElementChild as HTMLElement | null;
        if (!firstCopy) return;
        setIsOverflowing(firstCopy.scrollWidth > outer.clientWidth);
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const content = (
    <>
      <span className="uppercase tracking-[0.12em] text-brand-primary">Up next</span>
      <span className="mx-1.5 text-ui-muted-strong">·</span>
      <span className="font-chinese font-black text-ui-ink">{nextPage.titleTraditional}</span>
      <span className="mx-1.5 text-ui-muted-strong">·</span>
      {nextPage.titleEnglish}
    </>
  );

  return (
    <p
      ref={outerRef}
      className="w-full truncate text-center text-xs font-bold text-ui-muted sm:min-w-0 sm:flex-1 sm:text-left"
      aria-label={`Up next: ${nextPage.titleEnglish}`}
    >
      <span
        ref={innerRef}
        className={
          isOverflowing && !reduceMotion
            ? 'anim-teaser-marquee inline-block whitespace-nowrap will-change-transform'
            : 'inline-block whitespace-nowrap'
        }
      >
        <span className="inline-block whitespace-nowrap pr-10">{content}</span>
        {isOverflowing && !reduceMotion && (
          <span aria-hidden="true" className="inline-block whitespace-nowrap pr-10">{content}</span>
        )}
      </span>
    </p>
  );
}
