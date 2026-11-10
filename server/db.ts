import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  UserAccount,
  HenOrder,
  WithdrawalRequest,
  EggCollectionRecord,
  SupportTicket,
  GlobalFarmStats,
  PurchasedPackage,
} from '../src/types/farm';
import {
  PACKAGE_VALIDITY_DAYS,
  EGG_PRICE_PKR,
  OFFICIAL_INFO,
  isAdminEmail,
  deductWithdrawalBalance,
  refundWithdrawalBalance,
} from '../src/utils/farmRules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'farm_database.json');

export interface DatabaseSchema {
  users: UserAccount[];
  orders: HenOrder[];
  withdrawals: WithdrawalRequest[];
  collections: EggCollectionRecord[];
  tickets: SupportTicket[];
  globalStats: GlobalFarmStats;
}

function getInitialDatabase(): DatabaseSchema {
  return {
    users: [],
    orders: [],
    withdrawals: [],
    collections: [],
    tickets: [],
    globalStats: {
      totalCollected: 0,
      cracked: 0,
      netFresh: 0,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// Atomic load & save
export function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
      collections: Array.isArray(parsed.collections) ? parsed.collections : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      globalStats: parsed.globalStats || {
        totalCollected: 0,
        cracked: 0,
        netFresh: 0,
        lastUpdated: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('Error loading database:', err);
    return getInitialDatabase();
  }
}

export function saveDatabase(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// ---------------- USER OPERATIONS ----------------

export function ensureAdminAccount(email: string): UserAccount {
  const db = loadDatabase();
  const cleanEmail = email.trim().toLowerCase();
  let admin = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!admin) {
    admin = {
      id: 'ADMIN-' + Date.now(),
      email: cleanEmail,
      password: 'admin123',
      fullName: 'Farm Administrator',
      phone: 'Farm Support',
      easypaisaTitle: 'Official Admin',
      easypaisaNumber: '03000000000',
      role: 'admin',
      walletBalance: 0,
      activeHens: 0,
      referralCode: 'PHF-ADMIN',
      createdAt: new Date().toISOString(),
      packages: [],
    };
    db.users.push(admin);
    saveDatabase(db);
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    saveDatabase(db);
  }
  return admin;
}

export function ensureStaffAccount(email: string): UserAccount {
  const db = loadDatabase();
  const cleanEmail = email.trim().toLowerCase();
  let staff = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!staff) {
    staff = {
      id: 'STAFF-' + Date.now(),
      email: cleanEmail,
      password: 'staff123',
      fullName: 'Farm Helpdesk Staff',
      phone: 'Farm Support',
      easypaisaTitle: 'Farm Staff',
      easypaisaNumber: '03000000000',
      role: 'staff',
      walletBalance: 0,
      activeHens: 0,
      referralCode: 'PHF-STAFF',
      createdAt: new Date().toISOString(),
      packages: [],
    };
    db.users.push(staff);
    saveDatabase(db);
  }
  return staff;
}

export function findUserByEmail(email: string): UserAccount | undefined {
  const db = loadDatabase();
  return db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function findUserById(id: string): UserAccount | undefined {
  const db = loadDatabase();
  return db.users.find((u) => u.id === id);
}

export function createUser(user: UserAccount): UserAccount {
  const db = loadDatabase();
  db.users.push(user);
  saveDatabase(db);
  return user;
}

export function updateUser(updated: UserAccount): UserAccount {
  const db = loadDatabase();
  const idx = db.users.findIndex((u) => u.id === updated.id);
  if (idx !== -1) {
    db.users[idx] = updated;
    saveDatabase(db);
  }
  return updated;
}

export function getAllUsersList(): UserAccount[] {
  const db = loadDatabase();
  return db.users.map((u) => ({
    ...u,
    password: '***', // Mask password in listings
  }));
}

// ---------------- ORDERS & ACCUMULATION ----------------

export function getAllOrdersFromDb(): HenOrder[] {
  return loadDatabase().orders;
}

export function getUserOrdersFromDb(userId: string): HenOrder[] {
  return loadDatabase().orders.filter((o) => o.userId === userId);
}

export function createOrderInDb(orderData: Omit<HenOrder, 'id' | 'status' | 'submittedAt'>): HenOrder {
  const db = loadDatabase();
  const order: HenOrder = {
    ...orderData,
    id: 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  db.orders.unshift(order);
  saveDatabase(db);
  return order;
}

export function approveOrderInDb(orderId: string, adminNote?: string): boolean {
  const db = loadDatabase();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'pending') return false;

  order.status = 'approved';
  order.reviewedAt = new Date().toISOString();
  if (adminNote) order.adminNote = adminNote;

  // Strict accumulation rule: total_hens = existing_hens + new_hens
  const user = db.users.find((u) => u.id === order.userId);
  if (user) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PACKAGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

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
    };

    if (!user.packages) user.packages = [];
    user.packages.push(newPkg);

    // Accumulate hens!
    user.activeHens = (user.activeHens || 0) + order.hensCount;
  }

  saveDatabase(db);
  return true;
}

export function rejectOrderInDb(orderId: string, adminNote?: string): boolean {
  const db = loadDatabase();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'pending') return false;

  order.status = 'rejected';
  order.reviewedAt = new Date().toISOString();
  if (adminNote) order.adminNote = adminNote;

  saveDatabase(db);
  return true;
}

// ---------------- WITHDRAWALS ----------------

export function getAllWithdrawalsFromDb(): WithdrawalRequest[] {
  return loadDatabase().withdrawals;
}

export function getUserWithdrawalsFromDb(userId: string): WithdrawalRequest[] {
  return loadDatabase().withdrawals.filter((w) => w.userId === userId);
}

export function createWithdrawalInDb(
  userId: string,
  amount: number,
  easypaisaNumber: string,
  easypaisaTitle: string
): { success: boolean; error?: string; withdrawal?: WithdrawalRequest } {
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { success: false, error: 'User not found' };

  if (amount < 300) return { success: false, error: 'Minimum withdrawal is Rs. 300' };
  if (amount > 30000) return { success: false, error: 'Maximum withdrawal is Rs. 30,000' };
  if (amount > user.walletBalance) return { success: false, error: 'Insufficient wallet balance' };

  // Deduct immediately so cannot double spend
  user.walletBalance = deductWithdrawalBalance(user.walletBalance, amount);

  const req: WithdrawalRequest = {
    id: 'WDR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
    userId: user.id,
    userName: user.fullName,
    userEmail: user.email,
    amount: amount,
    eggsEquivalent: Math.floor(amount / EGG_PRICE_PKR),
    easypaisaNumber,
    easypaisaTitle,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  db.withdrawals.unshift(req);
  saveDatabase(db);
  return { success: true, withdrawal: req };
}

export function markWithdrawalPaidInDb(id: string, adminNote?: string): boolean {
  const db = loadDatabase();
  const item = db.withdrawals.find((w) => w.id === id);
  if (!item || item.status !== 'pending') return false;

  item.status = 'paid';
  item.processedAt = new Date().toISOString();
  if (adminNote) item.adminNote = adminNote;
  // If Admin Approves/Marks Paid, do nothing to the user's balance
  saveDatabase(db);
  return true;
}

export function rejectWithdrawalInDb(id: string, reason: string): boolean {
  const db = loadDatabase();
  const item = db.withdrawals.find((w) => w.id === id);
  if (!item || item.status !== 'pending') return false;

  item.status = 'rejected';
  item.processedAt = new Date().toISOString();
  item.adminNote = reason;

  // Refund money to user's wallet: accurately refund EXACTLY the requested amount
  const user = db.users.find((u) => u.id === item.userId);
  if (user) {
    user.walletBalance = refundWithdrawalBalance(user.walletBalance || 0, item.amount);
  }

  saveDatabase(db);
  return true;
}

// ---------------- EGG COLLECTIONS ----------------

export function getAllCollectionsFromDb(): EggCollectionRecord[] {
  return loadDatabase().collections;
}

export function getUserCollectionsFromDb(userId: string): EggCollectionRecord[] {
  return loadDatabase().collections
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function recordEggCollectionInDb(userId: string): {
  success: boolean;
  error?: string;
  record?: EggCollectionRecord;
  updatedUser?: UserAccount;
} {
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { success: false, error: 'User not found' };
  if (!user.activeHens || user.activeHens <= 0) {
    return { success: false, error: 'No active hens to collect eggs from' };
  }

  const now = new Date();
  if (user.lastEggCollectionAt) {
    const elapsed = now.getTime() - new Date(user.lastEggCollectionAt).getTime();
    if (elapsed < 24 * 60 * 60 * 1000) {
      return { success: false, error: '24 hours have not elapsed since your last collection' };
    }
  }

  const eggs = user.activeHens;
  const cash = eggs * EGG_PRICE_PKR;

  const record: EggCollectionRecord = {
    id: 'EGG-' + Date.now(),
    userId: user.id,
    timestamp: now.toISOString(),
    date: now.toISOString().split('T')[0],
    hensCount: user.activeHens,
    eggsCollected: eggs,
    cashEarned: cash,
  };

  user.walletBalance = (user.walletBalance || 0) + cash;
  user.lastEggCollectionAt = now.toISOString();

  db.collections.unshift(record);
  saveDatabase(db);

  return { success: true, record, updatedUser: user };
}

// ---------------- GLOBAL STATS ----------------

export function getGlobalStatsFromDb(): GlobalFarmStats {
  return loadDatabase().globalStats;
}

export function updateGlobalStatsInDb(stats: Omit<GlobalFarmStats, 'lastUpdated'>): GlobalFarmStats {
  const db = loadDatabase();
  const updated: GlobalFarmStats = {
    ...stats,
    lastUpdated: new Date().toISOString(),
  };
  db.globalStats = updated;
  saveDatabase(db);
  return updated;
}

// ---------------- SUPPORT TICKETS ----------------

export function getAllTicketsFromDb(): SupportTicket[] {
  return loadDatabase().tickets;
}

export function getUserTicketsFromDb(userId: string): SupportTicket[] {
  return loadDatabase().tickets.filter((t) => t.userId === userId);
}

export function createTicketInDb(ticketData: Omit<SupportTicket, 'id' | 'status' | 'createdAt'>): SupportTicket {
  const db = loadDatabase();
  const ticket: SupportTicket = {
    ...ticketData,
    id: 'SOS-' + Date.now().toString(36).toUpperCase(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  db.tickets.unshift(ticket);
  saveDatabase(db);
  return ticket;
}

export function replyToTicketInDb(ticketId: string, reply: string): boolean {
  const db = loadDatabase();
  const ticket = db.tickets.find((t) => t.id === ticketId);
  if (!ticket) return false;

  ticket.staffReply = reply;
  ticket.repliedAt = new Date().toISOString();
  ticket.status = 'resolved';
  saveDatabase(db);
  return true;
}
