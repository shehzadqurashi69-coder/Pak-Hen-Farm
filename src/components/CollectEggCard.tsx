import React, { useState, useEffect } from 'react';
import { UserAccount, EggCollectionRecord } from '../types/farm';
import { checkCollectionEligibility, calculateCycleEligibleHens, isUserLocked } from '../utils/farmRules';
import { apiCollectEggs } from '../services/api';
import { t } from '../utils/translations';
import { Egg, Clock, Sparkles, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

interface CollectEggCardProps {
  user: UserAccount;
  onCollected: (record: EggCollectionRecord, updatedUser: UserAccount) => void;
  onExplorePackages: () => void;
  lang: 'en' | 'ur';
  hasUnpaidMedical?: boolean;
  unpaidShedId?: string;
  onPayMedical?: () => void;
}

export const CollectEggCard: React.FC<CollectEggCardProps> = ({
  user,
  onCollected,
  onExplorePackages,
  lang,
  hasUnpaidMedical = false,
  unpaidShedId,
  onPayMedical,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [ticker, setTicker] = useState(0);
  const [successInfo, setSuccessInfo] = useState<{
    eggs: number;
    cash: number;
    normalIncome?: number;
    shedLossDeduction?: number;
    missedDays?: number;
    totalProfit?: number;
  } | null>(null);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);

  // Re-calculate eligibility on tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const userLocked = isUserLocked(user);
  const { eligibleHens, midCycleHens } = calculateCycleEligibleHens(
    user.packages || [],
    user.activeHens,
    user.lastEggCollectionAt,
    new Date()
  );

  const eligibility = checkCollectionEligibility(user.activeHens, user.lastEggCollectionAt, new Date());
  // Requirement 3: STRICT 1:1 EGG YIELD MATH (1 Active Hen = Exactly 1 Egg per day)
  const effectiveEggs = user.activeHens;
  const effectiveCash = effectiveEggs * 30;

  const handleCollect = async () => {
    if (!eligibility.canCollect || collecting || userLocked) return;

    try {
      setCollecting(true);
      setCollectError(null);
      const res = await apiCollectEggs(user);
      setSuccessInfo({
        eggs: res.record.eggsCollected,
        cash: res.record.cashEarned,
        normalIncome: res.record.normalIncome,
        shedLossDeduction: res.record.shedLossDeduction,
        missedDays: res.missedDays,
        totalProfit: res.totalProfit,
      });
      onCollected(res.record, res.updatedUser);

      setTimeout(() => {
        setSuccessInfo(null);
      }, 8000);
    } catch (err: any) {
      setCollectError(err.message || 'Error collecting eggs');
      setTimeout(() => setCollectError(null), 6000);
    } finally {
      setCollecting(false);
    }
  };

  const formatTimer = (h: number, m: number, s: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0a2618] via-[#0d3420] to-[#051a10] p-6 sm:p-7 shadow-2xl backdrop-blur-md">
      {/* Background egg watermark */}
      <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-[#d4af37]">
        <Egg className="h-56 w-56" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f3df88] to-[#d4af37] text-[#051a10] shadow-lg shadow-[#d4af37]/30">
              <Egg className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#f4efe6]">
                {strings.collectDailyEggsBtn}
              </h2>
              <p className="text-xs text-[#f3df88]/80 font-medium">
                {isUr ? '1 انڈا = 30 روپے نقد رقم | ہر 24 گھنٹے بعد دستی وصولی' : '1 Egg = Rs. 30 Cash | 24-Hour Manual Collection'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 px-3 py-1.5 text-xs font-bold text-[#f3df88]">
            <Sparkles className="h-4 w-4 text-[#d4af37]" />
            <span>
              {midCycleHens > 0
                ? strings.midCycleHensNotice
                    .replace('{eligible}', String(eligibleHens))
                    .replace('{midCycle}', String(midCycleHens))
                : isUr
                ? `${user.activeHens} مرغیاں = اندازاً ${user.activeHens} انڈے روزانہ`
                : `${user.activeHens} Hens = Estimated Daily ${user.activeHens} Eggs (Andazan)`}
            </span>
          </div>
        </div>

        {/* Error Alert (Inline, No window.alert) */}
        {collectError && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-500/50 bg-rose-950/90 p-4 text-xs text-rose-200 shadow-xl animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <span>{collectError}</span>
          </div>
        )}

        {/* Success Toast with Catch-Up Support */}
        {successInfo && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-950/90 p-4 text-emerald-200 animate-in fade-in slide-in-from-top-2 shadow-xl">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-emerald-300">
                  {isUr
                    ? `مبارک ہو! آپ نے ${successInfo.eggs} انڈے وصول کر لیے ہیں۔`
                    : `Success! You collected ${successInfo.eggs} Eggs.`}
                </p>
                {successInfo.missedDays && successInfo.missedDays > 1 && (
                  <span className="rounded-full bg-[#d4af37]/25 border border-[#d4af37]/50 px-2.5 py-0.5 text-[10px] font-black text-[#f3df88] uppercase tracking-wider animate-pulse">
                    ⚡ {isUr ? `${successInfo.missedDays} دن کی کیچ اپ وصولی!` : `${successInfo.missedDays}-Day Catch-Up Sequential Credit!`}
                  </span>
                )}
              </div>

              {successInfo.shedLossDeduction && successInfo.shedLossDeduction > 0 ? (
                <div className="text-xs space-y-0.5 bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center justify-between text-[#f4efe6]/80">
                    <span>{isUr ? 'معمول کی آمدن (1:1 شرح):' : 'Normal Gross Income (1:1):'}</span>
                    <span className="font-semibold text-emerald-300">Rs. {successInfo.normalIncome?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-300/90">
                    <span>{isUr ? 'فلاک کی قدرتی شرح نقصان میں حصہ:' : 'Proportional Shed Loss Share:'}</span>
                    <span className="font-semibold text-rose-300">-Rs. {successInfo.shedLossDeduction.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-emerald-500/30 pt-1 font-bold text-white">
                    <span>{isUr ? 'والٹ میں شامل حتمی رقم:' : 'Final Added to Wallet:'}</span>
                    <span className="text-[#f3df88] text-sm font-black">+Rs. {((successInfo.totalProfit || successInfo.cash)).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-300/80">
                  {isUr
                    ? `کل رقم +Rs. ${((successInfo.totalProfit || successInfo.cash)).toLocaleString()} براہِ راست آپ کے والٹ بیلنس میں شامل کر دی گئی ہے۔`
                    : `+Rs. ${((successInfo.totalProfit || successInfo.cash)).toLocaleString()} cash immediately deposited into your visible wallet.`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* State 0: Banned or Suspended User Lock */}
        {userLocked && (
          <div className="rounded-2xl border border-rose-500/50 bg-rose-950/80 p-5 text-center space-y-2 shadow-lg">
            <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <span>
                {strings.accountLockedBanner.replace('{status}', strings[`status${(user.status || 'suspended').charAt(0).toUpperCase() + (user.status || 'suspended').slice(1)}` as keyof typeof strings] || user.status || 'Suspended')}
              </span>
            </div>
            <p className="text-xs text-rose-200/70">
              {isUr
                ? 'اکاؤنٹ پر پابندی یا معطلی کے باعث انڈوں کی یومیہ وصولی اور رقم نکلوانا مکمل طور پر بند ہے۔'
                : 'Due to account suspension or ban, daily egg collection and withdrawals are strictly locked.'}
            </p>
            <button
              disabled
              className="mt-2 w-full rounded-xl bg-rose-900/40 border border-rose-500/30 py-3 text-xs font-bold text-rose-300/60 cursor-not-allowed opacity-60"
            >
              {strings.lockedCollectBtn.replace('{status}', user.status || 'suspended')}
            </button>
          </div>
        )}

        {/* State 1: No active hens */}
        {!userLocked && user.activeHens === 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-amber-200 text-xs sm:text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
              <span>{strings.noHensYetAlert}</span>
            </div>
            <button
              onClick={onExplorePackages}
              className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-4 py-2 text-xs font-bold text-[#051a10] hover:opacity-90 transition-all cursor-pointer shadow-md shadow-[#d4af37]/20 whitespace-nowrap active:scale-95"
            >
              {strings.explorePackagesBtn}
            </button>
          </div>
        )}

        {/* State 2: Unpaid Medical Fee -> Collection Paused */}
        {!userLocked && user.activeHens > 0 && hasUnpaidMedical && (
          <div className="rounded-2xl border border-rose-500/50 bg-rose-950/80 p-5 text-center space-y-3 shadow-lg">
            <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
              <AlertCircle className="h-5 w-5 text-rose-400 animate-pulse" />
              <span>
                {strings.profitPausedWarning.replace('{shedId}', unpaidShedId || 'Shed')}
              </span>
            </div>
            <p className="text-xs text-rose-200/80 max-w-md mx-auto">
              {isUr
                ? 'مرغیوں کی نگہداشت اور علاج کی 200 روپے فیس ادا کرنے کے بعد آپ کا یومیہ انڈوں کا منافع فوری بحال ہو جائے گا۔'
                : 'Medical treatment must be cleared to protect physical flock health. Pay Rs. 200 medical charges to resume daily egg collection.'}
            </p>
            {onPayMedical && (
              <button
                onClick={onPayMedical}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-[#d4af37] px-6 py-2.5 text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-950/40"
              >
                <span>{strings.payMedicalFeeBtn}</span>
              </button>
            )}
          </div>
        )}

        {/* State 3: Has hens, healthy, ready to collect */}
        {!userLocked && user.activeHens > 0 && !hasUnpaidMedical && eligibility.canCollect && (
          <div className="pt-2 space-y-2">
            <button
              onClick={handleCollect}
              disabled={collecting}
              className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] p-4 sm:p-5 text-[#051a10] shadow-xl shadow-[#d4af37]/30 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer font-black text-base sm:text-lg flex items-center justify-center gap-3 border-2 border-[#fff2b2]"
            >
              <Egg className="h-6 w-6 sm:h-7 sm:w-7 text-[#051a10] group-hover:scale-110 transition-transform" />
              <span>
                {isUr
                  ? `ابھی ${effectiveEggs} انڈے وصول کریں (+Rs. ${effectiveCash})`
                  : `Collect Now: ${effectiveEggs} Eggs (+Rs. ${effectiveCash})`}
              </span>
              <Sparkles className="h-5 w-5 text-[#051a10] group-hover:rotate-12 transition-transform" />
            </button>
            {midCycleHens > 0 && (
              <p className="text-center text-[11px] text-[#f3df88]/80 font-medium">
                {strings.midCycleHensNoteFooter}
              </p>
            )}
          </div>
        )}

        {/* State 4: Has hens, healthy, already collected in the last 24h -> Countdown */}
        {!userLocked && user.activeHens > 0 && !hasUnpaidMedical && !eligibility.canCollect && (
          <div className="rounded-2xl border border-[#d4af37]/30 bg-[#051a10]/70 p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#f3df88]">
              <Clock className="h-4 w-4 text-[#d4af37]" />
              <span>{strings.nextCollectionIn}:</span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-[#d4af37] drop-shadow-md min-h-[36px] flex items-center justify-center tabular-nums">
              {formatTimer(eligibility.remainingHours, eligibility.remainingMinutes, eligibility.remainingSeconds)}
            </div>
            <p className="text-xs text-[#f4efe6]/60">
              {isUr
                ? 'قاعدہ: چونکہ انڈے روزانہ 24 گھنٹے بعد تیار ہوتے ہیں، اگلا بٹن وقت پورا ہونے پر خود بخود فعال ہو جائے گا۔'
                : 'Rule: Hen egg cycle is strictly 24 hours. The collection button unlocks when timer reaches zero.'}
            </p>
            {midCycleHens > 0 && (
              <p className="text-[11px] text-[#f3df88]/80 font-medium pt-1 border-t border-[#d4af37]/20">
                {strings.midCycleHensNoteFooter}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
