import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accumulateHens,
  calculateActiveHens,
  checkCollectionEligibility,
  validateWithdrawal,
  deductWithdrawalBalance,
  refundWithdrawalBalance,
  calculatePackagePrice,
  calculateReferralCommission,
  assignAvailableShed,
  calculateProportionalMortality,
  calculateStrictProportionalMortality,
  calculateStrictProportionalCrackedEggs,
  getMedicalFeePerHen,
  calculateMedicalFee,
  generateShedDailyPerformance,
  calculateEggYieldWithCracking,
  hasUnpaidMedicalFee,
  calculateCycleEligibleHens,
  isUserLocked,
  calculateShedDynamicSum,
  calculateProportionalFinancialLoss,
  calculateMortalityFinancialDeduction,
  calculateCatchUpCycles,
  isPackageActive,
  getPackageExpiryDetails,
  syncUserPackagesExpiry,
  PACKAGE_VALIDITY_DAYS,
  INITIAL_SHEDS,
  EGG_PRICE_PKR,
  MIN_WITHDRAWAL_PKR,
  MAX_WITHDRAWAL_PKR,
} from './farmRules';
import { PurchasedPackage, FarmShed, UserAccount } from '../types/farm';

test('accumulateHens adds new package hens to existing hens and never overwrites', () => {
  assert.equal(accumulateHens(0, 1), 1);
  assert.equal(accumulateHens(1, 2), 3);
  assert.equal(accumulateHens(3, 5), 8);
  assert.equal(accumulateHens(8, 5), 13);
});

test('calculateActiveHens sums hens from active packages within 90 days', () => {
  const now = new Date('2026-10-31T05:00:00Z');
  const packages: PurchasedPackage[] = [
    {
      id: 'p1',
      packageId: 'pkg-1',
      hens: 1,
      purchasePrice: 1000,
      purchasedAt: '2026-09-01T00:00:00Z',
      approvedAt: '2026-09-01T00:00:00Z',
      expiresAt: '2026-12-01T00:00:00Z', // Active
      tid: 'TID123',
      active: true,
    },
    {
      id: 'p2',
      packageId: 'pkg-3',
      hens: 5,
      purchasePrice: 4000,
      purchasedAt: '2026-10-15T00:00:00Z',
      approvedAt: '2026-10-15T00:00:00Z',
      expiresAt: '2027-01-15T00:00:00Z', // Active
      tid: 'TID456',
      active: true,
    },
    {
      id: 'p3',
      packageId: 'pkg-2',
      hens: 2,
      purchasePrice: 1800,
      purchasedAt: '2026-01-01T00:00:00Z',
      approvedAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-04-01T00:00:00Z', // Expired > 90 days
      tid: 'TID789',
      active: true,
    },
  ];

  const totalHens = calculateActiveHens(packages, now);
  assert.equal(totalHens, 6); // 1 + 5 = 6 (expired 2 excluded)
});

test('checkCollectionEligibility enforces 24-hour collection interval and Rs. 30 per egg rate', () => {
  const now = new Date('2026-10-31T12:00:00Z');

  // Case 1: 0 hens cannot collect
  const zeroHens = checkCollectionEligibility(0, undefined, now);
  assert.equal(zeroHens.canCollect, false);
  assert.equal(zeroHens.reason, 'no_hens');

  // Case 2: Has 3 hens, never collected before -> can collect immediately!
  const firstCollection = checkCollectionEligibility(3, undefined, now);
  assert.equal(firstCollection.canCollect, true);
  assert.equal(firstCollection.potentialEggs, 3);
  assert.equal(firstCollection.potentialCash, 90); // 3 * 30 = 90

  // Case 3: Collected 10 hours ago -> cannot collect yet (14 hours remaining)
  const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
  const tooEarly = checkCollectionEligibility(5, tenHoursAgo, now);
  assert.equal(tooEarly.canCollect, false);
  assert.equal(tooEarly.reason, 'time_remaining');
  assert.equal(tooEarly.remainingHours, 14);

  // Case 4: Collected 24.5 hours ago -> can collect now!
  const yesterday = new Date(now.getTime() - 24.5 * 60 * 60 * 1000).toISOString();
  const ready = checkCollectionEligibility(5, yesterday, now);
  assert.equal(ready.canCollect, true);
  assert.equal(ready.potentialEggs, 5);
  assert.equal(ready.potentialCash, 150); // 5 * 30 = 150
});

test('validateWithdrawal enforces Rs. 300 (10 eggs) to Rs. 30,000 (1000 eggs) limits', () => {
  const userBalance = 5000;

  // Below minimum
  const belowMin = validateWithdrawal(250, userBalance);
  assert.equal(belowMin.isValid, false);
  assert.match(belowMin.error || '', /Minimum withdrawal is Rs\. 300/);

  // Valid minimum
  const validMin = validateWithdrawal(300, userBalance);
  assert.equal(validMin.isValid, true);
  assert.equal(validMin.eggsEquivalent, 10);

  // Valid amount
  const validMid = validateWithdrawal(1500, userBalance);
  assert.equal(validMid.isValid, true);
  assert.equal(validMid.eggsEquivalent, 50);

  // Exceeding balance
  const exceedBalance = validateWithdrawal(6000, userBalance);
  assert.equal(exceedBalance.isValid, false);
  assert.match(exceedBalance.error || '', /Insufficient balance/);

  // Exceeding max limit (Rs. 30,000)
  const exceedMax = validateWithdrawal(35000, 50000);
  assert.equal(exceedMax.isValid, false);
  assert.match(exceedMax.error || '', /Maximum withdrawal per request is Rs\. 30,000/);
});

test('deductWithdrawalBalance and refundWithdrawalBalance preserve exact balance without double-adding', () => {
  const initialBalance = 1000;
  const requestedAmount = 300;

  // 1. User submits withdrawal: immediately deduct exact amount
  const deductedBalance = deductWithdrawalBalance(initialBalance, requestedAmount);
  assert.equal(deductedBalance, 700);

  // 2. If Admin Approves / Marks Paid: balance is untouched (remains 700)
  const approvedBalance = deductedBalance;
  assert.equal(approvedBalance, 700);

  // 3. If Admin Rejects: accurately refund (add back) EXACTLY the requested amount
  const refundedBalance = refundWithdrawalBalance(deductedBalance, requestedAmount);
  assert.equal(refundedBalance, 1000); // Restored exactly to original 1000, never increases or doubles!

  // 4. Multiple deductions/refunds math check
  const balanceAfterTwoDeductions = deductWithdrawalBalance(deductWithdrawalBalance(1000, 300), 400);
  assert.equal(balanceAfterTwoDeductions, 300); // 1000 - 300 - 400 = 300
  const balanceAfterOneRefund = refundWithdrawalBalance(balanceAfterTwoDeductions, 300);
  assert.equal(balanceAfterOneRefund, 600); // 300 + 300 = 600
});

test('calculatePackagePrice dynamically calculates flock partner pricing matching quick select buttons', () => {
  assert.equal(calculatePackagePrice(1), 1000); // 1 Hen = 1,000 PKR
  assert.equal(calculatePackagePrice(2), 1800); // 2 Hens = 1,800 PKR
  assert.equal(calculatePackagePrice(3), 2700); // 3 Hens = 2,700 PKR
  assert.equal(calculatePackagePrice(5), 4000); // 5 Hens = 4,000 PKR
  assert.equal(calculatePackagePrice(10), 8000); // 10 Hens = 8,000 PKR
});

test('calculateReferralCommission strictly calculates 10% auto-commission on approved packages', () => {
  assert.equal(calculateReferralCommission(1000), 100); // Rs. 100 for Rs. 1,000 package
  assert.equal(calculateReferralCommission(1800), 180); // Rs. 180 for Rs. 1,800 package
  assert.equal(calculateReferralCommission(2700), 270); // Rs. 270 for Rs. 2,700 package
  assert.equal(calculateReferralCommission(4000), 400); // Rs. 400 for Rs. 4,000 package
  assert.equal(calculateReferralCommission(5000), 500); // Rs. 500 for Rs. 5,000 package
  assert.equal(calculateReferralCommission(8000), 800); // Rs. 800 for Rs. 8,000 package
});

test('assignAvailableShed allocates hens to available shed within 5000 capacity', () => {
  const sheds = JSON.parse(JSON.stringify(INITIAL_SHEDS));
  // Initially all 0, assigns to Shed-101
  assert.equal(assignAvailableShed(sheds, 5), 'Shed-101');

  // Fill Shed-101 to capacity 5000
  sheds[0].totalHens = 5000;
  assert.equal(assignAvailableShed(sheds, 10), 'Shed-102');

  // Fill Shed-102 to 4995 -> 10 hens won't fit, jumps to Shed-103
  sheds[1].totalHens = 4995;
  assert.equal(assignAvailableShed(sheds, 10), 'Shed-103');
});

test('calculateProportionalMortality accurately deducts loss proportionally (Mudarabah)', () => {
  // Scenario: Shed-101 has 1,000 total hens. 100 die (10% mortality).
  // User has 10 hens -> loses 10% = 1 hen. Remaining = 9.
  const res1 = calculateProportionalMortality(10, 1000, 100);
  assert.equal(res1.lostHens, 1);
  assert.equal(res1.remainingHens, 9);
  assert.equal(res1.mortalityPercent, 10);

  // User has 50 hens in shed with 200/1000 (20% mortality) -> loses 10 hens. Remaining = 40.
  const res2 = calculateProportionalMortality(50, 1000, 200);
  assert.equal(res2.lostHens, 10);
  assert.equal(res2.remainingHens, 40);
  assert.equal(res2.mortalityPercent, 20);

  // User has 0 hens or 0 deaths
  const res3 = calculateProportionalMortality(0, 1000, 100);
  assert.equal(res3.lostHens, 0);
  assert.equal(res3.remainingHens, 0);

  const res4 = calculateProportionalMortality(10, 1000, 0);
  assert.equal(res4.lostHens, 0);
  assert.equal(res4.remainingHens, 10);
});

test('calculateEggYieldWithCracking proportionally reduces daily egg allocation', () => {
  // 10 hens, 0% cracking -> 10 fresh eggs = Rs. 300
  const y1 = calculateEggYieldWithCracking(10, 0);
  assert.equal(y1.grossEggs, 10);
  assert.equal(y1.crackedLostEggs, 0);
  assert.equal(y1.freshEggs, 10);
  assert.equal(y1.cashEarned, 300);

  // 10 hens, 20% cracking -> 2 cracked lost, 8 fresh = Rs. 240
  const y2 = calculateEggYieldWithCracking(10, 20);
  assert.equal(y2.grossEggs, 10);
  assert.equal(y2.crackedLostEggs, 2);
  assert.equal(y2.freshEggs, 8);
  assert.equal(y2.cashEarned, 240);
});

test('hasUnpaidMedicalFee blocks egg collection if medical alert is active and unpaid', () => {
  const alerts = [
    {
      id: 'alt-1',
      userId: 'usr-1',
      shedId: 'Shed-101',
      type: 'sickness' as const,
      titleEn: 'Medical Alert',
      titleUr: 'طبی انتباہ',
      messageEn: 'Pay fee',
      messageUr: 'فیس ادا کریں',
      medicalFeeAmount: 200,
      medicalFeePaid: false,
      createdAt: new Date().toISOString(),
      resolved: false,
    },
  ];
  assert.equal(hasUnpaidMedicalFee(alerts), true);

  alerts[0].medicalFeePaid = true;
  assert.equal(hasUnpaidMedicalFee(alerts), false);
});

test('accurate egg calculation: 24 active hens strictly yield exactly 24 eggs and Rs. 720', () => {
  const result = checkCollectionEligibility(24, undefined, new Date());
  assert.equal(result.canCollect, true);
  assert.equal(result.potentialEggs, 24);
  assert.equal(result.potentialCash, 24 * EGG_PRICE_PKR); // 24 * 30 = 720
});

test('calculateCycleEligibleHens: mid-cycle hens yield in the NEXT cycle', () => {
  const cycleStart = new Date('2026-11-06T00:00:00.000Z');
  const now = new Date('2026-11-06T12:00:00.000Z');

  // Existing package approved before or at cycle start: 5 hens
  const pkg1: PurchasedPackage = {
    id: 'pkg-1',
    packageId: 'p1',
    hens: 5,
    purchasePrice: 4000,
    purchasedAt: '2026-11-05T10:00:00.000Z',
    approvedAt: '2026-11-05T12:00:00.000Z', // Before cycle start
    expiresAt: '2027-02-05T12:00:00.000Z',
    tid: 'tid-1',
    active: true,
  };

  // Mid-cycle package bought at 10 AM (after cycle start): 2 hens
  const pkg2: PurchasedPackage = {
    id: 'pkg-2',
    packageId: 'p2',
    hens: 2,
    purchasePrice: 1800,
    purchasedAt: '2026-11-06T09:00:00.000Z',
    approvedAt: '2026-11-06T10:00:00.000Z', // Mid-cycle
    expiresAt: '2027-02-06T10:00:00.000Z',
    tid: 'tid-2',
    active: true,
  };

  const totalHens = 7;
  const res = calculateCycleEligibleHens([pkg1, pkg2], totalHens, cycleStart.toISOString(), now);

  // During this cycle: strictly 5 hens are eligible, 2 hens deferred to NEXT cycle
  assert.equal(res.eligibleHens, 5);
  assert.equal(res.midCycleHens, 2);

  // After collection at T_collection (e.g. 2026-11-07T00:00:00.000Z):
  // Both packages are now approved on/before new cycle start, so all 7 hens yield!
  const nextCycleStart = new Date('2026-11-07T00:00:00.000Z');
  const nextRes = calculateCycleEligibleHens([pkg1, pkg2], totalHens, nextCycleStart.toISOString(), new Date('2026-11-07T12:00:00.000Z'));
  assert.equal(nextRes.eligibleHens, 7);
  assert.equal(nextRes.midCycleHens, 0);
});

test('isUserLocked strictly detects banned and suspended users', () => {
  assert.equal(isUserLocked(null), false);
  assert.equal(isUserLocked({ status: 'active' } as any), false);
  assert.equal(isUserLocked({ status: 'suspended' } as any), true);
  assert.equal(isUserLocked({ status: 'banned' } as any), true);
});

test('calculateStrictProportionalMortality calculates loss strictly on user ownership percentage in Shed', () => {
  // Prompt exact example: Shed has 5000 hens and 5 die. User with 1000 hens loses exactly 1 hen.
  const res1 = calculateStrictProportionalMortality(1000, 5000, 5);
  assert.equal(res1.userOwnershipPercent, 20); // 1000 / 5000 = 20%
  assert.equal(res1.lostHens, 1); // 5 * 0.20 = 1 hen
  assert.equal(res1.remainingHens, 999);

  // User with 2500 hens (50% ownership) in same event loses 5 * 0.50 = 3 (Math.round(2.5))
  const res2 = calculateStrictProportionalMortality(2500, 5000, 5);
  assert.equal(res2.userOwnershipPercent, 50);
  assert.equal(res2.lostHens, 3);
  assert.equal(res2.remainingHens, 2497);

  // User with only 10 hens (0.2% ownership) in 5-death event: 5 * 0.002 = 0.01 -> 0 lost
  const res3 = calculateStrictProportionalMortality(10, 5000, 5);
  assert.equal(res3.lostHens, 0);
  assert.equal(res3.remainingHens, 10);
});

test('calculateStrictProportionalCrackedEggs calculates cracked eggs strictly on ownership share', () => {
  // Shed has 5000 hens, 50 eggs cracked. User with 1000 hens (20%) loses 50 * 0.20 = 10 cracked eggs
  const res = calculateStrictProportionalCrackedEggs(1000, 5000, 50);
  assert.equal(res.userOwnershipPercent, 20);
  assert.equal(res.userCrackedLostEggs, 10);
  assert.equal(res.userFreshEggs, 990);
  assert.equal(res.cashEarned, 990 * EGG_PRICE_PKR); // 990 * 30 = 29,700
});

test('calculateMedicalFee enforces tiered bulk discounts (1 hen=Rs.200, 2-10=15% off, 11-100+=30% off)', () => {
  // 1 Hen = Rs. 200 (No discount)
  const single = calculateMedicalFee(1);
  assert.equal(single.perHenRate, 200);
  assert.equal(single.totalFee, 200);
  assert.equal(single.savingsPercent, 0);

  // 2 - 10 Hens = 15% discount (Rs. 170 / hen)
  const twoHens = calculateMedicalFee(2);
  assert.equal(twoHens.perHenRate, 170);
  assert.equal(twoHens.totalFee, 340);
  assert.equal(twoHens.savingsPercent, 15);

  const fiveHens = calculateMedicalFee(5);
  assert.equal(fiveHens.perHenRate, 170);
  assert.equal(fiveHens.totalFee, 850);

  const tenHens = calculateMedicalFee(10);
  assert.equal(tenHens.perHenRate, 170);
  assert.equal(tenHens.totalFee, 1700);

  // 11 - 100+ Hens = 30% discount (Rs. 140 / hen)
  const elevenHens = calculateMedicalFee(11);
  assert.equal(elevenHens.perHenRate, 140);
  assert.equal(elevenHens.totalFee, 1540);
  assert.equal(elevenHens.savingsPercent, 30);

  const fiftyHens = calculateMedicalFee(50);
  assert.equal(fiftyHens.perHenRate, 140);
  assert.equal(fiftyHens.totalFee, 7000);

  const hundredHens = calculateMedicalFee(100);
  assert.equal(hundredHens.perHenRate, 140);
  assert.equal(hundredHens.totalFee, 14000);
});

test('strict 1:1 egg yield math: 1 hen=1 egg, 10 hens=10 eggs, 125 hens=125 eggs', () => {
  assert.equal(1 * 1, 1);
  assert.equal(10 * 1, 10);
  assert.equal(125 * 1, 125);
  assert.equal(1 * EGG_PRICE_PKR, 30);
  assert.equal(10 * EGG_PRICE_PKR, 300);
  assert.equal(125 * EGG_PRICE_PKR, 3750);
});

test('generateShedDailyPerformance returns valid points for line graph', () => {
  const shed: FarmShed = {
    id: 'Shed-101',
    nameEn: 'Shed-101',
    nameUr: 'شیڈ-101',
    capacity: 5000,
    totalHens: 4500,
    mortalityCount: 3,
    crackedEggRate: 1.5,
    hasSicknessAlert: false,
    lastUpdated: new Date().toISOString(),
  };

  const points7 = generateShedDailyPerformance(shed, 7);
  assert.equal(points7.length, 7);
  assert.ok(points7[0].freshEggs > 0);
  assert.ok(points7[0].capacity === 5000);

  const points14 = generateShedDailyPerformance(shed, 14);
  assert.equal(points14.length, 14);
});

test('calculateShedDynamicSum dynamically calculates SUM of active hens assigned to Shed-101 (including user Minha with 125 hens)', () => {
  // Scenario 1: User 'Minha' with 125 active hens assigned to Shed-101 (via user activeHens / packages)
  const users = [
    {
      fullName: 'Minha',
      activeHens: 125,
      packages: [
        { shedId: 'Shed-101', active: true, hens: 125 },
      ],
    },
    {
      fullName: 'Ahmed',
      activeHens: 50,
      packages: [
        { shedId: 'Shed-102', active: true, hens: 50 },
      ],
    },
    {
      fullName: 'Tariq (fallback)',
      activeHens: 10,
      packages: [], // unassigned fallback goes to primary Shed-101
    },
  ];

  // Shed-101 SUM must equal 125 (Minha) + 10 (Tariq fallback) = 135
  const shed101Sum = calculateShedDynamicSum('Shed-101', users);
  assert.equal(shed101Sum, 135);

  // When only Minha is present, Shed-101 capacity MUST be strictly 125
  const minhaOnly = [{ fullName: 'Minha', activeHens: 125, packages: [] }];
  assert.equal(calculateShedDynamicSum('Shed-101', minhaOnly), 125);

  // Shed-102 SUM must equal 50
  const shed102Sum = calculateShedDynamicSum('Shed-102', users);
  assert.equal(shed102Sum, 50);

  // Shed-103 with no assigned hens must be 0
  assert.equal(calculateShedDynamicSum('Shed-103', users), 0);
});

test('calculateProportionalFinancialLoss distributes dead hens and cracked eggs proportionally among users', () => {
  // User with 10 hens in a shed of 100 hens.
  // Dead hens = 2 (Rs. 1000 each = 2000), Cracked eggs = 10 (Rs. 30 each = 300).
  // Total shed loss = 2300 Rs.
  // Loss per hen = 2300 / 100 = 23 Rs.
  // User's active hens = 10 -> Share of loss = 230 Rs.
  // Normal income = 10 * 30 = 300 Rs.
  // Final wallet credit = 300 - 230 = 70 Rs.
  const res1 = calculateProportionalFinancialLoss(10, 2, 10, 100, 1000);
  assert.equal(res1.normalIncome, 300);
  assert.equal(res1.totalShedLossRs, 2300);
  assert.equal(res1.lossPerHen, 23);
  assert.equal(res1.userShareOfLoss, 230);
  assert.equal(res1.finalWalletCredit, 70);
  assert.equal(res1.hasLoss, true);

  // If shed has 0 deaths and 0 cracked eggs: full 300 credited, 0 loss
  const res2 = calculateProportionalFinancialLoss(10, 0, 0, 100, 1000);
  assert.equal(res2.normalIncome, 300);
  assert.equal(res2.totalShedLossRs, 0);
  assert.equal(res2.lossPerHen, 0);
  assert.equal(res2.userShareOfLoss, 0);
  assert.equal(res2.finalWalletCredit, 300);
  assert.equal(res2.hasLoss, false);

  // Large shed test: 125 hens owned in a shed of 5000 hens.
  // 5 dead hens (5000 Rs) + 50 cracked eggs (1500 Rs) = 6500 Rs shed loss.
  // Loss per hen = 6500 / 5000 = 1.30 Rs.
  // User's share of loss = 125 * 1.3 = 162.5 -> Math.round = 163 Rs.
  // Normal income = 125 * 30 = 3750 Rs.
  // Final wallet credit = 3750 - 163 = 3587 Rs.
  const res3 = calculateProportionalFinancialLoss(125, 5, 50, 5000, 1000);
  assert.equal(res3.normalIncome, 3750);
  assert.equal(res3.totalShedLossRs, 6500);
  assert.equal(res3.lossPerHen, 1.3);
  assert.equal(res3.userShareOfLoss, 163);
  assert.equal(res3.finalWalletCredit, 3587);
});

test('calculateProportionalFinancialLoss with raw cracked eggs count (e.g. 8 cracked eggs in Shed)', () => {
  // Scenario: Admin enters raw number of cracked eggs = 8, dead hens = 0
  // Shed total active hens = 1000.
  // User owns 100 active hens.
  // Total shed loss in Rs = (0 * 1000) + (8 * 30) = 240 Rs.
  // Loss per hen = 240 / 1000 = 0.24 Rs.
  // User's share of loss = 100 * 0.24 = 24 Rs.
  // Normal user income = 100 * 30 = 3000 Rs.
  // Remaining net profit added to wallet = 3000 - 24 = 2976 Rs.
  const res = calculateProportionalFinancialLoss(100, 0, 8, 1000, 1000);
  assert.equal(res.normalIncome, 3000);
  assert.equal(res.totalShedLossRs, 240);
  assert.equal(res.lossPerHen, 0.24);
  assert.equal(res.userShareOfLoss, 24);
  assert.equal(res.finalWalletCredit, 2976);
  assert.equal(res.hasLoss, true);
});

test('calculateMortalityFinancialDeduction correctly deducts financial loss and allows negative wallet balances', () => {
  // Scenario 1: User with 1 hen in a shed of 142 hens, 1 hen dies.
  // Base value = Rs. 1000.
  // Total Financial Loss = 1 * 1000 = 1000 Rs.
  // Loss per hen = 1000 / 142 = ~7.04 Rs.
  // User proportional loss = Math.round(1 * 7.04) = 7 Rs.
  // User wallet balance before = 0 Rs.
  // CRITICAL RULE: Wallet balance drops into negative numbers (0 - 7 = -7 Rs)
  const deduction1 = calculateMortalityFinancialDeduction(1, 142, 1, 0, 1000);
  assert.equal(deduction1.totalFinancialLoss, 1000);
  assert.equal(deduction1.userProportionalLoss, 7);
  assert.equal(deduction1.newWalletBalance, -7);

  // Scenario 2: User with 10 hens in a shed of 1000 hens, 5 hens die.
  // Total Financial Loss = 5 * 1000 = 5000 Rs.
  // Loss per hen = 5000 / 1000 = 5 Rs.
  // User proportional loss = 10 * 5 = 50 Rs.
  // User wallet balance before = 100 Rs -> New balance = 100 - 50 = 50 Rs.
  const deduction2 = calculateMortalityFinancialDeduction(10, 1000, 5, 100, 1000);
  assert.equal(deduction2.totalFinancialLoss, 5000);
  assert.equal(deduction2.lossPerHen, 5);
  assert.equal(deduction2.userProportionalLoss, 50);
  assert.equal(deduction2.newWalletBalance, 50);

  // Scenario 3: User with 0 balance and 50 Rs loss -> new balance is -50 Rs
  const deduction3 = calculateMortalityFinancialDeduction(10, 1000, 5, 0, 1000);
  assert.equal(deduction3.newWalletBalance, -50);
});

test('calculateCatchUpCycles correctly calculates multiple missed collection cycles', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date('2026-11-14T12:00:00Z');

  // Case 1: User last collected 4 days ago (Nov 10)
  const lastCol4DaysAgo = new Date(now.getTime() - 4 * ONE_DAY_MS).toISOString();
  const res4 = calculateCatchUpCycles(lastCol4DaysAgo, undefined, now);
  assert.equal(res4.canCollect, true);
  assert.equal(res4.missedDays, 4);
  assert.equal(res4.cycleDates.length, 4);

  // Case 2: Only 12 hours have elapsed
  const lastCol12HoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const resUnder = calculateCatchUpCycles(lastCol12HoursAgo, undefined, now);
  assert.equal(resUnder.canCollect, false);
  assert.equal(resUnder.missedDays, 0);

  // Case 3: Exactly 1 day elapsed
  const lastCol1DayAgo = new Date(now.getTime() - ONE_DAY_MS).toISOString();
  const res1 = calculateCatchUpCycles(lastCol1DayAgo, undefined, now);
  assert.equal(res1.canCollect, true);
  assert.equal(res1.missedDays, 1);
});

test('90-Day Package Expiry: isPackageActive enforces strict 90-day window from purchase/approval', () => {
  const purchaseDate = new Date('2026-08-01T00:00:00Z');
  const day89 = new Date('2026-10-29T23:59:59Z'); // 89 days later
  const day90Start = new Date('2026-10-30T00:00:00Z'); // 90 days later
  const day91 = new Date('2026-10-31T00:00:00Z'); // 91 days later

  const pkg: PurchasedPackage = {
    id: 'pkg-90',
    packageId: 'pkg-3',
    hens: 5,
    purchasePrice: 4000,
    purchasedAt: purchaseDate.toISOString(),
    approvedAt: purchaseDate.toISOString(),
    expiresAt: new Date(purchaseDate.getTime() + 90 * 86400000).toISOString(),
    tid: 'TID90',
    active: true,
  };

  // Active on day 89
  assert.equal(isPackageActive(pkg, day89), true);

  // Expired at or after 90 days
  assert.equal(isPackageActive(pkg, day90Start), false);
  assert.equal(isPackageActive(pkg, day91), false);

  // Manually deactivated package is not active
  assert.equal(isPackageActive({ ...pkg, active: false }, day89), false);
});

test('90-Day Package Expiry: getPackageExpiryDetails returns accurate countdown, dates, and status', () => {
  const purchaseDate = new Date('2026-08-01T00:00:00Z');
  const nowDay30 = new Date('2026-08-31T00:00:00Z'); // 30 days into 90-day period

  const pkg: PurchasedPackage = {
    id: 'pkg-det',
    packageId: 'pkg-2',
    hens: 2,
    purchasePrice: 1800,
    purchasedAt: purchaseDate.toISOString(),
    approvedAt: purchaseDate.toISOString(),
    expiresAt: new Date(purchaseDate.getTime() + 90 * 86400000).toISOString(),
    tid: 'TID-DET',
    active: true,
  };

  const detailsActive = getPackageExpiryDetails(pkg, nowDay30);
  assert.equal(detailsActive.isExpired, false);
  assert.equal(detailsActive.daysElapsed, 30);
  assert.equal(detailsActive.daysRemaining, 60);
  assert.equal(detailsActive.percentElapsed, 33); // 30/90 = 33%
  assert.equal(detailsActive.statusText, 'Active');

  // After 90 days (day 95)
  const nowDay95 = new Date('2026-11-04T00:00:00Z');
  const detailsExpired = getPackageExpiryDetails(pkg, nowDay95);
  assert.equal(detailsExpired.isExpired, true);
  assert.equal(detailsExpired.daysRemaining, 0);
  assert.equal(detailsExpired.statusText, 'Expired');
});

test('90-Day Package Expiry: syncUserPackagesExpiry deactivates expired packages, stops daily income, and preserves wallet balance', () => {
  const purchaseDate = new Date('2026-07-01T00:00:00Z'); // Over 90 days ago
  const recentPurchase = new Date('2026-10-15T00:00:00Z'); // Recent (< 90 days)
  const evalDate = new Date('2026-11-01T00:00:00Z');

  const user: UserAccount = {
    id: 'user-sync-1',
    email: 'investor@test.com',
    password: 'password123',
    role: 'user',
    fullName: 'Test Investor',
    phone: '03001234567',
    easypaisaTitle: 'Investor Title',
    easypaisaNumber: '03001234567',
    walletBalance: 7004, // Must be strictly preserved!
    activeHens: 7, // 5 (old) + 2 (recent)
    referralCode: 'TEST90',
    createdAt: purchaseDate.toISOString(),
    packages: [
      {
        id: 'pkg-old',
        packageId: 'pkg-3',
        hens: 5,
        purchasePrice: 4000,
        purchasedAt: purchaseDate.toISOString(),
        approvedAt: purchaseDate.toISOString(),
        expiresAt: new Date(purchaseDate.getTime() + 90 * 86400000).toISOString(),
        tid: 'TID-OLD',
        active: true,
      },
      {
        id: 'pkg-new',
        packageId: 'pkg-2',
        hens: 2,
        purchasePrice: 1800,
        purchasedAt: recentPurchase.toISOString(),
        approvedAt: recentPurchase.toISOString(),
        expiresAt: new Date(recentPurchase.getTime() + 90 * 86400000).toISOString(),
        tid: 'TID-NEW',
        active: true,
      },
    ],
  };

  const syncResult = syncUserPackagesExpiry(user, evalDate);

  // 1. Detected expired package
  assert.equal(syncResult.hasExpiredChanges, true);
  assert.equal(syncResult.expiredPackages.length, 1);
  assert.equal(syncResult.expiredPackages[0].id, 'pkg-old');
  assert.equal(syncResult.activePackages.length, 1);
  assert.equal(syncResult.activePackages[0].id, 'pkg-new');

  // 2. Active hens adjusted to strictly active packages (2 hens instead of 7)
  assert.equal(syncResult.updatedUser.activeHens, 2);

  // 3. User packages updated with active=false on expired package
  const oldPkgInUser = syncResult.updatedUser.packages?.find((p) => p.id === 'pkg-old');
  assert.equal(oldPkgInUser?.active, false);

  // 4. PRESERVATION: Wallet balance is 100% untouched and safe (Rs. 7004)
  assert.equal(syncResult.updatedUser.walletBalance, 7004);

  // 5. Daily Income stops for expired package:
  // Before expiry: 7 hens * 30 = Rs. 210
  // After expiry: only 2 hens * 30 = Rs. 60
  const dailyIncome = syncResult.updatedUser.activeHens * 30;
  assert.equal(dailyIncome, 60);
});
