/**
 * Pak Hen Farm - Core Data Types
 * Strictly production-ready, no mock data flags.
 */

export type UserRole = 'user' | 'admin' | 'staff';

export interface HenPackage {
  id: string;
  hens: number;
  price: number; // in PKR (Rs.)
  dailyEggs: number;
  validityDays: number;
  titleEn: string;
  titleUr: string;
  badgeEn?: string;
  badgeUr?: string;
}

export interface PurchasedPackage {
  id: string;
  packageId: string;
  hens: number;
  purchasePrice: number;
  purchasedAt: string; // ISO string
  approvedAt: string; // ISO string
  expiresAt: string; // ISO string (90 days from approval)
  tid: string;
  active: boolean;
  shedId?: string; // e.g. 'Shed-101', 'Shed-102', 'Shed-103', 'Shed-104', 'Shed-105'
}

export interface EggCollectionRecord {
  id: string;
  userId: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  hensCount: number;
  eggsCollected: number;
  cashEarned: number; // in PKR (final amount credited)
  crackedDeduction?: number; // legacy
  normalIncome?: number; // User's Active Hens * Rs. 30
  shedLossDeduction?: number; // User's Share of Loss in PKR
  finalCredit?: number; // Normal User Income - User's Share of Loss
  totalShedLossRs?: number;
  lossPerHen?: number;
  shedDeadHens?: number;
  shedCrackedEggs?: number;
}

export type UserStatus = 'active' | 'suspended' | 'banned';

export interface UserAccount {
  id: string;
  email: string;
  password: string; // Stored securely for session matching
  fullName: string;
  phone: string;
  easypaisaTitle: string;
  easypaisaNumber: string;
  paymentGateway?: string; // 'easypaisa' | 'jazzcash' | 'sadapay' | 'upaisa' | 'bank'
  paymentAccountTitle?: string;
  paymentAccountNumber?: string;
  paymentBankName?: string;
  role: UserRole;
  status?: UserStatus; // 'active' | 'suspended' | 'banned'
  statusReason?: string;
  statusUpdatedAt?: string;
  walletBalance: number; // in PKR
  activeHens: number;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  lastEggCollectionAt?: string; // ISO string
  packages: PurchasedPackage[];
}

export interface FarmBanner {
  id: string; // 'banner-1', 'banner-2', 'banner-3', 'banner-4'
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  order: number;
}

export type FarmGalleryMediaType = 'photo' | 'video';

export interface FarmGalleryItem {
  id: string;
  type: FarmGalleryMediaType;
  title: string;
  titleUr?: string;
  caption?: string;
  captionUr?: string;
  mediaUrl: string; // image or video URL (MP4, YouTube embed/link)
  thumbnailUrl?: string; // poster for video
  duration?: string; // e.g. "1:45"
  location?: string; // e.g. "Shed-101, Sargodha, Punjab"
  uploadedAt: string;
  createdAt?: string;
  likesCount?: number;
  viewsCount?: number;
  order?: number;
  active: boolean;
  isActive?: boolean;
}

export type OrderStatus = 'pending' | 'approved' | 'rejected';

export interface HenOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  packageId: string;
  hensCount: number;
  amount: number;
  senderEasypaisaNumber?: string;
  senderEasypaisaTitle?: string;
  tid: string; // Transaction ID / Hash
  status: OrderStatus;
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
  commissionPaid?: boolean;
  shedId?: string;
  paymentMethodId?: string;
  paymentMethodTitle?: string;
  proofSlipUrl?: string; // Base64 data URL of user's payment slip / screenshot
}

export type PaymentMethodType = 'jazzcash' | 'easypaisa' | 'bank' | 'usdt' | 'other';

export interface PaymentAccount {
  id: string; // e.g. 'pm_1', 'pm_2'
  type: PaymentMethodType;
  title: string; // e.g. 'JazzCash Official', 'Easypaisa Official', 'Meezan Bank Ltd', 'USDT TRC-20'
  titleUr?: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  qrCodeUrl?: string; // Base64 image data URL
  instructions?: string;
  instructionsUr?: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface PaymentSettings {
  customGreeting?: string;
  customGreetingUr?: string;
  updatedAt?: string;
}

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number; // in PKR (Rs. 300 to Rs. 30,000)
  eggsEquivalent: number; // amount / 30
  easypaisaNumber: string;
  easypaisaTitle: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  adminNote?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
  staffReply?: string;
  repliedAt?: string;
}

export interface GlobalFarmStats {
  totalCollected: number;
  cracked: number;
  netFresh: number;
  lastUpdated: string;
}

// ---------------- ADVANCED REAL-WORLD SHED & MUDARABAH TYPES ----------------

export interface FarmShed {
  id: string; // 'Shed-101' | 'Shed-102' | 'Shed-103' | 'Shed-104' | 'Shed-105'
  nameEn: string;
  nameUr: string;
  name?: string;
  location?: string;
  capacity: number; // 5000
  totalHens: number; // Current active hens in this shed
  mortalityCount: number; // Total deceased hens recorded
  crackedEggsCount?: number; // Raw Number of Cracked Eggs (e.g. 8)
  crackedEggRate: number; // Percentage 0 - 100 (kept for backwards compatibility)
  hasSicknessAlert: boolean; // Sickness declared
  sicknessMessageEn?: string;
  sicknessMessageUr?: string;
  lastUpdated: string;
}

export type AlertType = 'mortality' | 'sickness' | 'general' | 'admin_message';

export interface UserAlert {
  id: string;
  userId: string;
  shedId: string;
  type: AlertType;
  titleEn: string;
  titleUr: string;
  messageEn: string;
  messageUr: string;
  title?: string;
  titleUrdu?: string;
  message?: string;
  messageUrdu?: string;
  senderHeader?: string; // e.g. 'From: Pak Hen Farm'
  isCustomAdminMessage?: boolean;
  medicalFeeAmount?: number; // Total fee in PKR
  medicalFeeRequired?: number;
  perHenRate?: number; // Tiered rate e.g. 200, 170, 140
  hensCount?: number;
  tierLabel?: string;
  tierLabelUrdu?: string;
  medicalFeePaid?: boolean;
  createdAt: string;
  resolved?: boolean;
  hensDeducted?: number;
  percentageLoss?: number;
  financialLossDeducted?: number;
  amountDeducted?: number;
  read?: boolean;
  readAt?: string;
  paidAt?: string;
  paymentPendingVerification?: boolean;
  pendingTid?: string;
  paymentMethod?: 'wallet' | 'jazzcash' | 'usdt';
}

export type MedicalPaymentStatus = 'pending' | 'approved' | 'rejected';

export interface MedicalPaymentOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  shedId: string;
  alertId?: string;
  hensCount: number;
  perHenRate: number;
  amount: number; // Tiered total fee in PKR
  paymentMethod: 'wallet' | 'jazzcash' | 'usdt';
  tid?: string; // Transaction ID
  senderName?: string;
  senderNumber?: string;
  status: MedicalPaymentStatus;
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface ShedPerformancePoint {
  date: string; // Formatted date e.g. 'Nov 1'
  fullDate: string; // YYYY-MM-DD
  freshEggs: number; // Daily Fresh Egg Yield
  mortalityDeaths: number; // Mortality count
  crackedEggs: number; // Cracked egg count
  totalLoss: number; // mortalityDeaths + crackedEggs
  capacity: number;
  efficiencyPercent: number;
}
