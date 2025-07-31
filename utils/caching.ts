import { LRUCache } from "lru-cache";

interface CacheConfig {
  ttl: number;
  maxSize: number;
}

/**
 * Creates an in-memory cache with configurable time-to-live and maximum size using an LRU eviction policy.
 *
 * @param config - Configuration object specifying the cache's TTL and maximum size
 * @returns An object with methods to get, set, check, delete, and clear cache entries
 */
export function createCache(config: CacheConfig) {
  const cache = new LRUCache({
    max: config.maxSize,
    ttl: config.ttl,
  });

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: any) => cache.set(key, value),
    has: (key: string) => cache.has(key),
    delete: (key: string) => cache.delete(key),
    clear: () => cache.clear(),
  };
}
