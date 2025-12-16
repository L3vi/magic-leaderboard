/**
 * Unified cache system for commander data (images, colors, variants)
 * Handles localStorage persistence, deduplication, and batch operations
 */

export interface CommanderImageData {
  art: string;
  full: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheStore {
  version: number;
  images: Record<string, CacheEntry<CommanderImageData>>;
  colors: Record<string, CacheEntry<string[]>>;
  timestamp: number;
}

const CACHE_KEY = 'magicLeaderboard_cache_v1';
const CACHE_VERSION = 1;
const DEFAULT_CACHE: CacheStore = {
  version: CACHE_VERSION,
  images: {},
  colors: {},
  timestamp: Date.now(),
};

// In-memory cache for fast access
let memoryCache: CacheStore = { ...DEFAULT_CACHE };

// Track in-flight requests to prevent duplicate fetches
const inflightRequests: Map<string, Promise<any>> = new Map();

/**
 * Load cache from localStorage on initialization
 */
function loadCache(): void {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CacheStore;
      if (parsed.version === CACHE_VERSION) {
        memoryCache = parsed;
        return;
      }
    }
  } catch (error) {
    console.warn('Failed to load cache from localStorage:', error);
  }
  memoryCache = { ...DEFAULT_CACHE };
}

/**
 * Persist cache to localStorage
 */
function saveCache(): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch (error) {
    console.warn('Failed to save cache to localStorage:', error);
  }
}

/**
 * Get cached commander image data
 */
export function getImageCache(commander: string): CommanderImageData | null {
  const entry = memoryCache.images[commander];
  return entry ? entry.data : null;
}

/**
 * Get all cached images
 */
export function getAllImageCache(): Record<string, CommanderImageData> {
  const result: Record<string, CommanderImageData> = {};
  for (const [key, entry] of Object.entries(memoryCache.images)) {
    result[key] = entry.data;
  }
  return result;
}

/**
 * Set commander image data
 */
export function setImageCache(commander: string, data: CommanderImageData): void {
  memoryCache.images[commander] = {
    data,
    timestamp: Date.now(),
  };
  saveCache();
}

/**
 * Batch set image cache entries
 */
export function setImageCacheBatch(entries: Record<string, CommanderImageData>): void {
  for (const [commander, data] of Object.entries(entries)) {
    memoryCache.images[commander] = {
      data,
      timestamp: Date.now(),
    };
  }
  saveCache();
}

/**
 * Get cached commander color data
 */
export function getColorCache(commander: string): string[] | null {
  const entry = memoryCache.colors[commander];
  return entry ? entry.data : null;
}

/**
 * Set commander color data
 */
export function setColorCache(commander: string, colors: string[]): void {
  memoryCache.colors[commander] = {
    data: colors,
    timestamp: Date.now(),
  };
  saveCache();
}

/**
 * Batch set color cache entries
 */
export function setColorCacheBatch(entries: Record<string, string[]>): void {
  for (const [commander, colors] of Object.entries(entries)) {
    memoryCache.colors[commander] = {
      data: colors,
      timestamp: Date.now(),
    };
  }
  saveCache();
}

/**
 * Check if commander is cached (either images or colors)
 */
export function isCached(commander: string): boolean {
  return !!(memoryCache.images[commander] || memoryCache.colors[commander]);
}

/**
 * Get commanders that are NOT cached
 */
export function getUncachedCommanders(commanders: string[]): string[] {
  return commanders.filter(cmd => !isCached(cmd));
}

/**
 * Track in-flight requests to prevent duplicate fetches
 */
export function getInflightRequest(key: string): Promise<any> | undefined {
  return inflightRequests.get(key);
}

/**
 * Set in-flight request
 */
export function setInflightRequest(key: string, promise: Promise<any>): void {
  inflightRequests.set(key, promise);
}

/**
 * Clear in-flight request
 */
export function clearInflightRequest(key: string): void {
  inflightRequests.delete(key);
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  memoryCache = { ...DEFAULT_CACHE };
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear cache from localStorage:', error);
  }
}

/**
 * Clear specific commander from cache
 */
export function clearCommanderCache(commander: string): void {
  delete memoryCache.images[commander];
  delete memoryCache.colors[commander];
  saveCache();
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats() {
  return {
    imageCount: Object.keys(memoryCache.images).length,
    colorCount: Object.keys(memoryCache.colors).length,
    inflightRequests: inflightRequests.size,
    lastUpdated: new Date(memoryCache.timestamp).toISOString(),
  };
}

// Initialize cache on module load
loadCache();
