/**
 * Reusable Duplicate-Click & Duplicate-Transaction Protection Utilities
 *
 * Provides:
 * 1. Synchronous ref-backed action locks (immune to React async state batching on rapid double-clicks
 *    or slow internet connections).
 * 2. Deterministic Firestore ID builders for idempotent daily egg collection
 *    (`eggCollect_${userId}_${dateKey}`) and unique Trx ID reservations.
 */

import { useCallback, useRef, useState } from 'react';

// ---------------- PURE DETERMINISTIC ID HELPERS ----------------

/**
 * Trims and normalizes a Transaction ID (TrxID / TxID) consistently:
 * trims outer spaces, collapses internal whitespace, and lowercases.
 */
export function normalizeTrxId(raw: string): string {
  return (raw || '').trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Encodes a normalized Trx ID into a Firestore-safe document ID segment
 * (no '/', no leading/trailing '.', bounded length, collision-resistant).
 */
export function encodeTrxIdForDocId(raw: string): string {
  const normalized = normalizeTrxId(raw);
  if (!normalized) return '';
  // Replace any character outside [a-z0-9_-] with a deterministic hex escape
  const safe = normalized.replace(/[^a-z0-9_-]/g, (ch) => {
    const code = ch.charCodeAt(0).toString(16).padStart(2, '0');
    return `_x${code}_`;
  });
  return safe.slice(0, 180);
}

/**
 * Builds a deterministic Firestore document ID for a unique package order Trx ID.
 */
export function buildUniqueOrderTrxDocId(rawTrxId: string): string {
  const encoded = encodeTrxIdForDocId(rawTrxId);
  if (!encoded) {
    throw new Error('Transaction ID is required.');
  }
  return `ORD-TRX-${encoded}`;
}

/**
 * Builds a deterministic Firestore document ID for a unique medical payment Trx ID.
 */
export function buildUniqueMedicalTrxDocId(rawTrxId: string): string {
  const encoded = encodeTrxIdForDocId(rawTrxId);
  if (!encoded) {
    throw new Error('Transaction ID is required.');
  }
  return `MED-TRX-${encoded}`;
}

/**
 * Formats a Date into a canonical UTC YYYY-MM-DD date key for deterministic daily collection docs.
 */
export function buildDailyDateKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Builds the deterministic Firestore document ID for daily egg collection:
 * `eggCollect_${userId}_${dateKey}`
 */
export function buildDailyEggCollectDocId(userId: string, date: Date | string = new Date()): string {
  const cleanUserId = (userId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!cleanUserId) {
    throw new Error('User ID is required for egg collection.');
  }
  const dateKey = typeof date === 'string' ? date.trim() : buildDailyDateKey(date);
  return `eggCollect_${cleanUserId}_${dateKey}`;
}

// ---------------- PURE SYNCHRONOUS LOCK CONTROLLERS (UNIT-TESTABLE) ----------------

export interface ActionLockController {
  isLocked: () => boolean;
  run: <T>(action: () => Promise<T>) => Promise<{ executed: true; value: T } | { executed: false }>;
}

/**
 * Framework-agnostic synchronous action lock.
 * Guarantees that if `run()` is invoked multiple times before the first Promise settles,
 * only the FIRST invocation executes and all subsequent calls return `{ executed: false }` immediately.
 */
export function createActionLock(onChange?: (locked: boolean) => void): ActionLockController {
  let locked = false;

  return {
    isLocked: () => locked,
    async run<T>(action: () => Promise<T>) {
      if (locked) {
        return { executed: false as const };
      }
      locked = true;
      onChange?.(true);
      try {
        const value = await action();
        return { executed: true as const, value };
      } finally {
        locked = false;
        onChange?.(false);
      }
    },
  };
}

export interface KeyedActionLockController {
  isLocked: (key: string) => boolean;
  hasAnyLock: () => boolean;
  run: <T>(
    key: string,
    action: () => Promise<T>
  ) => Promise<{ executed: true; value: T } | { executed: false }>;
}

/**
 * Framework-agnostic per-key synchronous action lock (e.g. per orderId or withdrawalId in Admin Portal).
 * Prevents double-clicking Approve/Reject on the same record while keeping other records independent.
 */
export function createKeyedActionLock(
  onChange?: (lockedKeys: Record<string, boolean>) => void
): KeyedActionLockController {
  const activeKeys = new Set<string>();

  const emitSnapshot = () => {
    if (!onChange) return;
    const snap: Record<string, boolean> = {};
    activeKeys.forEach((k) => {
      snap[k] = true;
    });
    onChange(snap);
  };

  return {
    isLocked: (key: string) => activeKeys.has(key),
    hasAnyLock: () => activeKeys.size > 0,
    async run<T>(key: string, action: () => Promise<T>) {
      if (!key || activeKeys.has(key)) {
        return { executed: false as const };
      }
      activeKeys.add(key);
      emitSnapshot();
      try {
        const value = await action();
        return { executed: true as const, value };
      } finally {
        activeKeys.delete(key);
        emitSnapshot();
      }
    },
  };
}

// ---------------- REUSABLE REACT HOOKS ----------------

/**
 * Reusable single-action lock hook for forms and CTA buttons
 * (Collect Daily Eggs, Buy Package / Submit Slip & Trx ID, Withdraw, Medical Payment).
 *
 * Uses a synchronous ref guard alongside React `isSubmitting` state so rapid double-clicks
 * or slow network taps can NEVER fire duplicate async requests.
 */
export function useActionLock() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef<ActionLockController | null>(null);

  if (!lockRef.current) {
    lockRef.current = createActionLock((locked) => {
      setIsSubmitting(locked);
    });
  }

  const runLocked = useCallback(
    async <T,>(action: () => Promise<T>): Promise<{ executed: true; value: T } | { executed: false }> => {
      return lockRef.current!.run(action);
    },
    []
  );

  return {
    isSubmitting,
    runLocked,
  };
}

/**
 * Reusable per-item action lock hook for lists/tables (e.g. Admin Portal Approve/Reject
 * on package orders and withdrawal requests).
 */
export function useKeyedActionLock() {
  const [lockedMap, setLockedMap] = useState<Record<string, boolean>>({});
  const lockRef = useRef<KeyedActionLockController | null>(null);

  if (!lockRef.current) {
    lockRef.current = createKeyedActionLock((snapshot) => {
      setLockedMap(snapshot);
    });
  }

  const isKeyLocked = useCallback(
    (key: string): boolean => Boolean(lockedMap[key] || lockRef.current?.isLocked(key)),
    [lockedMap]
  );

  const runKeyLocked = useCallback(
    async <T,>(
      key: string,
      action: () => Promise<T>
    ): Promise<{ executed: true; value: T } | { executed: false }> => {
      return lockRef.current!.run(key, action);
    },
    []
  );

  return {
    lockedMap,
    isKeyLocked,
    runKeyLocked,
  };
}
