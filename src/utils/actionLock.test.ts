import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createActionLock,
  createKeyedActionLock,
  normalizeTrxId,
  encodeTrxIdForDocId,
  buildUniqueOrderTrxDocId,
  buildUniqueMedicalTrxDocId,
  buildDailyEggCollectDocId,
  buildDailyDateKey,
} from './actionLock';

test('createActionLock blocks rapid duplicate clicks and executes action only once under slow network', async () => {
  let executionCount = 0;
  const states: boolean[] = [];
  const lock = createActionLock((locked) => states.push(locked));

  const slowAction = async () => {
    executionCount += 1;
    await new Promise((r) => setTimeout(r, 30));
    return 'DONE';
  };

  // Simulate 5 rapid simultaneous taps while internet is slow
  const results = await Promise.all([
    lock.run(slowAction),
    lock.run(slowAction),
    lock.run(slowAction),
    lock.run(slowAction),
    lock.run(slowAction),
  ]);

  assert.equal(executionCount, 1);
  assert.equal(results[0].executed, true);
  assert.equal((results[0] as { executed: true; value: string }).value, 'DONE');
  assert.equal(results.slice(1).every((r) => r.executed === false), true);
  assert.equal(lock.isLocked(), false);
  assert.deepEqual(states, [true, false]);
});

test('createActionLock releases lock cleanly when action throws an error so user can retry', async () => {
  const lock = createActionLock();
  let attempts = 0;

  await assert.rejects(
    () =>
      lock.run(async () => {
        attempts += 1;
        throw new Error('Slow network timeout');
      }),
    /Slow network timeout/
  );

  assert.equal(lock.isLocked(), false);

  const retry = await lock.run(async () => {
    attempts += 1;
    return 'RETRY_OK';
  });

  assert.equal(attempts, 2);
  assert.equal(retry.executed, true);
  assert.equal((retry as { executed: true; value: string }).value, 'RETRY_OK');
});

test('createKeyedActionLock prevents double-clicking Approve/Reject on the same order/withdrawal while isolating other IDs', async () => {
  const lock = createKeyedActionLock();
  const processed: string[] = [];

  const slowApprove = (id: string) =>
    lock.run(id, async () => {
      processed.push(id);
      await new Promise((r) => setTimeout(r, 25));
      return id;
    });

  // Double-click Approve AND Reject on ORD-101 simultaneously, plus click Approve on ORD-102
  const [r1, r2, r3, r4] = await Promise.all([
    slowApprove('ORD-101'),
    slowApprove('ORD-101'),
    slowApprove('ORD-101'),
    slowApprove('ORD-102'),
  ]);

  assert.equal(r1.executed, true);
  assert.equal(r2.executed, false);
  assert.equal(r3.executed, false);
  assert.equal(r4.executed, true);
  assert.deepEqual(processed, ['ORD-101', 'ORD-102']);
  assert.equal(lock.hasAnyLock(), false);
});

test('normalizeTrxId and deterministic Trx doc IDs normalize case, whitespace, and Firestore-unsafe chars', () => {
  assert.equal(normalizeTrxId('  TRX-8293 8472  '), 'trx-82938472');
  assert.equal(normalizeTrxId('trx-82938472'), 'trx-82938472');

  const idA = buildUniqueOrderTrxDocId('  8293 8472 91 ');
  const idB = buildUniqueOrderTrxDocId('8293847291');
  assert.equal(idA, idB);
  assert.equal(idA, 'ORD-TRX-8293847291');

  const slashSafe = buildUniqueOrderTrxDocId('TX/2026.01/ABC');
  assert.equal(slashSafe.includes('/'), false);
  assert.equal(slashSafe.startsWith('ORD-TRX-'), true);

  const medId = buildUniqueMedicalTrxDocId('  MED 9988  ');
  assert.equal(medId, 'MED-TRX-med9988');
  assert.equal(encodeTrxIdForDocId(''), '');
});

test('buildDailyEggCollectDocId generates deterministic daily ID eggCollect_${userId}_${dateKey}', () => {
  const fixedDate = new Date('2026-11-20T09:15:00.000Z');
  assert.equal(buildDailyDateKey(fixedDate), '2026-11-20');
  assert.equal(
    buildDailyEggCollectDocId('USR-ABC-123', fixedDate),
    'eggCollect_USR-ABC-123_2026-11-20'
  );
  // Same user on same day always produces identical doc ID (preventing double credit in transaction)
  const laterSameDay = new Date('2026-11-20T22:45:00.000Z');
  assert.equal(
    buildDailyEggCollectDocId('USR-ABC-123', laterSameDay),
    'eggCollect_USR-ABC-123_2026-11-20'
  );
});
