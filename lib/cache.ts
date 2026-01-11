/**
 * Simple in-memory cache with TTL (Time To Live)
 * Used for caching API responses that don't change frequently
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cache entry (returns null if expired or not found)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  EXAMS: 'exams',
  ATTEMPTS: 'attempts',
  LIVE_PROGRESS: 'live_progress',
  CLASS_IDS: 'class_ids',
  CONFIG: 'config',
  BANK_QUESTIONS: 'bank_questions',
} as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  EXAMS: 2 * 60 * 1000,        // 2 minutes (exams don't change often)
  ATTEMPTS: 30 * 1000,         // 30 seconds (attempts change more frequently)
  CLASS_IDS: 10 * 60 * 1000,   // 10 minutes (class IDs rarely change)
  BANK_QUESTIONS: 5 * 60 * 1000, // 5 minutes (bank questions change less frequently)
} as const;

