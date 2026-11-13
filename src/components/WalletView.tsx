import React, { useState } from 'react';
import { UserAccount, EggCollectionRecord } from '../types/farm';
import { PaymentLogo } from './PaymentLogos';
import { ReferralMilestoneBoard } from './ReferralMilestoneBoard';
import { apiUpdateUserProfile } from '../services/api';
import { setCurrentUser } from '../services/storage';
import { t } from '../utils/translations';
import {
  ArrowLeft,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Save,
  CreditCard,
  Building2,
  Loader2,
  Egg,
  Gift,
} from 'lucide-react';

interface WalletViewProps {
  user: UserAccount;
  collections: EggCollectionRecord[];
  lang: 'en' | 'ur';
  onNavigate: (screen: string) => void;
  onUserUpdated?: (updatedUser: UserAccount) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  user,
  collections,
  lang,
  onNavigate,
  onUserUpdated,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  // Payment method selection state
  const [selectedGateway, setSelectedGateway] = useState<string>(
    user.paymentGateway || 'easypaisa'
  );
  const [accountTitle, setAccountTitle] = useState(
    user.paymentAccountTitle || user.easypaisaTitle || ''
  );
  const [accountNumber, setAccountNumber] = useState(
    user.paymentAccountNumber || user.easypaisaNumber || ''
  );
  const [bankName, setBankName] = useState(user.paymentBankName || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Dynamic Gateway Labels & Placeholders
  const getGatewayConfig = (gw: string) => {
    switch (gw) {
      case 'jazzcash':
        return {
          name: 'JazzCash',
          titleLabel: isUr ? 'جاز کیش اکاؤنٹ ٹائٹل (وصول کنندہ کا نام) *' : 'JazzCash Account Title (Receiver Name) *',
          titlePlaceholder: isUr ? 'مثلاً محمد علی' : 'e.g. Muhammad Ali',
          numberLabel: isUr ? 'جاز کیش موبائل اکاؤنٹ نمبر *' : 'JazzCash Mobile Account Number *',
          numberPlaceholder: '03XXXXXXXXX',
        };
      case 'sadapay':
        return {
          name: 'SadaPay',
          titleLabel: isUr ? 'سادہ پے اکاؤنٹ ٹائٹل *' : 'SadaPay Account Title *',
          titlePlaceholder: isUr ? 'مثلاً محمد علی' : 'e.g. Muhammad Ali',
          numberLabel: isUr ? 'سادہ پے موبائل / آئی بین نمبر *' : 'SadaPay Mobile / IBAN Number *',
          numberPlaceholder: '03XXXXXXXXX or PK00SADA...',
        };
      case 'upaisa':
        return {
          name: 'UPaisa',
          titleLabel: isUr ? 'یوپیسہ اکاؤنٹ ٹائٹل *' : 'UPaisa Account Title *',
          titlePlaceholder: isUr ? 'مثلاً محمد علی' : 'e.g. Muhammad Ali',
          numberLabel: isUr ? 'یوپیسہ موبائل اکاؤنٹ نمبر *' : 'UPaisa Mobile Account Number *',
          numberPlaceholder: '03XXXXXXXXX',
        };
      case 'bank':
        return {
          name: isUr ? 'بینک / راست' : 'Bank / Raast',
          titleLabel: isUr ? 'بینک اکاؤنٹ ٹائٹل (اکاؤنٹ ہولڈر کا نام) *' : 'Bank Account Title (Account Holder Name) *',
          titlePlaceholder: isUr ? 'مثلاً محمد علی' : 'e.g. Muhammad Ali',
          numberLabel: isUr ? 'بینک اکاؤنٹ نمبر / 24 ہندسوں کا IBAN / راست آئی ڈی *' : 'Bank Account Number / 24-Digit IBAN / Raast ID *',
          numberPlaceholder: 'PK00MEZN00... or 03XXXXXXXXX',
        };
      case 'easypaisa':
      default:
        return {
          name: 'Easypaisa',
          titleLabel: isUr ? 'ایزی پیسہ اکاؤنٹ ٹائٹل (وصول کنندہ کا نام) *' : 'Easypaisa Account Title (Receiver Name) *',
          titlePlaceholder: isUr ? 'مثلاً محمد علی' : 'e.g. Muhammad Ali',
          numberLabel: isUr ? 'ایزی پیسہ موبائل اکاؤنٹ نمبر *' : 'Easypaisa Mobile Account Number *',
          numberPlaceholder: '03XXXXXXXXX',
        };
    }
  };

  const currentGwConfig = getGatewayConfig(selectedGateway);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveSuccess('');
    setSaveError('');

    const cleanTitle = accountTitle.trim();
    const cleanNumber = accountNumber.trim();
    const cleanBank = bankName.trim();

    if (!cleanTitle || !cleanNumber) {
      setSaveError(isUr ? 'براہ کرم اکاؤنٹ کا ٹائٹل اور نمبر درج کریں۔' : 'Please provide account title and account number.');
      return;
    }

    try {
      setIsSaving(true);
      const updates = {
        paymentGateway: selectedGateway,
        paymentAccountTitle: cleanTitle,
        paymentAccountNumber: cleanNumber,
        paymentBankName: cleanBank,
        easypaisaTitle: cleanTitle,
        easypaisaNumber: cleanNumber,
      };

      const updatedUser = await apiUpdateUserProfile(user.id, updates);
      setCurrentUser(updatedUser);
      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }
      setSaveSuccess(isUr ? 'اکاؤنٹ کی تفصیلات کامیابی سے محفوظ ہو گئیں!' : 'Payment account details saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving payment account');
    } finally {
      setIsSaving(false);
    }
  };

  // Daily yield and loss summary
  const dailyIncomePotential = (user.activeHens || 0) * 30;
  const recentCollections = collections.slice(0, 10);
  const totalCollectionsEarnings = collections.reduce((acc, c) => acc + (c.cashEarned || 0), 0);
  const totalShedDeductions = collections.reduce((acc, c) => acc + (c.shedLossDeduction || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 rounded-2xl border border-[#d4af37]/40 bg-[#051a10] px-4 py-2 text-xs font-bold text-[#f3df88] hover:bg-[#0a2618] hover:border-[#d4af37] transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isUr ? 'ڈیش بورڈ پر واپس جائیں' : 'Back to Dashboard'}</span>
        </button>

        <button
          onClick={() => onNavigate('withdraw')}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-[#d4af37] px-4 py-2 text-xs font-black text-[#051a10] hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#d4af37]/25"
        >
          <ArrowDownRight className="h-4 w-4" />
          <span>{strings.navWithdraw}</span>
        </button>
      </div>

      {/* Hero Wallet Balance Card */}
      <div className="rounded-3xl border-2 border-[#fff2b2] bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] p-6 sm:p-8 shadow-2xl text-[#051a10]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#143d24]">
                {strings.walletBalance}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#051a10] text-[#f3df88] text-[10px] font-mono font-bold">
                {user.walletBalance < 0 ? 'DUE / ADJUSTMENT' : 'ACTIVE & VERIFIED'}
              </span>
            </div>
            <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-[#051a10]">
              {user.walletBalance < 0
                ? `-Rs. ${Math.abs(user.walletBalance).toLocaleString()}`
                : `Rs. ${user.walletBalance.toLocaleString()}`}
            </div>
            <p className="text-xs text-[#143d24] font-bold mt-1">
              {isUr
                ? `100% حقیقی نقد رقم • مساوی تقریباً ${Math.max(0, Math.floor(user.walletBalance / 30)).toLocaleString()} انڈے`
                : `100% Real Cash Balance • Equivalent to ~${Math.max(0, Math.floor(user.walletBalance / 30)).toLocaleString()} Eggs`}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#143d24]/20">
            <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase text-[#143d24] block">
                  {isUr ? 'فعال مرغیاں:' : 'Active Flock:'}
                </span>
                <span className="text-base sm:text-lg font-black text-[#051a10]">
                  {user.activeHens || 0} {isUr ? 'مرغیاں' : 'Hens'}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase text-[#143d24] block">
                  {isUr ? 'متوقع یومیہ منافع:' : 'Daily Yield:'}
                </span>
                <span className="text-base sm:text-lg font-black text-[#051a10]">
                  +Rs. {dailyIncomePotential.toLocaleString()}/day
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('invite')}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#051a10] px-4 py-2.5 text-xs font-black text-[#f3df88] border border-[#f3df88]/30 shadow-lg hover:bg-[#0d3420] active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Gift className="h-4 w-4 text-[#f3df88]" />
              <span>{strings.navInvite}</span>
              <span className="rounded-md bg-[#d4af37] px-1.5 py-0.5 text-[10px] font-black text-[#051a10]">
                10%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Invite & Earn — Dynamic Milestone & Target Bonus System */}
      <ReferralMilestoneBoard
        user={user}
        lang={lang}
        onUserUpdated={onUserUpdated}
        onOpenFullInvite={() => onNavigate('invite')}
        compactShareBar
      />

      {/* SECTION A: Account / Payment Method Update Settings */}
      <div className="rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/90 p-5 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#d4af37]/20">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88]">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#f4efe6]">
              {isUr ? 'اکاؤنٹ اور ادائیگی کا طریقہ کار اپ ڈیٹ کریں' : 'Account & Payment Method Settings'}
            </h3>
            <p className="text-xs text-[#f4efe6]/60">
              {isUr
                ? 'کسی بھی وقت اپنا جاز کیش، ایزی پیسہ، سادہ پے، یوپیسہ یا بینک اکاؤنٹ تبدیل اور محفوظ کریں۔'
                : 'Update your official payout account at any time for instant, seamless withdrawals.'}
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-4 text-emerald-200 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-4 text-rose-200 text-xs sm:text-sm font-semibold">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSaveAccount} className="space-y-4 max-w-2xl">
          {/* Gateway Selector Buttons */}
          <div>
            <label className="block text-xs font-bold text-[#f3df88] mb-2">
              {isUr ? 'ادائیگی کا گیٹ وے منتخب کریں:' : 'Select Payment Gateway / Method:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'easypaisa', label: 'Easypaisa' },
                { id: 'jazzcash', label: 'JazzCash' },
                { id: 'sadapay', label: 'SadaPay' },
                { id: 'upaisa', label: 'UPaisa' },
                { id: 'bank', label: 'Bank / Raast' },
              ].map((gw) => {
                const isSelected = selectedGateway === gw.id;
                return (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setSelectedGateway(gw.id)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#d4af37] bg-[#d4af37]/25 shadow-lg shadow-[#d4af37]/20 scale-[1.02]'
                        : 'border-[#d4af37]/20 bg-[#051a10] hover:border-[#d4af37]/50'
                    }`}
                  >
                    <PaymentLogo method={gw.id} size="md" />
                    <span className="text-[11px] font-bold text-[#f4efe6] text-center">
                      {gw.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                {currentGwConfig.titleLabel}
              </label>
              <input
                type="text"
                required
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                placeholder={currentGwConfig.titlePlaceholder}
                className="w-full rounded-xl border border-[#d4af37]/35 bg-[#051a10] py-2.5 px-3 text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                {currentGwConfig.numberLabel}
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={currentGwConfig.numberPlaceholder}
                className="w-full rounded-xl border border-[#d4af37]/35 bg-[#051a10] py-2.5 px-3 font-mono text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
          </div>

          {selectedGateway === 'bank' && (
            <div>
              <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                {isUr ? 'بینک کا نام (اختیاری)' : 'Bank Name (e.g. Meezan Bank, HBL, Allied Bank)'}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-[#d4af37]/60" />
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Meezan Bank Ltd"
                  className="w-full rounded-xl border border-[#d4af37]/35 bg-[#051a10] py-2.5 pl-9 pr-3 text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-600 px-6 py-3 text-xs font-black text-[#051a10] hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#d4af37]/25 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isUr ? 'محفوظ ہو رہا ہے...' : 'Saving Account...'}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isUr ? 'اکاؤنٹ کی تفصیلات محفوظ کریں' : 'Save Payment Account Details'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* SECTION B: Clean Daily Income & Loss Panel / Graph */}
      <div className="rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/90 p-5 sm:p-7 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#f4efe6]">
                {isUr ? 'یومیہ آمدنی اور شیڈ نقصانات کا تفصیلی ریکارڈ' : 'Daily Income & Shed Loss Analysis'}
              </h3>
              <p className="text-xs text-[#f4efe6]/60">
                {isUr
                  ? 'انڈوں کی یومیہ پیداوار سے آمدنی اور شراکت دارانہ نقصانات (مرگی اموات و کریک انڈے) کی شفاف کٹوتی۔'
                  : 'Transparent daily egg yield profits and proportional shed loss sharing (mortality & cracked eggs).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-1.5 text-xs text-emerald-300 font-bold">
              +{isUr ? 'کل کمائی:' : 'Earned:'} Rs. {totalCollectionsEarnings.toLocaleString()}
            </div>
            {totalShedDeductions > 0 && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/60 px-3 py-1.5 text-xs text-rose-300 font-bold">
                -{isUr ? 'شیڈ نقصان:' : 'Loss Deductions:'} Rs. {totalShedDeductions.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#d4af37]/25 bg-[#051a10]/80 p-4">
            <span className="text-[10px] font-bold text-[#f3df88] uppercase block mb-1">
              {isUr ? 'یومیہ مجموعی منافع (1:1)' : 'Gross Daily Yield (1:1)'}
            </span>
            <div className="text-xl font-black font-mono text-[#f4efe6]">
              Rs. {dailyIncomePotential.toLocaleString()}/day
            </div>
            <span className="text-[11px] text-[#f4efe6]/60 block mt-0.5">
              {user.activeHens || 0} {isUr ? 'مرغیاں' : 'Active Hens'} × Rs. 30
            </span>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-[#051a10]/80 p-4">
            <span className="text-[10px] font-bold text-amber-300 uppercase block mb-1">
              {isUr ? 'شراکت دارانہ نقصان کی پالیسی' : 'Proportional Loss Policy'}
            </span>
            <div className="text-xl font-black font-mono text-amber-400">
              Mudarabah
            </div>
            <span className="text-[11px] text-[#f4efe6]/60 block mt-0.5">
              {isUr ? 'مرغی منہا نہیں ہوتی، مالی کٹوتی مساوی ہوتی ہے' : 'Hens never deducted; losses shared proportionally'}
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-[#051a10]/80 p-4">
            <span className="text-[10px] font-bold text-emerald-300 uppercase block mb-1">
              {isUr ? 'خالص والٹ کریڈٹ' : 'Net Wallet Credit'}
            </span>
            <div className="text-xl font-black font-mono text-emerald-400">
              Rs. {(user.walletBalance || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-[#f4efe6]/60 block mt-0.5">
              {isUr ? 'نکلوائی کیلئے مکمل دستیاب' : 'Ready for Instant Withdrawal'}
            </span>
          </div>
        </div>

        {/* Recent Collections Log Table */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-[#f3df88] mb-2 uppercase tracking-wider">
            {isUr ? 'حالیہ یومیہ کلیکشن لاگ' : 'Recent Daily Collection & Deduction Logs'}
          </h4>

          {recentCollections.length === 0 ? (
            <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/60 p-6 text-center text-xs text-[#f4efe6]/50">
              <Egg className="h-6 w-6 text-[#d4af37]/50 mx-auto mb-1.5" />
              <p>{isUr ? 'ابھی تک کوئی یومیہ کلیکشن ریکارڈ موجود نہیں ہے۔' : 'No daily collection records yet. Click "Collect Daily Eggs" on your dashboard every 24 hours.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCollections.map((col) => (
                <div
                  key={col.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/80 p-3.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-[#f3df88]">
                        +{col.eggsCollected} {isUr ? 'انڈے' : 'Eggs'}
                      </span>
                      <span className="font-mono text-[11px] text-[#f4efe6]/60">
                        (Gross: Rs. {((col.normalIncome || col.cashEarned || 0) + (col.shedLossDeduction || 0)).toLocaleString()})
                      </span>
                      {col.shedLossDeduction && col.shedLossDeduction > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                          -{col.shedLossDeduction} Rs. {isUr ? 'شیڈ نقصان' : 'Shed Loss'}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-[#f4efe6]/50">
                      {new Date(col.timestamp).toLocaleDateString(isUr ? 'ur-PK' : 'en-US')} • {col.hensCount} {isUr ? 'مرغیاں' : 'Hens'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-sm text-emerald-400 font-mono">
                      +Rs. {col.cashEarned.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-emerald-300/80 font-bold">
                      {isUr ? 'والٹ میں شامل' : 'Credited to Wallet'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
