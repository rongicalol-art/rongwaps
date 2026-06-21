import { useState, useEffect } from 'react';
import { getOrGenerateMnemonic, getCachedMnemonic } from '../../../services/aiService';
import { RankedExample } from '../../../utils/courseExamples';

export function useMemoryHookOverlay(activeMemoryHook: any) {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAllOverlay, setShowAllOverlay] = useState(false);

  const [smartSentences, setSmartSentences] = useState<RankedExample[]>([]);
  const [isSentencesLoading, setIsSentencesLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (!activeMemoryHook || !activeMemoryHook.front || !activeMemoryHook.id) {
       setSmartSentences([]);
       return;
    }
    
    setIsSentencesLoading(true);

    // Fast path: find examples instantly without downloading the entire DB
    (async () => {
       try {
         const { fetchExamplesForWord } = await import('../../../services/vocabularyService');
         const matchingCards = await fetchExamplesForWord(activeMemoryHook.front);
         if (!isMounted) return;
         // We can still use findSmartExamplesForWord for sorting/ranking 
         // but we pass our matching cards subset instead of all cards!
         const { findSmartExamplesForWord } = await import('../../../utils/courseExamples');
         const sentences = findSmartExamplesForWord(matchingCards, activeMemoryHook.front, activeMemoryHook.id);
         setSmartSentences(sentences);
       } catch (err) {
         console.error("Error loading smart sentences:", err);
       } finally {
         if (isMounted) {
           setIsSentencesLoading(false);
         }
       }
    })();
    
    return () => { isMounted = false; };
  }, [activeMemoryHook]);

  useEffect(() => {
    let isMounted = true;

    async function loadMnemonic() {
      if (!activeMemoryHook?.front) return;

      setMnemonic(null);
      setLoading(true);

      try {
        const textToUse = activeMemoryHook.front;
        const cacheKey = textToUse.length > 1 ? `word_${textToUse}` : textToUse;
        const cached = await getCachedMnemonic(cacheKey);
        if (isMounted) {
          setMnemonic(cached ?? null);
        }
      } catch (err) {
        console.error("Error loading mnemonic from cache:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (activeMemoryHook) {
      loadMnemonic();
      setShowAllOverlay(false);
    }

    return () => { isMounted = false; };
  }, [activeMemoryHook]);

  const handleGenerateMnemonic = async () => {
    if (!activeMemoryHook || !activeMemoryHook.front) return;
    
    setLoading(true);
    try {
      const pinyin = activeMemoryHook.pinyin || "";
      const english = activeMemoryHook.english || "";
      const result = await getOrGenerateMnemonic(activeMemoryHook.front, pinyin, english, true);
      setMnemonic(result);
    } catch (err) {
      console.error(err);
      setMnemonic("Failed to generate mnemonic.");
    } finally {
      setLoading(false);
    }
  };

  return {
    mnemonic,
    loading,
    showAllOverlay,
    setShowAllOverlay,
    smartSentences,
    isSentencesLoading,
    handleGenerateMnemonic,
  };
}
