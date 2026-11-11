import React from 'react';
import { UserAccount, EggCollectionRecord } from '../types/farm';
import { getPackageExpiryDetails, isPackageActive } from '../utils/farmRules';
import { t } from '../utils/translations';
import {
  ArrowLeft,
  TrendingUp,
  Egg,
  Feather,
  Clock,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Warehouse,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface ProfitViewProps {
  user: UserAccount;
  collections: EggCollectionRecord[];
  lang: 'en' | 'ur';
  onNavigate: (screen: string) => void;
}

export const ProfitView: React.FC<ProfitViewProps> = ({
  user,
  collections,
  lang,
  onNavigate,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';
  const now = new Date();

  const allUserPackages = user.packages || [];
  const activePackages = allUserPackages.filter((p) => isPackageActive(p, now));
  const expiredPackages = allUserPackages.filter((p) => !isPackageActive(p, now));

  const liveActiveHens = activePackages.reduce((sum, p) => sum + (Number(p.hens) || 0), 0);
  const dailyEggs = liveActiveHens;
  const dailyIncome = dailyEggs * 30;

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 rounded-2xl border border-[#d4af37]/40 bg-[#051a10] px-4 py-2 text-xs font-bold text-[#f3df88] hover:bg-[#0a2618] hover:border-[#d4af37] transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isUr ? 'ڈیش بورڈ پر واپس جائیں' : 'Back to Dashboard'}</span>
        </button>

        <button
          onClick={() => onNavigate('packages')}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-[#d4af37] px-4 py-2 text-xs font-black text-[#051a10] hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#d4af37]/25"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{isUr ? 'نیا پیکج خریدیں' : 'Buy New Package'}</span>
        </button>
      </div>

      {/* Hero Overview */}
      <div className="rounded-3xl border-2 border-[#fff2b2] bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] p-6 sm:p-8 shadow-2xl text-[#051a10]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#143d24]">
                {isUr ? 'میرے فلاک کا یومیہ منافع' : 'My Flock Production & Profit'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#051a10] text-[#f3df88] text-[10px] font-mono font-bold">
                100% SHARIAH MUDARABAH
              </span>
            </div>
            <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-[#051a10]">
              Rs. {dailyIncome.toLocaleString()} <span className="text-sm sm:text-lg font-bold text-[#143d24]">/ Day</span>
            </div>
            <p className="text-xs text-[#143d24] font-bold mt-1">
              {isUr
                ? `100% حقیقی پیداوار: 1 مرغی = 1 انڈا = 30 روپے یومیہ نقد`
                : `100% Real Physical Yield: 1 Hen = 1 Egg = Rs. 30 Cash per Day`}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#143d24]/20">
            <div className="bg-[#051a10]/15 p-2.5 rounded-2xl border border-[#143d24]/20 text-center sm:text-right">
              <span className="text-[10px] font-bold uppercase text-[#143d24] block">
                {isUr ? 'فعال مرغیاں:' : 'Active Hens:'}
              </span>
              <span className="text-base sm:text-lg font-black text-[#051a10]">
                {liveActiveHens} {isUr ? 'مرغیاں' : 'Hens'}
              </span>
            </div>
            <div className="bg-[#051a10]/15 p-2.5 rounded-2xl border border-[#143d24]/20 text-center sm:text-right">
              <span className="text-[10px] font-bold uppercase text-[#143d24] block">
                {isUr ? 'یومیہ انڈے:' : 'Daily Eggs:'}
              </span>
              <span className="text-base sm:text-lg font-black text-[#051a10]">
                {dailyEggs} {isUr ? 'انڈے' : 'Eggs'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SHIFTED: "My Flock Packages" (Moved from main home screen as requested in Requirement 5) */}
      <div className="rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/90 p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d4af37]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88]">
              <Feather className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#f4efe6]">
                {isUr ? 'میرے فلاک پیکجز (90 روزہ مقررہ مدت)' : 'My Flock Packages (90-Day Strict Validity)'}
              </h3>
              <p className="text-xs text-[#f4efe6]/60">
                {isUr
                  ? 'خریداری کی تاریخ سے مکمل 90 دن تک منافع حاصل ہوتا ہے، جس کے بعد پیکج ازخود منقضی ہو جاتا ہے۔'
                  : 'Each package produces daily egg yield for strictly 90 days from purchase date.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            {activePackages.length > 0 && (
              <span className="rounded-full bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 text-emerald-300">
                {activePackages.length} {isUr ? 'فعال پیکج' : 'Active'}
              </span>
            )}
            {expiredPackages.length > 0 && (
              <span className="rounded-full bg-rose-950/80 border border-rose-500/60 px-3 py-1 text-rose-300">
                {expiredPackages.length} {isUr ? 'منقضی شدہ' : 'Expired'}
              </span>
            )}
          </div>
        </div>

        {allUserPackages.length === 0 ? (
          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/60 p-8 text-center text-xs text-[#f4efe6]/60 space-y-3">
            <Feather className="h-8 w-8 text-[#d4af37]/50 mx-auto" />
            <p>{isUr ? 'آپ کے پاس ابھی کوئی فلاک پیکج نہیں ہے۔' : 'You do not have any flock packages yet.'}</p>
            <button
              onClick={() => onNavigate('packages')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#d4af37] px-4 py-2 text-xs font-bold text-[#051a10] hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isUr ? 'پہلا پیکج منتخب کریں' : 'Choose Your First Flock Package'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allUserPackages.map((pkg) => {
              const details = getPackageExpiryDetails(pkg, now);
              return (
                <div
                  key={pkg.id}
                  className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all ${
                    details.isExpired
                      ? 'border-rose-500/50 bg-gradient-to-br from-rose-950/40 via-[#18070a] to-[#051a10] shadow-lg'
                      : 'border-[#d4af37]/35 bg-gradient-to-br from-[#051a10] to-[#0a2618] shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-[#f3df88]">
                          {pkg.hens} {isUr ? 'مرغیاں' : 'Hens'}
                        </span>
                        <span className="text-xs text-[#f4efe6]/70 font-mono">
                          (Rs. {pkg.purchasePrice.toLocaleString()})
                        </span>
                        <span className="px-2 py-0.5 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f3df88] font-mono font-bold text-[10px]">
                          {pkg.shedId || 'Shed-101'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#f4efe6]/50 mt-0.5">
                        {isUr ? 'خریداری کی تاریخ:' : 'Purchased:'} {details.purchaseDate.toLocaleDateString(isUr ? 'ur-PK' : 'en-US')}
                      </div>
                    </div>

                    <div>
                      {details.isExpired ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-500/60 inline-flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          <span>{isUr ? 'پیکج ختم ہو گیا' : 'Package Expired'}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/60 inline-flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{isUr ? 'فعال (90 دن)' : 'Active (90 Days)'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#f4efe6]/60">
                        {details.isExpired ? (isUr ? 'منقضی تاریخ:' : 'Expired on:') : (isUr ? 'آخری تاریخ:' : 'Valid until:')}
                      </span>
                      <span className={`font-mono font-bold ${details.isExpired ? 'text-rose-400' : 'text-amber-300'}`}>
                        {details.expiryDate.toLocaleDateString(isUr ? 'ur-PK' : 'en-US')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#f4efe6]/60">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#d4af37]" />
                          <span>{isUr ? '90 روزہ میعاد کی پیشرفت' : '90-Day Validity Progress'}</span>
                        </span>
                        <span className="font-mono font-bold">
                          {details.isExpired
                            ? (isUr ? '90/90 دن (100%)' : '90/90 Days (100%)')
                            : `${details.daysElapsed}/90 Days (${details.daysRemaining}d left)`}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            details.isExpired
                              ? 'bg-rose-500'
                              : details.percentElapsed > 80
                              ? 'bg-amber-400'
                              : 'bg-gradient-to-r from-emerald-400 to-[#d4af37]'
                          }`}
                          style={{ width: `${details.percentElapsed}%` }}
                        />
                      </div>
                    </div>

                    {/* Yield / Expiry Status Message */}
                    <div className="pt-1.5">
                      {details.isExpired ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-rose-300/90 leading-tight">
                            {isUr
                              ? '⚠️ اس پیکج کی 90 روزہ میعاد مکمل ہو چکی ہے۔ روزانہ آمدنی روک دی گئی ہے۔ دوبارہ آمدنی کیلئے تجدید کریں۔'
                              : '⚠️ 90-day validity completed. Daily egg yield for this package has stopped.'}
                          </p>
                          <button
                            onClick={() => onNavigate('packages')}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-600 text-[#051a10] font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>{isUr ? 'پیکج کی تجدید کریں / نیا خریدیں' : 'Renew / Buy New Package'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-emerald-300 font-bold bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/20">
                          <span>{isUr ? 'موجودہ یومیہ منافع:' : 'Current Daily Yield:'}</span>
                          <span className="font-mono">+{pkg.hens} Eggs (+Rs. {pkg.hens * 30}/day)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Collections History in My Profit */}
      <div className="rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/90 p-5 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#d4af37]/20">
          <Egg className="h-5 w-5 text-[#d4af37]" />
          <h3 className="text-base font-extrabold text-[#f4efe6]">
            {isUr ? 'یومیہ انڈوں کی وصولی کا ریکارڈ' : 'Daily Egg Collection Records'}
          </h3>
        </div>

        {collections.length === 0 ? (
          <p className="text-xs text-[#f4efe6]/50 text-center py-4">
            {isUr ? 'کوئی کلیکشن ریکارڈ نہیں ملا۔' : 'No egg collection records found yet.'}
          </p>
        ) : (
          <div className="space-y-2">
            {collections.slice(0, 15).map((col) => (
              <div
                key={col.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#f3df88]">
                      +{col.eggsCollected} {isUr ? 'انڈے' : 'Eggs'} (+Rs. {col.cashEarned.toLocaleString()})
                    </span>
                    {col.shedLossDeduction && col.shedLossDeduction > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        -{col.shedLossDeduction} Rs. Loss
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-[#f4efe6]/50">
                    {new Date(col.timestamp).toLocaleString(isUr ? 'ur-PK' : 'en-US')} • {col.hensCount} {isUr ? 'مرغیاں' : 'Hens'}
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold font-mono">
                  Credited to Wallet ✓
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
