import React, { useState } from 'react';
import { UserAccount } from '../types/farm';
import { t } from '../utils/translations';
import { apiUpdateUserProfile } from '../services/api';
import { setCurrentUser } from '../services/storage';
import { PaymentLogo } from './PaymentLogos';
import { getPackageExpiryDetails } from '../utils/farmRules';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Feather,
  Wallet,
  Gift,
  Copy,
  Check,
  Share2,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Loader2,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface ProfileViewProps {
  user: UserAccount;
  lang: 'en' | 'ur';
  onNavigate?: (tab: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, lang, onNavigate }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [copied, setCopied] = useState(false);
  const referralUrl = `${window.location.origin}/?ref=${user.referralCode}`;

  // Payout / Account Settings State
  const [accountTitle, setAccountTitle] = useState(user.easypaisaTitle || '');
  const [accountNumber, setAccountNumber] = useState(user.easypaisaNumber || '');
  const [selectedMethod, setSelectedMethod] = useState<string>(
    user.easypaisaNumber?.startsWith('03') ? 'easypaisa' : 'bank'
  );
  const [bankName, setBankName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = isUr
      ? `پاک ہین فارم میں شامل ہوں اور پورے پاکستان میں حقیقی پولٹری فارمنگ سے روزانہ انڈے وصول کریں۔ میرا ریفرل کوڈ استعمال کریں: ${referralUrl}`
      : `Join Pak Hen Farm (Real physical poultry farming across Pakistan) and collect daily eggs! Use my link: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSaveAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // Strict debouncing

    const cleanTitle = accountTitle.trim();
    const cleanNumber = accountNumber.trim();

    if (!cleanTitle || !cleanNumber) {
      setSaveError(
        isUr
          ? 'براہ کرم اکاؤنٹ کا عنوان اور اکاؤنٹ نمبر درج کریں۔'
          : 'Please provide both Account Title and Account / Mobile Number.'
      );
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const updated = await apiUpdateUserProfile(user.id, {
        easypaisaTitle: cleanTitle,
        easypaisaNumber: cleanNumber,
      });

      setCurrentUser(updated);
      setSaveSuccess(
        isUr
          ? 'اکاؤنٹ کی تفصیلات کامیابی سے محفوظ ہو گئیں!'
          : 'Payment account details saved successfully!'
      );

      setTimeout(() => {
        setSaveSuccess(null);
      }, 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving account settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-black text-[#d4af37] font-serif">
          {strings.profileTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[#f4efe6]/70">
          {isUr
            ? 'آپ کے اکاؤنٹ کی تصدیق شدہ تفصیلات اور فارم رکنیت'
            : 'Verified poultry flock membership details and credentials'}
        </p>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0a2618] via-[#0d3420] to-[#051a10] p-6 sm:p-7 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-[#d4af37]/25 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-[#d4af37] bg-[#051a10] p-1.5 shadow-lg shadow-[#d4af37]/20">
              <img
                src="/golden-hen.svg"
                alt="Golden Hen Profile"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[#f4efe6]">{user.fullName}</h3>
                <span className="rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#f3df88] uppercase">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-[#f4efe6]/60 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#d4af37]" />
                <span>
                  {strings.memberSince}: {new Date(user.createdAt).toLocaleDateString(isUr ? 'ur-PK' : 'en-US')}
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-[#d4af37]/30 bg-[#051a10]/80 px-4 py-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-[#f3df88]/80 block">{strings.activeHens}</span>
              <span className="text-xl font-black text-[#d4af37]">{user.activeHens}</span>
            </div>
            <div className="rounded-2xl border border-[#d4af37]/30 bg-[#051a10]/80 px-4 py-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-[#f3df88]/80 block">{strings.walletBalance}</span>
              <span className="text-xl font-black text-emerald-400">Rs. {user.walletBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/60 p-3.5">
            <Mail className="h-5 w-5 text-[#d4af37]" />
            <div>
              <span className="text-[11px] text-[#f4efe6]/60 block">{strings.emailLabel}</span>
              <span className="text-xs sm:text-sm font-semibold text-[#f4efe6] break-all">{user.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/60 p-3.5">
            <Phone className="h-5 w-5 text-[#d4af37]" />
            <div>
              <span className="text-[11px] text-[#f4efe6]/60 block">{strings.phoneLabel}</span>
              <span className="text-xs sm:text-sm font-semibold text-[#f4efe6]">{user.phone}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/60 p-3.5">
            <CreditCard className="h-5 w-5 text-[#d4af37]" />
            <div>
              <span className="text-[11px] text-[#f4efe6]/60 block">{strings.easypaisaTitleLabel}</span>
              <span className="text-xs sm:text-sm font-semibold text-[#f4efe6]">{user.easypaisaTitle || 'Not Set'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/60 p-3.5">
            <Wallet className="h-5 w-5 text-[#d4af37]" />
            <div>
              <span className="text-[11px] text-[#f4efe6]/60 block">{strings.easypaisaNumberLabel}</span>
              <span className="text-xs sm:text-sm font-semibold text-[#f4efe6]">{user.easypaisaNumber || 'Not Set'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module 2 Fix: Dedicated Payout & Account Settings Form */}
      <div className="rounded-3xl border-2 border-[#d4af37]/40 bg-gradient-to-br from-[#0a2618] via-[#0d3420] to-[#051a10] p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4af37]/25 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/20 text-[#f3df88] border border-[#d4af37]/40">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#f4efe6]">
                {isUr ? 'ادائیگی اور بینک اکاؤنٹ سیٹنگز' : 'Withdrawal & Payment Account Settings'}
              </h3>
              <p className="text-xs text-[#f4efe6]/60">
                {isUr
                  ? 'رقم نکلوانے کے لیے اپنا اکاؤنٹ منتخب اور محفوظ کریں'
                  : 'Configure and instantly save your official withdrawal account details'}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-4 text-emerald-200 text-xs sm:text-sm font-semibold animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-4 text-rose-200 text-xs sm:text-sm font-semibold animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSaveAccountSettings} className="space-y-4">
          {/* Method Selection with Official Brand Badges */}
          <div>
            <label className="block text-xs font-bold text-[#f3df88] mb-2">
              {isUr ? 'ادائیگی کا ذریعہ منتخب کریں:' : 'Select Gateway / Method:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'easypaisa', label: 'Easypaisa' },
                { id: 'jazzcash', label: 'JazzCash' },
                { id: 'sadapay', label: 'SadaPay' },
                { id: 'upaisa', label: 'UPaisa' },
                { id: 'bank', label: 'Bank / Raast' },
              ].map((m) => {
                const active = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethod(m.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 border text-center transition-all cursor-pointer ${
                      active
                        ? 'border-[#d4af37] bg-[#d4af37]/20 shadow-lg shadow-[#d4af37]/20 scale-[1.02]'
                        : 'border-[#d4af37]/25 bg-[#051a10] hover:border-[#d4af37]/60'
                    }`}
                  >
                    <PaymentLogo method={m.id} size="sm" />
                    <span className="text-[11px] font-bold text-[#f4efe6]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#f3df88] mb-1">
                {isUr ? 'اکاؤنٹ ٹائٹل / نام *' : 'Account Title (Receiver Name) *'}
              </label>
              <input
                type="text"
                required
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                placeholder="e.g. Muhammad Ali"
                className="w-full rounded-xl border border-[#d4af37]/40 bg-[#051a10] py-3 px-3.5 text-xs sm:text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#f3df88] mb-1">
                {isUr ? 'اکاؤنٹ یا موبائل نمبر / IBAN *' : 'Account Number / Mobile / IBAN *'}
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 03001234567 or PK00MEZN00..."
                className="w-full rounded-xl border border-[#d4af37]/40 bg-[#051a10] py-3 px-3.5 font-mono text-xs sm:text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
          </div>

          {selectedMethod === 'bank' && (
            <div>
              <label className="block text-xs font-bold text-[#f3df88] mb-1">
                {isUr ? 'بینک کا نام' : 'Bank Name'}
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Meezan Bank, HBL, Bank Alfalah, etc."
                className="w-full rounded-xl border border-[#d4af37]/40 bg-[#051a10] py-2.5 px-3.5 text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] px-6 py-3 text-xs sm:text-sm font-black text-[#051a10] shadow-xl shadow-[#d4af37]/25 transition-all ${
                isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-105 active:scale-95 cursor-pointer'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#051a10]" />
                  <span>{isUr ? 'محفوظ کیا جا رہا ہے...' : 'Saving Account...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-[#051a10]" />
                  <span>{isUr ? 'اکاؤنٹ محفوظ کریں' : 'Save Account'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Referral Link Quick Share Box */}
      <div className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-[#d4af37]" />
          <h3 className="text-base font-bold text-[#f4efe6]">{strings.referralLink}</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralUrl}
            className="flex-1 rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 font-mono text-xs text-[#f3df88] select-all outline-none"
          />

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-4 py-2.5 text-xs font-bold text-[#051a10] hover:brightness-105 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? strings.linkCopied : strings.copyLink}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#20ba5a] transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
          >
            <Share2 className="h-4 w-4" />
            <span>{strings.shareWhatsApp}</span>
          </button>
        </div>
      </div>

      {/* Active Flock Packages */}
      <div className="rounded-3xl border border-[#d4af37]/25 bg-[#0a2618]/80 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Feather className="h-4 w-4 text-[#d4af37]" />
            <h3 className="text-base font-bold text-[#f4efe6]">{strings.activeFlockPackages}</h3>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('packages')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#f3df88] hover:text-[#ffd700] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{isUr ? 'نیا پیکج خریدیں' : 'Buy / Renew'}</span>
            </button>
          )}
        </div>

        {!user.packages || user.packages.length === 0 ? (
          <p className="text-xs text-[#f4efe6]/50 text-center py-4">
            {isUr ? 'کوئی ایکٹو پیکج نہیں ملا۔' : 'No active flock packages yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {user.packages.map((pkg) => {
              const details = getPackageExpiryDetails(pkg);
              return (
                <div
                  key={pkg.id}
                  className={`flex flex-col gap-2.5 rounded-2xl border p-4 text-xs transition-all ${
                    details.isExpired
                      ? 'border-rose-500/30 bg-gradient-to-br from-[#1b0a0e] to-[#0d0407]'
                      : 'border-[#d4af37]/25 bg-[#051a10]/80 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`font-bold text-sm ${details.isExpired ? 'text-rose-300' : 'text-[#f3df88]'}`}>
                          {pkg.hens} {isUr ? 'مرغیاں' : 'Hens'}
                        </span>
                        <span className="text-[11px] text-[#f4efe6]/60">
                          (Rs. {pkg.purchasePrice.toLocaleString()})
                        </span>
                        <span className="px-2 py-0.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f3df88] font-mono font-bold text-[10px]">
                          {pkg.shedId || 'Shed-101'}
                        </span>

                        {details.isExpired ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            {isUr ? 'پیکج ختم ہو گیا (90 دن مکمل)' : 'Package Expired'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {isUr ? `ایکٹو • ${details.daysRemaining} دن باقی` : `Active • ${details.daysRemaining}d left`}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#f4efe6]/50">
                        TID: {pkg.tid} • {isUr ? 'خریداری' : 'Bought'}: {details.purchaseDate.toLocaleDateString(isUr ? 'ur-PK' : 'en-US')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-[11px] text-[#f4efe6]/70">
                        {strings.packageExpires}:{' '}
                        <span className={`font-semibold ${details.isExpired ? 'text-rose-400' : 'text-amber-300'}`}>
                          {details.expiryDate.toLocaleDateString(isUr ? 'ur-PK' : 'en-US')}
                        </span>
                      </div>
                      {details.isExpired && onNavigate && (
                        <button
                          onClick={() => onNavigate('packages')}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#d4af37] text-black font-bold text-[11px] hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1 shrink-0"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>{isUr ? 'پیکج کی تجدید کریں' : 'Renew Package'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar of 90-day validity */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-[#f4efe6]/50">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isUr ? '90 روزہ میعاد کی پیشرفت' : '90-Day Validity Progress'}
                      </span>
                      <span>{details.isExpired ? '100% (90/90 Days)' : `${details.daysElapsed}/90 Days (${details.percentElapsed}%)`}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
