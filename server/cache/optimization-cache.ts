
import { OptimizedRoute } from '../../shared/utils/tour-optimizer';
import { createHash } from 'crypto';

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface CacheEntry {
  result: OptimizedRoute;
  timestamp: number;
}

class OptimizationCache {
  private cache: Map<string, CacheEntry> = new Map();

  private getCacheKey(tourId: number, preferences: any): string {
    const prefsString = JSON.stringify(preferences || {});
    const hash = createHash('md5').update(prefsString).digest('hex');
    return `${tourId}:${hash}`;
  }

  get(tourId: number, preferences: any): OptimizedRoute | null {
    const key = this.getCacheKey(tourId, preferences);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }

  set(tourId: number, preferences: any, result: OptimizedRoute): void {
    const key = this.getCacheKey(tourId, preferences);
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  invalidate(tourId: number): void {
    // Remove all entries for this tour
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tourId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const optimizationCache = new OptimizationCache();
