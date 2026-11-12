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

  // 3. Regular Member login
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail));
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

  // 1. Strict Unique Email check in Cloud Firestore
  const emailQuery = query(usersRef, where('email', '==', cleanEmail));
  const emailSnap = await getDocs(emailQuery);
  if (!emailSnap.empty) {
    throw new Error('An account with this email address already exists.');
  }

  // 2. Strict Unique Phone Number check across all users
  const allUsersSnap = await getDocs(usersRef);
  const duplicatePhone = allUsersSnap.docs.some((docSnap) => {
    const u = docSnap.data() as UserAccount;
    if (!u.phone) return false;
    const existingDigits = sanitizePhone(u.phone);
    return (
      u.phone.trim() === cleanPhone ||
      (digitsPhone.length >= 10 && existingDigits.length >= 10 && (
        existingDigits.endsWith(digitsPhone.slice(-10)) || digitsPhone.endsWith(existingDigits.slice(-10))
      ))
    );
  });

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
    phone: details.phone.trim(),
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
  const q = query(usersRef, where('email', '==', cleanEmail));
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

// ---------------- DYNAMIC PAYMENT METHODS (ADMIN CONTROL) ----------------

export const INITIAL_PAYMENT_METHODS: PaymentAccount[] = [
  {
    id: 'pm-jazzcash',
    type: 'jazzcash',
    title: 'JazzCash Official',
    titleUr: 'جاز کیش آفیشل',
    accountTitle: 'Pak Hen Farm Official',
    accountNumber: '980722735',
    instructions: 'Send money to JazzCash Mobile Account & enter TID below',
    instructionsUr: 'جاز کیش موبائل اکاؤنٹ پر رقم منتقل کر کے TID درج کریں',
    active: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pm-easypaisa',
    type: 'easypaisa',
    title: 'Easypaisa Official',
    titleUr: 'ایزی پیسہ آفیشل',
    accountTitle: 'Pak Hen Farm Official',
    accountNumber: '03451122334',
    instructions: 'Send money to Easypaisa Account & enter TID below',
    instructionsUr: 'ایزی پیسہ اکاؤنٹ پر رقم بھیج کر TID نیچے درج کریں',
    active: true,
    displayOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pm-meezan',
    type: 'bank',
    title: 'Meezan Bank Ltd',
    titleUr: 'میزان بینک لمیٹڈ',
    accountTitle: 'Pak Hen Farm (Pvt) Ltd',
    accountNumber: '01010102938475',
    bankName: 'Meezan Bank (Islamic)',
    instructions: 'Transfer via IBFT / Raast to Meezan Bank',
    instructionsUr: 'میزان بینک پر IBFT یا راست کے ذریعے ٹرانسفر کریں',
    active: true,
    displayOrder: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pm-usdt',
    type: 'usdt',
    title: 'USDT (TRC-20)',
    titleUr: 'یو ایس ڈی ٹی (TRC20)',
    accountTitle: 'Pak Hen Farm Official',
    accountNumber: 'TPACKdX3KrTBHHMLdBmmw37uC9FmUsVPoc',
    instructions: 'Send USDT on TRON (TRC20) network only',
    instructionsUr: 'صرف TRON (TRC20) نیٹ ورک پر USDT ٹرانسفر کریں',
    active: true,
    displayOrder: 4,
    createdAt: new Date().toISOString(),
  },
];

export function subscribeToPaymentMethods(callback: (methods: PaymentAccount[]) => void): Unsubscribe {
  const pmRef = collection(db, 'paymentMethods');
  return onSnapshot(
    pmRef,
    async (snapshot) => {
      try {
        const list: PaymentAccount[] = [];
        snapshot.forEach((d) => {
          // Exclude any non-account docs
          if (d.id !== 'settings' && d.id !== 'customGreeting') {
            const data = d.data() as PaymentAccount;
            if (data.title && data.accountNumber) {
              list.push({ ...data, id: data.id || d.id });
            }
          }
        });

        if (list.length === 0) {
          // Initialize default payment methods in Firestore
          for (const pm of INITIAL_PAYMENT_METHODS) {
            await setDoc(doc(db, 'paymentMethods', pm.id), pm);
          }
          callback(INITIAL_PAYMENT_METHODS);
          return;
        }

        list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        callback(list);
      } catch (err) {
        console.warn('subscribeToPaymentMethods warning:', err);
        callback(INITIAL_PAYMENT_METHODS);
      }
    },
    (err) => {
      console.warn('subscribeToPaymentMethods error:', err);
      callback(INITIAL_PAYMENT_METHODS);
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
  const newAccount: PaymentAccount = {
    ...cleanData,
    id,
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
    proofSlipUrl?: string; // Uploaded payment slip / screenshot Base64
  }
): Promise<HenOrder> {
  if (isUserLocked(user)) {
    throw new Error('Your account is currently suspended or banned. Purchasing packages is disabled.');
  }

  const cleanTid = orderData.tid.trim();
  const lowerTid = cleanTid.toLowerCase();

  // Strict anti-duplicate check: ensure this TID has never been used for any order or medical fee
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const isDuplicateOrder = ordersSnap.docs.some((d) => {
    const o = d.data() as HenOrder;
    return o.tid && o.tid.trim().toLowerCase() === lowerTid;
  });

  if (isDuplicateOrder) {
    throw new Error('This Transaction ID (TxID) has already been processed or submitted. Each transaction ID can only be used once.');
  }

  const medSnap = await getDocs(collection(db, 'medicalPayments'));
  const isDuplicateMed = medSnap.docs.some((d) => {
    const m = d.data() as MedicalPaymentOrder;
    return m.tid && m.tid.trim().toLowerCase() === lowerTid;
  });

  if (isDuplicateMed) {
    throw new Error('This Transaction ID (TxID) has already been submitted for a medical fee payment.');
  }

  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
  const newOrder: HenOrder = {
    id: orderId,
    userId: user.id,
    userName: user.fullName,
    userEmail: user.email,
    userPhone: user.phone,
    packageId: orderData.packageId,
    hensCount: orderData.hensCount,
    amount: orderData.amount,
    senderEasypaisaNumber: (orderData.senderEasypaisaNumber || user.phone || '').trim(),
    senderEasypaisaTitle: (orderData.senderEasypaisaTitle || user.fullName || '').trim(),
    tid: cleanTid,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    paymentMethodId: orderData.paymentMethodId,
    paymentMethodTitle: orderData.paymentMethodTitle,
    proofSlipUrl: orderData.proofSlipUrl,
  };

  // Push directly to cloud database
  await setDoc(doc(db, 'orders', orderId), newOrder);
  return newOrder;
}

/**
 * Admin approves order:
 * 1. Marks order approved
 * 2. Accumulates hens into buyer's active flock (never overwrites)
 * 3. AUTO-COMMISSION: Calculates 10% of purchased package price and instantly credits it to Inviter's wallet
 */
export async function cloudApproveOrder(order: HenOrder, adminNote?: string): Promise<void> {
  const orderRef = doc(db, 'orders', order.id);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error('Order not found in database');
  }
  const currentOrderData = orderSnap.data() as HenOrder;
  if (currentOrderData.status !== 'pending') {
    throw new Error(`This order is already ${currentOrderData.status}.`);
  }

  // Strictly prevent multiple package approvals for a single Transaction ID (TID)
  const cleanTid = (currentOrderData.tid || order.tid || '').trim();
  if (cleanTid) {
    const ordersRef = collection(db, 'orders');
    const tidQuery = query(
      ordersRef,
      where('tid', '==', cleanTid),
      where('status', '==', 'approved')
    );
    const approvedTidSnap = await getDocs(tidQuery);
    if (!approvedTidSnap.empty) {
      throw new Error(`Transaction ID "${cleanTid}" has already been approved for another package. Double approval blocked.`);
    }
  }

  const userRef = doc(db, 'users', order.userId);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PACKAGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Retrieve current sheds to assign hens to an available shed
  const shedsSnap = await getDocs(collection(db, 'sheds'));
  let currentSheds: FarmShed[] = [];
  if (shedsSnap.empty) {
    for (const s of INITIAL_SHEDS) {
      await setDoc(doc(db, 'sheds', s.id), s);
    }
    currentSheds = [...INITIAL_SHEDS];
  } else {
    shedsSnap.forEach((d) => currentSheds.push(d.data() as FarmShed));
    currentSheds.sort((a, b) => a.id.localeCompare(b.id));
  }

  const assignedShedId = assignAvailableShed(currentSheds, order.hensCount);

  const newPkg: PurchasedPackage = {
    id: 'PKG-' + Date.now(),
    packageId: order.packageId,
    hens: order.hensCount,
    purchasePrice: order.amount,
    purchasedAt: order.submittedAt,
    approvedAt: now.toISOString(),
    expiresAt: expiresAt,
    tid: order.tid,
    active: true,
    shedId: assignedShedId,
  };

  // Update shed capacity
  const targetShedRef = doc(db, 'sheds', assignedShedId);
  const targetShedDoc = currentSheds.find((s) => s.id === assignedShedId);
  const existingShedHens = targetShedDoc ? targetShedDoc.totalHens : 0;
  await updateDoc(targetShedRef, {
    totalHens: existingShedHens + order.hensCount,
    lastUpdated: now.toISOString(),
  });

  // 1. Update Order in Firestore with commission mark and assigned shed
  await updateDoc(orderRef, {
    status: 'approved',
    reviewedAt: now.toISOString(),
    adminNote: adminNote || 'Verified and approved on cloud',
    shedId: assignedShedId,
  });

  // 2. Accumulate user's active hens in Firestore & read inviter referral code
  const userSnap = await getDoc(userRef);
  let inviterReferralCode: string | undefined;
  if (userSnap.exists()) {
    const current = userSnap.data() as UserAccount;
    const currentHens = current.activeHens || 0;
    const existingPackages = current.packages || [];
    inviterReferralCode = current.referredBy;

    await updateDoc(userRef, {
      activeHens: currentHens + order.hensCount,
      packages: [...existingPackages, newPkg],
    });
  }

  // 3. Strict 10% Auto-Commission Rule:
  // When an invited user purchases a package AND the admin approves that deposit,
  // automatically calculate 10% of the purchased package price and instantly credit to Inviter's wallet.
  if (inviterReferralCode && inviterReferralCode.trim()) {
    try {
      const commissionAmount = calculateReferralCommission(order.amount);
      if (commissionAmount > 0) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', inviterReferralCode.trim()));
        const inviterSnap = await getDocs(q);

        if (!inviterSnap.empty) {
          const inviterDoc = inviterSnap.docs[0];
          const inviterRef = doc(db, 'users', inviterDoc.id);
          const inviterData = inviterDoc.data() as UserAccount;
          const currentWallet = Number(inviterData.walletBalance) || 0;
          await updateDoc(inviterRef, {
            walletBalance: currentWallet + commissionAmount,
          });
        }
      }
    } catch (commErr) {
      console.error('Failed to credit 10% referral commission:', commErr);
    }
  }
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

  // 2. Check if user has any unpaid medical fees
  const alertsSnap = await getDocs(query(collection(db, 'alerts'), where('userId', '==', user.id)));
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

  // 3. Strict 1:1 Egg Yield Math & Proportional Financial Loss Calculation:
  // a) Visual 1:1 Egg Yield: 1 active hen strictly yields 1 egg (10 hens = 10 eggs, 125 hens = 125 eggs)
  const eggs = exactActiveHens;
  const normalIncome = eggs * EGG_PRICE_PKR; // (User's Active Hens * Rs. 30)

  // Identify user's shed from active packages (default to primary Shed-101)
  const userPackages = currentUser.packages || [];
  const primaryShedId = userPackages.find((p) => p.active && p.shedId)?.shedId || 'Shed-101';

  // Read current live shed data to determine shed dead hens and cracked eggs
  let deadHens = 0;
  let crackedEggs = 0;
  let shedTotalHens = 5000;

  try {
    const shedRef = doc(db, 'sheds', primaryShedId);
    const shedSnap = await getDoc(shedRef);
    if (shedSnap.exists()) {
      const sData = shedSnap.data() as FarmShed;
      shedTotalHens = Math.max(exactActiveHens, sData.totalHens || 5000);
      deadHens = sData.mortalityCount || 0;
      // Requirement 3: Use raw number of cracked eggs directly, no percentage calculations
      if (typeof sData.crackedEggsCount === 'number') {
        crackedEggs = Math.max(0, sData.crackedEggsCount);
      } else {
        crackedEggs = Math.round((shedTotalHens * (sData.crackedEggRate || 0)) / 100);
      }
    }
  } catch (shedErr) {
    console.warn('Could not read shed data for proportional loss calculation:', shedErr);
  }

  // Calculate proportional financial loss per daily collection cycle (cracked eggs deduction from daily collection).
  const lossCalc = calculateProportionalFinancialLoss(
    exactActiveHens,
    0, // Mortality is handled directly on wallet balance; collection deducts cracked eggs
    crackedEggs,
    shedTotalHens,
    HEN_REPLACEMENT_PRICE_PKR
  );

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
      crackedDeduction: 0,
      normalIncome: lossCalc.normalIncome,
      shedLossDeduction: lossCalc.userShareOfLoss,
      finalCredit: finalCreditPerDay,
      totalShedLossRs: lossCalc.totalShedLossRs,
      lossPerHen: lossCalc.lossPerHen,
      shedDeadHens: deadHens,
      shedCrackedEggs: crackedEggs,
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

export async function cloudGetCollections(userId: string): Promise<EggCollectionRecord[]> {
  const colsRef = collection(db, 'collections');
  const q = query(colsRef, where('userId', '==', userId));
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
  await setDoc(statsRef, data);
  return data;
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
  const usersRef = collection(db, 'users');

  // Helper function: calculates dynamic SUM of all active hens per shed from all users in the database
  const computeDynamicSheds = async (shedDocs: FarmShed[]): Promise<FarmShed[]> => {
    // 1. Fetch current live users to compute dynamic SUM per shed
    const usersSnap = await getDocs(usersRef);
    const shedHensSum: Record<string, number> = {
      'Shed-101': 0,
      'Shed-102': 0,
      'Shed-103': 0,
      'Shed-104': 0,
      'Shed-105': 0,
    };

    usersSnap.forEach((uDoc) => {
      const u = uDoc.data() as UserAccount;
      const pkgs = u.packages || [];
      let totalPkgActiveHens = 0;
      for (const p of pkgs) {
        if (p.active && (p.hens || 0) > 0) {
          totalPkgActiveHens += p.hens || 0;
          const sId = p.shedId || 'Shed-101';
          shedHensSum[sId] = (shedHensSum[sId] || 0) + (p.hens || 0);
        }
      }
      // If user has activeHens in user doc greater than active packages sum (e.g. Minha having 125 hens in Shed-101)
      const unallocatedHens = Math.max(0, (u.activeHens || 0) - totalPkgActiveHens);
      if (unallocatedHens > 0) {
        shedHensSum['Shed-101'] = (shedHensSum['Shed-101'] || 0) + unallocatedHens;
      }
    });

    // 2. Map existing or initial sheds with dynamically computed SUM
    const baseList = shedDocs.length > 0 ? shedDocs : INITIAL_SHEDS;
    const computedList = baseList.map((s) => {
      const liveSum = shedHensSum[s.id] ?? 0;
      return {
        ...s,
        totalHens: liveSum,
      };
    });

    computedList.sort((a, b) => a.id.localeCompare(b.id));

    // 3. Persist dynamic SUM in Firestore shed docs so they never reset to 0
    for (const cShed of computedList) {
      try {
        const sRef = doc(db, 'sheds', cShed.id);
        const sSnap = await getDoc(sRef);
        if (!sSnap.exists()) {
          await setDoc(sRef, cShed);
        } else {
          const existingData = sSnap.data() as FarmShed;
          if (existingData.totalHens !== cShed.totalHens) {
            await updateDoc(sRef, {
              totalHens: cShed.totalHens,
              lastUpdated: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('Persisting dynamic shed SUM warning:', err);
      }
    }

    return computedList;
  };

  return onSnapshot(
    shedsRef,
    async (snap) => {
      try {
        const rawSheds: FarmShed[] = [];
        snap.forEach((d) => rawSheds.push(d.data() as FarmShed));
        const computedSheds = await computeDynamicSheds(rawSheds);
        callback(computedSheds);
      } catch (err) {
        console.warn('subscribeToSheds computation warning:', err);
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

  // 1. Fetch all users to calculate dynamic sum of active hens in this shed
  const usersSnap = await getDocs(collection(db, 'users'));
  const allUsers: UserAccount[] = [];
  usersSnap.forEach((d) => allUsers.push(d.data() as UserAccount));

  const shedLiveHens = calculateShedDynamicSum(shedId, allUsers);
  const currentTotal = Math.max(shedLiveHens, shedData.totalHens || 0);
  if (currentTotal <= 0) {
    throw new Error(`Shed ${shedId} currently has 0 active hens.`);
  }

  // 2. Base value for 1 Hen: fixed constant Rs. 1000 (HEN_REPLACEMENT_PRICE_PKR) or Admin-specified
  const henPrice = Math.max(1, Number(pricePerHen) || HEN_REPLACEMENT_PRICE_PKR);

  // 3. Calculate Total Financial Loss: (Number of Dead Hens entered by Admin * Price per Hen)
  const totalFinancialLoss = deaths * henPrice;

  // 4. Calculate Loss Per Hen: (Total Financial Loss / Total Active Hens in the Shed)
  const lossPerHen = totalFinancialLoss / currentTotal;
  const now = new Date();

  // 5. Calculate User's Proportional Loss and deduct from Wallet Balance
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data() as UserAccount;
    const pkgs = userData.packages || [];
    let userHensInShed = 0;

    for (const p of pkgs) {
      const pShed = p.shedId || 'Shed-101';
      if (pShed === shedId && p.active && p.hens > 0) {
        userHensInShed += p.hens;
      }
    }

    // Default unallocated active hens to Shed-101
    if (shedId === 'Shed-101' && (userData.activeHens || 0) > 0 && userHensInShed === 0) {
      userHensInShed = userData.activeHens || 0;
    }

    if (userHensInShed > 0) {
      // 5. Calculate User's Proportional Loss: (User's Active Hens * Loss Per Hen)
      const userProportionalLoss = Math.round(userHensInShed * lossPerHen);

      if (userProportionalLoss > 0) {
        // 6. Deduct "User's Proportional Loss" (in Rs) directly from the user's "Wallet Balance".
        // CRITICAL RULE: Allow Wallet Balance to drop into negative numbers (e.g., -7 Rs) if balance is 0.
        // Do NOT restrict or floor to 0. Negative balance acts as a due amount recovered from next egg profit.
        // DO NOT deduct from user's "Active Hens" count. Live hen count remains unchanged for fractional losses.
        const currentBalance = Number(userData.walletBalance) || 0;
        const newWalletBalance = currentBalance - userProportionalLoss;

        await updateDoc(userDoc.ref, {
          walletBalance: newWalletBalance,
        });

        // 7. Update Alert Notification: reflect financial deduction in wallet balance
        const alertId = 'ALERT-MORT-' + shedId + '-' + userData.id + '-' + Date.now();
        const alertDoc: UserAlert = {
          id: alertId,
          userId: userData.id,
          type: 'mortality',
          shedId: shedId,
          titleEn: 'Natural Flock Mortality Financial Loss',
          titleUr: 'قدرتی اموات مالی نقصان الرٹ',
          messageEn: `Alert: Natural mortality in ${shedId}. A proportional financial loss of Rs. ${userProportionalLoss.toLocaleString()} has been deducted from your wallet balance to maintain Mudarabah partnership.`,
          messageUr: `انتباہ: ${shedId} میں قدرتی شرح اموات۔ مضاربہ شراکت داری کے تحت آپ کے والیٹ بیلنس سے ${userProportionalLoss.toLocaleString()} روپے کا متناسب مالی نقصان منہا کر دیا گیا ہے۔`,
          title: 'Natural Flock Mortality Financial Loss',
          titleUrdu: 'قدرتی اموات مالی نقصان الرٹ',
          message: `Alert: Natural mortality in ${shedId}. A proportional financial loss of Rs. ${userProportionalLoss.toLocaleString()} has been deducted from your wallet balance to maintain Mudarabah partnership.`,
          messageUrdu: `انتباہ: ${shedId} میں قدرتی شرح اموات۔ مضاربہ شراکت داری کے تحت آپ کے والیٹ بیلنس سے ${userProportionalLoss.toLocaleString()} روپے کا متناسب مالی نقصان منہا کر دیا گیا ہے۔`,
          financialLossDeducted: userProportionalLoss,
          amountDeducted: userProportionalLoss,
          percentageLoss: Math.round((deaths / currentTotal) * 1000) / 10,
          createdAt: now.toISOString(),
          read: false,
        };
        await setDoc(doc(db, 'alerts', alertId), alertDoc);
      }
    }
  }

  // Update shed doc: record mortality count, keeping flock active
  await updateDoc(shedRef, {
    mortalityCount: (shedData.mortalityCount || 0) + deaths,
    lastUpdated: now.toISOString(),
  });
}

export async function cloudUpdateShedCracking(shedId: string, crackedEggsCount: number): Promise<void> {
  const shedRef = doc(db, 'sheds', shedId);
  const shedSnap = await getDoc(shedRef);
  let defaultShed = INITIAL_SHEDS.find((s) => s.id === shedId) || INITIAL_SHEDS[0];
  if (!shedSnap.exists()) {
    await setDoc(shedRef, defaultShed);
  } else {
    defaultShed = shedSnap.data() as FarmShed;
  }
  const cleanCount = Math.max(0, Math.floor(Number(crackedEggsCount) || 0));
  const shedHens = Math.max(1, defaultShed.totalHens || 5000);
  const calculatedRate = Math.round((cleanCount / shedHens) * 1000) / 10;

  await updateDoc(shedRef, {
    crackedEggsCount: cleanCount,
    crackedEggRate: calculatedRate,
    lastUpdated: new Date().toISOString(),
  });
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
  paymentMethod: 'wallet' | 'jazzcash' | 'usdt';
  tid: string;
  senderName?: string;
  senderNumber?: string;
}): Promise<MedicalPaymentOrder> {
  const cleanTid = params.tid.trim();
  if (!cleanTid) throw new Error('Transaction ID is required');
  const lowerTid = cleanTid.toLowerCase();

  // Enforce absolute uniqueness on medical payment TID
  const medSnap = await getDocs(collection(db, 'medicalPayments'));
  const isDuplicateMed = medSnap.docs.some((d) => {
    const m = d.data() as MedicalPaymentOrder;
    return m.tid && m.tid.trim().toLowerCase() === lowerTid;
  });

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

  await setDoc(doc(db, 'medicalPayments', id), order);

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


