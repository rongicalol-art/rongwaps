import { useState, useEffect, useRef } from 'react';
import { getCharacterBreakdown } from '../services/breakdownService';
import { DBCharacterBreakdown } from '../types/database';
import { breakdownCache } from '../utils/cache';

export function useCharBreakdown(char: string) {
  const [data, setData] = useState<DBCharacterBreakdown | null>(() => {
    if (!char) return null;
    return breakdownCache.get<DBCharacterBreakdown>(char) || null;
  });

  useEffect(() => {
    if (!char) {
      setData(null);
      return;
    }

    // If already cached, use it immediately
    if (breakdownCache.has(char)) {
      setData(breakdownCache.get<DBCharacterBreakdown>(char) || null);
      return;
    }

    let active = true;
    getCharacterBreakdown(char).then(d => {
      if (active) setData(d);
    });
    return () => { active = false; };
  }, [char]);

  return data;
}
