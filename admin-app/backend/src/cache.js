// In-memory vote count cache.
// TTL of 5 seconds — intentionally short so we can demonstrate
// the difference between cached and uncached result responses.
// In a production system this would be Redis.

const CACHE_TTL_MS = 5000;

const voteCache = new Map();

function getCache(pollId) {
  const entry = voteCache.get(pollId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    voteCache.delete(pollId);
    return null;
  }
  return entry;
}

function setCache(pollId, counts) {
  voteCache.set(pollId, { counts, cachedAt: Date.now() });
}

function invalidateCache(pollId) {
  voteCache.delete(pollId);
}

function getCacheStats() {
  return {
    size: voteCache.size,
    keys: [...voteCache.keys()],
    ttl_ms: CACHE_TTL_MS,
  };
}

module.exports = { getCache, setCache, invalidateCache, getCacheStats };
