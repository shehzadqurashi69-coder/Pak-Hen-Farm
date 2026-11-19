/**
 * Pak Hen Farm - Real-time Firebase Cloud Database Integration
 *
 * ======================================================================================
 * FIREBASE CONFIG PLACEHOLDER:
 * You can paste your own Firebase project configuration below.
 * ======================================================================================
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  Unsubscribe,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import {
  UserAccount,
  HenOrder,
  WithdrawalRequest,
  EggCollectionRecord,
  SupportTicket,
  GlobalFarmStats,
  PurchasedPackage,
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
  PACKAGE_VALIDITY_DAYS,
  EGG_PRICE_PKR,
  isAdminEmail,
  OFFICIAL_INFO,
  DEFAULT_BANNERS,
  DEFAULT_GALLERY_ITEMS,
  DEFAULT_FARM_PROFILE,
  calculateReferralCommission,
  deductWithdrawalBalance,
  refundWithdrawalBalance,
  INITIAL_SHEDS,
  assignAvailableShed,
  calculateProportionalMortality,
  calculateStrictProportionalMortality,
  calculateStrictProportionalCrackedEggs,
  calculateMedicalFee,
  getMedicalFeePerHen,
  calculateEggYieldWithCracking,
  hasUnpaidMedicalFee,
  calculateCycleEligibleHens,
  isUserLocked,
  MEDICAL_FEE_PKR,
  HEN_REPLACEMENT_PRICE_PKR,
  calculateProportionalFinancialLoss,
  calculateMortalityFinancialDeduction,
  calculateShedDynamicSum,
  calculateCatchUpCycles,
  syncUserPackagesExpiry,
  isPaymentAccountActive,
  evaluateReferralMilestones,
  getReferralCommissionRateForPackage,
  mergeAllSheds,
  getUserActiveHensByShed,
  calculateMultiShedCollectionYield,
  aggregateGlobalStatsFromSheds,
  getShedCrackedEggsCount,
  isPackageActive,
  validateOrderSubmissionPayload,
  sanitizeFirestorePayload,
  estimateUtf8ByteLength,
  MAX_ORDER_DOC_BYTES,
  computeIncrementalShedAndGlobalStats,
} from '../utils/farmRules';

// --------------------------------------------------------------------------------------
// FIREBASE CONFIG PLACEHOLDER (PASTE YOUR KEYS HERE IF USING YOUR OWN PROJECT)
// --------------------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "AIzaSyC1GqBfC64fGym9eH_81oVWQf1yKcKtEIM",
  authDomain: "parabolic-period-jpz3c.firebaseapp.com",
  projectId: "parabolic-period-jpz3c",
  storageBucket: "parabolic-period-jpz3c.firebasestorage.app",
  messagingSenderId: "526297033042",
  appId: "1:526297033042:web:850ecafa887e21ef7ff28b",
  firestoreDatabaseId: "ai-studio-pakhenfarm-01f84931-77ef-446e-afe0-84aa77a6bbee",
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (targeting configured databaseId if specified, fallback to default)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// ---------------- AUTHENTICATION & USERS ----------------

export async function cloudSignIn(email: string, pass: string): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  // 1. Admin login check
  if (isAdminEmail(cleanEmail) && cleanPass === 'admin123') {
    const adminRef = doc(db, 'users', 'ADMIN-MASTER');
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      const adminData: UserAccount = {
        id: 'ADMIN-MASTER',
        email: cleanEmail,
        password: 'admin123',
        fullName: 'Farm Administrator',
        phone: 'Farm Support',
        easypaisaTitle: 'Official Farm Admin',
        easypaisaNumber: '03000000000',
        role: 'admin',
        walletBalance: 0,
        activeHens: 0,
        referralCode: 'PHF-ADMIN',
        createdAt: new Date().toISOString(),
        packages: [],
      };
      await setDoc(adminRef, adminData);
      return adminData;
    }
    return snap.data() as UserAccount;
  }

  // 2. Staff login check
  if (cleanEmail === OFFICIAL_INFO.staffEmail && cleanPass === 'staff123') {
    const staffRef = doc(db, 'users', 'STAFF-PORTAL');
    const snap = await getDoc(staffRef);
    if (!snap.exists()) {
      const staffData: UserAccount = {
        id: 'STAFF-PORTAL',
        email: cleanEmail,
        password: 'staff123',
        fullName: 'Farm Helpdesk Staff',
        phone: 'Farm Helpdesk',
        easypaisaTitle: 'Farm Staff',
        easypaisaNumber: '03000000000',
        role: 'staff',
        walletBalance: 0,
        activeHens: 0,
        referralCode: 'PHF-STAFF',
        createdAt: new Date().toISOString(),
        packages: [],
      };
      await setDoc(staffRef, staffData);
      return staffData;
    }
    return snap.data() as UserAccount;
  }

  // 3. Regular Member login (bounded to 1 document)
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail), limit(1));
  const querySnap = await getDocs(q);

  if (querySnap.empty) {
    throw new Error('No account found with this email. Please register.');
  }

  const userDoc = querySnap.docs[0];
  const userData = userDoc.data() as UserAccount;

  if (userData.password && userData.password !== cleanPass) {
    throw new Error('Incorrect password. Please try again.');
  }

  return userData;
}

export async function cloudRegister(details: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  easypaisaTitle?: string;
  easypaisaNumber?: string;
  referralCode?: string;
}): Promise<UserAccount> {
  const cleanEmail = details.email.trim().toLowerCase();
  const cleanPhone = details.phone.trim();
  const sanitizePhone = (p: string) => p.replace(/[^0-9]/g, '');
  const digitsPhone = sanitizePhone(cleanPhone);

  const usersRef = collection(db, 'users');

  // 1. Strict Unique Email check in Cloud Firestore (bounded to 1 read)
  const emailQuery = query(usersRef, where('email', '==', cleanEmail), limit(1));
  const emailSnap = await getDocs(emailQuery);
  if (!emailSnap.empty) {
    throw new Error('An account with this email address already exists.');
  }

  // 2. Indexed Unique Phone Number check (2 bounded limit(1) queries — zero full-collection scan)
  const last10 = digitsPhone.length >= 10 ? digitsPhone.slice(-10) : digitsPhone;
  const phoneChecks = [
    getDocs(query(usersRef, where('phone', '==', cleanPhone), limit(1))),
  ];
  if (last10.length >= 10) {
    phoneChecks.push(
      getDocs(query(usersRef, where('phoneNormalized', '==', last10), limit(1)))
    );
  }
  const phoneSnaps = await Promise.all(phoneChecks);
  const duplicatePhone = phoneSnaps.some((s) => !s.empty);

  if (duplicatePhone) {
    throw new Error('An account with this phone number already exists.');
  }

  const userId = 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
  const epTitle = (details.easypaisaTitle || details.fullName || '').trim();
  const epNumber = (details.easypaisaNumber || details.phone || '').trim();

  const newUser: Record<string, any> = {
    id: userId,
    email: cleanEmail,
    password: details.password.trim(),
    fullName: details.fullName.trim(),
    phone: cleanPhone,
    phoneNormalized: last10,
    easypaisaTitle: epTitle,
    easypaisaNumber: epNumber,
    paymentGateway: 'easypaisa',
    paymentAccountTitle: epTitle,
    paymentAccountNumber: epNumber,
    role: 'user',
    walletBalance: 0,
    activeHens: 0,
    referralCode: 'PHF-' + cleanEmail.substring(0, 4).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000),
    createdAt: new Date().toISOString(),
    packages: [],
  };

  if (details.referralCode && details.referralCode.trim()) {
    newUser.referredBy = details.referralCode.trim();
  }

  await setDoc(doc(db, 'users', userId), newUser);
  return newUser as UserAccount;
}

export async function cloudResetPassword(details: {
  email: string;
  phoneOrEasypaisa: string;
  newPassword: string;
}): Promise<UserAccount> {
  const cleanEmail = details.email.trim().toLowerCase();
  const cleanPhone = details.phoneOrEasypaisa.trim();
  const cleanNewPass = details.newPassword.trim();

  if (!cleanEmail || !cleanPhone || !cleanNewPass) {
    throw new Error('Please fill in all verification fields.');
  }

  if (cleanNewPass.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  // Master Admin reset support
  if (isAdminEmail(cleanEmail)) {
    const adminRef = doc(db, 'users', 'ADMIN-MASTER');
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      await updateDoc(adminRef, { password: cleanNewPass });
      return { ...(adminSnap.data() as UserAccount), password: cleanNewPass };
    }
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('No registered account found with this email.');
  }

  const userDoc = snap.docs[0];
  const userData = userDoc.data() as UserAccount;

  // Identity verification: Match either phone or easypaisaNumber (ignoring spaces / dashes) or title
  const sanitize = (s?: string) => (s || '').replace(/[^0-9]/g, '');
  const inputPhoneSanitized = sanitize(cleanPhone);
  const userPhoneSanitized = sanitize(userData.phone);
  const userEpSanitized = sanitize(userData.easypaisaNumber);

  const matches =
    (inputPhoneSanitized && (inputPhoneSanitized === userPhoneSanitized || inputPhoneSanitized === userEpSanitized)) ||
    cleanPhone.toLowerCase() === (userData.easypaisaTitle || '').trim().toLowerCase();

  if (!matches) {
    throw new Error('Verification failed: Provided mobile number does not match this account.');
  }

  const userRef = doc(db, 'users', userDoc.id);
  await updateDoc(userRef, {
    password: cleanNewPass,
  });

  return {
    ...userData,
    password: cleanNewPass,
  };
}

// ---------------- REALTIME LISTENERS (CLOUD FETCHING) ----------------

/**
 * Admin live listener: receives updates whenever any user places an order on ANY device
 */
export function subscribeToOrders(
  role: 'admin' | 'staff' | 'user',
  userId: string,
  callback: (orders: HenOrder[]) => void
): Unsubscribe {
  const ordersRef = collection(db, 'orders');

  // Admin gets all orders across all devices. User gets their own orders.
  const q =
    role === 'admin'
      ? query(ordersRef)
      : query(ordersRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: HenOrder[] = [];
      snapshot.forEach((d) => {
        orders.push(d.data() as HenOrder);
      });
      // Sort newest first
      orders.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      callback(orders);
    },
    (err) => {
      console.error('Firestore orders subscription error:', err);
    }
  );
}

/**
 * Admin live listener: receives updates for all registered users (Users Directory)
 */
export function cleanFakeUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem('pakHenUsers');
    const users: UserAccount[] = raw ? JSON.parse(raw) : [];
    const realUsers = users.filter(
      (user) =>
        user.email &&
        !user.email.toLowerCase().includes('ai-studio-dummy') &&
        !user.email.toLowerCase().includes('dummy') &&
        !user.email.toLowerCase().includes('testmember99@')
    );
    localStorage.setItem('pakHenUsers', JSON.stringify(realUsers));
    return realUsers;
  } catch (e) {
    return [];
  }
}

export function subscribeToUsers(callback: (users: UserAccount[]) => void): Unsubscribe {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const rawUsers: UserAccount[] = [];
      snapshot.forEach((d) => {
        rawUsers.push(d.data() as UserAccount);
      });
      // Requirement 3: Filter out dummy/fake studio users, keeping only real registered ones with valid emails/phones
      const realUsers = rawUsers.filter(
        (u) =>
          u.email &&
          !u.email.toLowerCase().includes('ai-studio-dummy') &&
          !u.email.toLowerCase().includes('dummy') &&
          !u.email.toLowerCase().includes('testmember99@')
      );
      realUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      try {
        localStorage.setItem('pakHenUsers', JSON.stringify(realUsers));
      } catch (e) {}
      callback(realUsers);
    },
    (err) => {
      console.error('Firestore users subscription error:', err);
    }
  );
}

/**
 * Live listener for single user profile updates (e.g. when Admin approves package on laptop)
 */
export function subscribeToUserDoc(userId: string, callback: (user: UserAccount | null) => void): Unsubscribe {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserAccount);
    } else {
      callback(null);
    }
  });
}

export async function cloudGetUserById(userId: string): Promise<UserAccount | null> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as UserAccount;
}

export async function cloudUpdateUserProfile(
  userId: string,
  updates: Partial<UserAccount>
): Promise<UserAccount> {
  const userRef = doc(db, 'users', userId);
  const cleanUpdates: any = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) {
      cleanUpdates[k] = v;
    }
  }
  await updateDoc(userRef, cleanUpdates);
  const updatedSnap = await getDoc(userRef);
  return updatedSnap.data() as UserAccount;
}

/**
 * Live listener for withdrawals
 */
export function subscribeToWithdrawals(
  role: 'admin' | 'staff' | 'user',
  userId: string,
  callback: (withdrawals: WithdrawalRequest[]) => void
): Unsubscribe {
  const withdrawalsRef = collection(db, 'withdrawals');
  const q =
    role === 'admin'
      ? query(withdrawalsRef)
      : query(withdrawalsRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const list: WithdrawalRequest[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as WithdrawalRequest);
    });
    list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    callback(list);
  });
}

/**
 * Live listener for global farm production stats
 */
export function subscribeToGlobalStats(callback: (stats: GlobalFarmStats) => void): Unsubscribe {
  const statsRef = doc(db, 'stats', 'dailyProduction');
  return onSnapshot(statsRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as GlobalFarmStats);
    } else {
      callback({
        totalCollected: 0,
        cracked: 0,
        netFresh: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  });
}

/**
 * Live listener for support tickets
 */
export function subscribeToTickets(
  role: 'admin' | 'staff' | 'user',
  userId: string,
  callback: (tickets: SupportTicket[]) => void
): Unsubscribe {
  const ticketsRef = collection(db, 'tickets');
  const q =
    role === 'admin' || role === 'staff'
      ? query(ticketsRef)
      : query(ticketsRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    let localSOS: any[] = [];
    try {
      const raw = localStorage.getItem('adminSOSInbox');
      if (raw) localSOS = JSON.parse(raw);
    } catch (e) {}

    const list: SupportTicket[] = [];
    snapshot.forEach((d) => {
      const t = d.data() as SupportTicket;
      const localMatch = localSOS.find((item) => item.id === t.id);
      const isRead = typeof t.read === 'boolean' ? t.read : (localMatch ? !!localMatch.read : t.status === 'resolved');
      list.push({ ...t, read: isRead });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  });
}

/**
 * Live listener for a user's invited referrals ('My Referrals' list)
 */
export function subscribeToMyReferrals(
  referralCode: string,
  callback: (referrals: UserAccount[]) => void
): Unsubscribe {
  if (!referralCode || !referralCode.trim()) {
    callback([]);
    return () => {};
  }
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('referredBy', '==', referralCode.trim()));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserAccount[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as UserAccount);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.error('Firestore referrals subscription error:', err);
    }
  );
}

// ---------------- CLOUD SAVING (ORDERS / PACKAGES) ----------------

// ---------------- DYNAMIC PAYMENT METHODS (STRICT ADMIN CONTROL) ----------------

// Strictly empty: zero hardcoded mock accounts or phantom numbers.
// Payment accounts only exist when explicitly created and enabled by Admin.
export const INITIAL_PAYMENT_METHODS: PaymentAccount[] = [];

export function subscribeToPaymentMethods(callback: (methods: PaymentAccount[]) => void): Unsubscribe {
  const pmRef = collection(db, 'paymentMethods');
  return onSnapshot(
    pmRef,
    (snapshot) => {
      try {
        const list: PaymentAccount[] = [];
        snapshot.forEach((d) => {
          // Exclude any non-account docs
          if (d.id !== 'settings' && d.id !== 'customGreeting') {
            const data = d.data() as PaymentAccount;
            if (data.title && data.accountNumber) {
              const normalizedActive = isPaymentAccountActive(data);
              list.push({
                ...data,
                id: data.id || d.id,
                active: normalizedActive,
                isActive: normalizedActive,
                status: normalizedActive ? 'active' : 'disabled',
              });
            }
          }
        });

        list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        callback(list);
      } catch (err) {
        console.warn('subscribeToPaymentMethods warning:', err);
        callback([]);
      }
    },
    (err) => {
      console.warn('subscribeToPaymentMethods error:', err);
      callback([]);
    }
  );
}

export async function cloudAddPaymentMethod(
  method: Omit<PaymentAccount, 'id' | 'createdAt'>
): Promise<PaymentAccount> {
  const pmRef = collection(db, 'paymentMethods');
  const snap = await getDocs(pmRef);
  const accountDocs = snap.docs.filter((d) => d.id !== 'settings' && d.id !== 'customGreeting');
  if (accountDocs.length >= 10) {
    throw new Error('Maximum limit of 10 active payment accounts reached. Please edit or delete an existing method.');
  }

  const id = 'pm-' + Date.now().toString(36) + '-' + Math.floor(100 + Math.random() * 900);
  const cleanData: any = {};
  for (const [key, value] of Object.entries(method)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  const enabledFlag = Boolean(method.active ?? method.isActive ?? (method.status ? method.status === 'active' : true));
  const newAccount: PaymentAccount = {
    ...cleanData,
    id,
    active: enabledFlag,
    isActive: enabledFlag,
    status: enabledFlag ? 'active' : 'disabled',
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'paymentMethods', id), newAccount);
  return newAccount;
}

export async function cloudUpdatePaymentMethod(
  id: string,
  updates: Partial<PaymentAccount>
): Promise<void> {
  const ref = doc(db, 'paymentMethods', id);
  const cleanUpdates: any = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }
  const hasActiveFlag =
    typeof updates.active === 'boolean' ||
    typeof updates.isActive === 'boolean' ||
    typeof updates.status === 'string';
  if (hasActiveFlag) {
    const enabledFlag =
      typeof updates.active === 'boolean'
        ? updates.active
        : typeof updates.isActive === 'boolean'
        ? updates.isActive
        : updates.status === 'active';
    cleanUpdates.active = enabledFlag;
    cleanUpdates.isActive = enabledFlag;
    cleanUpdates.status = enabledFlag ? 'active' : 'disabled';
  }
  await updateDoc(ref, cleanUpdates);
}

export async function cloudDeletePaymentMethod(id: string): Promise<void> {
  const ref = doc(db, 'paymentMethods', id);
  await deleteDoc(ref);
}

export function subscribeToPaymentSettings(callback: (settings: PaymentSettings) => void): Unsubscribe {
  const settingsRef = doc(db, 'paymentSettings', 'global');
  return onSnapshot(
    settingsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as PaymentSettings);
      } else {
        callback({
          customGreeting: 'Thanks for trusting us! We look forward to serving your flock.',
          customGreetingUr: 'ہم پر اعتماد کرنے کا شکریہ! ہم آپ کے فلاک کی دیکھ بھال کے منتظر ہیں۔',
        });
      }
    },
    (err) => {
      console.warn('subscribeToPaymentSettings error:', err);
      callback({
        customGreeting: 'Thanks for trusting us! We look forward to serving your flock.',
        customGreetingUr: 'ہم پر اعتماد کرنے کا شکریہ! ہم آپ کے فلاک کی دیکھ بھال کے منتظر ہیں۔',
      });
    }
  );
}

export async function cloudUpdatePaymentSettings(updates: Partial<PaymentSettings>): Promise<void> {
  const settingsRef = doc(db, 'paymentSettings', 'global');
  await setDoc(settingsRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

export function subscribeToFarmProfile(callback: (profile: FarmProfileSettings) => void): Unsubscribe {
  const profileDocRef = doc(db, 'settings', 'farm_profile');
  return onSnapshot(
    profileDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as FarmProfileSettings;
        callback({
          ...DEFAULT_FARM_PROFILE,
          ...data,
        });
      } else {
        const localName = localStorage.getItem('adminFarmName') || DEFAULT_FARM_PROFILE.farmName;
        const localBio = localStorage.getItem('adminBio') || DEFAULT_FARM_PROFILE.farmBio;
        const localLocation = localStorage.getItem('adminLocation') !== null ? (localStorage.getItem('adminLocation') || '') : DEFAULT_FARM_PROFILE.location;
        const localHelpline = localStorage.getItem('adminHelpline') || DEFAULT_FARM_PROFILE.helpline;
        const localAvatar = localStorage.getItem('adminAvatar') || DEFAULT_FARM_PROFILE.avatar;
        const localCover = localStorage.getItem('adminCover') || DEFAULT_FARM_PROFILE.coverUrl;
        callback({
          farmName: localName,
          farmBio: localBio,
          location: localLocation,
          helpline: localHelpline,
          avatar: localAvatar,
          coverUrl: localCover,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    (err) => {
      console.warn('subscribeToFarmProfile fallback:', err);
      callback(DEFAULT_FARM_PROFILE);
    }
  );
}

export async function cloudSaveFarmProfile(profile: FarmProfileSettings): Promise<void> {
  const profileDocRef = doc(db, 'settings', 'farm_profile');
  const sanitized = JSON.parse(JSON.stringify(profile));
  await setDoc(profileDocRef, sanitized, { merge: true });
  try {
    localStorage.setItem('adminFarmName', profile.farmName);
    localStorage.setItem('adminBio', profile.farmBio);
    localStorage.setItem('adminLocation', profile.location);
    localStorage.setItem('adminHelpline', profile.helpline);
    localStorage.setItem('adminAvatar', profile.avatar);
    if (profile.coverUrl) localStorage.setItem('adminCover', profile.coverUrl);
  } catch {
    // ignore
  }
}

// ---------------- CLOUD SAVING (ORDERS / PACKAGES) ----------------

/**
 * Pushes checkout deposit order directly to Firebase database
 */
export async function cloudSubmitOrder(
  user: UserAccount,
  orderData: {
    packageId: string;
    hensCount: number;
    amount: number;
    senderEasypaisaNumber?: string;
    senderEasypaisaTitle?: string;
    tid: string; // Transaction Hash / TxID
    paymentMethodId?: string;
    paymentMethodTitle?: string;
    proofSlipUrl?: string; // Server URL (/uploads/slips/...) or size-capped compressed JPEG data URL
    proofSlipSizeBytes?: number;
  }
): Promise<HenOrder> {
  if (isUserLocked(user)) {
    throw new Error('Your account is currently suspended or banned. Purchasing packages is disabled.');
  }

  const hensCount = Math.floor(Number(orderData.hensCount) || 0);
  const amount = Math.round(Number(orderData.amount) || 0);
  const cleanTid = (orderData.tid || '').trim();

  // Validate package quantity, exact price, TrxID, and slip payload bounds for ALL package sizes (1 hen to 100+ hens)
  const validation = validateOrderSubmissionPayload({
    hensCount,
    amount,
    tid: cleanTid,
    proofSlipUrl: orderData.proofSlipUrl,
  });
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid package order details.');
  }

  const lowerTid = validation.normalizedTid;

  // Targeted O(1) duplicate TID checks (zero full-collection scans on orders or medicalPayments)
  const [dupNormSnap, dupExactSnap, dupMedSnap] = await Promise.all([
    getDocs(query(collection(db, 'orders'), where('tidNormalized', '==', lowerTid), limit(1))),
    getDocs(query(collection(db, 'orders'), where('tid', '==', cleanTid), limit(1))),
    getDocs(query(collection(db, 'medicalPayments'), where('tid', '==', cleanTid), limit(1))),
  ]);

  if (!dupNormSnap.empty || !dupExactSnap.empty) {
    throw new Error(
      'This Transaction ID (TxID) has already been processed or submitted. Each transaction ID can only be used once.'
    );
  }

  if (!dupMedSnap.empty) {
    throw new Error('This Transaction ID (TxID) has already been submitted for a medical fee payment.');
  }

  const orderId =
    'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
  const newOrder: HenOrder = {
    id: orderId,
    userId: user.id,
    userName: user.fullName || 'Investor',
    userEmail: user.email || '',
    userPhone: user.phone || '',
    packageId: orderData.packageId || `partner-flock-${hensCount}-hens`,
    hensCount,
    amount,
    senderEasypaisaNumber: (orderData.senderEasypaisaNumber || user.phone || '').trim(),
    senderEasypaisaTitle: (orderData.senderEasypaisaTitle || user.fullName || '').trim(),
    tid: cleanTid,
    tidNormalized: lowerTid,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    paymentMethodId: orderData.paymentMethodId || '',
    paymentMethodTitle: orderData.paymentMethodTitle || '',
    proofSlipUrl: (orderData.proofSlipUrl || '').trim(),
    proofSlipSizeBytes: orderData.proofSlipSizeBytes || validation.proofSlipBytes,
  };

  // Strip any undefined fields so Firestore setDoc never rejects optional keys
  const sanitizedOrder = sanitizeFirestorePayload(newOrder);
  const payloadBytes = estimateUtf8ByteLength(JSON.stringify(sanitizedOrder));
  if (payloadBytes > MAX_ORDER_DOC_BYTES) {
    throw new Error(
      'Payment slip payload exceeds database document size limit. Please upload a smaller or cropped screenshot.'
    );
  }

  try {
    await setDoc(doc(db, 'orders', orderId), sanitizedOrder);
  } catch (err: any) {
    console.error('Firestore cloudSubmitOrder setDoc failed:', err);
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      throw new Error(
        'Database daily quota limit reached. Please retry shortly or contact Farm Support with your TrxID.'
      );
    }
    throw new Error(
      err?.message?.includes('longer than') || err?.code === 'invalid-argument'
        ? 'Payment slip image was too large for database storage. Please upload a clearer or cropped screenshot.'
        : err?.message || 'Failed to save package order to server. Please check your connection and try again.'
    );
  }

  return newOrder;
}

export interface OrderApprovalSummary {
  orderId: string;
  assignedShedId: string;
  hensCount: number;
  amount: number;
  updatedUser?: UserAccount;
}

/**
 * Optimized Admin Order Approval:
 * Reads and updates ONLY the specific order, buyer user, and assigned shed records needed
 * (plus incremental stats/dailyProduction) without scanning the full `users` or `orders` collections.
 */
export async function cloudApproveOrder(
  orderOrId: string | HenOrder,
  adminNote?: string
): Promise<OrderApprovalSummary> {
  const orderId = typeof orderOrId === 'string' ? orderOrId : orderOrId.id;
  if (!orderId) {
    throw new Error('Invalid order ID.');
  }

  // 1. Read ONLY the specific order document (1 read)
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error('Order not found in database.');
  }
  const currentOrder = orderSnap.data() as HenOrder;
  if (currentOrder.status !== 'pending') {
    throw new Error(`This order is already ${currentOrder.status}.`);
  }

  const cleanTid = (currentOrder.tid || '').trim();
  const userRef = doc(db, 'users', currentOrder.userId);

  // 2. Targeted reads only: duplicate-approved TID check (limit 1), specific buyer user doc (1 read),
  //    and the 5 fixed shed docs (Shed-101..Shed-105) by direct document ID (zero collection scans!)
  const [approvedTidSnap, userSnap, ...shedDocSnaps] = await Promise.all([
    cleanTid
      ? getDocs(
          query(
            collection(db, 'orders'),
            where('tid', '==', cleanTid),
            where('status', '==', 'approved'),
            limit(1)
          )
        )
      : Promise.resolve(null),
    getDoc(userRef),
    ...INITIAL_SHEDS.map((s) => getDoc(doc(db, 'sheds', s.id))),
  ]);

  if (approvedTidSnap && !approvedTidSnap.empty) {
    throw new Error(
      `Transaction ID "${cleanTid}" has already been approved for another package. Double approval blocked.`
    );
  }

  const rawSheds: FarmShed[] = [];
  shedDocSnaps.forEach((snap) => {
    if (snap.exists()) {
      rawSheds.push(snap.data() as FarmShed);
    }
  });
  const currentSheds = mergeAllSheds(rawSheds);

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + PACKAGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const assignedShedId = assignAvailableShed(currentSheds, currentOrder.hensCount);

  // Compute incremental updates for ONLY the assigned shed and global stats in memory (no full users scan!)
  const { updatedShed, updatedGlobalStats } = computeIncrementalShedAndGlobalStats(
    currentSheds,
    assignedShedId,
    currentOrder.hensCount,
    nowIso
  );

  const newPkg: PurchasedPackage = {
    id: 'PKG-' + Date.now(),
    packageId: currentOrder.packageId,
    hens: currentOrder.hensCount,
    purchasePrice: currentOrder.amount,
    purchasedAt: currentOrder.submittedAt,
    approvedAt: nowIso,
    expiresAt,
    tid: currentOrder.tid,
    active: true,
    shedId: assignedShedId,
  };

  let inviterReferralCode: string | undefined;
  let updatedBuyerUser: UserAccount | undefined;

  // 3. Commit ONLY the specific order, buyer user, assigned shed, and global stats atomically via writeBatch
  const batch = writeBatch(db);

  batch.update(orderRef, {
    status: 'approved',
    reviewedAt: nowIso,
    adminNote: adminNote || 'Verified and approved on cloud',
    shedId: assignedShedId,
  });

  if (userSnap.exists()) {
    const currentBuyer = userSnap.data() as UserAccount;
    const currentHens = Number(currentBuyer.activeHens) || 0;
    const existingPackages = Array.isArray(currentBuyer.packages) ? currentBuyer.packages : [];
    const nextPackages = [...existingPackages, newPkg];
    const nextHens = currentHens + currentOrder.hensCount;
    inviterReferralCode = currentBuyer.referredBy;
    updatedBuyerUser = {
      ...currentBuyer,
      activeHens: nextHens,
      packages: nextPackages,
    };

    batch.update(userRef, {
      activeHens: nextHens,
      packages: nextPackages,
    });
  }

  batch.set(
    doc(db, 'sheds', assignedShedId),
    sanitizeFirestorePayload(updatedShed),
    { merge: true }
  );

  batch.set(
    doc(db, 'stats', 'dailyProduction'),
    sanitizeFirestorePayload(updatedGlobalStats),
    { merge: true }
  );

  await batch.commit();

  // 4. Direct Referral Commission (10% base, or 15% when Target C/D unlocked) & Milestone Target Bonus:
  //    Only executes when buyer was referred, using scoped equality queries (no full collection scan).
  if (inviterReferralCode && inviterReferralCode.trim()) {
    try {
      const cleanRefCode = inviterReferralCode.trim();
      const usersRef = collection(db, 'users');
      const inviterSnap = await getDocs(
        query(usersRef, where('referralCode', '==', cleanRefCode), limit(1))
      );

      if (!inviterSnap.empty) {
        const inviterDoc = inviterSnap.docs[0];
        const inviterRef = doc(db, 'users', inviterDoc.id);
        const inviterData = inviterDoc.data() as UserAccount;
        const prevClaimed = Array.isArray(inviterData.claimedMilestoneTargets)
          ? inviterData.claimedMilestoneTargets
          : [];

        const commissionRate = getReferralCommissionRateForPackage(
          currentOrder.amount,
          currentOrder.hensCount,
          prevClaimed
        );
        const commissionAmount = calculateReferralCommission(currentOrder.amount, commissionRate);

        const refsSnap = await getDocs(query(usersRef, where('referredBy', '==', cleanRefCode)));
        const allReferrals: UserAccount[] = [];
        refsSnap.forEach((d) => {
          allReferrals.push(d.data() as UserAccount);
        });

        const milestoneEval = evaluateReferralMilestones(allReferrals, prevClaimed);
        const newTargetIds = milestoneEval.newlyUnlockedTargets.map((t) => t.id);
        const milestoneBonus = milestoneEval.pendingBonusTotal;
        const totalCredit = commissionAmount + milestoneBonus;

        if (totalCredit > 0 || newTargetIds.length > 0) {
          const currentWallet = Number(inviterData.walletBalance) || 0;
          const prevBonusEarned = Number(inviterData.milestoneBonusesEarned) || 0;
          await updateDoc(inviterRef, {
            walletBalance: currentWallet + totalCredit,
            claimedMilestoneTargets: Array.from(new Set([...prevClaimed, ...newTargetIds])),
            milestoneBonusesEarned: prevBonusEarned + milestoneBonus,
          });
        }

        if (milestoneEval.newlyUnlockedTargets.length > 0) {
          const unlockedNames = milestoneEval.newlyUnlockedTargets
            .map((t) => t.titleEn)
            .join(', ');
          const alertId = `ALT-MS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          await setDoc(doc(db, 'alerts', alertId), {
            id: alertId,
            userId: inviterDoc.id,
            shedId: 'Referral Program',
            type: 'admin_message',
            titleEn: `Milestone Target Unlocked (+Rs. ${milestoneBonus.toLocaleString()})`,
            titleUr: `ریفرل ہدف مکمل (+${milestoneBonus.toLocaleString()} روپے بونس)`,
            messageEn: `Congratulations! You achieved ${unlockedNames}. An extra Rs. ${milestoneBonus.toLocaleString()} milestone reward has been credited directly to your wallet.`,
            messageUr: `مبارک ہو! آپ نے ریفرل ہدف مکمل کر لیا ہے اور ${milestoneBonus.toLocaleString()} روپے اضافی بونس آپ کے والٹ میں شامل کر دیا گیا ہے۔`,
            senderHeader: 'From: Pak Hen Farm',
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      }
    } catch (commErr) {
      console.error('Failed to credit referral commission/milestone bonus:', commErr);
    }
  }

  return {
    orderId,
    assignedShedId,
    hensCount: currentOrder.hensCount,
    amount: currentOrder.amount,
    updatedUser: updatedBuyerUser,
  };
}

/**
 * Safely claims any reached-but-unclaimed Milestone Target bonuses (Target A/B/C/D)
 * inside a Firestore transaction to prevent double-crediting.
 */
export async function cloudClaimReferralMilestone(
  userId: string,
  targetId?: string
): Promise<{ updatedUser: UserAccount; creditedAmount: number; claimedIds: string[] }> {
  const userRef = doc(db, 'users', userId);
  const userSnapInitial = await getDoc(userRef);
  if (!userSnapInitial.exists()) {
    throw new Error('User account not found.');
  }
  const userInitial = userSnapInitial.data() as UserAccount;

  const usersRef = collection(db, 'users');
  const refsQuery = query(usersRef, where('referredBy', '==', userInitial.referralCode));
  const refsSnap = await getDocs(refsQuery);
  const allReferrals: UserAccount[] = [];
  refsSnap.forEach((d) => allReferrals.push(d.data() as UserAccount));

  let creditedAmount = 0;
  let claimedIds: string[] = [];

  const updatedUser = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('User account not found.');
    const freshUser = snap.data() as UserAccount;
    const prevClaimed = Array.isArray(freshUser.claimedMilestoneTargets)
      ? freshUser.claimedMilestoneTargets
      : [];

    const evalRes = evaluateReferralMilestones(allReferrals, prevClaimed);
    const eligibleTargets = targetId
      ? evalRes.newlyUnlockedTargets.filter((t) => t.id === targetId)
      : evalRes.newlyUnlockedTargets;

    if (eligibleTargets.length === 0) {
      creditedAmount = 0;
      claimedIds = [];
      return freshUser;
    }

    creditedAmount = eligibleTargets.reduce((sum, t) => sum + t.bonusAmountPkr, 0);
    claimedIds = eligibleTargets.map((t) => t.id);
    const nextClaimed = Array.from(new Set([...prevClaimed, ...claimedIds]));
    const nextBalance = (Number(freshUser.walletBalance) || 0) + creditedAmount;
    const nextBonusesEarned = (Number(freshUser.milestoneBonusesEarned) || 0) + creditedAmount;

    tx.update(userRef, {
      walletBalance: nextBalance,
      claimedMilestoneTargets: nextClaimed,
      milestoneBonusesEarned: nextBonusesEarned,
    });

    return {
      ...freshUser,
      walletBalance: nextBalance,
      claimedMilestoneTargets: nextClaimed,
      milestoneBonusesEarned: nextBonusesEarned,
    };
  });

  return { updatedUser, creditedAmount, claimedIds };
}

/**
 * Admin rejects order in cloud
 */
export async function cloudRejectOrder(orderId: string, adminNote?: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    adminNote: adminNote || 'Payment not verified',
  });
}

// ---------------- CLOUD WITHDRAWALS ----------------

export async function cloudRequestWithdrawal(
  user: UserAccount,
  amount: number,
  easypaisaNumber: string,
  easypaisaTitle: string
): Promise<{ withdrawal: WithdrawalRequest; updatedUser: UserAccount }> {
  if (amount < 300) throw new Error('Minimum withdrawal is Rs. 300');
  if (amount > 30000) throw new Error('Maximum withdrawal is Rs. 30,000');

  const userRef = doc(db, 'users', user.id);
  const wId = 'WDR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
  const wRef = doc(db, 'withdrawals', wId);

  const cleanNum = easypaisaNumber.trim();
  const cleanTitle = easypaisaTitle.trim();
  const nowStr = new Date().toISOString();

  let createdWithdrawal: WithdrawalRequest | null = null;
  let finalUpdatedUser: UserAccount | null = null;

  // Atomic transaction to ensure authoritative Firestore balance deduction
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error('User account not found');
    }

    const userData = userDoc.data() as UserAccount;
    if (isUserLocked(userData)) {
      throw new Error(`Your account is ${userData.status || 'suspended'}. Withdrawals are locked. Please contact Admin.`);
    }
    const currentBalance = Number(userData.walletBalance) || 0;

    if (amount > currentBalance) {
      throw new Error(`Insufficient wallet balance. Available: Rs. ${currentBalance}`);
    }

    // Immediately deduct the exact requested amount from active wallet balance
    const newBalance = deductWithdrawalBalance(currentBalance, amount);

    transaction.update(userRef, {
      walletBalance: newBalance,
    });

    const withdrawal: WithdrawalRequest = {
      id: wId,
      userId: user.id,
      userName: userData.fullName || user.fullName,
      userEmail: userData.email || user.email,
      amount: amount,
      eggsEquivalent: Math.floor(amount / EGG_PRICE_PKR),
      easypaisaNumber: cleanNum,
      easypaisaTitle: cleanTitle,
      status: 'pending',
      requestedAt: nowStr,
    };

    transaction.set(wRef, withdrawal);

    createdWithdrawal = withdrawal;
    finalUpdatedUser = {
      ...userData,
      walletBalance: newBalance,
    };
  });

  if (!createdWithdrawal || !finalUpdatedUser) {
    throw new Error('Failed to process withdrawal transaction');
  }

  return { withdrawal: createdWithdrawal, updatedUser: finalUpdatedUser };
}

/**
 * If Admin 'Approves/Marks Paid', do nothing to the user's balance
 * (since it was already deducted upon request).
 */
export async function cloudMarkWithdrawalPaid(id: string, adminNote?: string): Promise<void> {
  const wRef = doc(db, 'withdrawals', id);

  await runTransaction(db, async (transaction) => {
    const wDoc = await transaction.get(wRef);
    if (!wDoc.exists()) throw new Error('Withdrawal not found');
    const wData = wDoc.data() as WithdrawalRequest;

    if (wData.status !== 'pending') {
      throw new Error(`Withdrawal is already ${wData.status}`);
    }

    // Do nothing to the user's balance since it was already deducted
    transaction.update(wRef, {
      status: 'paid',
      processedAt: new Date().toISOString(),
      adminNote: adminNote || 'Paid via Easypaisa',
    });
  });
}

/**
 * If Admin 'Rejects' the request, accurately REFUND (Add back) EXACTLY the requested amount
 * to the user's wallet balance. Ensure the math strictly prevents double-adding.
 */
export async function cloudRejectWithdrawal(wId: string, reason: string): Promise<void> {
  const wRef = doc(db, 'withdrawals', wId);

  await runTransaction(db, async (transaction) => {
    const wDoc = await transaction.get(wRef);
    if (!wDoc.exists()) throw new Error('Withdrawal not found');
    const wData = wDoc.data() as WithdrawalRequest;

    // Strict idempotency: only pending requests can be rejected and refunded
    if (wData.status !== 'pending') {
      throw new Error(`Withdrawal is already ${wData.status}. Cannot refund again.`);
    }

    const userRef = doc(db, 'users', wData.userId);
    const userDoc = await transaction.get(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserAccount;
      const currentBalance = Number(userData.walletBalance) || 0;
      // Accurately refund EXACTLY the requested amount (strictly prevents double-adding)
      const newBalance = refundWithdrawalBalance(currentBalance, wData.amount);

      transaction.update(userRef, {
        walletBalance: newBalance,
      });
    }

    // Mark as rejected inside the same atomic transaction
    transaction.update(wRef, {
      status: 'rejected',
      processedAt: new Date().toISOString(),
      adminNote: reason || 'Rejected by Admin',
    });
  });
}

// ---------------- CLOUD EGG COLLECTIONS ----------------

export async function cloudCollectEggs(user: UserAccount): Promise<{ record: EggCollectionRecord; updatedUser: UserAccount }> {
  // 1. Fetch fresh user doc from database to get exact Active Hens at collection time
  const userRef = doc(db, 'users', user.id);
  const userSnap = await getDoc(userRef);
  const currentUser = userSnap.exists() ? (userSnap.data() as UserAccount) : user;

  // Strict User Management Check: Banned/Suspended accounts cannot collect eggs
  if (isUserLocked(currentUser)) {
    throw new Error(`Your account is ${currentUser.status || 'suspended'}. Egg collection is locked. Please contact Admin.`);
  }

  const now = new Date();

  // 90-Day Automatic Package Expiry Verification & Auto-Sync:
  // Re-verify package validity and update any expired packages in cloud database
  const { updatedUser: userWithSyncedExpiry, hasExpiredChanges } = syncUserPackagesExpiry(currentUser, now);
  if (hasExpiredChanges) {
    try {
      await updateDoc(userRef, {
        activeHens: userWithSyncedExpiry.activeHens,
        packages: userWithSyncedExpiry.packages,
      });
    } catch {
      // Non-blocking in case of test/mock mode
    }
  }

  const exactActiveHens = Number(userWithSyncedExpiry.activeHens) || 0;
  if (exactActiveHens <= 0) {
    throw new Error('All packages have completed their 90-day validity window and are expired. Daily egg production has stopped. Please renew or buy a new package to resume.');
  }

  // 2. Check if user has any unpaid medical fees (bounded to 30 alerts)
  const alertsSnap = await getDocs(query(collection(db, 'alerts'), where('userId', '==', user.id), limit(30)));
  const userAlerts: UserAlert[] = [];
  alertsSnap.forEach((d) => userAlerts.push(d.data() as UserAlert));
  if (hasUnpaidMedicalFee(userAlerts)) {
    throw new Error('Daily profit is paused due to an unpaid medical fee. Please pay the Rs. 200 medical charges on your dashboard to resume.');
  }

  const catchUp = calculateCatchUpCycles(currentUser.lastEggCollectionAt, currentUser.createdAt, now);
  if (!catchUp.canCollect) {
    throw new Error('24 hours have not elapsed since your last collection');
  }

  const missedDays = Math.max(1, catchUp.missedDays);
  const cycleDates = catchUp.cycleDates.length > 0 ? catchUp.cycleDates : [now];

  // 3. Strict 1:1 Egg Yield Math & Multi-Shed Proportional Financial Loss Calculation:
  // Read ONLY the specific shed docs where this user holds active hens (typically 1 doc read!).
  let mergedSheds: FarmShed[] = INITIAL_SHEDS;
  try {
    const userShedMap = getUserActiveHensByShed(userWithSyncedExpiry, now);
    const activeShedIds = Object.keys(userShedMap).filter((sid) => (userShedMap[sid] || 0) > 0);
    const idsToRead = activeShedIds.length > 0 ? activeShedIds : ['Shed-101'];
    const shedSnaps = await Promise.all(idsToRead.map((sid) => getDoc(doc(db, 'sheds', sid))));
    const rawSheds: FarmShed[] = [];
    shedSnaps.forEach((d) => {
      if (d.exists()) rawSheds.push(d.data() as FarmShed);
    });
    mergedSheds = mergeAllSheds(rawSheds);
  } catch (shedErr) {
    console.warn('Could not read sheds data for multi-shed proportional loss calculation:', shedErr);
  }

  const lossCalc = calculateMultiShedCollectionYield(userWithSyncedExpiry, mergedSheds, now);
  const eggs = exactActiveHens;
  const finalCreditPerDay = lossCalc.finalWalletCredit;
  const totalProfitAdded = finalCreditPerDay * missedDays;
  const allRecords: EggCollectionRecord[] = [];

  // Generate individual collection records sequentially for all missed days
  for (let i = 0; i < cycleDates.length; i++) {
    const d = cycleDates[i];
    const recId = 'EGG-' + d.getTime() + '-' + Math.floor(100 + Math.random() * 900);
    const record: EggCollectionRecord = {
      id: recId,
      userId: user.id,
      timestamp: d.toISOString(),
      date: d.toISOString().split('T')[0],
      hensCount: exactActiveHens,
      eggsCollected: eggs, // Strict 1:1 visual yield
      cashEarned: finalCreditPerDay,
      crackedDeduction: lossCalc.userShareOfLoss,
      crackedEggsLost: lossCalc.totalCrackedEggsLost,
      normalIncome: lossCalc.normalIncome,
      shedLossDeduction: lossCalc.userShareOfLoss,
      finalCredit: finalCreditPerDay,
      totalShedLossRs: lossCalc.totalShedLossRs,
      lossPerHen: lossCalc.lossPerHen,
      shedDeadHens: lossCalc.totalShedDeadHens,
      shedCrackedEggs: lossCalc.totalShedCrackedEggs,
      shedBreakdown: lossCalc.perShedBreakdown,
    };
    await setDoc(doc(db, 'collections', recId), record);
    allRecords.push(record);
  }

  const latestRecord = allRecords[allRecords.length - 1];
  const newBalance = (Number(currentUser.walletBalance) || 0) + totalProfitAdded;

  // Lock button for exactly 24 hours post-collection
  await updateDoc(userRef, {
    walletBalance: newBalance,
    lastEggCollectionAt: now.toISOString(),
  });

  const updatedUser: UserAccount = {
    ...userWithSyncedExpiry,
    walletBalance: newBalance,
    lastEggCollectionAt: now.toISOString(),
  };

  return {
    record: latestRecord,
    updatedUser,
    missedDays,
    totalProfit: totalProfitAdded,
    records: allRecords,
  } as any;
}

/**
 * Admin User Management: Ban, Suspend, or Restore user status.
 * Banned/Suspended users can log in and view the app, but 'Collect Eggs' and 'Withdraw' buttons are locked.
 */
export async function cloudSetUserStatus(
  adminUser: UserAccount,
  targetUserId: string,
  status: 'active' | 'suspended' | 'banned',
  reason?: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can update user status.');
  }
  const userRef = doc(db, 'users', targetUserId);
  await setDoc(
    userRef,
    {
      status,
      statusReason: reason || '',
      statusUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function cloudGetCollections(userId: string, limitCount = 60): Promise<EggCollectionRecord[]> {
  const colsRef = collection(db, 'collections');
  const q = query(colsRef, where('userId', '==', userId), limit(limitCount));
  const snap = await getDocs(q);
  const records: EggCollectionRecord[] = [];
  snap.forEach((d) => records.push(d.data() as EggCollectionRecord));
  records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return records;
}

// ---------------- CLOUD GLOBAL STATS ----------------

export async function cloudUpdateStats(stats: { totalCollected: number; cracked: number; netFresh: number }): Promise<GlobalFarmStats> {
  const statsRef = doc(db, 'stats', 'dailyProduction');
  const data: GlobalFarmStats = {
    ...stats,
    lastUpdated: new Date().toISOString(),
  };
  await setDoc(statsRef, data, { merge: true });
  return data;
}

/**
 * Aggregates live production, flock sizes (25,000 capacity), cracked eggs, net fresh eggs,
 * and mortality across ONLY the 5 fixed shed documents (Shed-101 to Shed-105) — 5 reads total,
 * zero full users-collection scan — and persists to stats/dailyProduction.
 */
export async function cloudSyncGlobalStatsFromSheds(): Promise<GlobalFarmStats> {
  const mergedSheds = await cloudGetSheds();
  const aggregated = aggregateGlobalStatsFromSheds(mergedSheds);
  await setDoc(doc(db, 'stats', 'dailyProduction'), aggregated, { merge: true });
  return aggregated;
}

// ---------------- CLOUD SUPPORT TICKETS ----------------

export async function cloudCreateTicket(
  user: UserAccount,
  subject: string,
  message: string
): Promise<SupportTicket> {
  const ticketId = 'SOS-' + Date.now().toString(36).toUpperCase();
  const ticket: SupportTicket = {
    id: ticketId,
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    userPhone: user.phone,
    subject: subject.trim(),
    message: message.trim(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'tickets', ticketId), ticket);
  return ticket;
}

export async function cloudReplyTicket(ticketId: string, reply: string): Promise<void> {
  const tRef = doc(db, 'tickets', ticketId);
  await updateDoc(tRef, {
    staffReply: reply.trim(),
    repliedAt: new Date().toISOString(),
    status: 'resolved',
    read: true,
  });

  try {
    const raw = localStorage.getItem('adminSOSInbox');
    let sosList: any[] = raw ? JSON.parse(raw) : [];
    const idx = sosList.findIndex((item) => item.id === ticketId);
    if (idx >= 0) {
      sosList[idx].read = true;
    } else {
      sosList.push({ id: ticketId, read: true });
    }
    localStorage.setItem('adminSOSInbox', JSON.stringify(sosList));
  } catch (e) {}
}

export async function cloudToggleTicketRead(ticketId: string, read: boolean): Promise<void> {
  const tRef = doc(db, 'tickets', ticketId);
  try {
    await updateDoc(tRef, {
      read,
    });
  } catch (e) {
    console.warn('Could not update Firestore ticket read status:', e);
  }

  // Requirement 2: SOS Notification Read/Unread Toggle Logic with localStorage adminSOSInbox
  try {
    const raw = localStorage.getItem('adminSOSInbox');
    let sosList: any[] = raw ? JSON.parse(raw) : [];
    const idx = sosList.findIndex((item) => item.id === ticketId);
    if (idx >= 0) {
      sosList[idx].read = read;
    } else {
      sosList.push({ id: ticketId, read });
    }
    localStorage.setItem('adminSOSInbox', JSON.stringify(sosList));
  } catch (e) {}
}

// ---------------- LIVE SHED MANAGEMENT & USER ALERTS ----------------

export function subscribeToSheds(callback: (sheds: FarmShed[]) => void): Unsubscribe {
  const shedsRef = collection(db, 'sheds');
  // Lightweight listener with ZERO users-collection scan and ZERO write-back loop.
  return onSnapshot(
    shedsRef,
    (snap) => {
      try {
        const rawSheds: FarmShed[] = [];
        snap.forEach((d) => rawSheds.push(d.data() as FarmShed));
        callback(mergeAllSheds(rawSheds));
      } catch (err) {
        console.warn('subscribeToSheds merge warning:', err);
        callback(INITIAL_SHEDS);
      }
    },
    (err) => {
      console.warn('subscribeToSheds snapshot error, using fallback:', err);
      callback(INITIAL_SHEDS);
    }
  );
}

export function subscribeToUserAlerts(userId: string, callback: (alerts: UserAlert[]) => void): Unsubscribe {
  const alertsRef = collection(db, 'alerts');
  const q = query(alertsRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const alerts: UserAlert[] = [];
      snap.forEach((d) => alerts.push(d.data() as UserAlert));
      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(alerts);
    },
    (err) => {
      console.warn('subscribeToUserAlerts error:', err);
      callback([]);
    }
  );
}

export async function cloudMarkAlertsAsRead(userId: string, alertIds?: string[]): Promise<void> {
  try {
    const alertsRef = collection(db, 'alerts');
    const q = query(alertsRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach((d) => {
      const alert = d.data() as UserAlert;
      if (!alert.read && (!alertIds || alertIds.length === 0 || alertIds.includes(alert.id))) {
        batch.update(d.ref, { read: true, readAt: new Date().toISOString() });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('cloudMarkAlertsAsRead error:', err);
  }
}

export async function cloudApplyShedMortality(
  shedId: string,
  deaths: number,
  pricePerHen: number = HEN_REPLACEMENT_PRICE_PKR
): Promise<void> {
  if (deaths <= 0) throw new Error('Mortality count must be greater than 0');

  const shedRef = doc(db, 'sheds', shedId);
  const shedSnap = await getDoc(shedRef);
  let shedData: FarmShed;
  if (!shedSnap.exists()) {
    const defaultShed = INITIAL_SHEDS.find((s) => s.id === shedId) || INITIAL_SHEDS[0];
    await setDoc(shedRef, defaultShed);
    shedData = defaultShed;
  } else {
    shedData = shedSnap.data() as FarmShed;
  }

  const now = new Date();

  // 1. Fetch all users to calculate dynamic sum of 90-day-active hens in THIS shed strictly
  const usersSnap = await getDocs(collection(db, 'users'));
  const allUsers: UserAccount[] = [];
  usersSnap.forEach((d) => allUsers.push(d.data() as UserAccount));

  const shedLiveHens = calculateShedDynamicSum(shedId, allUsers, now);
  const currentTotal = Math.max(shedLiveHens, shedData.totalHens || 0);
  if (currentTotal <= 0) {
    throw new Error(`Shed ${shedId} currently has 0 active hens.`);
  }

  // 2. Base value for 1 Hen: fixed constant Rs. 1000 (HEN_REPLACEMENT_PRICE_PKR) or Admin-specified
  const henPrice = Math.max(1, Number(pricePerHen) || HEN_REPLACEMENT_PRICE_PKR);

  // 3. Calculate Total Financial Loss: (Number of Dead Hens entered by Admin * Price per Hen)
  const totalFinancialLoss = deaths * henPrice;

  // 4. Calculate Loss Per Hen: (Total Financial Loss / Total Active Hens in THIS Shed)
  const lossPerHen = totalFinancialLoss / currentTotal;

  // 5. Batch-commit each investor's proportional loss strictly from their active hens in THIS shed
  let batch = writeBatch(db);
  let batchOps = 0;
  const commitBatchIfNeeded = async (force = false) => {
    if ((force && batchOps > 0) || batchOps >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchOps = 0;
    }
  };

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data() as UserAccount;
    const hensByShed = getUserActiveHensByShed(userData, now);
    const userHensInShed = hensByShed[shedId] || 0;

    if (userHensInShed > 0) {
      const userProportionalLoss = Math.round(userHensInShed * lossPerHen);

      if (userProportionalLoss > 0) {
        // Deduct proportional financial loss directly from wallet (allowing negative due balance).
        // CRITICAL MUDARABAH RULE: Do NOT deduct from user's Active Hens count.
        const currentBalance = Number(userData.walletBalance) || 0;
        const newWalletBalance = currentBalance - userProportionalLoss;

        batch.update(userDoc.ref, {
          walletBalance: newWalletBalance,
        });
        batchOps += 1;

        const alertId = 'ALERT-MORT-' + shedId + '-' + userData.id + '-' + Date.now();
        const alertDoc: UserAlert = {
          id: alertId,
          userId: userData.id,
          type: 'mortality',
          shedId: shedId,
          titleEn: 'Natural Flock Mortality Financial Loss',
          titleUr: 'قدرتی اموات مالی نقصان الرٹ',
          messageEn: `Alert: Natural mortality in ${shedId} (${deaths} hens across ${currentTotal.toLocaleString()} hens). Based on your ${userHensInShed.toLocaleString()} active hens in ${shedId}, a proportional financial loss of Rs. ${userProportionalLoss.toLocaleString()} has been deducted from your wallet balance.`,
          messageUr: `انتباہ: ${shedId} میں قدرتی شرح اموات (${deaths} مرغیاں)۔ ${shedId} میں آپ کی ${userHensInShed.toLocaleString()} فعال مرغیوں کے تناسب سے ${userProportionalLoss.toLocaleString()} روپے کا مالی نقصان آپ کے والٹ بیلنس سے منہا کر دیا گیا ہے۔`,
          title: 'Natural Flock Mortality Financial Loss',
          titleUrdu: 'قدرتی اموات مالی نقصان الرٹ',
          message: `Alert: Natural mortality in ${shedId}. A proportional financial loss of Rs. ${userProportionalLoss.toLocaleString()} has been deducted from your wallet balance to maintain Mudarabah partnership.`,
          messageUrdu: `انتباہ: ${shedId} میں قدرتی شرح اموات۔ مضاربہ شراکت داری کے تحت آپ کے والٹ بیلنس سے ${userProportionalLoss.toLocaleString()} روپے کا متناسب مالی نقصان منہا کر دیا گیا ہے۔`,
          financialLossDeducted: userProportionalLoss,
          amountDeducted: userProportionalLoss,
          percentageLoss: Math.round((deaths / currentTotal) * 1000) / 10,
          createdAt: now.toISOString(),
          read: false,
        };
        batch.set(doc(db, 'alerts', alertId), alertDoc);
        batchOps += 1;
        await commitBatchIfNeeded(false);
      }
    }
  }
  await commitBatchIfNeeded(true);

  // Update ONLY this shed doc: record daily and cumulative mortality count, keeping flock active
  await setDoc(
    shedRef,
    {
      ...shedData,
      totalHens: currentTotal,
      dailyMortalityCount: deaths,
      mortalityCount: (shedData.mortalityCount || 0) + deaths,
      lastUpdated: now.toISOString(),
    },
    { merge: true }
  );

  try {
    await cloudSyncGlobalStatsFromSheds();
  } catch (statsErr) {
    console.warn('Syncing global stats after mortality warning:', statsErr);
  }
}

/**
 * Updates daily egg collection and cracked/damaged eggs count for a single shed (Shed-101 to Shed-105)
 * independently (1 shed read, 0 users scan!), computes netFreshEggs and crackedEggRate,
 * and syncs Global Farm Production Stats across the 5 shed docs.
 */
export async function cloudUpdateShedDailyLog(
  shedId: string,
  log: { dailyEggCollection?: number; crackedEggsCount: number }
): Promise<FarmShed> {
  const shedRef = doc(db, 'sheds', shedId);
  const shedSnap = await getDoc(shedRef);
  let baseShed = INITIAL_SHEDS.find((s) => s.id === shedId) || { ...INITIAL_SHEDS[0], id: shedId };
  if (shedSnap.exists()) {
    baseShed = { ...baseShed, ...(shedSnap.data() as FarmShed) };
  }

  // Use the incrementally maintained active hen count on this shed doc (0 users-collection scans)
  const now = new Date();
  const shedHens = Math.max(0, Number(baseShed.totalHens) || 0);

  const cleanCracked = Math.max(0, Math.floor(Number(log.crackedEggsCount) || 0));
  const cleanDailyCollection =
    log.dailyEggCollection !== undefined && !isNaN(Number(log.dailyEggCollection))
      ? Math.max(0, Math.floor(Number(log.dailyEggCollection)))
      : typeof baseShed.dailyEggCollection === 'number'
      ? Math.max(0, baseShed.dailyEggCollection)
      : shedHens;
  const netFresh = Math.max(0, cleanDailyCollection - cleanCracked);
  const calculatedRate = shedHens > 0 ? Math.round((cleanCracked / shedHens) * 1000) / 10 : 0;

  const updatedShed: FarmShed = {
    ...baseShed,
    totalHens: shedHens,
    dailyEggCollection: cleanDailyCollection,
    crackedEggsCount: cleanCracked,
    netFreshEggs: netFresh,
    crackedEggRate: calculatedRate,
    lastUpdated: now.toISOString(),
  };

  await setDoc(shedRef, updatedShed, { merge: true });

  // Sync Global Farm Daily Production across all 5 sheds (Shed-101..Shed-105)
  try {
    await cloudSyncGlobalStatsFromSheds();
  } catch (statsErr) {
    console.warn('Syncing global stats from sheds warning:', statsErr);
  }

  return updatedShed;
}

export async function cloudUpdateShedCracking(shedId: string, crackedEggsCount: number): Promise<void> {
  await cloudUpdateShedDailyLog(shedId, { crackedEggsCount });
}

export async function cloudDeclareShedSickness(shedId: string, isSick: boolean): Promise<void> {
  const shedRef = doc(db, 'sheds', shedId);
  const shedSnap = await getDoc(shedRef);
  if (!shedSnap.exists()) {
    const defaultShed = INITIAL_SHEDS.find((s) => s.id === shedId) || INITIAL_SHEDS[0];
    await setDoc(shedRef, defaultShed);
  }

  const now = new Date();
  await updateDoc(shedRef, {
    hasSicknessAlert: isSick,
    lastUpdated: now.toISOString(),
  });

  if (isSick) {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const uDoc of usersSnap.docs) {
      const u = uDoc.data() as UserAccount;
      const userHensInShed = (u.packages || []).reduce((acc, p) => {
        const pShed = p.shedId || 'Shed-101';
        return pShed === shedId && p.active && p.hens > 0 ? acc + p.hens : acc;
      }, 0);

      if (userHensInShed > 0) {
        const existingAlerts = await getDocs(
          query(
            collection(db, 'alerts'),
            where('userId', '==', u.id),
            where('shedId', '==', shedId),
            where('type', '==', 'sickness'),
            where('resolved', '==', false)
          )
        );

        if (existingAlerts.empty) {
          const feeCalc = calculateMedicalFee(userHensInShed);
          const alertId = 'ALERT-SICK-' + shedId + '-' + u.id + '-' + Date.now();
          const alertDoc: UserAlert = {
            id: alertId,
            userId: u.id,
            type: 'sickness',
            shedId: shedId,
            titleEn: 'Urgent Medical Care Required',
            titleUr: 'فوری طبی نگہداشت کی ضرورت',
            messageEn: `Alert: Hens in ${shedId} require urgent medical care. Your flock: ${userHensInShed} hens @ Rs. ${feeCalc.perHenRate}/hen (${feeCalc.tierLabel}). Total Medical Fee: Rs. ${feeCalc.totalFee.toLocaleString()}.`,
            messageUr: `انتباہ: ${shedId} میں مرغیوں کو فوری طبی امداد کی ضرورت ہے۔ آپ کا فلاک: ${userHensInShed} مرغیاں (${feeCalc.perHenRate} روپے فی مرغی)۔ کل میڈیکل فیس: ${feeCalc.totalFee.toLocaleString()} روپے۔`,
            title: 'Urgent Medical Care Required',
            titleUrdu: 'فوری طبی نگہداشت کی ضرورت',
            message: `Alert: Hens in ${shedId} require urgent medical care. Please pay Rs. ${feeCalc.totalFee.toLocaleString()} medical charges.`,
            messageUrdu: `انتباہ: ${shedId} میں مرغیوں کو فوری طبی امداد کی ضرورت ہے۔ براہ کرم ${feeCalc.totalFee.toLocaleString()} روپے میڈیکل فیس ادا کریں۔`,
            medicalFeeAmount: feeCalc.totalFee,
            medicalFeeRequired: feeCalc.totalFee,
            perHenRate: feeCalc.perHenRate,
            hensCount: userHensInShed,
            tierLabel: feeCalc.tierLabel,
            tierLabelUrdu: feeCalc.tierLabelUrdu,
            medicalFeePaid: false,
            resolved: false,
            createdAt: now.toISOString(),
            read: false,
          };
          await setDoc(doc(db, 'alerts', alertId), alertDoc);
        }
      }
    }
  } else {
    const alertsSnap = await getDocs(
      query(collection(db, 'alerts'), where('shedId', '==', shedId), where('type', '==', 'sickness'))
    );
    for (const aDoc of alertsSnap.docs) {
      await updateDoc(aDoc.ref, {
        resolved: true,
      });
    }
  }
}

export async function cloudPayMedicalFee(user: UserAccount, alertId: string): Promise<UserAccount> {
  const alertRef = doc(db, 'alerts', alertId);
  const alertSnap = await getDoc(alertRef);
  if (!alertSnap.exists()) throw new Error('Alert not found');

  const alertData = alertSnap.data() as UserAlert;
  if (alertData.medicalFeePaid) {
    throw new Error('Medical fee is already paid for this alert.');
  }

  const fee = alertData.medicalFeeRequired || alertData.medicalFeeAmount || MEDICAL_FEE_PKR;
  if (user.walletBalance < fee) {
    throw new Error(`Insufficient wallet balance (Rs. ${user.walletBalance.toLocaleString()}). Required: Rs. ${fee.toLocaleString()}. Please pay via JazzCash/USDT or earn from eggs first.`);
  }

  const userRef = doc(db, 'users', user.id);
  const newBalance = user.walletBalance - fee;
  const now = new Date().toISOString();

  await updateDoc(userRef, {
    walletBalance: newBalance,
  });

  await updateDoc(alertRef, {
    medicalFeePaid: true,
    resolved: true,
    paidAt: now,
    paymentMethod: 'wallet',
    paymentPendingVerification: false,
  });

  return {
    ...user,
    walletBalance: newBalance,
  };
}

/**
 * Submits an off-chain medical payment TID (JazzCash or USDT TRC20) when user wallet balance is low.
 */
export async function cloudSubmitMedicalPaymentTid(params: {
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
  const cleanTid = params.tid.trim();
  if (!cleanTid) throw new Error('Transaction ID is required');
  const lowerTid = cleanTid.toLowerCase();

  // Indexed uniqueness check on medical payment TID (2 bounded limit(1) queries — zero collection scan)
  const [medNormSnap, medExactSnap] = await Promise.all([
    getDocs(query(collection(db, 'medicalPayments'), where('tidNormalized', '==', lowerTid), limit(1))),
    getDocs(query(collection(db, 'medicalPayments'), where('tid', '==', cleanTid), limit(1))),
  ]);
  const isDuplicateMed = !medNormSnap.empty || !medExactSnap.empty;

  if (isDuplicateMed) {
    throw new Error('This Transaction ID (TID) has already been submitted for medical verification.');
  }

  const id = 'MED-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const now = new Date().toISOString();

  const order: MedicalPaymentOrder = {
    id,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    userPhone: params.userPhone,
    shedId: params.shedId,
    alertId: params.alertId,
    hensCount: params.hensCount,
    perHenRate: params.perHenRate,
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    tid: cleanTid,
    senderName: params.senderName || '',
    senderNumber: params.senderNumber || '',
    status: 'pending',
    submittedAt: now,
  };

  await setDoc(doc(db, 'medicalPayments', id), { ...order, tidNormalized: lowerTid });

  // Update alert status with pending TID flag
  if (params.alertId) {
    const alertRef = doc(db, 'alerts', params.alertId);
    await updateDoc(alertRef, {
      paymentPendingVerification: true,
      pendingTid: cleanTid,
      paymentMethod: params.paymentMethod,
    });
  }

  return order;
}

/**
 * Admin: Approves a Medical Payment Order.
 * CRITICAL BUSINESS RULE:
 * Approving this TID ONLY unlocks the user's account/timer and MUST NOT add new hens.
 */
export async function cloudApproveMedicalPayment(orderId: string): Promise<void> {
  const medRef = doc(db, 'medicalPayments', orderId);
  const snap = await getDoc(medRef);
  if (!snap.exists()) throw new Error('Medical payment record not found');
  const order = snap.data() as MedicalPaymentOrder;

  if (order.status === 'approved') return;

  const now = new Date().toISOString();
  await updateDoc(medRef, {
    status: 'approved',
    reviewedAt: now,
    adminNote: 'Medical sickness fee verified and approved by Admin. Timer unlocked.',
  });

  // Resolve user alert to unlock collection timer
  if (order.alertId) {
    const alertRef = doc(db, 'alerts', order.alertId);
    const alertSnap = await getDoc(alertRef);
    if (alertSnap.exists()) {
      await updateDoc(alertRef, {
        medicalFeePaid: true,
        resolved: true,
        paymentPendingVerification: false,
        paidAt: now,
      });
    }
  } else {
    // Fallback: match by userId and shedId
    const alertsQuery = query(
      collection(db, 'alerts'),
      where('userId', '==', order.userId),
      where('shedId', '==', order.shedId),
      where('type', '==', 'sickness')
    );
    const alertsSnap = await getDocs(alertsQuery);
    for (const aDoc of alertsSnap.docs) {
      await updateDoc(aDoc.ref, {
        medicalFeePaid: true,
        resolved: true,
        paymentPendingVerification: false,
        paidAt: now,
      });
    }
  }

  // CRITICAL: Notice that NO packages are added, NO hens are modified.
  // The user's active hens count remains strictly unchanged!
}

/**
 * Admin: Rejects an invalid or unverified Medical Payment TID.
 */
export async function cloudRejectMedicalPayment(orderId: string, adminNote?: string): Promise<void> {
  const medRef = doc(db, 'medicalPayments', orderId);
  const snap = await getDoc(medRef);
  if (!snap.exists()) throw new Error('Medical payment record not found');
  const order = snap.data() as MedicalPaymentOrder;

  const now = new Date().toISOString();
  await updateDoc(medRef, {
    status: 'rejected',
    reviewedAt: now,
    adminNote: adminNote || 'TID not found or payment not received on official farm accounts.',
  });

  // Clear pending flag on alert so user can re-submit with correct TID
  if (order.alertId) {
    const alertRef = doc(db, 'alerts', order.alertId);
    const alertSnap = await getDoc(alertRef);
    if (alertSnap.exists()) {
      await updateDoc(alertRef, {
        paymentPendingVerification: false,
        pendingTid: null,
      });
    }
  }
}

/**
 * Real-time listener for Medical Payment orders (for Admin Medical Approvals tab).
 */
export function subscribeToMedicalPayments(
  callback: (orders: MedicalPaymentOrder[]) => void
): Unsubscribe {
  const q = query(collection(db, 'medicalPayments'), orderBy('submittedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders: MedicalPaymentOrder[] = [];
      snapshot.forEach((doc) => {
        orders.push(doc.data() as MedicalPaymentOrder);
      });
      callback(orders);
    },
    (err) => {
      console.warn('subscribeToMedicalPayments warning:', err);
      callback([]);
    }
  );
}

/**
 * Admin: Sends manual custom text message to specific user or all users.
 * Message displays prominent header "From: Pak Hen Farm" in the user's Farm Inbox.
 */
export async function cloudSendAdminCustomMessage(
  adminUser: UserAccount,
  params: {
    targetUserId: string; // 'ALL_USERS' or specific user.id
    targetUserName?: string;
    subject: string;
    message: string;
  }
): Promise<number> {
  const cleanSubject = params.subject.trim();
  const cleanMessage = params.message.trim();
  if (!cleanSubject || !cleanMessage) {
    throw new Error('Please enter both a subject and message text.');
  }

  const now = new Date().toISOString();
  let dispatched = 0;

  if (params.targetUserId === 'ALL_USERS') {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const uDoc of usersSnap.docs) {
      const u = uDoc.data() as UserAccount;
      if (u.role !== 'admin') {
        const msgId = 'MSG-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900) + '-' + dispatched;
        const alertDoc: UserAlert = {
          id: msgId,
          userId: u.id,
          shedId: 'Official',
          type: 'admin_message',
          senderHeader: 'From: Pak Hen Farm',
          isCustomAdminMessage: true,
          titleEn: cleanSubject,
          titleUr: cleanSubject,
          messageEn: cleanMessage,
          messageUr: cleanMessage,
          title: cleanSubject,
          titleUrdu: cleanSubject,
          message: cleanMessage,
          messageUrdu: cleanMessage,
          createdAt: now,
          read: false,
        };
        await setDoc(doc(db, 'alerts', msgId), alertDoc);
        dispatched++;
      }
    }
  } else {
    const msgId = 'MSG-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
    const alertDoc: UserAlert = {
      id: msgId,
      userId: params.targetUserId,
      shedId: 'Official',
      type: 'admin_message',
      senderHeader: 'From: Pak Hen Farm',
      isCustomAdminMessage: true,
      titleEn: cleanSubject,
      titleUr: cleanSubject,
      messageEn: cleanMessage,
      messageUr: cleanMessage,
      title: cleanSubject,
      titleUrdu: cleanSubject,
      message: cleanMessage,
      messageUrdu: cleanMessage,
      createdAt: now,
      read: false,
    };
    await setDoc(doc(db, 'alerts', msgId), alertDoc);
    dispatched = 1;
  }

  return dispatched;
}

/**
 * Realtime listener for Ads Banner Slider
 */
export function subscribeToBanners(callback: (banners: FarmBanner[]) => void): Unsubscribe {
  const bannersDocRef = doc(db, 'settings', 'ads_banners');
  return onSnapshot(
    bannersDocRef,
    (snap) => {
      if (snap.exists() && snap.data()?.banners && Array.isArray(snap.data().banners)) {
        callback(snap.data().banners as FarmBanner[]);
      } else {
        callback(DEFAULT_BANNERS);
      }
    },
    (err) => {
      console.warn('Banners listener error, using defaults:', err);
      callback(DEFAULT_BANNERS);
    }
  );
}

export async function cloudSaveBanners(banners: FarmBanner[]): Promise<void> {
  const bannersDocRef = doc(db, 'settings', 'ads_banners');
  await setDoc(bannersDocRef, {
    banners,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function cloudUpdateBanner(banner: FarmBanner): Promise<void> {
  const bannersDocRef = doc(db, 'settings', 'ads_banners');
  const snap = await getDoc(bannersDocRef);
  let currentList = DEFAULT_BANNERS;
  if (snap.exists() && snap.data()?.banners && Array.isArray(snap.data().banners)) {
    currentList = snap.data().banners as FarmBanner[];
  }
  const idx = currentList.findIndex((b) => b.id === banner.id);
  let updatedList: FarmBanner[];
  if (idx >= 0) {
    updatedList = [...currentList];
    updatedList[idx] = banner;
  } else {
    updatedList = [...currentList, banner];
  }
  await setDoc(bannersDocRef, {
    banners: updatedList,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Realtime listener for Farm Gallery Photos & Videos
 */
export function subscribeToGallery(callback: (items: FarmGalleryItem[]) => void): Unsubscribe {
  const galleryDocRef = doc(db, 'settings', 'farm_gallery');
  return onSnapshot(
    galleryDocRef,
    (snap) => {
      if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
        const rawItems = snap.data().items as FarmGalleryItem[];
        const cleaned = rawItems.map((item) => ({
          ...item,
          location: item.location
            ? item.location.replace(/,?\s*Sargodha,?\s*(Punjab)?/gi, '').replace(/\(\s*\)/g, '').trim() || 'Pak Hen Farm (Facility)'
            : 'Pak Hen Farm (Facility)',
        }));
        callback(cleaned);
      } else {
        callback(DEFAULT_GALLERY_ITEMS);
      }
    },
    (err) => {
      console.warn('Gallery listener error, using defaults:', err);
      callback(DEFAULT_GALLERY_ITEMS);
    }
  );
}

function sanitizeGalleryItems(items: FarmGalleryItem[]): FarmGalleryItem[] {
  return JSON.parse(JSON.stringify(items));
}

export async function cloudSaveGallery(items: FarmGalleryItem[]): Promise<void> {
  const galleryDocRef = doc(db, 'settings', 'farm_gallery');
  await setDoc(galleryDocRef, {
    items: sanitizeGalleryItems(items),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function cloudAddGalleryItem(item: FarmGalleryItem): Promise<void> {
  const galleryDocRef = doc(db, 'settings', 'farm_gallery');
  const snap = await getDoc(galleryDocRef);
  let currentList = DEFAULT_GALLERY_ITEMS;
  if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
    currentList = snap.data().items as FarmGalleryItem[];
  }
  const updatedList = [item, ...currentList];
  await setDoc(galleryDocRef, {
    items: sanitizeGalleryItems(updatedList),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function cloudDeleteGalleryItem(id: string): Promise<void> {
  const galleryDocRef = doc(db, 'settings', 'farm_gallery');
  const snap = await getDoc(galleryDocRef);
  let currentList = DEFAULT_GALLERY_ITEMS;
  if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
    currentList = snap.data().items as FarmGalleryItem[];
  }
  const updatedList = currentList.filter((item) => item.id !== id);
  await setDoc(galleryDocRef, {
    items: sanitizeGalleryItems(updatedList),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function cloudToggleGalleryItemActive(id: string, active: boolean): Promise<void> {
  const galleryDocRef = doc(db, 'settings', 'farm_gallery');
  const snap = await getDoc(galleryDocRef);
  let currentList = DEFAULT_GALLERY_ITEMS;
  if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
    currentList = snap.data().items as FarmGalleryItem[];
  }
  const updatedList = currentList.map((item) => (item.id === id ? { ...item, active, isActive: active } : item));
  await setDoc(galleryDocRef, {
    items: sanitizeGalleryItems(updatedList),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function cloudLikeGalleryItem(id: string): Promise<void> {
  const galleryDocRef = doc(db, 'settings', 'farm_gallery');
  const snap = await getDoc(galleryDocRef);
  let currentList = DEFAULT_GALLERY_ITEMS;
  if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
    currentList = snap.data().items as FarmGalleryItem[];
  }
  const updatedList = currentList.map((item) =>
    item.id === id ? { ...item, likesCount: (item.likesCount || 0) + 1 } : item
  );
  await setDoc(galleryDocRef, {
    items: sanitizeGalleryItems(updatedList),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// ======================================================================================
// PART 2: BOUNDED ONE-TIME FETCHERS (FREE-TIER READ OPTIMIZATION)
// Replaces unnecessary continuous onSnapshot listeners & unscoped full-collection scans.
// ======================================================================================

export async function cloudGetGlobalStats(): Promise<GlobalFarmStats> {
  const statsRef = doc(db, 'stats', 'dailyProduction');
  const snap = await getDoc(statsRef);
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

export async function cloudGetSheds(): Promise<FarmShed[]> {
  // Read strictly the 5 fixed shed documents (Shed-101 to Shed-105) — 5 reads, zero user scans
  const snaps = await Promise.all(
    INITIAL_SHEDS.map((s) => getDoc(doc(db, 'sheds', s.id)))
  );
  const rawSheds: FarmShed[] = [];
  snaps.forEach((snap) => {
    if (snap.exists()) rawSheds.push(snap.data() as FarmShed);
  });
  return mergeAllSheds(rawSheds);
}

export async function cloudGetPaymentMethods(): Promise<PaymentAccount[]> {
  const snap = await getDocs(query(collection(db, 'paymentMethods'), limit(20)));
  const list: PaymentAccount[] = [];
  snap.forEach((d) => {
    if (d.id !== 'settings' && d.id !== 'customGreeting') {
      const data = d.data() as PaymentAccount;
      if (data.title && data.accountNumber) {
        const normalizedActive = isPaymentAccountActive(data);
        list.push({
          ...data,
          id: data.id || d.id,
          active: normalizedActive,
          isActive: normalizedActive,
          status: normalizedActive ? 'active' : 'disabled',
        });
      }
    }
  });
  list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  return list;
}

export async function cloudGetPaymentSettings(): Promise<PaymentSettings> {
  const snap = await getDoc(doc(db, 'paymentSettings', 'global'));
  if (snap.exists()) {
    return snap.data() as PaymentSettings;
  }
  return {
    customGreeting: 'Thanks for trusting us! We look forward to serving your flock.',
    customGreetingUr: 'ہم پر اعتماد کرنے کا شکریہ! ہم آپ کے فلاک کی دیکھ بھال کے منتظر ہیں۔',
  };
}

export async function cloudGetFarmProfile(): Promise<FarmProfileSettings> {
  const snap = await getDoc(doc(db, 'settings', 'farm_profile'));
  if (snap.exists()) {
    return {
      ...DEFAULT_FARM_PROFILE,
      ...(snap.data() as FarmProfileSettings),
    };
  }
  try {
    return {
      farmName: localStorage.getItem('adminFarmName') || DEFAULT_FARM_PROFILE.farmName,
      farmBio: localStorage.getItem('adminBio') || DEFAULT_FARM_PROFILE.farmBio,
      location:
        localStorage.getItem('adminLocation') !== null
          ? localStorage.getItem('adminLocation') || ''
          : DEFAULT_FARM_PROFILE.location,
      helpline: localStorage.getItem('adminHelpline') || DEFAULT_FARM_PROFILE.helpline,
      avatar: localStorage.getItem('adminAvatar') || DEFAULT_FARM_PROFILE.avatar,
      coverUrl: localStorage.getItem('adminCover') || DEFAULT_FARM_PROFILE.coverUrl,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return DEFAULT_FARM_PROFILE;
  }
}

export async function cloudGetBanners(): Promise<FarmBanner[]> {
  const snap = await getDoc(doc(db, 'settings', 'ads_banners'));
  if (snap.exists() && Array.isArray(snap.data()?.banners)) {
    return snap.data().banners as FarmBanner[];
  }
  return DEFAULT_BANNERS;
}

export async function cloudGetGallery(): Promise<FarmGalleryItem[]> {
  const snap = await getDoc(doc(db, 'settings', 'farm_gallery'));
  if (snap.exists() && Array.isArray(snap.data()?.items)) {
    const rawItems = snap.data().items as FarmGalleryItem[];
    return rawItems.map((item) => ({
      ...item,
      location: item.location
        ? item.location.replace(/,?\s*Sargodha,?\s*(Punjab)?/gi, '').replace(/\(\s*\)/g, '').trim() || 'Pak Hen Farm (Facility)'
        : 'Pak Hen Farm (Facility)',
    }));
  }
  return DEFAULT_GALLERY_ITEMS;
}

export async function cloudGetUserAlerts(userId: string, limitCount = 50): Promise<UserAlert[]> {
  const snap = await getDocs(
    query(collection(db, 'alerts'), where('userId', '==', userId), limit(limitCount))
  );
  const alerts: UserAlert[] = [];
  snap.forEach((d) => alerts.push(d.data() as UserAlert));
  alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return alerts;
}

export async function cloudGetMyReferrals(referralCode: string, limitCount = 100): Promise<UserAccount[]> {
  const cleanCode = (referralCode || '').trim();
  if (!cleanCode) return [];
  const snap = await getDocs(
    query(collection(db, 'users'), where('referredBy', '==', cleanCode), limit(limitCount))
  );
  const list: UserAccount[] = [];
  snap.forEach((d) => list.push(d.data() as UserAccount));
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export async function cloudGetUserOrders(userId: string, limitCount = 50): Promise<HenOrder[]> {
  const snap = await getDocs(
    query(collection(db, 'orders'), where('userId', '==', userId), limit(limitCount))
  );
  const list: HenOrder[] = [];
  snap.forEach((d) => list.push(d.data() as HenOrder));
  list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return list;
}

export async function cloudGetAdminOrders(limitCount = 100): Promise<HenOrder[]> {
  const ordersRef = collection(db, 'orders');
  let snap;
  try {
    snap = await getDocs(query(ordersRef, orderBy('submittedAt', 'desc'), limit(limitCount)));
  } catch {
    snap = await getDocs(query(ordersRef, limit(limitCount)));
  }
  const list: HenOrder[] = [];
  snap.forEach((d) => list.push(d.data() as HenOrder));
  list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return list;
}

export async function cloudGetUserWithdrawals(userId: string, limitCount = 50): Promise<WithdrawalRequest[]> {
  const snap = await getDocs(
    query(collection(db, 'withdrawals'), where('userId', '==', userId), limit(limitCount))
  );
  const list: WithdrawalRequest[] = [];
  snap.forEach((d) => list.push(d.data() as WithdrawalRequest));
  list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  return list;
}

export async function cloudGetAdminWithdrawals(limitCount = 100): Promise<WithdrawalRequest[]> {
  const wRef = collection(db, 'withdrawals');
  let snap;
  try {
    snap = await getDocs(query(wRef, orderBy('requestedAt', 'desc'), limit(limitCount)));
  } catch {
    snap = await getDocs(query(wRef, limit(limitCount)));
  }
  const list: WithdrawalRequest[] = [];
  snap.forEach((d) => list.push(d.data() as WithdrawalRequest));
  list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  return list;
}

export async function cloudGetAdminUsers(limitCount = 150): Promise<UserAccount[]> {
  const usersRef = collection(db, 'users');
  let snap;
  try {
    snap = await getDocs(query(usersRef, orderBy('createdAt', 'desc'), limit(limitCount)));
  } catch {
    snap = await getDocs(query(usersRef, limit(limitCount)));
  }
  const rawUsers: UserAccount[] = [];
  snap.forEach((d) => rawUsers.push(d.data() as UserAccount));
  const realUsers = rawUsers.filter(
    (u) =>
      u.email &&
      !u.email.toLowerCase().includes('ai-studio-dummy') &&
      !u.email.toLowerCase().includes('dummy') &&
      !u.email.toLowerCase().includes('testmember99@')
  );
  realUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return realUsers;
}

export async function cloudGetUserTickets(userId: string, limitCount = 50): Promise<SupportTicket[]> {
  const snap = await getDocs(
    query(collection(db, 'tickets'), where('userId', '==', userId), limit(limitCount))
  );
  const list: SupportTicket[] = [];
  snap.forEach((d) => {
    const ticket = d.data() as SupportTicket;
    list.push({
      ...ticket,
      read: typeof ticket.read === 'boolean' ? ticket.read : ticket.status === 'resolved',
    });
  });
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export async function cloudGetAdminTickets(limitCount = 100): Promise<SupportTicket[]> {
  const ticketsRef = collection(db, 'tickets');
  let snap;
  try {
    snap = await getDocs(query(ticketsRef, orderBy('createdAt', 'desc'), limit(limitCount)));
  } catch {
    snap = await getDocs(query(ticketsRef, limit(limitCount)));
  }
  let localSOS: any[] = [];
  try {
    const raw = localStorage.getItem('adminSOSInbox');
    if (raw) localSOS = JSON.parse(raw);
  } catch {
    // ignore
  }
  const list: SupportTicket[] = [];
  snap.forEach((d) => {
    const ticket = d.data() as SupportTicket;
    const localMatch = localSOS.find((item) => item.id === ticket.id);
    const isRead =
      typeof ticket.read === 'boolean'
        ? ticket.read
        : localMatch
        ? !!localMatch.read
        : ticket.status === 'resolved';
    list.push({ ...ticket, read: isRead });
  });
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export async function cloudGetAdminMedicalPayments(limitCount = 100): Promise<MedicalPaymentOrder[]> {
  const medRef = collection(db, 'medicalPayments');
  let snap;
  try {
    snap = await getDocs(query(medRef, orderBy('submittedAt', 'desc'), limit(limitCount)));
  } catch {
    snap = await getDocs(query(medRef, limit(limitCount)));
  }
  const list: MedicalPaymentOrder[] = [];
  snap.forEach((d) => list.push(d.data() as MedicalPaymentOrder));
  list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return list;
}



