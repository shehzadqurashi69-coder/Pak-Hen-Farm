import React, { useState, useEffect } from 'react';
import { UserAccount, WithdrawalRequest } from '../types/farm';
import {
  validateWithdrawal,
  EGG_PRICE_PKR,
  MIN_WITHDRAWAL_PKR,
  MAX_WITHDRAWAL_PKR,
  MIN_WITHDRAWAL_EGGS,
  MAX_WITHDRAWAL_EGGS,
  isUserLocked,
} from '../utils/farmRules';
import {
  apiCreateWithdrawal,
  subscribeToWithdrawals,
  apiGetUserById,
  subscribeToUserDoc,
} from '../services/api';
import { PaymentLogo } from './PaymentLogos';
import { t } from '../utils/translations';
import {
  Wallet,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface WithdrawViewProps {
  user: UserAccount;
  onWithdrawalRequested: (req: WithdrawalRequest, updatedUser: UserAccount) => void;
  lang: 'en' | 'ur';
}

export const WithdrawView: React.FC<WithdrawViewProps> = ({
  user,
  onWithdrawalRequested,
  lang,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  // Live Authoritative Wallet Balance Synced directly with Firestore
  const [liveBalance, setLiveBalance] = useState<number>(Number(user.walletBalance) || 0);
  const [amountStr, setAmountStr] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<string>('easypaisa');
  const [easypaisaNumber, setEasypaisaNumber] = useState(user.easypaisaNumber || '');
  const [easypaisaTitle, setEasypaisaTitle] = useState(user.easypaisaTitle || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = parseFloat(amountStr) || 0;
  const eggsEquiv = Math.floor(parsedAmount / EGG_PRICE_PKR);

  useEffect(() => {
    // 1. Live subscription to authoritative user document in Firestore to prevent false "Insufficient Balance" bug
    let isMounted = true;
    apiGetUserById(user.id).then((fresh) => {
      if (isMounted && fresh) {
        setLiveBalance(Number(fresh.walletBalance) || 0);
      }
    });

    const unsubUser = subscribeToUserDoc(user.id, (fresh) => {
      if (fresh) {
        setLiveBalance(Number(fresh.walletBalance) || 0);
      }
    });

    // 2. Live subscription to user withdrawals from Firebase
    const unsubWithdrawals = subscribeToWithdrawals('user', user.id, (list) => {
      setUserWithdrawals(list);
    });

    return () => {
      isMounted = false;
      unsubUser();
      unsubWithdrawals();
    };
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Strict debouncing
    setErrorMsg('');
    setSuccessMsg('');

    if (isUserLocked(user)) {
      setErrorMsg(
        `Your account is ${user.status || 'suspended'}. Withdrawals are strictly locked. Please contact Admin.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Dynamically fetch authoritative user document directly from Firestore before validation
      const freshUser = await apiGetUserById(user.id);
      const currentAuthoritativeBalance = freshUser ? Number(freshUser.walletBalance) : liveBalance;

      const validation = validateWithdrawal(parsedAmount, currentAuthoritativeBalance);
      if (!validation.isValid) {
        setErrorMsg(
          (isUr ? validation.errorUrdu || validation.error || '' : validation.error || '') +
            ` (${isUr ? 'دستیاب بیلنس' : 'Live Available'}: Rs. ${currentAuthoritativeBalance.toLocaleString()})`
        );
        setIsSubmitting(false);
        return;
      }

      const cleanNum = easypaisaNumber.trim();
      const cleanTitle = easypaisaTitle.trim();

      if (!cleanNum || !cleanTitle) {
        setErrorMsg(
          isUr
            ? 'براہ کرم اکاؤنٹ کی مکمل تفصیلات (نام اور نمبر) درج کریں۔'
            : 'Please provide account title and account / mobile number.'
        );
        setIsSubmitting(false);
        return;
      }

      const res = await apiCreateWithdrawal(freshUser || user, {
        amount: parsedAmount,
        easypaisaNumber: cleanNum,
        easypaisaTitle: cleanTitle,
      });

      setLiveBalance(res.updatedUser.walletBalance);
      setSuccessMsg(strings.withdrawSubmittedSuccess);
      onWithdrawalRequested(res.withdrawal, res.updatedUser);
      setAmountStr('');

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-black text-[#d4af37] font-serif">
          {strings.withdrawTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[#f4efe6]/70">
          {strings.withdrawSubtitle}
        </p>
      </div>

      {/* Balance & Rules Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Available Balance - Dynamic Real-Time */}
        <div className="rounded-3xl border-2 border-[#d4af37]/50 bg-gradient-to-br from-[#0a2618] via-[#0d3420] to-[#051a10] p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88]">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#f3df88]/80 block">
                {strings.walletBalance} ({isUr ? 'لائیو تصدیق شدہ' : 'Live Synced'})
              </span>
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  liveBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                Rs. {liveBalance.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#f4efe6]/60">
            {isUr
              ? `برابر ہے: ${Math.floor(Math.max(0, liveBalance) / 30)} انڈے (شرح: 1 انڈا = 30 روپے)`
              : `Equivalent to ${Math.floor(Math.max(0, liveBalance) / 30)} eggs (Rate: 1 Egg = Rs. 30)`}
          </p>
        </div>

        {/* Strict Limits Rules Box */}
        <div className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/70 p-5 shadow-xl flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-[#f3df88]">
              {isUr ? 'لازمی نکلوائی حدود' : 'Strict Withdrawal Limits'}
            </h4>
            <p className="text-[#f4efe6]/80 leading-relaxed">
              {isUr
                ? `کم از کم: ${MIN_WITHDRAWAL_EGGS} انڈے (Rs. ${MIN_WITHDRAWAL_PKR})`
                : `Minimum: ${MIN_WITHDRAWAL_EGGS} Eggs (Rs. ${MIN_WITHDRAWAL_PKR})`}
              <br />
              {isUr
                ? `زیادہ سے زیادہ: ${MAX_WITHDRAWAL_EGGS} انڈے (Rs. ${MAX_WITHDRAWAL_PKR.toLocaleString()})`
                : `Maximum: ${MAX_WITHDRAWAL_EGGS} Eggs (Rs. ${MAX_WITHDRAWAL_PKR.toLocaleString()})`}
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawal Form Card */}
      <div className="rounded-3xl border border-[#d4af37]/40 bg-[#0a2618]/95 p-6 sm:p-7 shadow-2xl backdrop-blur-md">
        {isUserLocked(user) && (
          <div className="mb-5 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-4 text-center text-xs text-rose-200 shadow-lg">
            <span className="font-bold block text-rose-300 mb-1">
              {strings.accountLockedBanner.replace(
                '{status}',
                strings[`status${(user.status || 'suspended').charAt(0).toUpperCase() + (user.status || 'suspended').slice(1)}` as keyof typeof strings] || user.status || 'Suspended'
              )}
            </span>
            <p className="text-[11px] text-rose-200/70">
              {isUr
                ? 'اکاؤنٹ معطل یا بند ہونے کے باعث رقم نکالنے کی تمام سہولیات بند کر دی گئی ہیں۔'
                : 'All payout requests are locked while this account is under administrative review.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 max-w-xl mx-auto">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/50 bg-rose-950/70 p-3.5 text-xs text-rose-200 animate-in fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/70 p-3.5 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Module 4: Payment Gateway Selector with Official Brand Logos */}
          <div>
            <label className="block text-xs font-bold text-[#f3df88] mb-2">
              {isUr ? 'ادائیگی کا گیٹ وے منتخب کریں:' : 'Select Payout Method / Gateway:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#d4af37] bg-[#d4af37]/20 shadow-md shadow-[#d4af37]/20 scale-[1.02]'
                        : 'border-[#d4af37]/20 bg-[#051a10] hover:border-[#d4af37]/50'
                    }`}
                  >
                    <PaymentLogo method={gw.id} size="sm" />
                    <span className="text-[10px] font-bold text-[#f4efe6]">{gw.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#f3df88] mb-1">
              {strings.withdrawAmountLabel} *
            </label>
            <div className="relative">
              <input
                type="number"
                min={MIN_WITHDRAWAL_PKR}
                max={MAX_WITHDRAWAL_PKR}
                step="30"
                required
                disabled={isUserLocked(user)}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder={strings.withdrawAmountPlaceholder}
                className="w-full rounded-xl border border-[#d4af37]/40 bg-[#051a10] py-3 px-4 font-mono text-base text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] disabled:opacity-50"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-[#d4af37]">
                PKR
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-[#f3df88]">
              <span>
                {parsedAmount > 0
                  ? strings.equivalentEggsNotice.replace('{eggs}', String(eggsEquiv))
                  : isUr
                  ? `دستیاب بیلنس: Rs. ${liveBalance.toLocaleString()}`
                  : `Available Balance: Rs. ${liveBalance.toLocaleString()}`}
              </span>
              {liveBalance >= MIN_WITHDRAWAL_PKR && !isUserLocked(user) && (
                <button
                  type="button"
                  onClick={() =>
                    setAmountStr(String(Math.min(liveBalance, MAX_WITHDRAWAL_PKR)))
                  }
                  className="text-[11px] underline text-[#f3df88] hover:text-white cursor-pointer font-bold"
                >
                  {isUr ? 'مکمل رقم درج کریں' : 'Max Available'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                {strings.easypaisaTitleLabel} *
              </label>
              <input
                type="text"
                required
                disabled={isUserLocked(user)}
                value={easypaisaTitle}
                onChange={(e) => setEasypaisaTitle(e.target.value)}
                placeholder="Receiver Name"
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3 text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                {selectedGateway === 'bank'
                  ? isUr
                    ? 'بینک اکاؤنٹ یا IBAN نمبر *'
                    : 'Bank Account Number / IBAN *'
                  : strings.easypaisaNumberLabel + ' *'}
              </label>
              <input
                type="text"
                required
                disabled={isUserLocked(user)}
                value={easypaisaNumber}
                onChange={(e) => setEasypaisaNumber(e.target.value)}
                placeholder={selectedGateway === 'bank' ? 'PK00MEZN00...' : '03XXXXXXXXX'}
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3 font-mono text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUserLocked(user) || liveBalance < MIN_WITHDRAWAL_PKR}
            className={`w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#b38f20] py-4 text-sm font-black text-[#051a10] shadow-xl shadow-[#d4af37]/30 transition-all ${
              isSubmitting || isUserLocked(user) || liveBalance < MIN_WITHDRAWAL_PKR
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:brightness-105 active:scale-98 cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-[#051a10]" />
                <span>{isUr ? 'درخواست جمع ہو رہی ہے...' : 'Verifying Balance & Submitting...'}</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="h-5 w-5 text-[#051a10]" />
                <span>{strings.submitWithdrawalBtn}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* User Withdrawal Requests History */}
      <div className="rounded-3xl border border-[#d4af37]/25 bg-[#0a2618]/80 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-[#d4af37]" />
          <h3 className="text-base font-bold text-[#f4efe6]">
            {strings.withdrawalHistoryTitle}
          </h3>
        </div>

        {userWithdrawals.length === 0 ? (
          <p className="text-xs text-[#f4efe6]/50 text-center py-4">
            {isUr ? 'ابھی تک کوئی نکلوائی کی درخواست نہیں ہے۔' : 'No withdrawal requests submitted yet.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {userWithdrawals.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#f3df88]">
                      Rs. {req.amount.toLocaleString()} ({req.eggsEquivalent} {isUr ? 'انڈے' : 'Eggs'})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg border font-mono font-bold text-[10px] uppercase ${
                        req.status === 'paid'
                          ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                          : req.status === 'rejected'
                          ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                          : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#f4efe6]/60">
                    {req.easypaisaTitle} ({req.easypaisaNumber}) • {new Date(req.requestedAt).toLocaleString(isUr ? 'ur-PK' : 'en-US')}
                  </div>
                </div>

                {req.adminNote && (
                  <div className="text-[11px] text-amber-200/80 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-500/20">
                    Note: {req.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
