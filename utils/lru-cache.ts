import { LRUCache } from "lru-cache";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Cache for review counts
// Key: userId (string)
// Value: count (number)
// max: Maximum number of items in the cache (e.g., 1000 users' review counts)
// ttl: Time-to-live for each item in milliseconds (e.g., 5 minutes = 300_000 ms)
export const reviewCountCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 1000 * 60 * 5,
  allowStale: true,
  updateAgeOnGet: true,
});

// If you decide to cache actual lists of reviews for a user:
export const userReviewsListCache = new LRUCache<string, Review[]>({
  max: 500, // Cache review lists for up to 500 users
  ttl: 1000 * 60 * 1, // 1 minute, as review lists change more often
});
