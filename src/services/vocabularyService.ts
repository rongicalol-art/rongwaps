import { supabase } from './supabaseClient';
import { Flashcard, FLASHCARDS_DATA } from '../data/flashcards';
import { vocabularyCache } from '../utils/cache';
import { extractSearchVariants } from '../utils/courseExamples';
import { cleanVocabText } from '../utils/vocabCleaner';

// Maps a cache key to its currently ongoing fetch promise (if any)
const fetchPromises = new Map<string, Promise<Flashcard[]>>();
const searchPromises = new Map<string, Promise<Flashcard[]>>();

export async function fetchVocabulary(bookId?: number, lessonId?: number): Promise<Flashcard[]> {
  const cacheKey = `vocab-${bookId || 'all'}-${lessonId || 'all'}`;
  
  if (vocabularyCache.has(cacheKey)) {
    return vocabularyCache.get<Flashcard[]>(cacheKey) || [];
  }

  if (fetchPromises.has(cacheKey)) {
    return fetchPromises.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    // If Supabase is not configured, fall back to local data
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
    
    if (!supabaseUrl) {
      let filteredData = FLASHCARDS_DATA;
      if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
      if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
      
      const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      vocabularyCache.set(cacheKey, sortedData);
      return sortedData;
    }

    const allData: any[] = [];
    let from = 0;
    const step = 1000;
    let pagesFetched = 0;
    const MAX_PAGES = 3; // Hard limit at 3000 flashcards

    try {
      while (pagesFetched < MAX_PAGES) {
        let query = supabase
          .from('book_vocabulary')
          .select('*')
          .range(from, from + step - 1);

        if (bookId) {
          const padBId = bookId < 10 ? `0${bookId}` : bookId;
          query = query.or(`id.ilike.b${bookId}l%,id.ilike.b${bookId}-l%,id.ilike.b${padBId}l%,id.ilike.b${padBId}-l%`);
        } else if (lessonId) {
          const padLId = lessonId < 10 ? `0${lessonId}` : lessonId;
          query = query.or(`id.ilike.%l${lessonId}-%,id.ilike.%l${lessonId}\\%,id.ilike.%l${padLId}-%,id.ilike.%l${padLId}\\%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching vocabulary:', error);
          if (allData.length === 0) {
            let filteredData = FLASHCARDS_DATA;
            if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
            if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
            const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
            vocabularyCache.set(cacheKey, sortedData);
            return sortedData;
          }
          break;
        }

        if (!data || data.length === 0) {
          break;
        }

        allData.push(...data);
        if (data.length < step) {
          break;
        }
        from += step;
        pagesFetched++;
      }

      if (allData.length === 0) {
        let filteredData = FLASHCARDS_DATA;
        if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
        if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
        const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
        vocabularyCache.set(cacheKey, sortedData);
        return sortedData;
      }

      const mappedData: any[] = allData.map((item: any) => {
        const match = item.id ? item.id.toString().match(/^[Bb](\d+)[-_]?[Ll](\d+)/) : null;
        const bId = match ? parseInt(match[1], 10) : 0;
        const lId = match ? parseInt(match[2], 10) : 0;
        
        return {
          id: item.id?.toString() || Math.random().toString(),
          bookId: bId || item.book_id || item.book || 0,
          lessonId: lId || item.lesson_id || item.lesson || 0,
          front: cleanVocabText(item.traditional || item.simplified || item.character || item.hanzi || item.word || ''),
          back: (item.meaning || item.english || item.definition || '').trim(),
          pinyin: (item.pinyin || item.pronunciation || '').trim(),
          audio: item.audio || item.audio_url || '',
          notes: item.notes || item.note || '',
          examples: typeof item.examples === 'string' ? (()=>{ try { const parsed = JSON.parse(item.examples); return Array.isArray(parsed) ? parsed : [ { chinese: item.examples } ]; } catch(e) { return item.examples.trim() ? [ { chinese: item.examples } ] : []; } })() : (item.examples || []),
        };
      });
      

      
      let finalData = mappedData;
      if (lessonId) {
        finalData = finalData.filter((c: any) => c.lessonId === lessonId);
      }
      
      finalData.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      
      vocabularyCache.set(cacheKey, finalData);
      return finalData;
    } catch (err) {
      console.error('Exception fetching vocabulary:', err);
      let filteredData = FLASHCARDS_DATA;
      if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
      if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
      const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      vocabularyCache.set(cacheKey, sortedData);
      return sortedData;
    } finally {
      fetchPromises.delete(cacheKey);
    }
  })();

  fetchPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

function normalizePinyin(str: string) {
  if (!str) return '';
  // Remove tone marks, spaces, digits
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[1-5]/g, "").replace(/[-']/g, "").toLowerCase();
}

function getVariations(str: string): string[] {
  if (!str) return [];
  const results = new Set<string>();
  results.add(str);

  // Handle slashes: split by /
  if (str.includes('/')) {
    const parts = str.split('/').map(p => p.trim());
    parts.forEach(p => results.add(p));
  }

  // Handle parentheses (both ASCII and full-width)
  for (const res of Array.from(results)) {
    if ((res.includes('(') && res.includes(')')) || (res.includes('（') && res.includes('）'))) {
      const withoutParens = res.replace(/\([^)]+\)/g, '').replace(/（[^）]+）/g, '');
      const withParensContent = res.replace(/[\(（]/g, '').replace(/[\)）]/g, '');
      results.add(withoutParens.trim());
      results.add(withParensContent.trim());
    }
  }

  return Array.from(results).filter(s => s.length > 0);
}

function getSmartScore(card: Flashcard, rawQuery: string, lowerQuery: string, normQuery: string) {
  let maxScore = 0;
  
  const frontVariations = getVariations(card.front || '');
  const pinyinVariations = getVariations(card.pinyin || '');
  const definitions = (card.back || '').toLowerCase();

  for (const front of frontVariations) {
    // If no pinyin variations, still run at least once
    const pinyinsToTest = pinyinVariations.length > 0 ? pinyinVariations : [''];
    
    for (const pinyinRaw of pinyinsToTest) {
      let score = 0;
      const joinedPinyin = normalizePinyin(pinyinRaw);

      // 1. Exact Matches (Highest Priority)
      if (front === rawQuery) score += 10000;
      if (joinedPinyin === normQuery && joinedPinyin.length > 0) score += 8000;

      // Exact English meaning word match
      const wordsRegex = new RegExp(`\\b${lowerQuery}\\b`, 'i');
      if (wordsRegex.test(definitions)) {
         score += 4000;
         if (definitions.startsWith(lowerQuery)) score += 1000;
      }

      // 2. Starts With (High Priority)
      if (front.startsWith(rawQuery)) score += 500;
      if (joinedPinyin && joinedPinyin.startsWith(normQuery)) score += 400;
      
      // 3. Partial or Substring matches
      if (front.includes(rawQuery)) score += 100;
      if (joinedPinyin && joinedPinyin.includes(normQuery)) score += 50;
      if (definitions.includes(lowerQuery)) score += 10;

      // 4. Penalty for length so shorter, more exact matches float higher
      score -= front.length * 2; 
      if (joinedPinyin) {
         score -= joinedPinyin.length;
      }
      
      if (score > maxScore) {
        maxScore = score;
      }
    }
  }
  
  return maxScore;
}

export async function searchVocabulary(queryStr: string): Promise<Flashcard[]> {
  if (!queryStr || queryStr.trim() === '') return [];
  
  const cacheKey = `search-${queryStr}`;
  if (vocabularyCache.has(cacheKey)) {
    return vocabularyCache.get<Flashcard[]>(cacheKey) || [];
  }

  if (searchPromises.has(cacheKey)) {
    return searchPromises.get(cacheKey)!;
  }

  const searchPromise = (async () => {
    try {
      const queryTrimmed = queryStr.trim();
      const queryLower = queryTrimmed.toLowerCase();
      const normalizedQuery = normalizePinyin(queryTrimmed);

      // Fast path: single Chinese character lookup
      // Check all cached vocabulary pages instead of fetching everything
      const isSingleChar = queryTrimmed.length === 1 && /[\u4E00-\u9FFF\u3400-\u4DBF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(queryTrimmed);
      if (isSingleChar) {
        const results: Flashcard[] = [];
        const seen = new Set<string>();
        // Scan all vocabulary cache keys for matches
        const vocabKeys = ['vocab-all-all', 'vocab-1-all', 'vocab-2-all', 'vocab-3-all', 'vocab-4-all', 'vocab-5-all', 'vocab-6-all'];
        for (const key of vocabKeys) {
          const cached = vocabularyCache.get<Flashcard[]>(key);
          if (cached) {
            for (const card of cached) {
              if (card.front === queryTrimmed && !seen.has(card.id)) {
                seen.add(card.id);
                results.push(card);
              }
            }
          }
        }
        // If we found matches in cache, return immediately without fetching all vocab
        if (results.length > 0) {
          vocabularyCache.set(cacheKey, results);
          return results;
        }
        // If no cache hits, fall through to full search
      }

      const allCards = await fetchVocabulary();
      
      const scoredResults = allCards.map(card => ({
        card,
        score: getSmartScore(card, queryTrimmed, queryLower, normalizedQuery)
      })).filter(item => item.score > 0);
      
      scoredResults.sort((a, b) => b.score - a.score);
      
      const finalData = scoredResults.slice(0, 100).map(s => s.card);
      vocabularyCache.set(cacheKey, finalData);
      
      return finalData;
    } catch (err) {
      console.error('Exception searching vocabulary:', err);
      return [];
    } finally {
      searchPromises.delete(cacheKey);
    }
  })();

  searchPromises.set(cacheKey, searchPromise);
  return searchPromise;
}

export async function fetchExamplesForWord(searchWord: string): Promise<Flashcard[]> {
  if (!searchWord || searchWord.trim() === '') return [];
  
  const cacheKey = `examples-${searchWord}`;
  if (vocabularyCache.has(cacheKey)) {
    return vocabularyCache.get<Flashcard[]>(cacheKey) || [];
  }

  try {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
    const variants = extractSearchVariants(searchWord);
    
    if (!supabaseUrl) {
      // Fallback to local data
      const matching = FLASHCARDS_DATA.filter(c => c.examples?.some(e => e.chinese && (e.chinese.includes(searchWord) || variants.some(v => e.chinese.includes(v)))));
      return matching;
    }

    let query = supabase.from('book_vocabulary').select('*');
    if (variants.length > 0) {
      const orString = variants.map(v => `examples.ilike.%${v}%`).join(',');
      query = query.or(`examples.ilike.%${searchWord}%,${orString}`);
    } else {
      query = query.ilike('examples', `%${searchWord}%`);
    }

    const { data, error } = await query.limit(100); // 100 examples is plenty for sentences

    if (error) {
      console.error('Error fetching examples:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const mappedData: Flashcard[] = data.map((item: any) => {
      const match = item.id ? item.id.toString().match(/^[Bb](\d+)[-_]?[Ll](\d+)/) : null;
      const bId = match ? parseInt(match[1], 10) : 0;
      const lId = match ? parseInt(match[2], 10) : 0;
      
      return {
        id: item.id?.toString() || Math.random().toString(),
        bookId: bId || item.book_id || item.book || 0,
        lessonId: lId || item.lesson_id || item.lesson || 0,
        front: (item.traditional || item.simplified || item.character || item.hanzi || item.word || '').trim(),
        back: (item.meaning || item.english || item.definition || '').trim(),
        pinyin: (item.pinyin || item.pronunciation || '').trim(),
        audio: item.audio || item.audio_url || '',
        notes: item.notes || item.note || '',
        examples: typeof item.examples === 'string' ? (()=>{ try { const parsed = JSON.parse(item.examples); return Array.isArray(parsed) ? parsed : [ { chinese: item.examples } ]; } catch(e) { return item.examples.trim() ? [ { chinese: item.examples } ] : []; } })() : (item.examples || []),
      };
    });

    vocabularyCache.set(cacheKey, mappedData);
    return mappedData;
  } catch (err) {
    console.error('Exception fetching examples:', err);
    return [];
  }
}

