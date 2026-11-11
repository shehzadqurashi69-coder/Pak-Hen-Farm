import React, { useState, useEffect } from 'react';
import { UserAccount, EggCollectionRecord, GlobalFarmStats, UserAlert, FarmShed, FarmBanner } from '../types/farm';
import {
  EGG_PRICE_PKR,
  isUserLocked,
  INITIAL_SHEDS,
  calculateMedicalFee,
  isPackageActive,
  calculateActiveHens,
  getPackageExpiryDetails,
  syncUserPackagesExpiry,
  DEFAULT_BANNERS,
} from '../utils/farmRules';
import { subscribeToUserAlerts, apiPayMedicalFee, subscribeToSheds } from '../services/api';
import { t } from '../utils/translations';
import { TrustBadge } from './TrustBadge';
import { BannerSlider } from './BannerSlider';
import { CollectEggCard } from './CollectEggCard';
import { YieldChart } from './YieldChart';
import { MedicalPaymentModal } from './MedicalPaymentModal';
import {
  Wallet,
  Feather,
  Egg,
  TrendingUp,
  ArrowDownRight,
  PlusCircle,
  User,
  Gift,
  HelpCircle,
  FileText,
  Activity,
  ShieldCheck,
  Warehouse,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  ShieldAlert,
  Inbox,
  ArrowRight,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface UserDashboardProps {
  user: UserAccount;
  collections: EggCollectionRecord[];
  globalStats: GlobalFarmStats;
  onNavigate: (screen: string) => void;
  onCollectedEggs: (record: EggCollectionRecord, updatedUser: UserAccount) => void;
  lang: 'en' | 'ur';
  unreadAlertsCount?: number;
  banners?: FarmBanner[];
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  collections,
  globalStats,
  onNavigate,
  onCollectedEggs,
  lang,
  unreadAlertsCount = 0,
  banners = DEFAULT_BANNERS,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  // 90-Day Automatic Package Expiry Verification:
  const now = new Date();
  const allUserPackages = user.packages || [];
  const activePackages = allUserPackages.filter((p) => isPackageActive(p, now));
  const expiredPackages = allUserPackages.filter((p) => !isPackageActive(p, now));

  // If user has packages, live active hens strictly only come from valid, non-expired packages:
  const liveActiveHens = allUserPackages.length > 0
    ? calculateActiveHens(allUserPackages, now)
    : user.activeHens;

  // Strict 1:1 Egg Yield Math: 1 active hen yields exactly 1 egg per day
  // Once 90 days are completed, Est. Daily Income & egg generation stop automatically:
  const dailyEggs = liveActiveHens;
  const dailyIncome = dailyEggs * EGG_PRICE_PKR;

  const userLocked = isUserLocked(user);

  // Live Alerts & Sheds subscription
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [sheds, setSheds] = useState<FarmShed[]>(INITIAL_SHEDS);
  const [activeMedicalAlert, setActiveMedicalAlert] = useState<UserAlert | null>(null);
  const [payingAlertId, setPayingAlertId] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsubAlerts = subscribeToUserAlerts(user.id, (liveAlerts) => {
      setAlerts(liveAlerts);
    });
    const unsubSheds = subscribeToSheds((liveSheds) => {
      setSheds(liveSheds);
    });
    return () => {
      unsubAlerts();
      unsubSheds();
    };
  }, [user?.id]);

  // Extract assigned shed numbers from currently active packages
  const assignedShedIds = Array.from(
    new Set(activePackages.map((p) => p.shedId || 'Shed-101'))
  );
  const primaryShedId = assignedShedIds[0] || (liveActiveHens > 0 ? 'Shed-101' : null);

  // Requirement 4: DIRECT SINGLE STICKY MEDICAL ALERT (Admin Triggered, No Duplicates)
  // Deduplicate: Find exactly ONE active sickness alert for the user
  const activeSicknessAlert = alerts.find(
    (a) => a.type === 'sickness' && !a.resolved && !a.medicalFeePaid
  );
  const hasUnpaidMedical = !!activeSicknessAlert;

  // Calculate dynamic medical fee with discounts: 1 Hen=200, 2-10=15% off, 11-100+=30% off
  const userHensForFee = Math.max(1, user.activeHens || 1);
  const feeCalculation = calculateMedicalFee(userHensForFee);

  return (
    <div className="space-y-6 pb-12">
      {/* Prominently displayed Trust Badge */}
      <TrustBadge lang={lang} />

      {/* Admin Image Banner Slider (Ads System - Auto-Scrolling Carousel) */}
      <BannerSlider banners={banners} lang={lang} />

      {/* SINGLE STICKY MEDICAL ALERT BANNER (Direct on Dashboard, Non-Dismissible, Deduplicated) */}
      {activeSicknessAlert && (
        <div className="sticky top-2 z-30 rounded-3xl border-2 border-rose-500 bg-gradient-to-r from-rose-950 via-[#1e070c] to-[#0a2618] p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3 text-rose-200">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600/25 border border-rose-500/50 text-rose-300 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-rose-300 bg-rose-900/80 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                  {isUr ? '⚠️ فوری طبی ایمرجنسی' : '⚠️ URGENT MEDICAL CARE REQUIRED'}
                </span>
                <span className="text-xs font-bold text-[#f3df88]">
                  {activeSicknessAlert.shedId}
                </span>
                {feeCalculation.savingsPercent > 0 && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    {feeCalculation.savingsPercent}% {isUr ? 'رعایت لاگو' : 'OFF'}
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-[#f4efe6] text-sm sm:text-base mt-1">
                {activeSicknessAlert.title || (isUr ? strings.medicalAlertStickyTitle : strings.medicalAlertStickyTitle)}
              </h4>
              <p className="text-xs text-rose-200/90 mt-0.5 max-w-xl">
                {activeSicknessAlert.message ||
                  strings.profitPausedWarning.replace('{shedId}', activeSicknessAlert.shedId)}
              </p>
              <div className="text-[11px] text-[#f3df88]/80 mt-1 font-mono">
                {isUr ? 'فلاک گنجائش:' : 'Flock:'} {user.activeHens} {isUr ? 'مرغیاں' : 'Hens'} • {feeCalculation.tierLabel}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
            {activeSicknessAlert.paymentPendingVerification ? (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-950/80 px-4 py-2.5 text-xs font-bold text-[#f3df88]">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{isUr ? 'TID موصول • تصدیق جاری' : 'TID Submitted • In Review'}</span>
              </div>
            ) : (
              <button
                onClick={() => setActiveMedicalAlert(activeSicknessAlert)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 px-5 py-3 text-xs sm:text-sm font-black text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-xl border border-amber-400/30 whitespace-nowrap"
              >
                <HeartPulse className="h-4 w-4" />
                <span>
                  {isUr
                    ? `میڈیکل فیس ادا کریں (${feeCalculation.totalFee.toLocaleString()} روپے)`
                    : `Pay Medical Fee (Rs. ${feeCalculation.totalFee.toLocaleString()})`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prominently Displayed Assigned Shed Number on Active Package Dashboard */}
      {user.activeHens > 0 && primaryShedId && (
        <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d3420] via-[#0a2618] to-[#051a10] p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88]">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-[#f3df88]/80 block">
                {strings.assignedShed}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-[#d4af37]">
                  {primaryShedId}
                </span>
                {assignedShedIds.length > 1 && (
                  <span className="text-xs text-[#f4efe6]/70">
                    (+{assignedShedIds.slice(1).join(', ')})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#f4efe6]/70">
              {isUr ? 'فلاک کی شراکت داری:' : 'Flock Allocation:'}
            </span>
            <span className="font-bold text-[#f3df88]">
              {user.activeHens} {isUr ? 'مرغیاں' : 'Hens'}
            </span>
            <span className="text-[#d4af37]">✓</span>
          </div>
        </div>
      )}

      {/* Account Locked Banner for Banned or Suspended Users */}
      {userLocked && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-4 text-rose-200 shadow-xl">
          <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-extrabold block text-rose-300">
              {strings.accountLockedBanner.replace(
                '{status}',
                strings[`status${(user.status || 'suspended').charAt(0).toUpperCase() + (user.status || 'suspended').slice(1)}` as keyof typeof strings] || user.status || 'Suspended'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Operation Feedback Banner */}
      {(alertSuccess || alertError) && (
        <div className="space-y-3">
          {alertSuccess && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-4 text-emerald-200 text-xs sm:text-sm font-semibold">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{alertSuccess}</span>
            </div>
          )}
          {alertError && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-4 text-rose-200 text-xs sm:text-sm font-semibold">
              <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{alertError}</span>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TOP DASHBOARD: EXACT 6 PROMINENT LUXURY CARDS (ORDER 1 TO 6)
          1. My Wallet (Balance & quick status)
          2. My Profile (Account info & settings)
          3. Withdraw Cash (Instant payout gateway)
          4. Buy Hens Package (Investment & packages)
          5. Daily Egg Yield (Current active egg production)
          6. Est. Daily Income (Estimated earnings calculation)
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {/* 1. My Wallet (Showing current balance & quick status) */}
        <button
          onClick={() => onNavigate('wallet')}
          className="group relative overflow-hidden rounded-3xl p-3.5 sm:p-5 bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] text-[#051a10] border-2 border-[#fff2b2] shadow-xl shadow-[#d4af37]/35 hover:shadow-2xl hover:shadow-[#d4af37]/50 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[155px] text-left min-w-0"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase text-[#143d24] tracking-wider truncate">
                {strings.walletBalance}
              </span>
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#051a10] text-[#f3df88] shadow-md shadow-[#051a10]/40 group-hover:scale-110 transition-transform">
                <Wallet className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className={`text-lg sm:text-2xl lg:text-3xl font-black font-mono tracking-tight break-words ${user.walletBalance < 0 ? 'text-rose-900' : 'text-[#051a10]'}`}>
              {user.walletBalance < 0 ? `-Rs. ${Math.abs(user.walletBalance).toLocaleString()}` : `Rs. ${user.walletBalance.toLocaleString()}`}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] w-full font-bold text-[#143d24]">
            <span className="inline-flex items-center gap-1 truncate">
              <span className={`h-2 w-2 rounded-full ${user.walletBalance < 0 ? 'bg-rose-700 animate-pulse' : 'bg-emerald-800'}`} />
              <span className="truncate">{user.walletBalance < 0 ? (isUr ? 'منفی بیلنس • ایڈجسٹمنٹ' : 'Due Balance') : (isUr ? 'فعال اور دستیاب' : 'Active Balance')}</span>
            </span>
            <span className="text-[#051a10] font-black text-xs shrink-0 group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        {/* 2. My Profile (Account info & settings) */}
        <button
          onClick={() => onNavigate('profile')}
          className="group relative overflow-hidden rounded-3xl p-3.5 sm:p-5 bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] text-[#051a10] border-2 border-[#fff2b2] shadow-xl shadow-[#d4af37]/35 hover:shadow-2xl hover:shadow-[#d4af37]/50 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[155px] text-left min-w-0"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase text-[#143d24] tracking-wider truncate">
                {strings.navProfile}
              </span>
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#051a10] text-[#f3df88] shadow-md shadow-[#051a10]/40 group-hover:scale-110 transition-transform">
                <User className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl lg:text-2xl font-black text-[#051a10] truncate font-serif">
              {user.fullName || user.email?.split('@')[0] || (isUr ? 'شراکت دار' : 'Partner')}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] w-full font-bold text-[#143d24]">
            <span className="truncate">
              {isUr ? 'اکاؤنٹ اور ترتیبات' : 'Account & Settings'}
            </span>
            <span className="text-[#051a10] font-black text-xs shrink-0 group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        {/* 3. Withdraw Cash (Instant payout gateway) */}
        {userLocked ? (
          <div
            className="rounded-3xl border-2 border-rose-500/50 bg-gradient-to-r from-[#d4af37]/40 via-[#f3df88]/40 to-[#b38f20]/40 p-3.5 sm:p-5 shadow-xl opacity-70 cursor-not-allowed flex flex-col justify-between min-h-[135px] sm:min-h-[155px] min-w-0 text-[#051a10]"
            title="Withdrawals locked"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-black text-rose-900 uppercase truncate">
                  {strings.navWithdraw} (Locked)
                </span>
                <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-rose-900/20 text-rose-900">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-black text-rose-950">
                {strings.navWithdraw}
              </div>
            </div>
            <span className="text-[11px] text-rose-900 font-bold truncate">
              {isUr ? 'اکاؤنٹ زیر جائزہ ہے' : 'Account Under Review'}
            </span>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('withdraw')}
            className="group relative overflow-hidden rounded-3xl p-3.5 sm:p-5 bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] text-[#051a10] border-2 border-[#fff2b2] shadow-xl shadow-[#d4af37]/35 hover:shadow-2xl hover:shadow-[#d4af37]/50 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[155px] text-left min-w-0"
          >
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-black uppercase text-[#143d24] tracking-wider truncate">
                  {isUr ? 'فوری کیش آؤٹ' : 'Payout Gateway'}
                </span>
                <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#051a10] text-[#f3df88] shadow-md shadow-[#051a10]/40 group-hover:scale-110 transition-transform">
                  <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-base sm:text-xl lg:text-2xl font-black text-[#051a10] font-serif tracking-tight truncate">
                {strings.navWithdraw}
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] w-full font-bold text-[#143d24]">
              <span className="truncate">
                {isUr ? 'جاز کیش، ایزی پیسہ و بینک' : 'Instant 24/7 Payout'}
              </span>
              <span className="text-[#051a10] font-black text-xs shrink-0 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        )}

        {/* 4. Buy Hens Package (Investment & packages) */}
        {userLocked ? (
          <div
            className="rounded-3xl border-2 border-rose-500/50 bg-gradient-to-r from-[#d4af37]/40 via-[#f3df88]/40 to-[#b38f20]/40 p-3.5 sm:p-5 shadow-xl opacity-70 cursor-not-allowed flex flex-col justify-between min-h-[135px] sm:min-h-[155px] min-w-0 text-[#051a10]"
            title="Purchases locked"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-black text-rose-900 uppercase truncate">
                  {strings.navPackages} (Locked)
                </span>
                <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-rose-900/20 text-rose-900">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-black text-rose-950">
                {strings.navPackages}
              </div>
            </div>
            <span className="text-[11px] text-rose-900 font-bold truncate">
              {isUr ? 'خریداری معطل ہے' : 'Purchases Locked'}
            </span>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('packages')}
            className="group relative overflow-hidden rounded-3xl p-3.5 sm:p-5 bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] text-[#051a10] border-2 border-[#fff2b2] shadow-xl shadow-[#d4af37]/35 hover:shadow-2xl hover:shadow-[#d4af37]/50 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[155px] text-left min-w-0"
          >
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <img
                    src="/golden-hen.svg"
                    alt="Golden Hen"
                    className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 object-contain drop-shadow"
                  />
                  <span className="text-[10px] sm:text-xs font-black text-[#143d24] uppercase truncate tracking-wider">
                    {isUr ? 'شرعی سرمایہ کاری' : 'Investment'}
                  </span>
                  {expiredPackages.length > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-0.5 rounded-full bg-rose-950 text-rose-200 px-1.5 py-0.5 text-[9px] font-black uppercase border border-rose-500/50">
                      {isUr ? 'منقضی' : 'Expired'}
                    </span>
                  )}
                </div>
                <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#051a10] text-[#f3df88] shadow-md shadow-[#051a10]/40 group-hover:scale-110 transition-transform">
                  <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-base sm:text-xl lg:text-2xl font-black text-[#051a10] font-serif tracking-tight truncate">
                {expiredPackages.length > 0 && activePackages.length === 0
                  ? (isUr ? 'پیکج کی تجدید کریں' : 'Renew Package')
                  : (isUr ? 'مرغیاں خریدیں (پیکجز)' : 'Buy Hens Package')}
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] w-full font-bold text-[#143d24]">
              <span className="truncate">
                {expiredPackages.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-rose-950 font-black">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-rose-800" />
                    <span>{isUr ? `${expiredPackages.length} پیکج کی مدت ختم • تجدید کریں` : `${expiredPackages.length} Expired • Renew Now`}</span>
                  </span>
                ) : (
                  <span>{isUr ? '1 مرغی = 1,000 روپے' : 'Starts at Rs. 1,000'}</span>
                )}
              </span>
              <span className="text-[#051a10] font-black text-xs shrink-0 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        )}

        {/* 5. Daily Egg Yield (Current active egg production) */}
        <button
          onClick={() => onNavigate('profit')}
          className="group relative overflow-hidden rounded-3xl p-3.5 sm:p-5 bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] text-[#051a10] border-2 border-[#fff2b2] shadow-xl shadow-[#d4af37]/35 hover:shadow-2xl hover:shadow-[#d4af37]/50 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[155px] text-left min-w-0"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase text-[#143d24] tracking-wider truncate">
                {strings.dailyEggsYield}
              </span>
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#051a10] text-[#f3df88] shadow-md shadow-[#051a10]/40 group-hover:scale-110 transition-transform">
                <Egg className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-[#051a10] font-mono tracking-tight">
              {dailyEggs} <span className="text-xs sm:text-sm font-bold text-[#143d24]">{strings.eggsPerDay}</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] font-bold text-[#143d24] w-full">
            <span className="truncate">
              {liveActiveHens === 0 && expiredPackages.length > 0 ? (
                <span className="text-rose-950 font-black">
                  {isUr ? 'مدت ختم • پیداوار بند ہے' : '90-Day Ended • Yield Stopped'}
                </span>
              ) : (
                `${liveActiveHens} ${isUr ? 'فعال مرغیاں (1:1 تناسب)' : 'Active Hens (1:1 Yield)'}`
              )}
            </span>
            <span className="text-[#051a10] font-black text-xs shrink-0 group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        {/* 6. Est. Daily Income (Estimated earnings calculation) */}
        <button
          onClick={() => onNavigate('profit')}
          className="group relative overflow-hidden rounded-3xl p-3.5 sm:p-5 bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] text-[#051a10] border-2 border-[#fff2b2] shadow-xl shadow-[#d4af37]/35 hover:shadow-2xl hover:shadow-[#d4af37]/50 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[155px] text-left min-w-0"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase text-[#143d24] tracking-wider truncate">
                {strings.approxDailyIncome}
              </span>
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#051a10] text-[#f3df88] shadow-md shadow-[#051a10]/40 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-3xl font-black text-[#051a10] font-mono tracking-tight">
              Rs. {dailyIncome.toLocaleString()}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] font-bold text-[#143d24] w-full">
            <span className="truncate">
              {liveActiveHens === 0 && expiredPackages.length > 0 ? (
                <span className="text-rose-950 font-black">
                  {isUr ? 'تجدید پر روزانہ آمدنی بحال ہوگی' : 'Renew to Resume Daily Income'}
                </span>
              ) : (
                isUr ? '1 انڈا = 30 روپے نقد' : 'Rate: 1 Egg = Rs. 30'
              )}
            </span>
            <span className="text-[#051a10] font-black text-xs shrink-0 group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>
      </div>

      {/* Manual 24-Hour Egg Collection Section */}
      <CollectEggCard
        user={{ ...user, activeHens: liveActiveHens }}
        onCollected={onCollectedEggs}
        onExplorePackages={() => onNavigate('packages')}
        lang={lang}
        hasUnpaidMedical={hasUnpaidMedical}
        unpaidShedId={activeSicknessAlert?.shedId}
        onPayMedical={activeSicknessAlert ? () => setActiveMedicalAlert(activeSicknessAlert) : undefined}
      />

      {/* 7-Day Live Egg Yield Record */}
      <YieldChart collections={collections} lang={lang} />

      {/* Global Farm Daily Production (Live Stats from Admin) */}
      <div className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-4">
          <Activity className="h-5 w-5 text-[#d4af37]" />
          <div>
            <h3 className="text-base font-bold text-[#f4efe6]">
              {strings.liveFarmStatsTitle}
            </h3>
            <p className="text-xs text-[#f4efe6]/60">
              {isUr ? 'ملک گیر فزیکل فارم شیڈز سے مصدقہ یومیہ رپورٹ' : 'Real-time production report from nationwide physical farm sheds'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5">
            <span className="text-[10px] sm:text-xs text-[#f4efe6]/60 font-semibold block mb-1">
              {strings.statTotalCollected}
            </span>
            <span className="text-lg sm:text-2xl font-black text-[#d4af37]">
              {globalStats.totalCollected.toLocaleString()}
            </span>
          </div>

          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5">
            <span className="text-[10px] sm:text-xs text-rose-300/80 font-semibold block mb-1">
              {strings.statCracked}
            </span>
            <span className="text-lg sm:text-2xl font-black text-rose-400">
              {globalStats.cracked.toLocaleString()}
            </span>
          </div>

          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5">
            <span className="text-[10px] sm:text-xs text-emerald-300/80 font-semibold block mb-1">
              {strings.statNetFresh}
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-300">
              {globalStats.netFresh.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Requirement 6: Persistent Floating Quick-Access Navigation Bar (Farm Inbox, Invite & Earn, Help / SOS) */}
      <div className="sticky bottom-3 z-40 w-full max-w-2xl mx-auto pt-2 px-1">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-2 rounded-2xl border-2 border-[#d4af37]/60 bg-[#051a10]/95 backdrop-blur-xl shadow-2xl shadow-black/90">
          {/* Dedicated Farm Inbox Card with Live Unread Badge */}
          <button
            onClick={() => onNavigate('notifications')}
            className="relative flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0a2618] to-[#072013] p-2.5 sm:p-3 text-left hover:border-[#d4af37] hover:bg-[#0f3422] transition-all cursor-pointer active:scale-95 group shadow-md min-w-0"
          >
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88] group-hover:scale-105 transition-transform">
              <Inbox className="h-4 w-4" />
              {unreadAlertsCount > 0 && (
                <span className="sm:hidden absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-[#051a10] shadow animate-pulse">
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </span>
              )}
            </div>
            <div className="min-w-0 hidden sm:block">
              <span className="text-xs sm:text-sm font-bold text-[#f4efe6] block truncate">
                {strings.navInbox}
              </span>
              <span className="text-[10px] text-[#f4efe6]/60 block truncate">
                {isUr ? 'سرکاری الرٹس' : 'Notices & Logs'}
              </span>
            </div>
            {unreadAlertsCount > 0 && (
              <span className="hidden sm:flex ml-auto h-5 min-w-[20px] px-1.5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-[#051a10] shadow-md animate-pulse">
                {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
              </span>
            )}
            <span className="sm:hidden text-[11px] font-bold text-[#f4efe6] truncate">
              {strings.navInbox}
            </span>
          </button>

          {/* Invite & Earn */}
          <button
            onClick={() => onNavigate('invite')}
            className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0a2618] to-[#072013] p-2.5 sm:p-3 text-left hover:border-[#d4af37] hover:bg-[#0f3422] transition-all cursor-pointer active:scale-95 group shadow-md min-w-0"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88] group-hover:scale-105 transition-transform">
              <Gift className="h-4 w-4" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <span className="text-xs sm:text-sm font-bold text-[#f4efe6] block truncate">
                {strings.navInvite}
              </span>
              <span className="text-[10px] text-[#f4efe6]/60 block truncate">
                {isUr ? 'کمائیں' : 'Refer & Earn'}
              </span>
            </div>
            <span className="sm:hidden text-[11px] font-bold text-[#f4efe6] truncate">
              {strings.navInvite}
            </span>
          </button>

          {/* Emergency Help / SOS Helpline */}
          <button
            onClick={() => onNavigate('help')}
            className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-amber-500/50 bg-gradient-to-r from-[#140b02] to-[#0a2618] p-2.5 sm:p-3 text-left hover:border-amber-400 hover:bg-[#1a0e05] transition-all cursor-pointer active:scale-95 group shadow-md min-w-0"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/25 border border-amber-400/50 text-amber-300 group-hover:scale-105 transition-transform">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <span className="text-xs sm:text-sm font-bold text-[#f4efe6] block truncate">
                {strings.navHelp}
              </span>
              <span className="text-[10px] text-amber-300/70 block truncate">
                {isUr ? 'ہیلپ لائن' : 'SOS Support'}
              </span>
            </div>
            <span className="sm:hidden text-[11px] font-bold text-amber-300 truncate">
              {strings.navHelp}
            </span>
          </button>
        </div>
      </div>

      {/* Terms & Helpline quick bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/80 p-3.5 text-xs">
        <div className="flex items-center gap-2 text-[#f4efe6]/70">
          <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
          <span>{isUr ? '100% مصدقہ حقیقی فزیکل پولٹری فارمنگ' : '100% Verified Physical Poultry Farming'}</span>
        </div>

        <button
          onClick={() => onNavigate('terms')}
          className="flex items-center gap-1.5 text-[#f3df88] font-bold hover:underline cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{strings.navTerms}</span>
        </button>
      </div>

      {/* Medical Payment Modal (Phase 3: Tiered Bulk Discounts + Low-Wallet JazzCash/USDT TID) */}
      {activeMedicalAlert && (
        <MedicalPaymentModal
          isOpen={!!activeMedicalAlert}
          onClose={() => setActiveMedicalAlert(null)}
          user={user}
          alert={activeMedicalAlert}
          language={lang}
          onSuccess={(updatedUser) => {
            setActiveMedicalAlert(null);
            setAlertSuccess(strings.feePaidSuccess);
            if (updatedUser && collections.length > 0) {
              onCollectedEggs(collections[0], updatedUser);
            }
          }}
        />
      )}
    </div>
  );
};
