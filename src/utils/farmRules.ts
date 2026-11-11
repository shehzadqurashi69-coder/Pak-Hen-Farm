/**
 * Pak Hen Farm - Business Logic & Rules
 * Pure functions decoupled from React UI for deterministic testing and rock-solid state management.
 */

import { HenPackage, PurchasedPackage, UserAccount, FarmShed, UserAlert, ShedPerformancePoint, FarmBanner, FarmGalleryItem } from '../types/farm';

export const EGG_PRICE_PKR = 30; // 1 Egg = Rs. 30
export const MIN_WITHDRAWAL_EGGS = 10; // 10 Eggs = Rs. 300
export const MIN_WITHDRAWAL_PKR = MIN_WITHDRAWAL_EGGS * EGG_PRICE_PKR; // Rs. 300
export const MAX_WITHDRAWAL_EGGS = 1000; // 1000 Eggs = Rs. 30,000
export const MAX_WITHDRAWAL_PKR = MAX_WITHDRAWAL_EGGS * EGG_PRICE_PKR; // Rs. 30,000
export const PACKAGE_VALIDITY_DAYS = 90;
export const COLLECTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Hours in milliseconds

export const DEFAULT_GALLERY_ITEMS: FarmGalleryItem[] = [
  // 5 Real Poultry Farm Videos
  {
    id: 'gal-vid-1',
    type: 'video',
    title: 'Shed-101 Automated Feeding & Fresh Water Line Operations',
    titleUr: 'شیڈ 101: خودکار فیڈنگ اور تازہ پانی کی فراہمی کا نظام',
    caption: 'Real on-ground inspection of our primary laying facility in Punjab. Automated chain feeding guarantees balanced nutrition and stress-free laying hens.',
    captionUr: 'پنجاب میں ہمارے مرکزی شیڈ کا معائنہ۔ خودکار فیڈنگ کا نظام مرغیوں کی صحت مند نشوونما اور انڈوں کی مسلسل پیداوار یقینی بناتا ہے۔',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: '/banners/banner-1.jpg',
    duration: '1:45',
    location: 'Pak Hen Farm Shed-101, Sargodha, Punjab',
    uploadedAt: '2026-11-09T08:30:00Z',
    likesCount: 142,
    viewsCount: 1840,
    order: 1,
    active: true,
  },
  {
    id: 'gal-vid-2',
    type: 'video',
    title: 'Daily Fresh Golden Egg Collection & Quality Sorting Conveyor',
    titleUr: 'روزانہ تازہ سنہری انڈوں کی وصولی اور کوالٹی چیکنگ لائن',
    caption: 'Watch our staff and automated conveyors harvest daily organic eggs. Every single egg is weighed, sanitized, and graded for distribution.',
    captionUr: 'روزانہ کے تازہ نامیاتی انڈوں کی وصولی کا براہ راست منظر۔ ہر انڈے کا وزن اور کوالٹی چیک کر کے پیکنگ کی جاتی ہے۔',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: '/banners/banner-2.jpg',
    duration: '2:10',
    location: 'Central Egg Sorting Unit, Pak Hen Farm',
    uploadedAt: '2026-11-08T11:15:00Z',
    likesCount: 198,
    viewsCount: 2450,
    order: 2,
    active: true,
  },
  {
    id: 'gal-vid-3',
    type: 'video',
    title: 'Free-Range Healthy Layer Flocks Grazing in Open Green Run',
    titleUr: 'کھلے سبز چراگاہ میں صحت مند فری رینج مرغیوں کا غول',
    caption: '100% Halal Shariah-compliant physical poultry. Hens enjoy open natural sunlight, fresh pasture grazing, and clean environmental protection.',
    captionUr: 'شریعت کے مطابق حقیقی پولٹری فارمنگ۔ مرغیاں کھلی دھوپ اور قدرتی سبزے سے لطف اندوز ہوتی ہیں۔',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: '/banners/banner-3.jpg',
    duration: '1:15',
    location: 'Free-Range Organic Paddock, Pak Hen Farm',
    uploadedAt: '2026-11-07T14:00:00Z',
    likesCount: 275,
    viewsCount: 3120,
    order: 3,
    active: true,
  },
  {
    id: 'gal-vid-4',
    type: 'video',
    title: 'Modern Climate-Controlled Airflow & Temperature Tuning',
    titleUr: 'جدید کلائمیٹ کنٹرول، وینٹی لیشن اور ایواپوریٹو کولنگ سسٹم',
    caption: 'Computerized climate control prevents heat stress and keeps layer sheds at an optimal 22°C year-round regardless of outside summer heat.',
    captionUr: 'کمپیوٹرائزڈ درجہ حرارت کا نظام جو ہر موسم میں شیڈز کا اندرونی ماحول مرغیوں کے لیے بالکل سازگار رکھتا ہے۔',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: '/banners/banner-4.jpg',
    duration: '1:30',
    location: 'Climate Engineering Bay, Shed-202',
    uploadedAt: '2026-11-06T16:45:00Z',
    likesCount: 164,
    viewsCount: 1980,
    order: 4,
    active: true,
  },
  {
    id: 'gal-vid-5',
    type: 'video',
    title: 'Veterinarian Biosecurity Check & Health Monitoring Session',
    titleUr: 'ماہر ویٹرنری ڈاکٹر کی زیر نگرانی مرغیوں کا ہیلتھ چیک اپ',
    caption: 'Qualified veterinarians inspecting flock immunity, respiratory wellness, and sanitizing entry footbaths to ensure 0% viral contamination.',
    captionUr: 'ماہر ڈاکٹرز مرغیوں کی صحت، ویکسینیشن اور بائیو سیکیورٹی کا باقاعدہ معائنہ کرتے ہیں۔',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnailUrl: '/banners/banner-1.jpg',
    duration: '2:05',
    location: 'Veterinary Diagnostic Hub, Pak Hen Farm',
    uploadedAt: '2026-11-05T09:20:00Z',
    likesCount: 210,
    viewsCount: 2290,
    order: 5,
    active: true,
  },

  // Real Farm Photos (Unlimited admin upload support)
  {
    id: 'gal-photo-1',
    type: 'photo',
    title: 'Modern Environmental Poultry Shed Exterior & Solar Array',
    titleUr: 'جدید پولٹری شیڈز کا بیرونی منظر اور سولر پاور سسٹم',
    caption: 'Uninterrupted green solar energy powering our automated ventilation fans and egg conveyor belts across all 4 sheds.',
    captionUr: 'سولر انرجی سے لیس شیڈز جو 24 گھنٹے بلاتعطل بجلی اور کولنگ فراہم کرتے ہیں۔',
    mediaUrl: '/banners/banner-1.jpg',
    location: 'Main Compound, Pak Hen Farm Facility',
    uploadedAt: '2026-11-10T10:00:00Z',
    likesCount: 312,
    viewsCount: 3400,
    order: 6,
    active: true,
  },
  {
    id: 'gal-photo-2',
    type: 'photo',
    title: 'Morning Egg Harvest & Sanitary Tray Packing',
    titleUr: 'صبح کی تازہ انڈوں کی فصل اور صفائی کے بعد کریٹس میں پیکنگ',
    caption: 'Thousands of farm-fresh golden eggs collected every morning, stamped for authenticity and dispatched to Pakistani markets.',
    captionUr: 'روزانہ صبح ہزاروں تازہ انڈے جمع کر کے مارکیٹ اور شراکت داروں کے لیے تیار کیے جاتے ہیں۔',
    mediaUrl: '/banners/banner-2.jpg',
    location: 'Dispatch Hub, Pak Hen Farm',
    uploadedAt: '2026-11-09T12:00:00Z',
    likesCount: 289,
    viewsCount: 2950,
    order: 7,
    active: true,
  },
  {
    id: 'gal-photo-3',
    type: 'photo',
    title: 'High-Producing Golden Layer Hens in Open Paddock',
    titleUr: 'اعلیٰ نسل کی سنہری لیئر مرغیاں کھلی فضا میں',
    caption: 'Purebred, highly active laying hens bred for robust immunity, daily laying persistence, and organic egg shell strength.',
    captionUr: 'مضبوط قوت مدافعت کی حامل اعلیٰ لیئر مرغیاں جو روزانہ بہترین انڈے دیتی ہیں۔',
    mediaUrl: '/banners/banner-3.jpg',
    location: 'Flock Paddock 3, Pak Hen Farm',
    uploadedAt: '2026-11-08T15:30:00Z',
    likesCount: 350,
    viewsCount: 4100,
    order: 8,
    active: true,
  },
  {
    id: 'gal-photo-4',
    type: 'photo',
    title: 'Biosecure Tunnel Ventilation System in Shed-202',
    titleUr: 'شیڈ 202 میں بائیو سیکیور ٹنل وینٹی لیشن سسٹم',
    caption: 'Advanced evaporative cooling pads and industrial extraction fans keeping humidity and ammonia levels strictly at zero.',
    captionUr: 'جدید کولنگ پیڈز اور ایگزاسٹ پنکھے جو شیڈ کے اندر ہوا کو بالکل صاف اور تازہ رکھتے ہیں۔',
    mediaUrl: '/banners/banner-4.jpg',
    location: 'Shed-202, Pak Hen Farm',
    uploadedAt: '2026-11-07T11:00:00Z',
    likesCount: 241,
    viewsCount: 2600,
    order: 9,
    active: true,
  },
  {
    id: 'gal-photo-5',
    type: 'photo',
    title: 'Organic Grain & Mineral Nutrition Formulation',
    titleUr: 'قدرتی اناج اور غذائی اجزاء پر مشتمل معیاری فیڈ',
    caption: 'Corn, soybean, calcium grit, and natural vitamins mixed on-site to ensure rich golden yolks and strong eggshells.',
    captionUr: 'مکئی، سویا بین اور قدرتی وٹامنز سے تیار کردہ خالص فیڈ تاکہ زردی قدرتی سنہری رہے۔',
    mediaUrl: '/banners/banner-2.jpg',
    location: 'Feed Processing Mill, Pak Hen Farm',
    uploadedAt: '2026-11-06T13:40:00Z',
    likesCount: 188,
    viewsCount: 2150,
    order: 10,
    active: true,
  },
  {
    id: 'gal-photo-6',
    type: 'photo',
    title: 'Flock Medical Inspection & Veterinarian Certificate',
    titleUr: 'فارم کا ویٹرنری ہیلتھ سرٹیفکیٹ اور باقاعدہ معائنہ',
    caption: '100% antibiotic-free commercial operation certified by veterinary specialists for consumer health and animal welfare.',
    captionUr: 'ماہرین سے تصدیق شدہ 100% اینٹی بائیوٹک فری اور صحت بخش فارمنگ۔',
    mediaUrl: '/banners/banner-1.jpg',
    location: 'Administrative Office, Pak Hen Farm',
    uploadedAt: '2026-11-05T15:10:00Z',
    likesCount: 295,
    viewsCount: 3200,
    order: 11,
    active: true,
  },
];

export const DEFAULT_BANNERS: FarmBanner[] = [
  {
    id: 'banner-1',
    title: 'State-of-the-Art Modern Poultry Farm Sheds',
    subtitle: '100% Real physical agricultural infrastructure in Pakistan',
    imageUrl: '/banners/banner-1.jpg',
    active: true,
    order: 1,
  },
  {
    id: 'banner-2',
    title: 'Daily Fresh Golden Organic Egg Production',
    subtitle: 'Directly collected from healthy laying hens every 24 hours',
    imageUrl: '/banners/banner-2.jpg',
    active: true,
    order: 2,
  },
  {
    id: 'banner-3',
    title: 'Free-Range Healthy Laying Flocks',
    subtitle: '100% Halal Shariah-compliant Mudarabah physical partnership',
    imageUrl: '/banners/banner-3.jpg',
    active: true,
    order: 3,
  },
  {
    id: 'banner-4',
    title: 'Modern Climate-Controlled Biosecure Sheds',
    subtitle: 'Automated feeding and medical supervision nationwide',
    imageUrl: '/banners/banner-4.jpg',
    active: true,
    order: 4,
  },
];

export const OFFICIAL_INFO = {
  farmName: 'Pak Hen Farm',
  farmLocation: 'Pakistan (Nationwide Services)',
  taglineEn: 'Real physical poultry farming across Pakistan',
  taglineUr: 'پورے پاکستان میں حقیقی فزیکل پولٹری فارمنگ',
  trustBadge: 'Pak Hen Farm is a 100% real physical poultry farm providing services all over Pakistan.',
  trustBadgeUrdu: 'پاک ہین فارم ایک 100% حقیقی فزیکل پولٹری فارم ہے جو پورے پاکستان میں اپنی خدمات فراہم کر رہا ہے۔',
  usdtTrc20Address: 'TPaCKdX3kRtBHHMLdBmmw37uC9FmUsVPoc',
  usdtNetwork: 'USDT (TRC20)',
  jazzCashAccountTitle: 'Pak Hen Farm Official',
  jazzCashAccountNumber: '03009988776',
  adminEmail: 'shehzadqurashi69@gmail.com',
  adminEmails: ['shehzadqurashi69@gmail.com', 'shehzadqurashi9@gmail.com', 'admin@pakhenfarm.com'],
  staffEmail: 'staff@pakhenfarm.com',
};

export const REFERRAL_COMMISSION_PERCENT = 10; // 10% auto-commission on approved package purchases

/**
 * Calculates 10% auto-commission on an approved package purchase.
 * e.g., Rs. 100 for a Rs. 1000 package, Rs. 500 for a Rs. 5000 package, Rs. 800 for Rs. 8000.
 */
export function calculateReferralCommission(packagePrice: number): number {
  const price = Math.max(0, Number(packagePrice) || 0);
  return Math.round((price * REFERRAL_COMMISSION_PERCENT) / 100);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return OFFICIAL_INFO.adminEmails.includes(clean);
}

export const PACKAGES: HenPackage[] = [
  {
    id: 'pkg-1',
    hens: 1,
    price: 1000,
    dailyEggs: 1,
    validityDays: 90,
    titleEn: 'Bronze Flock (1 Hen)',
    titleUr: 'برونز پیکج (1 مرغی)',
    badgeEn: 'Starter',
    badgeUr: 'شروعاتی',
  },
  {
    id: 'pkg-2',
    hens: 2,
    price: 1800,
    dailyEggs: 2,
    validityDays: 90,
    titleEn: 'Silver Flock (2 Hens)',
    titleUr: 'سلور پیکج (2 مرغیاں)',
    badgeEn: 'Popular (Save Rs. 200)',
    badgeUr: 'مقبول (200 روپے بچت)',
  },
  {
    id: 'pkg-3',
    hens: 5,
    price: 4000,
    dailyEggs: 5,
    validityDays: 90,
    titleEn: 'Golden Flock (5 Hens)',
    titleUr: 'گولڈن پیکج (5 مرغیاں)',
    badgeEn: 'Best Value (Save Rs. 1,000)',
    badgeUr: 'بہترین منافع (1,000 روپے بچت)',
  },
];

/**
 * Dynamic Package Pricing for Islamic Finance Partner Flocks:
 * 1 Hen: 1,000 PKR
 * Tiered discounts for volume partnership:
 * 2 Hens: 1,800 PKR
 * 3 Hens: 2,700 PKR
 * 4 Hens: 3,600 PKR
 * 5 Hens: 4,000 PKR
 * 10 Hens: 8,000 PKR
 */
export function calculatePackagePrice(quantity: number): number {
  const qty = Math.max(1, Math.floor(quantity || 1));
  if (qty === 1) return 1000;
  if (qty === 2) return 1800;
  if (qty === 3) return 2700;
  if (qty === 4) return 3600;
  if (qty === 5) return 4000;
  return qty * 800;
}

/**
 * Calculates whether a package is currently active based on its 90-day validity window from purchase date.
 */
export function isPackageActive(pkg: PurchasedPackage, now: Date = new Date()): boolean {
  if (pkg.active === false) return false;
  
  // Calculate expiry based on expiresAt or exactly 90 days from purchasedAt/approvedAt
  let expiryTime: number;
  if (pkg.expiresAt) {
    expiryTime = new Date(pkg.expiresAt).getTime();
  } else {
    const purchaseDate = pkg.purchasedAt || pkg.approvedAt;
    expiryTime = purchaseDate
      ? new Date(purchaseDate).getTime() + PACKAGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      : 0;
  }

  if (isNaN(expiryTime) || expiryTime <= 0) {
    return false;
  }

  return now.getTime() < expiryTime;
}

export interface PackageExpiryDetails {
  isExpired: boolean;
  purchaseDate: Date;
  expiryDate: Date;
  daysRemaining: number;
  hoursRemaining: number;
  daysElapsed: number;
  percentElapsed: number;
  statusText: 'Active' | 'Expired';
}

/**
 * Returns comprehensive 90-day countdown & expiry calculations for a purchased package.
 */
export function getPackageExpiryDetails(pkg: PurchasedPackage, now: Date = new Date()): PackageExpiryDetails {
  const purchaseDate = new Date(pkg.purchasedAt || pkg.approvedAt || now.toISOString());
  const expiryTime = pkg.expiresAt
    ? new Date(pkg.expiresAt).getTime()
    : purchaseDate.getTime() + PACKAGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
  
  const isExpired = now.getTime() >= expiryTime || pkg.active === false;
  const totalDurationMs = PACKAGE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now.getTime() - purchaseDate.getTime());
  const diffMs = Math.max(0, expiryTime - now.getTime());
  
  const daysElapsed = Math.min(PACKAGE_VALIDITY_DAYS, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
  const daysRemaining = isExpired ? 0 : Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = isExpired ? 0 : Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const percentElapsed = isExpired ? 100 : Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));

  return {
    isExpired,
    purchaseDate,
    expiryDate: new Date(expiryTime),
    daysRemaining,
    hoursRemaining,
    daysElapsed,
    percentElapsed,
    statusText: isExpired ? 'Expired' : 'Active',
  };
}

/**
 * Evaluates all user packages against the 90-day validity window.
 * Automatically switches any completed packages from 'active: true' to 'active: false' (Expired),
 * recalculates total active hens, and preserves the user's wallet balance completely untouched.
 */
export function syncUserPackagesExpiry(
  user: UserAccount,
  now: Date = new Date()
): { updatedUser: UserAccount; hasExpiredChanges: boolean; expiredPackages: PurchasedPackage[]; activePackages: PurchasedPackage[] } {
  if (!user.packages || user.packages.length === 0) {
    return {
      updatedUser: user,
      hasExpiredChanges: false,
      expiredPackages: [],
      activePackages: [],
    };
  }

  let hasExpiredChanges = false;
  const expiredPackages: PurchasedPackage[] = [];
  const activePackages: PurchasedPackage[] = [];

  const updatedPackages = user.packages.map((pkg) => {
    const active = isPackageActive(pkg, now);
    const updatedPkg = { ...pkg, active };
    if (active) {
      activePackages.push(updatedPkg);
    } else {
      expiredPackages.push(updatedPkg);
    }
    if (pkg.active !== active) {
      hasExpiredChanges = true;
    }
    return updatedPkg;
  });

  const liveActiveHens = calculateActiveHens(updatedPackages, now);

  const updatedUser: UserAccount = {
    ...user,
    activeHens: liveActiveHens,
    packages: updatedPackages,
  };

  return {
    updatedUser,
    hasExpiredChanges: hasExpiredChanges || user.activeHens !== liveActiveHens,
    expiredPackages,
    activePackages,
  };
}

/**
 * Calculates total active hens strictly accumulating all valid active packages.
 * CRITICAL RULE: When a user buys a new package, it MUST ADD UP (total_hens = existing_hens + new_hens), NEVER overwrite.
 */
export function calculateActiveHens(packages: PurchasedPackage[], now: Date = new Date()): number {
  if (!packages || !Array.isArray(packages)) return 0;
  return packages
    .filter((pkg) => isPackageActive(pkg, now))
    .reduce((total, pkg) => total + pkg.hens, 0);
}

/**
 * Helper to compute accumulated hens when adding a newly approved package.
 */
export function accumulateHens(currentHens: number, newPackageHens: number): number {
  return Math.max(0, currentHens) + Math.max(0, newPackageHens);
}

export interface CollectionEligibility {
  canCollect: boolean;
  reason?: 'no_hens' | 'time_remaining';
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingSeconds: number;
  potentialEggs: number;
  potentialCash: number;
}

/**
 * Manual Egg Collection Verification:
 * Stop auto-collecting. Users MUST click this every 24 hours.
 */
export function checkCollectionEligibility(
  activeHens: number,
  lastCollectionAt?: string,
  now: Date = new Date()
): CollectionEligibility {
  if (!activeHens || activeHens <= 0) {
    return {
      canCollect: false,
      reason: 'no_hens',
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      potentialEggs: 0,
      potentialCash: 0,
    };
  }

  const potentialEggs = activeHens;
  const potentialCash = potentialEggs * EGG_PRICE_PKR;

  if (!lastCollectionAt) {
    return {
      canCollect: true,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      potentialEggs,
      potentialCash,
    };
  }

  const lastTime = new Date(lastCollectionAt).getTime();
  const elapsed = now.getTime() - lastTime;

  if (elapsed >= COLLECTION_INTERVAL_MS) {
    return {
      canCollect: true,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      potentialEggs,
      potentialCash,
    };
  }

  const remainingMs = COLLECTION_INTERVAL_MS - elapsed;
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return {
    canCollect: false,
    reason: 'time_remaining',
    remainingMs,
    remainingHours,
    remainingMinutes,
    remainingSeconds,
    potentialEggs,
    potentialCash,
  };
}

export interface CatchUpCollectionResult {
  canCollect: boolean;
  missedDays: number;
  cycleDates: Date[];
}

/**
 * Calculates catch-up collection cycles when a user misses daily egg collections over multiple days.
 * For instance, if a user last collected on the 10th and returns on the 14th (4 days elapsed),
 * this calculates 4 sequential daily collections with individual calendar dates.
 */
export function calculateCatchUpCycles(
  lastCollectionAt?: string,
  userCreatedAt?: string,
  now: Date = new Date(),
  maxCatchUpDays: number = 30
): CatchUpCollectionResult {
  if (!lastCollectionAt) {
    const baseTime = userCreatedAt ? new Date(userCreatedAt).getTime() : now.getTime() - COLLECTION_INTERVAL_MS;
    const elapsed = Math.max(0, now.getTime() - baseTime);
    const missed = Math.min(maxCatchUpDays, Math.max(1, Math.floor(elapsed / COLLECTION_INTERVAL_MS)));
    const cycleDates: Date[] = [];
    for (let i = missed; i >= 1; i--) {
      cycleDates.push(new Date(now.getTime() - (i - 1) * COLLECTION_INTERVAL_MS));
    }
    return {
      canCollect: true,
      missedDays: missed,
      cycleDates,
    };
  }

  const lastTime = new Date(lastCollectionAt).getTime();
  const elapsed = now.getTime() - lastTime;

  if (elapsed < COLLECTION_INTERVAL_MS) {
    return {
      canCollect: false,
      missedDays: 0,
      cycleDates: [],
    };
  }

  const completedCycles = Math.min(maxCatchUpDays, Math.floor(elapsed / COLLECTION_INTERVAL_MS));
  const cycleDates: Date[] = [];
  for (let i = 1; i <= completedCycles; i++) {
    cycleDates.push(new Date(lastTime + i * COLLECTION_INTERVAL_MS));
  }

  return {
    canCollect: true,
    missedDays: completedCycles,
    cycleDates,
  };
}


export interface WithdrawalValidation {
  isValid: boolean;
  error?: string;
  errorUrdu?: string;
  eggsEquivalent: number;
}

/**
 * Strict limits:
 * Minimum 10 Eggs (Rs. 300)
 * Maximum 1000 Eggs (Rs. 30,000)
 * Must not exceed wallet balance.
 */
export function validateWithdrawal(
  amountPkr: number,
  currentBalancePkr: number
): WithdrawalValidation {
  if (isNaN(amountPkr) || amountPkr <= 0) {
    return {
      isValid: false,
      error: 'Please enter a valid withdrawal amount.',
      errorUrdu: 'براہ کرم نکلوائی کی درست رقم درج کریں۔',
      eggsEquivalent: 0,
    };
  }

  if (amountPkr < MIN_WITHDRAWAL_PKR) {
    return {
      isValid: false,
      error: `Minimum withdrawal is Rs. ${MIN_WITHDRAWAL_PKR.toLocaleString()} (equivalent to ${MIN_WITHDRAWAL_EGGS} Eggs).`,
      errorUrdu: `کم از کم نکلوائی رقم 300 روپے (10 انڈوں کے برابر) ہے۔`,
      eggsEquivalent: Math.floor(amountPkr / EGG_PRICE_PKR),
    };
  }

  if (amountPkr > MAX_WITHDRAWAL_PKR) {
    return {
      isValid: false,
      error: `Maximum withdrawal per request is Rs. ${MAX_WITHDRAWAL_PKR.toLocaleString()} (equivalent to ${MAX_WITHDRAWAL_EGGS} Eggs).`,
      errorUrdu: `ایک درخواست میں زیادہ سے زیادہ نکلوائی رقم 30,000 روپے (1,000 انڈوں کے برابر) ہے۔`,
      eggsEquivalent: Math.floor(amountPkr / EGG_PRICE_PKR),
    };
  }

  if (amountPkr > currentBalancePkr) {
    return {
      isValid: false,
      error: `Insufficient balance! Your current wallet balance is Rs. ${currentBalancePkr.toLocaleString()}.`,
      errorUrdu: `بیلنس ناکافی ہے! آپ کا موجودہ والٹ بیلنس ${currentBalancePkr.toLocaleString()} روپے ہے۔`,
      eggsEquivalent: Math.floor(amountPkr / EGG_PRICE_PKR),
    };
  }

  return {
    isValid: true,
    eggsEquivalent: Math.floor(amountPkr / EGG_PRICE_PKR),
  };
}

/**
 * Deducts the exact withdrawal amount from user wallet balance upon request submission.
 * Strictly prevents negative balances.
 */
export function deductWithdrawalBalance(currentBalance: number, requestedAmount: number): number {
  const cur = Math.max(0, Number(currentBalance) || 0);
  const req = Math.max(0, Number(requestedAmount) || 0);
  if (req > cur) {
    throw new Error('Insufficient wallet balance');
  }
  return cur - req;
}

/**
 * Refunds the exact withdrawal amount back to user wallet balance when Admin rejects a pending request.
 * Strictly adds back exactly the requested amount.
 */
export function refundWithdrawalBalance(currentBalance: number, refundAmount: number): number {
  const cur = Math.max(0, Number(currentBalance) || 0);
  const ref = Math.max(0, Number(refundAmount) || 0);
  return cur + ref;
}

/**
 * Generates a unique user referral code.
 */
export function generateReferralCode(email: string): string {
  const clean = email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PHF-${clean || 'FARM'}-${rand}`;
}

// ---------------- ADVANCED REAL-WORLD SHED & MUDARABAH RULES ----------------

export const SHED_CAPACITY = 5000;
export const MEDICAL_FEE_PKR = 200;

export const INITIAL_SHEDS: FarmShed[] = [
  {
    id: 'Shed-101',
    nameEn: 'Shed-101 (Alpha Flock)',
    nameUr: 'شیڈ-101 (الفا فلاک)',
    capacity: 5000,
    totalHens: 0,
    mortalityCount: 0,
    crackedEggRate: 0,
    hasSicknessAlert: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'Shed-102',
    nameEn: 'Shed-102 (Beta Flock)',
    nameUr: 'شیڈ-102 (بیٹا فلاک)',
    capacity: 5000,
    totalHens: 0,
    mortalityCount: 0,
    crackedEggRate: 0,
    hasSicknessAlert: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'Shed-103',
    nameEn: 'Shed-103 (Gamma Flock)',
    nameUr: 'شیڈ-103 (گاما فلاک)',
    capacity: 5000,
    totalHens: 0,
    mortalityCount: 0,
    crackedEggRate: 0,
    hasSicknessAlert: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'Shed-104',
    nameEn: 'Shed-104 (Delta Flock)',
    nameUr: 'شیڈ-104 (ڈیلٹا فلاک)',
    capacity: 5000,
    totalHens: 0,
    mortalityCount: 0,
    crackedEggRate: 0,
    hasSicknessAlert: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'Shed-105',
    nameEn: 'Shed-105 (Epsilon Flock)',
    nameUr: 'شیڈ-105 (ایپسیلون فلاک)',
    capacity: 5000,
    totalHens: 0,
    mortalityCount: 0,
    crackedEggRate: 0,
    hasSicknessAlert: false,
    lastUpdated: new Date().toISOString(),
  },
];

/**
 * Automatically assigns purchased hens to an available shed (capacity 5,000 each).
 */
export function assignAvailableShed(sheds: FarmShed[], hensToAssign: number = 1): string {
  const list = sheds && sheds.length > 0 ? sheds : INITIAL_SHEDS;
  for (const s of list) {
    if ((s.totalHens || 0) + hensToAssign <= (s.capacity || SHED_CAPACITY)) {
      return s.id;
    }
  }
  const sorted = [...list].sort((a, b) => (a.totalHens || 0) - (b.totalHens || 0));
  return sorted[0]?.id || 'Shed-101';
}

/**
 * Strict Proportional Math (Mudarabah Ownership Share):
 * Calculates natural mortality strictly based on the user's percentage of ownership in the Shed.
 * e.g., if a Shed has 5,000 hens and 5 die:
 * user with 1,000 hens (20% ownership) loses exactly 1 hen.
 */
export function calculateStrictProportionalMortality(
  userHensInShed: number,
  shedTotalHens: number,
  mortalityDeaths: number
): {
  userOwnershipPercent: number;
  lostHens: number;
  remainingHens: number;
  mortalityPercent: number;
} {
  const userHens = Math.max(0, Number(userHensInShed) || 0);
  const totalHens = Math.max(0, Number(shedTotalHens) || 0);
  const deaths = Math.max(0, Number(mortalityDeaths) || 0);

  if (userHens === 0 || totalHens === 0 || deaths === 0) {
    return { userOwnershipPercent: 0, lostHens: 0, remainingHens: userHens, mortalityPercent: 0 };
  }

  // Ownership share = userHens / totalHens (e.g. 1000 / 5000 = 0.20)
  const effectiveTotal = Math.max(totalHens, userHens);
  const ownershipRatio = userHens / effectiveTotal;
  const userOwnershipPercent = Math.round(ownershipRatio * 10000) / 100; // e.g. 20.00%
  const mortalityRatio = Math.min(1, deaths / effectiveTotal);
  const mortalityPercent = Math.round(mortalityRatio * 10000) / 100;

  // Exact loss = deaths * ownershipRatio (e.g. 5 * 0.20 = 1.0)
  const exactLoss = deaths * ownershipRatio;
  let lostHens = Math.round(exactLoss);
  lostHens = Math.min(userHens, Math.min(deaths, lostHens));
  const remainingHens = Math.max(0, userHens - lostHens);

  return { userOwnershipPercent, lostHens, remainingHens, mortalityPercent };
}

/**
 * Calculates natural mortality for a user, delegating to strict proportional ownership math.
 */
export function calculateProportionalMortality(
  userHensInShed: number,
  shedTotalHens: number,
  mortalityDeaths: number
): { lostHens: number; remainingHens: number; mortalityPercent: number } {
  const res = calculateStrictProportionalMortality(userHensInShed, shedTotalHens, mortalityDeaths);
  return {
    lostHens: res.lostHens,
    remainingHens: res.remainingHens,
    mortalityPercent: res.mortalityPercent,
  };
}

/**
 * Strict Proportional Math:
 * Calculates cracked/lost eggs strictly based on the user's percentage of ownership in the Shed.
 */
export function calculateStrictProportionalCrackedEggs(
  userHensInShed: number,
  shedTotalHens: number,
  shedCrackedEggs: number
): {
  userCrackedLostEggs: number;
  userFreshEggs: number;
  cashEarned: number;
  userOwnershipPercent: number;
} {
  const userHens = Math.max(0, Number(userHensInShed) || 0);
  const totalHens = Math.max(0, Number(shedTotalHens) || 0);
  const crackedTotal = Math.max(0, Number(shedCrackedEggs) || 0);

  if (userHens === 0) {
    return { userCrackedLostEggs: 0, userFreshEggs: 0, cashEarned: 0, userOwnershipPercent: 0 };
  }

  const effectiveTotal = Math.max(totalHens, userHens);
  const ownershipRatio = userHens / effectiveTotal;
  const userOwnershipPercent = Math.round(ownershipRatio * 10000) / 100;

  const exactCracked = crackedTotal * ownershipRatio;
  let userCrackedLostEggs = Math.round(exactCracked);
  userCrackedLostEggs = Math.min(userHens, userCrackedLostEggs);
  const userFreshEggs = Math.max(0, userHens - userCrackedLostEggs);
  const cashEarned = userFreshEggs * EGG_PRICE_PKR;

  return { userCrackedLostEggs, userFreshEggs, cashEarned, userOwnershipPercent };
}

/**
 * Calculates daily egg yield accounting for shed egg cracking / loss rate.
 */
export function calculateEggYieldWithCracking(
  activeHens: number,
  crackedRatePercent: number = 0
): { grossEggs: number; crackedLostEggs: number; freshEggs: number; cashEarned: number } {
  const grossEggs = Math.max(0, Number(activeHens) || 0);
  const rate = Math.max(0, Math.min(100, Number(crackedRatePercent) || 0));
  const crackedLostEggs = rate > 0 ? Math.min(grossEggs, Math.round((grossEggs * rate) / 100)) : 0;
  const freshEggs = Math.max(0, grossEggs - crackedLostEggs);
  const cashEarned = freshEggs * EGG_PRICE_PKR;

  return { grossEggs, crackedLostEggs, freshEggs, cashEarned };
}

/**
 * Tiered & Isolated Medical Fee (Bulk Discounts):
 * 1 Hen = Rs. 200 (No discount)
 * 2 - 10 Hens = 15% discount (Rs. 170 / hen)
 * 11 - 100+ Hens = 30% discount (Rs. 140 / hen)
 */
export function getMedicalFeePerHen(hensCount: number): number {
  const count = Math.max(1, Math.floor(Number(hensCount) || 1));
  if (count === 1) return 200;
  if (count <= 10) return 170; // 15% discount (200 * 0.85)
  return 140; // 30% discount (200 * 0.70)
}

export function calculateMedicalFee(hensCount: number): {
  perHenRate: number;
  totalFee: number;
  tierLabel: string;
  tierLabelUrdu: string;
  savingsPercent: number;
} {
  const count = Math.max(1, Math.floor(Number(hensCount) || 1));
  let perHenRate = 200;
  let savingsPercent = 0;
  let tierLabel = '1 Hen (Standard Rs. 200)';
  let tierLabelUrdu = '1 مرغی (200 روپے)';

  if (count > 10) {
    perHenRate = 140; // 30% discount
    savingsPercent = 30;
    tierLabel = '11-100+ Hens (30% Discount • Rs. 140/hen)';
    tierLabelUrdu = '11 تا 100+ مرغیاں (30٪ رعایت • 140 روپے فی مرغی)';
  } else if (count >= 2) {
    perHenRate = 170; // 15% discount
    savingsPercent = 15;
    tierLabel = '2-10 Hens (15% Discount • Rs. 170/hen)';
    tierLabelUrdu = '2 تا 10 مرغیاں (15٪ رعایت • 170 روپے فی مرغی)';
  }

  const totalFee = count * perHenRate;
  return { perHenRate, totalFee, tierLabel, tierLabelUrdu, savingsPercent };
}

/**
 * Generates dynamic, realistic daily performance points for a physical shed line chart.
 * Plots 'Daily Egg Yield' vs 'Daily Mortality / Cracked Eggs' over past N days.
 */
export function generateShedDailyPerformance(
  shed: FarmShed,
  days: number = 7
): ShedPerformancePoint[] {
  const points: ShedPerformancePoint[] = [];
  const now = new Date();
  const capacity = shed.capacity || SHED_CAPACITY;
  const currentTotal = Math.max(50, shed.totalHens || 4200);
  const baseYield = Math.round(currentTotal * 0.96); // ~96% baseline lay rate

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = d.toISOString().split('T')[0];

    // Seed variations deterministically based on date and shed id
    const seed = (d.getDate() * 13 + (shed.id.charCodeAt(5) || 1)) % 10;
    const variation = (seed - 5) * 8; // -40 to +40

    // Mortality & cracked eggs
    const mort = i === 0 ? shed.mortalityCount || 2 : Math.max(0, (seed % 4));
    const cracked = i === 0 ? Math.round((currentTotal * (shed.crackedEggRate || 1.2)) / 100) : Math.round((currentTotal * (1.1 + (seed % 3) * 0.3)) / 100);
    const freshEggs = Math.max(0, baseYield + variation - cracked);
    const totalLoss = mort + cracked;
    const efficiencyPercent = Math.round((freshEggs / currentTotal) * 1000) / 10;

    points.push({
      date: dateStr,
      fullDate,
      freshEggs,
      mortalityDeaths: mort,
      crackedEggs: cracked,
      totalLoss,
      capacity,
      efficiencyPercent,
    });
  }

  return points;
}

/**
 * Checks if user has unpaid medical fee alerts that pause daily egg collections.
 */
export function hasUnpaidMedicalFee(alerts: UserAlert[]): boolean {
  if (!alerts || !Array.isArray(alerts)) return false;
  return alerts.some((a) => a.type === 'sickness' && !a.medicalFeePaid && !a.resolved);
}

/**
 * Unified Global Timer - Cycle Eligibility:
 * New hens bought mid-cycle yield eggs in the NEXT cycle.
 * Any package approved on or before the current cycle start (lastEggCollectionAt)
 * is eligible for this collection cycle. Packages approved AFTER lastEggCollectionAt
 * were purchased mid-cycle and will yield in the next cycle (post-collection).
 */
export function calculateCycleEligibleHens(
  packages: PurchasedPackage[],
  activeHens: number,
  lastEggCollectionAt?: string,
  now: Date = new Date()
): { eligibleHens: number; midCycleHens: number } {
  const currentActiveHens = Math.max(0, Number(activeHens) || 0);
  if (currentActiveHens <= 0) {
    return { eligibleHens: 0, midCycleHens: 0 };
  }

  // If no prior collection cycle recorded: all active hens are eligible for first collection
  if (!lastEggCollectionAt || !packages || packages.length === 0) {
    return { eligibleHens: currentActiveHens, midCycleHens: 0 };
  }

  const cycleStartTime = new Date(lastEggCollectionAt).getTime();
  const validPkgs = packages.filter((pkg) => isPackageActive(pkg, now));

  let eligibleHens = 0;
  let midCycleHens = 0;

  for (const pkg of validPkgs) {
    const approvedTime = pkg.approvedAt
      ? new Date(pkg.approvedAt).getTime()
      : new Date(pkg.purchasedAt).getTime();

    if (approvedTime <= cycleStartTime) {
      eligibleHens += pkg.hens;
    } else {
      midCycleHens += pkg.hens;
    }
  }

  // Safety fallback if packages array wasn't fully hydrated
  if (eligibleHens === 0 && midCycleHens === 0 && currentActiveHens > 0) {
    eligibleHens = currentActiveHens;
  } else if (eligibleHens + midCycleHens < currentActiveHens) {
    // Reconcile if total differs
    const diff = currentActiveHens - (eligibleHens + midCycleHens);
    eligibleHens += diff;
  }

  return { eligibleHens, midCycleHens };
}

/**
 * Checks if a user's account has been Banned or Suspended by Admin.
 * Banned/Suspended users can log in and view the app, but 'Collect Eggs' and 'Withdraw' buttons are locked.
 */
export function isUserLocked(user?: UserAccount | null): boolean {
  if (!user || !user.status) return false;
  return user.status === 'suspended' || user.status === 'banned';
}

/**
 * Dynamic SUM formula for Live Shed Capacity:
 * SUM(All Active Hens from Users assigned to this Shed)
 * Handles both package-level shed assignments and user activeHens (e.g. Minha having 125 hens in Shed-101).
 */
export function calculateShedDynamicSum(
  shedId: string,
  users: Array<{ activeHens?: number; packages?: Array<{ shedId?: string; active?: boolean; hens?: number }> }>
): number {
  return users.reduce((total, user) => {
    const pkgs = user.packages || [];
    let pkgHensInShed = 0;
    let totalPkgActiveHens = 0;

    for (const p of pkgs) {
      if (p.active && (p.hens || 0) > 0) {
        totalPkgActiveHens += p.hens || 0;
        const targetShed = p.shedId || 'Shed-101';
        if (targetShed === shedId) {
          pkgHensInShed += p.hens || 0;
        }
      }
    }

    // If user's activeHens is greater than active packages sum (or packages array is unpopulated),
    // assign the unallocated active hens to default primary shed (Shed-101)
    const unallocatedHens = shedId === 'Shed-101' ? Math.max(0, (user.activeHens || 0) - totalPkgActiveHens) : 0;

    return total + pkgHensInShed + unallocatedHens;
  }, 0);
}

export const HEN_REPLACEMENT_PRICE_PKR = 1000;

export interface ProportionalFinancialLossResult {
  normalIncome: number; // User's Active Hens * Rs. 30
  totalShedLossRs: number; // (Dead Hens * 1000) + (Cracked Eggs * 30)
  lossPerHen: number; // Total Shed Loss / Total Active Hens in Shed
  userShareOfLoss: number; // Loss Per Hen * User's Active Hens
  finalWalletCredit: number; // Normal User Income - User's Share of Loss
  hasLoss: boolean;
}

/**
 * Strict Proportional Financial Loss Calculation (Dead Hens & Cracked Eggs):
 * NEVER deduct whole hens or whole eggs from a single user's account when a shed-level loss occurs.
 * Instead, distribute the financial loss proportionally among all users in that shed during daily collection:
 * a) Normal User Income = (User's Active Hens * Rs. 30)
 * b) Total Shed Loss in Rs = (Number of Dead Hens * Price per Hen) + (Number of Cracked Eggs * Rs. 30)
 * c) Loss Per Hen = Total Shed Loss / Total Active Hens in the Shed
 * d) User's Share of Loss = Loss Per Hen * User's Active Hens
 * e) Final Amount Added to Wallet = Normal User Income - User's Share of Loss
 */
export function calculateProportionalFinancialLoss(
  userActiveHens: number,
  shedDeadHens: number,
  shedCrackedEggs: number,
  totalShedActiveHens: number,
  henPrice: number = HEN_REPLACEMENT_PRICE_PKR
): ProportionalFinancialLossResult {
  const userHens = Math.max(0, Number(userActiveHens) || 0);
  const deadHens = Math.max(0, Number(shedDeadHens) || 0);
  const crackedEggs = Math.max(0, Number(shedCrackedEggs) || 0);
  const shedHens = Math.max(userHens, Number(totalShedActiveHens) || 0);

  const normalIncome = userHens * EGG_PRICE_PKR;

  if (userHens === 0 || shedHens === 0 || (deadHens === 0 && crackedEggs === 0)) {
    return {
      normalIncome,
      totalShedLossRs: 0,
      lossPerHen: 0,
      userShareOfLoss: 0,
      finalWalletCredit: normalIncome,
      hasLoss: false,
    };
  }

  // b) Total Shed Loss in Rs = (Dead Hens * Price per Hen) + (Cracked Eggs * Rs. 30)
  const totalShedLossRs = deadHens * henPrice + crackedEggs * EGG_PRICE_PKR;

  // c) Loss Per Hen = Total Shed Loss / Total Active Hens in the Shed
  const lossPerHen = shedHens > 0 ? totalShedLossRs / shedHens : 0;

  // d) User's Share of Loss = Loss Per Hen * User's Active Hens
  const rawShare = lossPerHen * userHens;
  const userShareOfLoss = Math.min(normalIncome, Math.round(rawShare));

  // e) Final Amount Added to Wallet = Normal User Income - User's Share of Loss
  const finalWalletCredit = Math.max(0, normalIncome - userShareOfLoss);

  return {
    normalIncome,
    totalShedLossRs,
    lossPerHen: Math.round(lossPerHen * 100) / 100,
    userShareOfLoss,
    finalWalletCredit,
    hasLoss: userShareOfLoss > 0,
  };
}

export interface MortalityFinancialDeductionResult {
  totalFinancialLoss: number;
  lossPerHen: number;
  userProportionalLoss: number;
  newWalletBalance: number;
}

/**
 * Natural Mortality Mudarabah Financial Loss Sharing:
 * 1. DO NOT deduct from user's "Active Hens" count (flock remains unchanged).
 * 2. Base value for 1 Hen: Rs. 1000 (HEN_REPLACEMENT_PRICE_PKR).
 * 3. Total Financial Loss: (Number of Dead Hens entered by Admin * Price per Hen).
 * 4. Loss Per Hen: (Total Financial Loss / Total Active Hens in the Shed).
 * 5. User's Proportional Loss: (User's Active Hens * Loss Per Hen).
 * 6. Deduct "User's Proportional Loss" directly from user's "Wallet Balance",
 *    allowing negative balance (e.g. -7 Rs) as a due amount that recovers from next egg profit.
 */
export function calculateMortalityFinancialDeduction(
  userActiveHensInShed: number,
  totalActiveHensInShed: number,
  deaths: number,
  currentWalletBalance: number,
  pricePerHen: number = HEN_REPLACEMENT_PRICE_PKR
): MortalityFinancialDeductionResult {
  const userHens = Math.max(0, Number(userActiveHensInShed) || 0);
  const shedHens = Math.max(userHens, Number(totalActiveHensInShed) || 0);
  const deadCount = Math.max(0, Number(deaths) || 0);
  const henPrice = Math.max(1, Number(pricePerHen) || 1000);
  const currentBal = Number(currentWalletBalance) || 0;

  if (userHens === 0 || shedHens === 0 || deadCount === 0) {
    return {
      totalFinancialLoss: 0,
      lossPerHen: 0,
      userProportionalLoss: 0,
      newWalletBalance: currentBal,
    };
  }

  const totalFinancialLoss = deadCount * henPrice;
  const lossPerHen = totalFinancialLoss / shedHens;
  const userProportionalLoss = Math.round(userHens * lossPerHen);
  const newWalletBalance = currentBal - userProportionalLoss;

  return {
    totalFinancialLoss,
    lossPerHen: Math.round(lossPerHen * 100) / 100,
    userProportionalLoss,
    newWalletBalance,
  };
}

