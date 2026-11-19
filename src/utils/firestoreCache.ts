/**
 * Pak Hen Farm - Free-Tier Firestore Caching, Request Deduplication & Quota Protection
 *
 * Pure utility module (zero React dependency, deterministic & unit-testable via node:test):
 * - Short-lived in-memory + sessionStorage cache with per-resource TTLs
 * - In-flight promise deduplication (prevents parallel identical reads on re-renders or double-clicks)
 * - Intelligent invalidation & optimistic patching after writes/approvals
 * - Quota-exceeded circuit breaker (prevents infinite retry loops when Firebase Free Tier quota is hit)
 * - Bilingual Firestore error classification distinguishing auth errors from quota/network/permission errors
 */

export const CACHE_TTL_MS = {
  userProfile: 2 * 60 * 1000, // 2 min
  globalStats: 5 * 60 * 1000, // 5 min
  sheds: 3 * 60 * 1000, // 3 min
  paymentMethods: 10 * 60 * 1000, // 10 min
  paymentSettings: 10 * 60 * 1000, // 10 min
  banners: 15 * 60 * 1000, // 15 min
  gallery: 15 * 60 * 1000, // 15 min
  farmProfile: 15 * 60 * 1000, // 15 min
  collections: 2 * 60 * 1000, // 2 min
  alerts: 2 * 60 * 1000, // 2 min
  orders: 2 * 60 * 1000, // 2 min
  withdrawals: 2 * 60 * 1000, // 2 min
  referrals: 5 * 60 * 1000, // 5 min
  tickets: 2 * 60 * 1000, // 2 min
  medical: 2 * 60 * 1000, // 2 min
  adminUsers: 3 * 60 * 1000, // 3 min
} as const;

export const QUOTA_COOLDOWN_MS = 60 * 1000; // 60s backoff after resource-exhausted to stop retry storms

const STORAGE_PREFIX = 'phf_cache_v2:';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  updatedAt: number;
}

export type FirestoreErrorKind = 'quota' | 'permission' | 'network' | 'auth' | 'unknown';

export interface ClassifiedFirestoreError {
  kind: FirestoreErrorKind;
  messageEn: string;
  messageUr: string;
  isQuota: boolean;
  isAuthError: boolean;
  rawCode?: string;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
let quotaCooldownUntil = 0;

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Ignore restricted iframe / SSR environments
  }
  return null;
}

function readFromSessionStorage<T>(key: string): CacheEntry<T> | null {
  const storage = getSafeSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed && typeof parsed.expiresAt === 'number' && 'value' in parsed) {
      return parsed;
    }
  } catch {
    // Corrupted or unavailable storage entry
  }
  return null;
}

function writeToSessionStorage<T>(key: string, entry: CacheEntry<T>): void {
  const storage = getSafeSessionStorage();
  if (!storage) return;
  try {
    const serialized = JSON.stringify(entry);
    // Avoid bloating sessionStorage with oversized payloads (> 400KB)
    if (serialized.length <= 400 * 1024) {
      storage.setItem(STORAGE_PREFIX + key, serialized);
    }
  } catch {
    // QuotaExceededError on sessionStorage is non-fatal; memoryCache still holds value
  }
}

function removeFromSessionStorage(key: string): void {
  const storage = getSafeSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Classifies Firebase / application errors cleanly so UI never confuses
 * database quota or network errors with invalid login credentials.
 */
export function classifyFirestoreError(
  err: any,
  lang: 'en' | 'ur' = 'en'
): ClassifiedFirestoreError {
  const rawCode = String(err?.code || '').toLowerCase();
  const rawMsg = String(err?.message || err || '');
  const lowerMsg = rawMsg.toLowerCase();

  // 1. Firestore Free Tier Quota Exhaustion
  if (
    rawCode.includes('resource-exhausted') ||
    lowerMsg.includes('quota limit exceeded') ||
    lowerMsg.includes('quota exceeded') ||
    lowerMsg.includes('resource-exhausted') ||
    lowerMsg.includes('daily read units')
  ) {
    return {
      kind: 'quota',
      isQuota: true,
      isAuthError: false,
      rawCode: rawCode || 'resource-exhausted',
      messageEn:
        'Database daily read quota is temporarily reached. Showing cached data where available — please wait or tap Refresh later. Your login session is safe.',
      messageUr:
        'ڈیٹا بیس کی یومیہ مفت حد عارضی طور پر مکمل ہو گئی ہے۔ محفوظ شدہ ڈیٹا دکھایا جا رہا ہے — براہ کرم تھوڑی دیر بعد ریفریش کریں۔ آپ کا لاگ ان سیشن محفوظ ہے۔',
    };
  }

  // 2. Permission / Security Rules Errors
  if (rawCode.includes('permission-denied') || lowerMsg.includes('missing or insufficient permissions')) {
    return {
      kind: 'permission',
      isQuota: false,
      isAuthError: false,
      rawCode: rawCode || 'permission-denied',
      messageEn: 'Access permission denied by database security rules. Please sign in again or contact Farm Admin.',
      messageUr: 'ڈیٹا بیس کی اجازت مسترد ہو گئی ہے۔ براہ کرم دوبارہ لاگ ان کریں یا ایڈمن سے رابطہ کریں۔',
    };
  }

  // 3. Network / Offline / Unavailable Errors
  if (
    rawCode.includes('unavailable') ||
    rawCode.includes('deadline-exceeded') ||
    lowerMsg.includes('client is offline') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('networkerror') ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('could not reach cloud firestore')
  ) {
    return {
      kind: 'network',
      isQuota: false,
      isAuthError: false,
      rawCode: rawCode || 'unavailable',
      messageEn: 'Unable to reach the farm database right now. Please check your internet connection and tap Refresh.',
      messageUr: 'اس وقت فارم ڈیٹا بیس سے رابطہ ممکن نہیں ہو سکا۔ براہ کرم انٹرنیٹ چیک کریں اور ریفریش دبائیں۔',
    };
  }

  // 4. Explicit Authentication / Validation Errors
  if (
    lowerMsg.includes('incorrect password') ||
    lowerMsg.includes('no account found') ||
    lowerMsg.includes('no registered account') ||
    lowerMsg.includes('already exists') ||
    lowerMsg.includes('verification failed') ||
    lowerMsg.includes('at least 6 characters') ||
    lowerMsg.includes('invalid email')
  ) {
    return {
      kind: 'auth',
      isQuota: false,
      isAuthError: true,
      rawCode: rawCode || 'auth-error',
      messageEn: rawMsg,
      messageUr:
        lang === 'ur' && lowerMsg.includes('incorrect password')
          ? 'پاس ورڈ درست نہیں ہے۔ براہ کرم دوبارہ کوشش کریں۔'
          : lang === 'ur' && lowerMsg.includes('no account found')
          ? 'اس ای میل کے ساتھ کوئی اکاؤنٹ موجود نہیں ہے۔ براہ کرم نیا اکاؤنٹ بنائیں۔'
          : lang === 'ur' && lowerMsg.includes('already exists')
          ? 'یہ ای میل یا موبائل نمبر پہلے سے رجسٹرڈ ہے۔'
          : rawMsg,
    };
  }

  return {
    kind: 'unknown',
    isQuota: false,
    isAuthError: false,
    rawCode: rawCode || undefined,
    messageEn: rawMsg || 'A temporary database error occurred. Please try again.',
    messageUr: rawMsg || 'عارضی تکنیکی خرابی پیش آئی ہے۔ براہ کرم دوبارہ کوشش کریں۔',
  };
}

export function getFriendlyErrorMessage(err: any, lang: 'en' | 'ur' = 'en'): string {
  const classified = classifyFirestoreError(err, lang);
  return lang === 'ur' ? classified.messageUr : classified.messageEn;
}

export function recordQuotaExceeded(nowMs: number = Date.now(), cooldownMs: number = QUOTA_COOLDOWN_MS): void {
  quotaCooldownUntil = Math.max(quotaCooldownUntil, nowMs + cooldownMs);
}

export function clearQuotaCooldown(): void {
  quotaCooldownUntil = 0;
}

export function isQuotaCooldownActive(nowMs: number = Date.now()): boolean {
  return nowMs < quotaCooldownUntil;
}

export function getQuotaCooldownRemainingMs(nowMs: number = Date.now()): number {
  return Math.max(0, quotaCooldownUntil - nowMs);
}

/**
 * Returns cached data if still fresh (within TTL), or if `allowStale` is true returns
 * the last known value even after expiry (critical fallback during quota/network outages).
 */
export function getCachedValue<T>(
  key: string,
  options?: { allowStale?: boolean; nowMs?: number }
): T | undefined {
  const nowMs = options?.nowMs ?? Date.now();
  const allowStale = options?.allowStale ?? false;

  let entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    const persisted = readFromSessionStorage<T>(key);
    if (persisted) {
      memoryCache.set(key, persisted);
      entry = persisted;
    }
  }

  if (!entry) return undefined;
  if (nowMs < entry.expiresAt || allowStale) {
    return entry.value;
  }
  return undefined;
}

export function setCachedValue<T>(
  key: string,
  value: T,
  ttlMs: number,
  options?: { persist?: boolean; nowMs?: number }
): void {
  const nowMs = options?.nowMs ?? Date.now();
  const entry: CacheEntry<T> = {
    value,
    updatedAt: nowMs,
    expiresAt: nowMs + Math.max(1000, ttlMs),
  };
  memoryCache.set(key, entry);
  if (options?.persist !== false) {
    writeToSessionStorage(key, entry);
  }
}

export function invalidateCacheKey(key: string): void {
  memoryCache.delete(key);
  removeFromSessionStorage(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  const storage = getSafeSessionStorage();
  if (storage) {
    try {
      const fullPrefix = STORAGE_PREFIX + prefix;
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(fullPrefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    } catch {
      // ignore
    }
  }
}

export function clearAllAppCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();
  clearQuotaCooldown();
  const storage = getSafeSessionStorage();
  if (storage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    } catch {
      // ignore
    }
  }
}

export interface FetchCachedOptions<T> {
  ttlMs: number;
  forceRefresh?: boolean;
  persist?: boolean;
  fallbackValue?: T;
  nowMs?: number;
}

/**
 * Core Free-Tier Read Optimizer:
 * 1. Returns fresh cached value immediately (0 Firestore reads).
 * 2. Deduplicates concurrent identical requests via `inFlightRequests` (prevents double-fetch storms).
 * 3. Respects quota cooldown: during cooldown, serves stale cache/fallback instead of hammering Firestore.
 * 4. On quota/network error, falls back to stale cache if available so the UI never blanks out or crashes.
 */
export async function getOrFetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: FetchCachedOptions<T>
): Promise<T> {
  const nowMs = options.nowMs ?? Date.now();
  const forceRefresh = !!options.forceRefresh;

  if (!forceRefresh) {
    const fresh = getCachedValue<T>(key, { allowStale: false, nowMs });
    if (fresh !== undefined) {
      return fresh;
    }

    // If quota cooldown is active, do NOT issue another Firestore read — return stale cache or throw cleanly
    if (isQuotaCooldownActive(nowMs)) {
      const stale = getCachedValue<T>(key, { allowStale: true, nowMs });
      if (stale !== undefined) {
        return stale;
      }
      if (options.fallbackValue !== undefined) {
        return options.fallbackValue;
      }
      const err: any = new Error(
        'Database daily read quota is temporarily reached. Please wait a moment and tap Refresh.'
      );
      err.code = 'resource-exhausted';
      throw err;
    }
  } else {
    // User explicitly requested manual Refresh: allow a fresh attempt
    clearQuotaCooldown();
  }

  // Deduplicate simultaneous identical calls (including concurrent Refresh button taps)
  const existingInFlight = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existingInFlight) {
    return existingInFlight;
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      setCachedValue(key, data, options.ttlMs, { persist: options.persist, nowMs: Date.now() });
      return data;
    } catch (err: any) {
      const classified = classifyFirestoreError(err);
      if (classified.isQuota) {
        recordQuotaExceeded();
      }
      // Graceful degradation: preserve stale cached data when a temporary quota/network error occurs
      if (!forceRefresh && (classified.kind === 'quota' || classified.kind === 'network')) {
        const stale = getCachedValue<T>(key, { allowStale: true });
        if (stale !== undefined) {
          return stale;
        }
        if (options.fallbackValue !== undefined) {
          return options.fallbackValue;
        }
      }
      throw err;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}
