/**
 * Pak Hen Farm - Centralized Cloud Database Client API
 * Powered 100% by Firebase Cloud Database with Free-Tier read optimization,
 * short-lived in-memory + sessionStorage caching, in-flight deduplication,
 * intelligent post-write cache invalidation, and quota circuit-breaker protection.
 */

import {
  UserAccount,
  HenOrder,
  WithdrawalRequest,
  EggCollectionRecord,
  SupportTicket,
  GlobalFarmStats,
  FarmShed,
  UserAlert,
  MedicalPaymentOrder,
  PaymentAccount,
  PaymentMethodType,
  PaymentSettings,
  FarmBanner,
  FarmGalleryItem,
  FarmProfileSettings,
} from '../types/farm';
import {
  cloudSignIn,
  cloudRegister,
  cloudResetPassword,
  cloudSubmitOrder,
  cloudApproveOrder,
  cloudRejectOrder,
  cloudRequestWithdrawal,
  cloudMarkWithdrawalPaid,
  cloudRejectWithdrawal,
  cloudCollectEggs,
  cloudGetCollections,
  cloudGetGlobalStats,
  cloudUpdateStats,
  cloudSyncGlobalStatsFromSheds,
  cloudCreateTicket,
  cloudReplyTicket,
  subscribeToOrders,
  subscribeToUsers,
  subscribeToWithdrawals,
  subscribeToGlobalStats,
  subscribeToTickets,
  subscribeToUserDoc,
  subscribeToSheds,
  subscribeToUserAlerts,
  cloudGetSheds,
  cloudGetUserAlerts,
  cloudMarkAlertsAsRead,
  cloudApplyShedMortality,
  cloudUpdateShedCracking,
  cloudUpdateShedDailyLog,
  cloudDeclareShedSickness,
  cloudPayMedicalFee,
  cloudSetUserStatus,
  cloudSubmitMedicalPaymentTid,
  cloudApproveMedicalPayment,
  cloudRejectMedicalPayment,
  cloudSendAdminCustomMessage,
  subscribeToMedicalPayments,
  subscribeToPaymentMethods,
  subscribeToPaymentSettings,
  cloudGetPaymentMethods,
  cloudGetPaymentSettings,
  cloudUpdatePaymentSettings,
  cloudAddPaymentMethod,
  cloudUpdatePaymentMethod,
  cloudDeletePaymentMethod,
  cloudGetUserById,
  cloudUpdateUserProfile,
  subscribeToBanners,
  cloudGetBanners,
  cloudSaveBanners as _cloudSaveBanners,
  cloudUpdateBanner as _cloudUpdateBanner,
  subscribeToGallery,
  cloudGetGallery,
  cloudSaveGallery as _cloudSaveGallery,
  cloudAddGalleryItem as _cloudAddGalleryItem,
  cloudDeleteGalleryItem as _cloudDeleteGalleryItem,
  cloudToggleGalleryItemActive as _cloudToggleGalleryItemActive,
  cloudLikeGalleryItem as _cloudLikeGalleryItem,
  subscribeToFarmProfile,
  cloudGetFarmProfile,
  cloudSaveFarmProfile as _cloudSaveFarmProfile,
  cleanFakeUsers,
  cloudClaimReferralMilestone,
  cloudToggleTicketRead as _cloudToggleTicketRead,
  cloudGetMyReferrals,
  cloudGetUserOrders,
  cloudGetAdminOrders,
  cloudGetUserWithdrawals,
  cloudGetAdminWithdrawals,
  cloudGetAdminUsers,
  cloudGetUserTickets,
  cloudGetAdminTickets,
  cloudGetAdminMedicalPayments,
  INITIAL_PAYMENT_METHODS,
} from './firebase';
import { validateMediaUploadFile } from '../utils/farmRules';
import {
  CACHE_TTL_MS,
  getOrFetchCached,
  setCachedValue,
  invalidateCacheKey,
  invalidateCachePrefix,
  clearAllAppCache,
  classifyFirestoreError,
  getFriendlyErrorMessage,
  isQuotaCooldownActive,
} from '../utils/firestoreCache';

export {
  subscribeToOrders,
  subscribeToUsers,
  subscribeToWithdrawals,
  subscribeToGlobalStats,
  subscribeToTickets,
  subscribeToUserDoc,
  subscribeToSheds,
  subscribeToUserAlerts,
  subscribeToMedicalPayments,
  subscribeToPaymentMethods,
  subscribeToPaymentSettings,
  subscribeToBanners,
  subscribeToGallery,
  subscribeToFarmProfile,
  cleanFakeUsers,
  INITIAL_PAYMENT_METHODS,
  clearAllAppCache,
  classifyFirestoreError,
  getFriendlyErrorMessage,
  isQuotaCooldownActive,
};

// Cache key registry (centralized so invalidation is exact and bug-free)
export const CACHE_KEYS = {
  user: (userId: string) => `user:${userId}`,
  globalStats: 'global:stats',
  sheds: 'global:sheds',
  paymentMethods: 'global:paymentMethods',
  paymentSettings: 'global:paymentSettings',
  banners: 'global:banners',
  gallery: 'global:gallery',
  farmProfile: 'global:farmProfile',
  collections: (userId: string) => `collections:${userId}`,
  alerts: (userId: string) => `alerts:${userId}`,
  userOrders: (userId: string) => `orders:user:${userId}`,
  adminOrders: 'orders:admin',
  userWithdrawals: (userId: string) => `withdrawals:user:${userId}`,
  adminWithdrawals: 'withdrawals:admin',
  referrals: (referralCode: string) => `referrals:${referralCode}`,
  userTickets: (userId: string) => `tickets:user:${userId}`,
  adminTickets: 'tickets:admin',
  adminMedical: 'medical:admin',
  adminUsers: 'users:admin',
} as const;

// ---------------- AUTH ----------------

export async function apiLogin(email: string, password: string): Promise<UserAccount> {
  const user = await cloudSignIn(email, password);
  setCachedValue(CACHE_KEYS.user(user.id), user, CACHE_TTL_MS.userProfile);
  return user;
}

export async function apiRegister(details: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  easypaisaTitle?: string;
  easypaisaNumber?: string;
  referralCode?: string;
}): Promise<UserAccount> {
  const user = await cloudRegister(details);
  setCachedValue(CACHE_KEYS.user(user.id), user, CACHE_TTL_MS.userProfile);
  invalidateCacheKey(CACHE_KEYS.adminUsers);
  if (details.referralCode) {
    invalidateCacheKey(CACHE_KEYS.referrals(details.referralCode.trim().toUpperCase()));
  }
  return user;
}

export async function apiResetPassword(details: {
  email: string;
  phoneOrEasypaisa: string;
  newPassword: string;
}): Promise<UserAccount> {
  const user = await cloudResetPassword(details);
  setCachedValue(CACHE_KEYS.user(user.id), user, CACHE_TTL_MS.userProfile);
  return user;
}

export async function apiSyncUser(user: UserAccount, forceRefresh: boolean = false): Promise<UserAccount> {
  try {
    const fresh = await apiGetUserById(user.id, forceRefresh);
    return fresh || user;
  } catch (e) {
    console.error('Error syncing user with Firestore:', e);
    return user;
  }
}

export async function apiGetUserById(
  userId: string,
  forceRefresh: boolean = false
): Promise<UserAccount | null> {
  return await getOrFetchCached(
    CACHE_KEYS.user(userId),
    () => cloudGetUserById(userId),
    { ttlMs: CACHE_TTL_MS.userProfile, forceRefresh, persist: true }
  );
}

export async function apiUpdateUserProfile(
  userId: string,
  updates: Partial<UserAccount>
): Promise<UserAccount> {
  const updated = await cloudUpdateUserProfile(userId, updates);
  setCachedValue(CACHE_KEYS.user(userId), updated, CACHE_TTL_MS.userProfile);
  invalidateCacheKey(CACHE_KEYS.adminUsers);
  return updated;
}

// ---------------- STATIC / SHARED CONFIG (LONG TTL CACHED) ----------------

export async function apiGetFarmProfile(forceRefresh: boolean = false): Promise<FarmProfileSettings> {
  return await getOrFetchCached(
    CACHE_KEYS.farmProfile,
    () => cloudGetFarmProfile(),
    { ttlMs: CACHE_TTL_MS.farmProfile, forceRefresh, persist: true }
  );
}

export async function cloudSaveFarmProfile(profile: FarmProfileSettings): Promise<void> {
  await _cloudSaveFarmProfile(profile);
  setCachedValue(CACHE_KEYS.farmProfile, profile, CACHE_TTL_MS.farmProfile);
}

export async function apiGetBanners(forceRefresh: boolean = false): Promise<FarmBanner[]> {
  return await getOrFetchCached(
    CACHE_KEYS.banners,
    () => cloudGetBanners(),
    { ttlMs: CACHE_TTL_MS.banners, forceRefresh, persist: true }
  );
}

export async function cloudSaveBanners(banners: FarmBanner[]): Promise<void> {
  await _cloudSaveBanners(banners);
  setCachedValue(CACHE_KEYS.banners, banners, CACHE_TTL_MS.banners);
}

export async function cloudUpdateBanner(banner: FarmBanner): Promise<void> {
  await _cloudUpdateBanner(banner);
  invalidateCacheKey(CACHE_KEYS.banners);
}

export async function apiGetGallery(forceRefresh: boolean = false): Promise<FarmGalleryItem[]> {
  return await getOrFetchCached(
    CACHE_KEYS.gallery,
    () => cloudGetGallery(),
    { ttlMs: CACHE_TTL_MS.gallery, forceRefresh, persist: true }
  );
}

export async function cloudSaveGallery(items: FarmGalleryItem[]): Promise<void> {
  await _cloudSaveGallery(items);
  setCachedValue(CACHE_KEYS.gallery, items, CACHE_TTL_MS.gallery);
}

export async function cloudAddGalleryItem(item: FarmGalleryItem): Promise<void> {
  await _cloudAddGalleryItem(item);
  invalidateCacheKey(CACHE_KEYS.gallery);
}

export async function cloudDeleteGalleryItem(id: string): Promise<void> {
  await _cloudDeleteGalleryItem(id);
  invalidateCacheKey(CACHE_KEYS.gallery);
}

export async function cloudToggleGalleryItemActive(id: string, active: boolean): Promise<void> {
  await _cloudToggleGalleryItemActive(id, active);
  invalidateCacheKey(CACHE_KEYS.gallery);
}

export async function cloudLikeGalleryItem(id: string): Promise<void> {
  await _cloudLikeGalleryItem(id);
  invalidateCacheKey(CACHE_KEYS.gallery);
}

// ---------------- USERS DIRECTORY & REFERRALS ----------------

export async function apiGetAdminUsers(
  limitCount: number = 150,
  forceRefresh: boolean = false
): Promise<UserAccount[]> {
  return await getOrFetchCached(
    CACHE_KEYS.adminUsers,
    () => cloudGetAdminUsers(limitCount),
    { ttlMs: CACHE_TTL_MS.adminUsers, forceRefresh, persist: true }
  );
}

export async function apiGetUsers(_adminUser?: UserAccount, forceRefresh: boolean = false): Promise<UserAccount[]> {
  return await apiGetAdminUsers(150, forceRefresh);
}

export async function apiGetMyReferrals(
  referralCode: string,
  forceRefresh: boolean = false
): Promise<UserAccount[]> {
  if (!referralCode) return [];
  const normalized = referralCode.trim().toUpperCase();
  return await getOrFetchCached(
    CACHE_KEYS.referrals(normalized),
    () => cloudGetMyReferrals(normalized),
    { ttlMs: CACHE_TTL_MS.referrals, forceRefresh, persist: true }
  );
}

export async function apiSetUserStatus(
  adminUser: UserAccount,
  targetUserId: string,
  status: 'active' | 'suspended' | 'banned',
  reason?: string
): Promise<void> {
  await cloudSetUserStatus(adminUser, targetUserId, status, reason);
  invalidateCacheKey(CACHE_KEYS.user(targetUserId));
  invalidateCacheKey(CACHE_KEYS.adminUsers);
}

// ---------------- ORDERS (INDEXED + LIMITED + CACHED) ----------------

export async function apiGetUserOrders(
  userId: string,
  forceRefresh: boolean = false
): Promise<HenOrder[]> {
  return await getOrFetchCached(
    CACHE_KEYS.userOrders(userId),
    () => cloudGetUserOrders(userId, 50),
    { ttlMs: CACHE_TTL_MS.orders, forceRefresh, persist: true }
  );
}

export async function apiGetAdminOrders(
  limitCount: number = 120,
  forceRefresh: boolean = false
): Promise<HenOrder[]> {
  return await getOrFetchCached(
    CACHE_KEYS.adminOrders,
    () => cloudGetAdminOrders(limitCount),
    { ttlMs: CACHE_TTL_MS.orders, forceRefresh, persist: true }
  );
}

export async function apiGetOrders(
  user: UserAccount,
  forceRefresh: boolean = false
): Promise<HenOrder[]> {
  if (user.role === 'admin') {
    return await apiGetAdminOrders(120, forceRefresh);
  }
  return await apiGetUserOrders(user.id, forceRefresh);
}

export async function apiCreateOrder(
  user: UserAccount,
  orderData: {
    packageId: string;
    hensCount: number;
    amount: number;
    senderEasypaisaNumber?: string;
    senderEasypaisaTitle?: string;
    tid: string;
    paymentMethodId?: string;
    paymentMethodTitle?: string;
    proofSlipUrl?: string;
    proofSlipSizeBytes?: number;
  }
): Promise<HenOrder> {
  const created = await cloudSubmitOrder(user, orderData);
  invalidateCacheKey(CACHE_KEYS.userOrders(user.id));
  invalidateCacheKey(CACHE_KEYS.adminOrders);
  return created;
}

export async function apiApproveOrder(
  _adminUser: UserAccount,
  orderId: string,
  adminNote?: string
) {
  const result = await cloudApproveOrder(orderId, adminNote);
  // Invalidate exact affected caches so balances, sheds, and orders stay 100% fresh
  invalidateCacheKey(CACHE_KEYS.adminOrders);
  invalidateCacheKey(CACHE_KEYS.sheds);
  invalidateCacheKey(CACHE_KEYS.globalStats);
  invalidateCacheKey(CACHE_KEYS.adminUsers);
  if (result?.updatedUser?.id) {
    setCachedValue(CACHE_KEYS.user(result.updatedUser.id), result.updatedUser, CACHE_TTL_MS.userProfile);
    invalidateCacheKey(CACHE_KEYS.userOrders(result.updatedUser.id));
    invalidateCacheKey(CACHE_KEYS.alerts(result.updatedUser.id));
  }
  return result;
}

export async function apiRejectOrder(
  _adminUser: UserAccount,
  orderId: string,
  adminNote?: string
): Promise<void> {
  await cloudRejectOrder(orderId, adminNote);
  invalidateCacheKey(CACHE_KEYS.adminOrders);
  invalidateCachePrefix('orders:user:');
}

// ---------------- DYNAMIC PAYMENT METHODS & SETTINGS ----------------

export async function apiGetPaymentMethods(forceRefresh: boolean = false): Promise<PaymentAccount[]> {
  return await getOrFetchCached(
    CACHE_KEYS.paymentMethods,
    () => cloudGetPaymentMethods(),
    { ttlMs: CACHE_TTL_MS.paymentMethods, forceRefresh, persist: true }
  );
}

export async function apiGetPaymentSettings(forceRefresh: boolean = false): Promise<PaymentSettings> {
  return await getOrFetchCached(
    CACHE_KEYS.paymentSettings,
    () => cloudGetPaymentSettings(),
    { ttlMs: CACHE_TTL_MS.paymentSettings, forceRefresh, persist: true }
  );
}

export async function apiAddPaymentMethod(
  _adminUser: UserAccount,
  method: Omit<PaymentAccount, 'id' | 'createdAt'>
): Promise<PaymentAccount> {
  const created = await cloudAddPaymentMethod(method);
  invalidateCacheKey(CACHE_KEYS.paymentMethods);
  return created;
}

export async function apiUpdatePaymentMethod(
  _adminUser: UserAccount,
  id: string,
  updates: Partial<PaymentAccount>
): Promise<void> {
  await cloudUpdatePaymentMethod(id, updates);
  invalidateCacheKey(CACHE_KEYS.paymentMethods);
}

export async function apiDeletePaymentMethod(_adminUser: UserAccount, id: string): Promise<void> {
  await cloudDeletePaymentMethod(id);
  invalidateCacheKey(CACHE_KEYS.paymentMethods);
}

export async function apiUpdatePaymentSettings(
  _adminUser: UserAccount,
  updates: { customGreeting?: string; customGreetingUr?: string }
): Promise<void> {
  await cloudUpdatePaymentSettings(updates);
  invalidateCacheKey(CACHE_KEYS.paymentSettings);
}

// ---------------- WITHDRAWALS ----------------

export async function apiGetUserWithdrawals(
  userId: string,
  forceRefresh: boolean = false
): Promise<WithdrawalRequest[]> {
  return await getOrFetchCached(
    CACHE_KEYS.userWithdrawals(userId),
    () => cloudGetUserWithdrawals(userId, 50),
    { ttlMs: CACHE_TTL_MS.withdrawals, forceRefresh, persist: true }
  );
}

export async function apiGetAdminWithdrawals(
  limitCount: number = 120,
  forceRefresh: boolean = false
): Promise<WithdrawalRequest[]> {
  return await getOrFetchCached(
    CACHE_KEYS.adminWithdrawals,
    () => cloudGetAdminWithdrawals(limitCount),
    { ttlMs: CACHE_TTL_MS.withdrawals, forceRefresh, persist: true }
  );
}

export async function apiGetWithdrawals(
  user: UserAccount,
  forceRefresh: boolean = false
): Promise<WithdrawalRequest[]> {
  if (user.role === 'admin') {
    return await apiGetAdminWithdrawals(120, forceRefresh);
  }
  return await apiGetUserWithdrawals(user.id, forceRefresh);
}

export async function apiCreateWithdrawal(
  user: UserAccount,
  details: {
    amount: number;
    easypaisaNumber: string;
    easypaisaTitle: string;
  }
): Promise<{ withdrawal: WithdrawalRequest; updatedUser: UserAccount }> {
  const result = await cloudRequestWithdrawal(
    user,
    details.amount,
    details.easypaisaNumber,
    details.easypaisaTitle
  );
  setCachedValue(CACHE_KEYS.user(user.id), result.updatedUser, CACHE_TTL_MS.userProfile);
  invalidateCacheKey(CACHE_KEYS.userWithdrawals(user.id));
  invalidateCacheKey(CACHE_KEYS.adminWithdrawals);
  return result;
}

export async function apiMarkWithdrawalPaid(
  _adminUser: UserAccount,
  id: string,
  adminNote?: string
): Promise<void> {
  await cloudMarkWithdrawalPaid(id, adminNote);
  invalidateCacheKey(CACHE_KEYS.adminWithdrawals);
  invalidateCachePrefix('withdrawals:user:');
}

export async function apiRejectWithdrawal(
  _adminUser: UserAccount,
  id: string,
  reason: string
): Promise<void> {
  await cloudRejectWithdrawal(id, reason);
  invalidateCacheKey(CACHE_KEYS.adminWithdrawals);
  invalidateCachePrefix('withdrawals:user:');
  invalidateCacheKey(CACHE_KEYS.adminUsers);
}

// ---------------- EGG COLLECTIONS ----------------

export async function apiGetCollections(
  user: UserAccount,
  forceRefresh: boolean = false
): Promise<EggCollectionRecord[]> {
  return await getOrFetchCached(
    CACHE_KEYS.collections(user.id),
    () => cloudGetCollections(user.id, 60),
    { ttlMs: CACHE_TTL_MS.collections, forceRefresh, persist: true }
  );
}

export async function apiCollectEggs(
  user: UserAccount
): Promise<{
  record: EggCollectionRecord;
  updatedUser: UserAccount;
  missedDays?: number;
  totalProfit?: number;
  records?: EggCollectionRecord[];
}> {
  const result = await cloudCollectEggs(user);
  setCachedValue(CACHE_KEYS.user(user.id), result.updatedUser, CACHE_TTL_MS.userProfile);
  invalidateCacheKey(CACHE_KEYS.collections(user.id));
  invalidateCacheKey(CACHE_KEYS.adminUsers);
  return result;
}

// ---------------- GLOBAL STATS & SHEDS ----------------

export async function apiGetStats(forceRefresh: boolean = false): Promise<GlobalFarmStats> {
  return await getOrFetchCached(
    CACHE_KEYS.globalStats,
    () => cloudGetGlobalStats(),
    { ttlMs: CACHE_TTL_MS.globalStats, forceRefresh, persist: true }
  );
}

export async function apiUpdateStats(
  _adminUser: UserAccount,
  stats: { totalCollected: number; cracked: number; netFresh: number }
): Promise<GlobalFarmStats> {
  const updated = await cloudUpdateStats(stats);
  setCachedValue(CACHE_KEYS.globalStats, updated, CACHE_TTL_MS.globalStats);
  return updated;
}

export async function apiSyncGlobalStatsFromSheds(_adminUser: UserAccount): Promise<GlobalFarmStats> {
  const updated = await cloudSyncGlobalStatsFromSheds();
  setCachedValue(CACHE_KEYS.globalStats, updated, CACHE_TTL_MS.globalStats);
  return updated;
}

export async function cloudSyncGlobalStatsFromShedsWrapper(): Promise<GlobalFarmStats> {
  const updated = await cloudSyncGlobalStatsFromSheds();
  setCachedValue(CACHE_KEYS.globalStats, updated, CACHE_TTL_MS.globalStats);
  return updated;
}
export { cloudSyncGlobalStatsFromShedsWrapper as cloudSyncGlobalStatsFromSheds };

export async function apiGetSheds(forceRefresh: boolean = false): Promise<FarmShed[]> {
  return await getOrFetchCached(
    CACHE_KEYS.sheds,
    () => cloudGetSheds(),
    { ttlMs: CACHE_TTL_MS.sheds, forceRefresh, persist: true }
  );
}

export async function apiApplyShedMortality(
  _adminUser: UserAccount,
  shedId: string,
  deaths: number,
  pricePerHen?: number
): Promise<void> {
  await cloudApplyShedMortality(shedId, deaths, pricePerHen);
  invalidateCacheKey(CACHE_KEYS.sheds);
  invalidateCacheKey(CACHE_KEYS.globalStats);
  invalidateCacheKey(CACHE_KEYS.adminUsers);
}

export async function cloudApplyShedMortalityWrapper(
  shedId: string,
  deaths: number,
  pricePerHen?: number
): Promise<void> {
  await cloudApplyShedMortality(shedId, deaths, pricePerHen);
  invalidateCacheKey(CACHE_KEYS.sheds);
  invalidateCacheKey(CACHE_KEYS.globalStats);
  invalidateCacheKey(CACHE_KEYS.adminUsers);
}
export { cloudApplyShedMortalityWrapper as cloudApplyShedMortality };

export async function apiUpdateShedCracking(
  _adminUser: UserAccount,
  shedId: string,
  crackedEggsCount: number
): Promise<void> {
  await cloudUpdateShedCracking(shedId, crackedEggsCount);
  invalidateCacheKey(CACHE_KEYS.sheds);
  invalidateCacheKey(CACHE_KEYS.globalStats);
}

export async function cloudUpdateShedCrackingWrapper(
  shedId: string,
  crackedEggsCount: number
): Promise<void> {
  await cloudUpdateShedCracking(shedId, crackedEggsCount);
  invalidateCacheKey(CACHE_KEYS.sheds);
  invalidateCacheKey(CACHE_KEYS.globalStats);
}
export { cloudUpdateShedCrackingWrapper as cloudUpdateShedCracking };

export async function apiUpdateShedDailyLog(
  _adminUser: UserAccount,
  shedId: string,
  log: { dailyEggCollection?: number; crackedEggsCount: number }
): Promise<FarmShed> {
  const updated = await cloudUpdateShedDailyLog(shedId, log);
  invalidateCacheKey(CACHE_KEYS.sheds);
  invalidateCacheKey(CACHE_KEYS.globalStats);
  return updated;
}

export async function cloudUpdateShedDailyLogWrapper(
  shedId: string,
  log: { dailyEggCollection?: number; crackedEggsCount: number }
): Promise<FarmShed> {
  const updated = await cloudUpdateShedDailyLog(shedId, log);
  invalidateCacheKey(CACHE_KEYS.sheds);
  invalidateCacheKey(CACHE_KEYS.globalStats);
  return updated;
}
export { cloudUpdateShedDailyLogWrapper as cloudUpdateShedDailyLog };

export async function apiDeclareShedSickness(
  _adminUser: UserAccount,
  shedId: string,
  isSick: boolean
): Promise<void> {
  await cloudDeclareShedSickness(shedId, isSick);
  invalidateCacheKey(CACHE_KEYS.sheds);
}

export async function cloudDeclareShedSicknessWrapper(shedId: string, isSick: boolean): Promise<void> {
  await cloudDeclareShedSickness(shedId, isSick);
  invalidateCacheKey(CACHE_KEYS.sheds);
}
export { cloudDeclareShedSicknessWrapper as cloudDeclareShedSickness };

// ---------------- SUPPORT TICKETS ----------------

export async function apiGetUserTickets(
  userId: string,
  forceRefresh: boolean = false
): Promise<SupportTicket[]> {
  return await getOrFetchCached(
    CACHE_KEYS.userTickets(userId),
    () => cloudGetUserTickets(userId, 50),
    { ttlMs: CACHE_TTL_MS.tickets, forceRefresh, persist: true }
  );
}

export async function apiGetAdminTickets(
  limitCount: number = 100,
  forceRefresh: boolean = false
): Promise<SupportTicket[]> {
  return await getOrFetchCached(
    CACHE_KEYS.adminTickets,
    () => cloudGetAdminTickets(limitCount),
    { ttlMs: CACHE_TTL_MS.tickets, forceRefresh, persist: true }
  );
}

export async function apiGetTickets(
  user: UserAccount,
  forceRefresh: boolean = false
): Promise<SupportTicket[]> {
  if (user.role === 'admin' || user.role === 'staff') {
    return await apiGetAdminTickets(100, forceRefresh);
  }
  return await apiGetUserTickets(user.id, forceRefresh);
}

export async function apiCreateTicket(
  user: UserAccount,
  subject: string,
  message: string
): Promise<SupportTicket> {
  const created = await cloudCreateTicket(user, subject, message);
  invalidateCacheKey(CACHE_KEYS.userTickets(user.id));
  invalidateCacheKey(CACHE_KEYS.adminTickets);
  return created;
}

export async function apiReplyTicket(_staffUser: UserAccount, ticketId: string, reply: string): Promise<void> {
  await cloudReplyTicket(ticketId, reply);
  invalidateCacheKey(CACHE_KEYS.adminTickets);
  invalidateCachePrefix('tickets:user:');
}

export async function cloudToggleTicketRead(ticketId: string, read: boolean): Promise<void> {
  await _cloudToggleTicketRead(ticketId, read);
  invalidateCacheKey(CACHE_KEYS.adminTickets);
}

// ---------------- USER ALERTS ----------------

export async function apiGetUserAlerts(
  userId: string,
  forceRefresh: boolean = false
): Promise<UserAlert[]> {
  return await getOrFetchCached(
    CACHE_KEYS.alerts(userId),
    () => cloudGetUserAlerts(userId, 50),
    { ttlMs: CACHE_TTL_MS.alerts, forceRefresh, persist: true }
  );
}

export async function apiMarkAlertsAsRead(userId: string, alertIds?: string[]): Promise<void> {
  await cloudMarkAlertsAsRead(userId, alertIds);
  invalidateCacheKey(CACHE_KEYS.alerts(userId));
}

// ---------------- MEDICAL FEE & APPROVALS ----------------

export async function apiGetAdminMedicalPayments(
  limitCount: number = 100,
  forceRefresh: boolean = false
): Promise<MedicalPaymentOrder[]> {
  return await getOrFetchCached(
    CACHE_KEYS.adminMedical,
    () => cloudGetAdminMedicalPayments(limitCount),
    { ttlMs: CACHE_TTL_MS.medical, forceRefresh, persist: true }
  );
}

export async function apiPayMedicalFee(user: UserAccount, alertId: string): Promise<UserAccount> {
  const updated = await cloudPayMedicalFee(user, alertId);
  setCachedValue(CACHE_KEYS.user(user.id), updated, CACHE_TTL_MS.userProfile);
  invalidateCacheKey(CACHE_KEYS.alerts(user.id));
  return updated;
}

export async function cloudPayMedicalFeeWrapper(user: UserAccount, alertId: string): Promise<UserAccount> {
  return await apiPayMedicalFee(user, alertId);
}
export { cloudPayMedicalFeeWrapper as cloudPayMedicalFee };

export async function apiSubmitMedicalPaymentTid(params: {
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  shedId: string;
  alertId?: string;
  hensCount: number;
  perHenRate: number;
  amount: number;
  paymentMethod: 'wallet' | PaymentMethodType;
  tid: string;
  senderName?: string;
  senderNumber?: string;
}): Promise<MedicalPaymentOrder> {
  const order = await cloudSubmitMedicalPaymentTid(params);
  invalidateCacheKey(CACHE_KEYS.adminMedical);
  invalidateCacheKey(CACHE_KEYS.alerts(params.userId));
  return order;
}

export { apiSubmitMedicalPaymentTid as cloudSubmitMedicalPaymentTid };

export async function apiApproveMedicalPayment(_adminUser: UserAccount, orderId: string): Promise<void> {
  await cloudApproveMedicalPayment(orderId);
  invalidateCacheKey(CACHE_KEYS.adminMedical);
  invalidateCachePrefix('alerts:');
}

export async function cloudApproveMedicalPaymentWrapper(orderId: string): Promise<void> {
  await cloudApproveMedicalPayment(orderId);
  invalidateCacheKey(CACHE_KEYS.adminMedical);
  invalidateCachePrefix('alerts:');
}
export { cloudApproveMedicalPaymentWrapper as cloudApproveMedicalPayment };

export async function apiRejectMedicalPayment(
  _adminUser: UserAccount,
  orderId: string,
  adminNote?: string
): Promise<void> {
  await cloudRejectMedicalPayment(orderId, adminNote);
  invalidateCacheKey(CACHE_KEYS.adminMedical);
  invalidateCachePrefix('alerts:');
}

export async function cloudRejectMedicalPaymentWrapper(orderId: string, adminNote?: string): Promise<void> {
  await cloudRejectMedicalPayment(orderId, adminNote);
  invalidateCacheKey(CACHE_KEYS.adminMedical);
  invalidateCachePrefix('alerts:');
}
export { cloudRejectMedicalPaymentWrapper as cloudRejectMedicalPayment };

export async function apiSendAdminCustomMessage(
  adminUser: UserAccount,
  params: {
    targetUserId?: string;
    subject: string;
    message: string;
  }
): Promise<{ count: number }> {
  const target = !params.targetUserId || params.targetUserId === 'ALL' ? 'ALL_USERS' : params.targetUserId;
  const count = await cloudSendAdminCustomMessage(adminUser, {
    targetUserId: target,
    subject: params.subject,
    message: params.message,
  });
  invalidateCachePrefix('alerts:');
  return { count };
}

/**
 * Uploads media files (photos, videos) up to 50MB to the backend server storage.
 * Uses direct binary streaming (/api/upload-raw) for native File objects to avoid
 * the ~33% base64 JSON payload expansion and 413 Payload Too Large errors on videos.
 */
export async function apiUploadMedia(
  file: File | { dataUrl: string; fileName: string; fileType?: string; folder?: string },
  folder: string = 'gallery',
  expectedType?: 'photo' | 'video'
): Promise<{ success: boolean; url: string; size: number; fileName: string }> {
  if (file instanceof File) {
    const inferredKind: 'photo' | 'video' | undefined =
      expectedType ||
      (file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('image/')
        ? 'photo'
        : undefined);

    const validation = validateMediaUploadFile(
      { name: file.name, type: file.type, size: file.size },
      inferredKind
    );
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid media file.');
    }

    const response = await fetch('/api/upload-raw', {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-file-name': encodeURIComponent(file.name),
        'x-file-type': file.type || '',
        'x-folder': folder,
      },
      body: file,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || `Upload failed with status ${response.status}`);
    }

    return await response.json();
  }

  const targetFolder = file.folder || folder;
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: file.dataUrl,
      fileName: file.fileName,
      fileType: file.fileType || '',
      folder: targetFolder,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `Upload failed with status ${response.status}`);
  }

  return await response.json();
}

export async function apiClaimReferralMilestone(
  userId: string,
  targetId?: string
): Promise<{ updatedUser: UserAccount; creditedAmount: number; claimedIds: string[] }> {
  const result = await cloudClaimReferralMilestone(userId, targetId);
  setCachedValue(CACHE_KEYS.user(userId), result.updatedUser, CACHE_TTL_MS.userProfile);
  invalidateCacheKey(CACHE_KEYS.adminUsers);
  return result;
}
