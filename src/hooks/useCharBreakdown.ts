import { useState, useEffect } from 'react';
import { getCharacterBreakdown } from '../services/breakdownService';
import { DBCharacterBreakdown } from '../types/database';
import { breakdownCache } from '../utils/cache';

export interface CharacterBreakdownState {
  data: DBCharacterBreakdown | null;
  isLoading: boolean;
}

export function useCharBreakdownState(char: string): CharacterBreakdownState {
  const [data, setData] = useState<DBCharacterBreakdown | null>(() => {
    if (!char) return null;
    return breakdownCache.get<DBCharacterBreakdown>(char) || null;
  });
  const [isLoading, setIsLoading] = useState(() => Boolean(char) && !breakdownCache.has(char));

  useEffect(() => {
    if (!char) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // If already cached, use it immediately
    if (breakdownCache.has(char)) {
      setData(breakdownCache.get<DBCharacterBreakdown>(char) || null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setData(null);
    setIsLoading(true);
    getCharacterBreakdown(char).then(d => {
      if (active) {
        setData(d);
        setIsLoading(false);
      }
    }).catch(() => {
      if (active) {
        setData(null);
        setIsLoading(false);
      }
    });
    return () => { active = false; };
  }, [char]);

  return { data, isLoading };
}

export function useCharBreakdown(char: string) {
  return useCharBreakdownState(char).data;
}
