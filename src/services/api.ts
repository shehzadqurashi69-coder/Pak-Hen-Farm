/**
 * Pak Hen Farm - Centralized Cloud Database Client API
 * Powered 100% by Firebase Cloud Database for real-time cross-device synchronization.
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
  cloudUpdateStats,
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
  cloudMarkAlertsAsRead,
  cloudApplyShedMortality,
  cloudUpdateShedCracking,
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
  cloudUpdatePaymentSettings,
  cloudAddPaymentMethod,
  cloudUpdatePaymentMethod,
  cloudDeletePaymentMethod,
  cloudGetUserById,
  cloudUpdateUserProfile,
  INITIAL_PAYMENT_METHODS,
  db,
} from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

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
  cloudApplyShedMortality,
  cloudUpdateShedCracking,
  cloudDeclareShedSickness,
  cloudPayMedicalFee,
  cloudSubmitMedicalPaymentTid,
  cloudApproveMedicalPayment,
  cloudRejectMedicalPayment,
  INITIAL_PAYMENT_METHODS,
};

// ---------------- AUTH ----------------

export async function apiLogin(email: string, password: string): Promise<UserAccount> {
  return await cloudSignIn(email, password);
}

export async function apiRegister(details: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  easypaisaTitle: string;
  easypaisaNumber: string;
  referralCode?: string;
}): Promise<UserAccount> {
  return await cloudRegister(details);
}

export async function apiResetPassword(details: {
  email: string;
  phoneOrEasypaisa: string;
  newPassword: string;
}): Promise<UserAccount> {
  return await cloudResetPassword(details);
}

export async function apiSyncUser(user: UserAccount): Promise<UserAccount> {
  try {
    const snap = await getDoc(doc(db, 'users', user.id));
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
  } catch (e) {
    console.error('Error syncing user with Firestore:', e);
  }
  return user;
}

// ---------------- USERS DIRECTORY (ADMIN) ----------------

export async function apiGetUsers(_adminUser?: UserAccount): Promise<UserAccount[]> {
  const snap = await getDocs(collection(db, 'users'));
  const users: UserAccount[] = [];
  snap.forEach((d) => users.push(d.data() as UserAccount));
  users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return users;
}

// ---------------- ORDERS (REQUIREMENT 2: CLOUD SAVING) ----------------

export async function apiGetOrders(user: UserAccount): Promise<HenOrder[]> {
  const snap = await getDocs(collection(db, 'orders'));
  const list: HenOrder[] = [];
  snap.forEach((d) => {
    const o = d.data() as HenOrder;
    if (user.role === 'admin' || o.userId === user.id) {
      list.push(o);
    }
  });
  list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return list;
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
  }
): Promise<HenOrder> {
  return await cloudSubmitOrder(user, orderData);
}

export async function apiApproveOrder(_adminUser: UserAccount, orderId: string, adminNote?: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('Order not found');
  await cloudApproveOrder(snap.data() as HenOrder, adminNote);
}

export async function apiRejectOrder(_adminUser: UserAccount, orderId: string, adminNote?: string): Promise<void> {
  await cloudRejectOrder(orderId, adminNote);
}

// ---------------- DYNAMIC PAYMENT METHODS API ----------------

export async function apiAddPaymentMethod(
  _adminUser: UserAccount,
  method: Omit<PaymentAccount, 'id' | 'createdAt'>
): Promise<PaymentAccount> {
  return await cloudAddPaymentMethod(method);
}

export async function apiUpdatePaymentMethod(
  _adminUser: UserAccount,
  id: string,
  updates: Partial<PaymentAccount>
): Promise<void> {
  await cloudUpdatePaymentMethod(id, updates);
}

export async function apiDeletePaymentMethod(
  _adminUser: UserAccount,
  id: string
): Promise<void> {
  await cloudDeletePaymentMethod(id);
}

// ---------------- WITHDRAWALS ----------------

export async function apiGetWithdrawals(user: UserAccount): Promise<WithdrawalRequest[]> {
  const snap = await getDocs(collection(db, 'withdrawals'));
  const list: WithdrawalRequest[] = [];
  snap.forEach((d) => {
    const w = d.data() as WithdrawalRequest;
    if (user.role === 'admin' || w.userId === user.id) {
      list.push(w);
    }
  });
  list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  return list;
}

export async function apiCreateWithdrawal(
  user: UserAccount,
  details: {
    amount: number;
    easypaisaNumber: string;
    easypaisaTitle: string;
  }
): Promise<{ withdrawal: WithdrawalRequest; updatedUser: UserAccount }> {
  return await cloudRequestWithdrawal(user, details.amount, details.easypaisaNumber, details.easypaisaTitle);
}

export async function apiMarkWithdrawalPaid(_adminUser: UserAccount, id: string, adminNote?: string): Promise<void> {
  await cloudMarkWithdrawalPaid(id, adminNote);
}

export async function apiRejectWithdrawal(_adminUser: UserAccount, id: string, reason: string): Promise<void> {
  await cloudRejectWithdrawal(id, reason);
}

// ---------------- EGG COLLECTIONS ----------------

export async function apiGetCollections(user: UserAccount): Promise<EggCollectionRecord[]> {
  return await cloudGetCollections(user.id);
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
  return await cloudCollectEggs(user);
}

// ---------------- GLOBAL STATS ----------------

export async function apiGetStats(): Promise<GlobalFarmStats> {
  const snap = await getDoc(doc(db, 'stats', 'dailyProduction'));
  if (snap.exists()) {
    return snap.data() as GlobalFarmStats;
  }
  return {
    totalCollected: 0,
    cracked: 0,
    netFresh: 0,
    lastUpdated: new Date().toISOString(),
  };
}

export async function apiUpdateStats(
  _adminUser: UserAccount,
  stats: { totalCollected: number; cracked: number; netFresh: number }
): Promise<GlobalFarmStats> {
  return await cloudUpdateStats(stats);
}

// ---------------- SUPPORT TICKETS ----------------

export async function apiGetTickets(user: UserAccount): Promise<SupportTicket[]> {
  const snap = await getDocs(collection(db, 'tickets'));
  const list: SupportTicket[] = [];
  snap.forEach((d) => {
    const t = d.data() as SupportTicket;
    if (user.role === 'admin' || user.role === 'staff' || t.userId === user.id) {
      list.push(t);
    }
  });
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export async function apiCreateTicket(
  user: UserAccount,
  subject: string,
  message: string
): Promise<SupportTicket> {
  return await cloudCreateTicket(user, subject, message);
}

export async function apiReplyTicket(_staffUser: UserAccount, ticketId: string, reply: string): Promise<void> {
  await cloudReplyTicket(ticketId, reply);
}

// ---------------- LIVE SHEDS & USER ALERTS ----------------

export async function apiApplyShedMortality(
  _adminUser: UserAccount,
  shedId: string,
  deaths: number,
  pricePerHen?: number
): Promise<void> {
  await cloudApplyShedMortality(shedId, deaths, pricePerHen);
}

export async function apiUpdateShedCracking(_adminUser: UserAccount, shedId: string, crackedEggsCount: number): Promise<void> {
  await cloudUpdateShedCracking(shedId, crackedEggsCount);
}

export async function apiUpdatePaymentSettings(_adminUser: UserAccount, updates: { customGreeting?: string; customGreetingUr?: string }): Promise<void> {
  await cloudUpdatePaymentSettings(updates);
}

export async function apiDeclareShedSickness(_adminUser: UserAccount, shedId: string, isSick: boolean): Promise<void> {
  await cloudDeclareShedSickness(shedId, isSick);
}

export async function apiPayMedicalFee(user: UserAccount, alertId: string): Promise<UserAccount> {
  return await cloudPayMedicalFee(user, alertId);
}

export async function apiMarkAlertsAsRead(userId: string, alertIds?: string[]): Promise<void> {
  await cloudMarkAlertsAsRead(userId, alertIds);
}

export async function apiSetUserStatus(
  adminUser: UserAccount,
  targetUserId: string,
  status: 'active' | 'suspended' | 'banned',
  reason?: string
): Promise<void> {
  await cloudSetUserStatus(adminUser, targetUserId, status, reason);
}

// ---------------- MEDICAL FEE & APPROVALS (PHASE 3) ----------------

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
  paymentMethod: 'wallet' | 'jazzcash' | 'usdt';
  tid: string;
  senderName?: string;
  senderNumber?: string;
}): Promise<MedicalPaymentOrder> {
  return await cloudSubmitMedicalPaymentTid(params);
}

export async function apiApproveMedicalPayment(_adminUser: UserAccount, orderId: string): Promise<void> {
  await cloudApproveMedicalPayment(orderId);
}

export async function apiRejectMedicalPayment(_adminUser: UserAccount, orderId: string, adminNote?: string): Promise<void> {
  await cloudRejectMedicalPayment(orderId, adminNote);
}

export async function apiSendAdminCustomMessage(
  adminUser: UserAccount,
  params: {
    targetUserId?: string; // undefined, 'ALL', or 'ALL_USERS'
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
  return { count };
}

export async function apiGetUserById(userId: string): Promise<UserAccount | null> {
  return await cloudGetUserById(userId);
}

export async function apiUpdateUserProfile(
  userId: string,
  updates: Partial<UserAccount>
): Promise<UserAccount> {
  return await cloudUpdateUserProfile(userId, updates);
}

