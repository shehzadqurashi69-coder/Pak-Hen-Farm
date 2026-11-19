import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrFetchCached,
  getCachedValue,
  setCachedValue,
  invalidateCacheKey,
  invalidateCachePrefix,
  clearAllAppCache,
  classifyFirestoreError,
  isQuotaCooldownActive,
  recordQuotaExceeded,
  clearQuotaCooldown,
  CACHE_TTL_MS,
} from './firestoreCache';

test('getOrFetchCached reuses cached data within TTL and avoids duplicate Firestore reads', async () => {
  clearAllAppCache();
  let fetchCount = 0;

  const fetcher = async () => {
    fetchCount += 1;
    return { totalActiveHens: 1250, netFresh: 1200 };
  };

  const first = await getOrFetchCached('stats:global', fetcher, { ttlMs: CACHE_TTL_MS.globalStats });
  const second = await getOrFetchCached('stats:global', fetcher, { ttlMs: CACHE_TTL_MS.globalStats });

  assert.equal(fetchCount, 1);
  assert.deepEqual(first, second);
});

test('getOrFetchCached deduplicates simultaneous parallel requests (double-click / strict-mode protection)', async () => {
  clearAllAppCache();
  let fetchCount = 0;

  const slowFetcher = async () => {
    fetchCount += 1;
    await new Promise((r) => setTimeout(r, 25));
    return ['ORD-1', 'ORD-2'];
  };

  const [a, b, c] = await Promise.all([
    getOrFetchCached('admin:orders', slowFetcher, { ttlMs: CACHE_TTL_MS.orders }),
    getOrFetchCached('admin:orders', slowFetcher, { ttlMs: CACHE_TTL_MS.orders }),
    getOrFetchCached('admin:orders', slowFetcher, { ttlMs: CACHE_TTL_MS.orders }),
  ]);

  assert.equal(fetchCount, 1);
  assert.deepEqual(a, ['ORD-1', 'ORD-2']);
  assert.deepEqual(b, a);
  assert.deepEqual(c, a);
});

test('forceRefresh bypasses cache TTL and updates cached value cleanly', async () => {
  clearAllAppCache();
  let version = 0;

  const fetcher = async () => {
    version += 1;
    return { walletBalance: version * 500 };
  };

  const v1 = await getOrFetchCached('user:u1', fetcher, { ttlMs: 60_000 });
  assert.equal(v1.walletBalance, 500);

  const v1Cached = await getOrFetchCached('user:u1', fetcher, { ttlMs: 60_000 });
  assert.equal(v1Cached.walletBalance, 500);

  const v2 = await getOrFetchCached('user:u1', fetcher, { ttlMs: 60_000, forceRefresh: true });
  assert.equal(v2.walletBalance, 1000);
  assert.equal(getCachedValue<{ walletBalance: number }>('user:u1')?.walletBalance, 1000);
});

test('invalidateCacheKey and invalidateCachePrefix prevent stale financial/order data after writes', () => {
  clearAllAppCache();
  setCachedValue('admin:orders:100', [{ id: 'ORD-1', status: 'pending' }], 60_000);
  setCachedValue('admin:users:150', [{ id: 'U1', activeHens: 5 }], 60_000);
  setCachedValue('sheds:all', [{ id: 'Shed-101', totalHens: 5 }], 60_000);

  invalidateCachePrefix('admin:orders');
  assert.equal(getCachedValue('admin:orders:100'), undefined);
  assert.ok(getCachedValue('admin:users:150'));

  invalidateCacheKey('sheds:all');
  assert.equal(getCachedValue('sheds:all'), undefined);
});

test('quota circuit-breaker prevents repeated Firestore requests after resource-exhausted and serves stale cache', async () => {
  clearAllAppCache();
  const baseTime = 1_700_000_000_000;

  // Prime cache with an entry that is now expired (stale)
  setCachedValue('sheds:all', [{ id: 'Shed-101', totalHens: 42 }], 5_000, { nowMs: baseTime });

  let calls = 0;
  const failingQuotaFetcher = async () => {
    calls += 1;
    const err: any = new Error('Quota limit exceeded for free daily read units');
    err.code = 'resource-exhausted';
    throw err;
  };

  // First call hits quota, records cooldown, and gracefully returns stale cache instead of crashing
  const res1 = await getOrFetchCached('sheds:all', failingQuotaFetcher, {
    ttlMs: 5_000,
    nowMs: baseTime + 10_000,
  });
  assert.equal(calls, 1);
  assert.deepEqual(res1, [{ id: 'Shed-101', totalHens: 42 }]);
  assert.equal(isQuotaCooldownActive(), true);

  // Subsequent non-forced call during cooldown makes ZERO Firestore calls and reuses stale cache
  const res2 = await getOrFetchCached('sheds:all', failingQuotaFetcher, {
    ttlMs: 5_000,
    nowMs: Date.now(),
  });
  assert.equal(calls, 1);
  assert.deepEqual(res2, [{ id: 'Shed-101', totalHens: 42 }]);

  clearQuotaCooldown();
  assert.equal(isQuotaCooldownActive(), false);
});

test('classifyFirestoreError distinguishes auth errors from quota, permission, and network errors', () => {
  const quotaErr = classifyFirestoreError(
    { code: 'resource-exhausted', message: 'Quota limit exceeded' },
    'en'
  );
  assert.equal(quotaErr.kind, 'quota');
  assert.equal(quotaErr.isQuota, true);
  assert.equal(quotaErr.isAuthError, false);

  const authErr = classifyFirestoreError(new Error('Incorrect password. Please try again.'), 'ur');
  assert.equal(authErr.kind, 'auth');
  assert.equal(authErr.isAuthError, true);
  assert.ok(authErr.messageUr.includes('پاس ورڈ'));

  const netErr = classifyFirestoreError({ code: 'unavailable', message: 'client is offline' }, 'en');
  assert.equal(netErr.kind, 'network');
  assert.equal(netErr.isAuthError, false);

  const permErr = classifyFirestoreError(
    { code: 'permission-denied', message: 'Missing or insufficient permissions' },
    'en'
  );
  assert.equal(permErr.kind, 'permission');

  // Verify manual recordQuotaExceeded sets cooldown
  clearQuotaCooldown();
  recordQuotaExceeded(Date.now(), 5000);
  assert.equal(isQuotaCooldownActive(), true);
  clearQuotaCooldown();
});
