/**
 * Simple query cache with TTL (time-to-live)
 * Caches API responses to avoid redundant fetches during navigation
 * Components can explicitly call refresh() to get fresh data when needed
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function getCacheKey(type: string, param?: string): string {
  return param ? `${type}:${param}` : type;
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if cache has expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function isCached(key: string): boolean {
  return getFromCache(key) !== null;
}
