/**
 * Simple in-memory LRU-like cache map for storing high-frequency 
 * database reads (like characters and dictionary fetches).
 */
export class AppCache {
  private cache = new Map<string, any>();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // True LRU: delete and re-insert to move it to the back of the insertion order
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value as T | undefined;
  }

  set<T>(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      // Very crude LRU eviction: remove the first added item (Map maintains insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instances per domain to avoid key collisions
export const breakdownCache = new AppCache(2000);
export const dictionaryCache = new AppCache(2000);
export const vocabularyCache = new AppCache(500);
export const dictionarySearchCache = new AppCache(1000);
