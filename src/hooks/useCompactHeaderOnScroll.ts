import { UIEvent, useCallback, useState } from 'react';

export function useCompactHeaderOnScroll(threshold = 24) {
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

  const handleHeaderScroll = useCallback((event: UIEvent<HTMLElement>) => {
    const nextIsCompact = event.currentTarget.scrollTop > threshold;
    setIsHeaderCompact((current) => current === nextIsCompact ? current : nextIsCompact);
  }, [threshold]);

  return { isHeaderCompact, handleHeaderScroll };
}
