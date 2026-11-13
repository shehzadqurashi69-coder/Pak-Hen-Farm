import React, { useState, useEffect } from 'react';
import { UserAccount, UserAlert, PaymentAccount } from '../types/farm';
import { calculateMedicalFee, filterActivePaymentMethods } from '../utils/farmRules';
import { apiPayMedicalFee, apiSubmitMedicalPaymentTid, subscribeToPaymentMethods } from '../services/api';
import { PaymentLogo } from './PaymentLogos';
import { t } from '../utils/translations';
import {
  X,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface MedicalPaymentModalProps {
  user: UserAccount;
  alert: UserAlert;
  language: 'en' | 'ur';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser?: UserAccount) => void;
}

export const MedicalPaymentModal: React.FC<MedicalPaymentModalProps> = ({
  user,
  alert,
  language,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedTab, setSelectedTab] = useState<'wallet' | string>('wallet');
  const [activeAccounts, setActiveAccounts] = useState<PaymentAccount[]>([]);
  const [tid, setTid] = useState('');
  const [senderName, setSenderName] = useState(user.fullName || '');
  const [senderNumber, setSenderNumber] = useState(user.phone || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToPaymentMethods((methods) => {
      const filtered = filterActivePaymentMethods(methods);
      setActiveAccounts(filtered);
      setSelectedTab((prev) => {
        if (prev === 'wallet') return 'wallet';
        if (filtered.some((a) => a.id === prev)) return prev;
        return 'wallet';
      });
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedAccount = activeAccounts.find((a) => a.id === selectedTab) || null;

  // Calculate flock in this shed
  const userHensInShed =
    alert.hensCount ||
    (user.packages || []).reduce((acc, p) => {
      const pShed = p.shedId || 'Shed-101';
      return pShed === alert.shedId && p.active && p.hens > 0 ? acc + p.hens : acc;
    }, 0) ||
    1;

  const feeCalc = calculateMedicalFee(userHensInShed);
  const requiredAmount = alert.medicalFeeRequired || alert.medicalFeeAmount || feeCalc.totalFee;
  const isWalletSufficient = user.walletBalance >= requiredAmount;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleWalletPay = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const updatedUser = await apiPayMedicalFee(user, alert.id);
      setSuccessMsg(
        language === 'ur'
          ? `والٹ سے ${requiredAmount.toLocaleString()} روپے میڈیکل فیس کامیابی سے ادا ہو گئی! ٹائمر بحال کر دیا گیا۔`
          : `Rs. ${requiredAmount.toLocaleString()} medical fee paid successfully from wallet! Collection timer unlocked.`
      );
      setTimeout(() => {
        onSuccess(updatedUser);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedAccount) {
      setErrorMsg(
        language === 'ur'
          ? 'منتخب کردہ ادائیگی اکاؤنٹ دستیاب نہیں ہے۔ براہ کرم فعال اکاؤنٹ منتخب کریں۔'
          : 'Selected payment account is no longer active. Please pick an active method.'
      );
      return;
    }
    if (!tid.trim()) {
      setErrorMsg(language === 'ur' ? 'براہ کرم ٹرانزیکشن آئی ڈی (TID) درج کریں۔' : 'Please enter Transaction ID (TID)');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiSubmitMedicalPaymentTid({
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        userPhone: user.phone,
        shedId: alert.shedId,
        alertId: alert.id,
        hensCount: userHensInShed,
        perHenRate: feeCalc.perHenRate,
        amount: requiredAmount,
        paymentMethod: selectedAccount.type,
        tid: tid.trim(),
        senderName: senderName.trim(),
        senderNumber: senderNumber.trim(),
      });

      setSuccessMsg(t[language].medicalTidSubmittedNotice);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#082215] to-[#03130c] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-amber-200/60 hover:text-amber-200 hover:bg-amber-500/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="mb-4 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-amber-300">
              {t[language].payMedicalModalTitle}
            </h3>
          </div>
          <p className="text-xs text-amber-200/70">
            {t[language].payMedicalModalSubtitle}
          </p>
        </div>

        {/* Bulk Tier Discount Breakdown Box */}
        <div className="bg-[#05180f] border border-amber-500/20 rounded-xl p-3.5 mb-4">
          <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-amber-500/10">
            <span className="text-amber-200/70 font-medium">
              {language === 'ur' ? 'شیڈ میں آپ کی مرغیاں:' : 'Your Flock in Shed:'}
            </span>
            <span className="text-amber-300 font-bold">
              {alert.shedId} • {userHensInShed} {language === 'ur' ? 'مرغیاں' : 'Hens'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-amber-200/70">
              {language === 'ur' ? 'رعایتی شرح فی مرغی:' : 'Tiered Rate Per Hen:'}
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              Rs. {feeCalc.perHenRate} / {language === 'ur' ? 'مرغی' : 'hen'}
              {feeCalc.savingsPercent > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] text-emerald-300 font-bold">
                  {feeCalc.savingsPercent}% OFF
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t border-amber-500/15">
            <span className="text-amber-200 font-semibold">
              {language === 'ur' ? 'کل واجب الادا میڈیکل فیس:' : 'Total Medical Fee:'}
            </span>
            <span className="text-base font-extrabold text-amber-300">
              Rs. {requiredAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Dynamic Payment Method Selector Tabs (Wallet + Strictly Active Admin Accounts) */}
        <div className="flex flex-wrap rounded-xl bg-[#04120a] p-1 border border-amber-500/20 mb-4 gap-1">
          <button
            type="button"
            onClick={() => setSelectedTab('wallet')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedTab === 'wallet'
                ? 'bg-amber-500 text-[#04140d] shadow-md'
                : 'text-amber-200/70 hover:text-amber-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{language === 'ur' ? 'والٹ بیلنس' : 'Wallet'}</span>
          </button>

          {activeAccounts.map((pm) => (
            <button
              key={pm.id}
              type="button"
              onClick={() => {
                setSelectedTab(pm.id);
                setErrorMsg(null);
              }}
              className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedTab === pm.id
                  ? 'bg-amber-500 text-[#04140d] shadow-md'
                  : 'text-amber-200/70 hover:text-amber-200'
              }`}
            >
              <PaymentLogo method={pm.type} size="sm" />
              <span className="truncate">{language === 'ur' && pm.titleUr ? pm.titleUr : pm.title}</span>
            </button>
          ))}
        </div>

        {/* Success / Error Messages */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Pay from Wallet */}
        {selectedTab === 'wallet' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#051a10] border border-amber-500/15 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber-200/70">{t[language].walletBalance}:</span>
                <span className={`font-bold ${isWalletSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Rs. {user.walletBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-200/70">
                  {language === 'ur' ? 'درکار فیس:' : 'Required Fee:'}
                </span>
                <span className="font-bold text-amber-300">
                  Rs. {requiredAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {isWalletSufficient ? (
              <button
                type="button"
                onClick={handleWalletPay}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#04140d] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting
                  ? language === 'ur'
                    ? 'ادائیگی جاری ہے...'
                    : 'Processing...'
                  : t[language].payFromWalletBtn.replace('{amount}', requiredAmount.toLocaleString())}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs">
                  {t[language].insufficientBalanceForFee
                    .replace('{balance}', user.walletBalance.toLocaleString())
                    .replace('{required}', requiredAmount.toLocaleString())}
                </div>
                {activeAccounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeAccounts.map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedTab(pm.id)}
                        className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold bg-[#072417] hover:bg-[#0c3120] text-amber-300 border border-amber-500/30 transition-all text-center cursor-pointer"
                      >
                        Pay via {pm.title} →
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs text-center">
                    {language === 'ur'
                      ? 'اس وقت ایڈمن کی طرف سے کوئی بیرونی پیمنٹ اکاؤنٹ فعال نہیں ہے۔'
                      : 'No external payment accounts are currently active. Please contact Admin.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Active Admin Payment Account Form */}
        {selectedTab !== 'wallet' && selectedAccount && (
          <form onSubmit={handleSubmitTid} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#061b11] border border-amber-500/25 space-y-2.5 text-xs">
              <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <PaymentLogo method={selectedAccount.type} size="sm" />
                <span>{language === 'ur' && selectedAccount.titleUr ? selectedAccount.titleUr : selectedAccount.title}</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-[#03130c] p-2.5 rounded-lg border border-amber-500/15">
                <div className="min-w-0">
                  <div className="text-[10px] text-amber-200/60">Account Title</div>
                  <div className="font-bold text-amber-200 truncate">{selectedAccount.accountTitle}</div>
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-[10px] text-amber-200/60">Account Number / Address</div>
                  <div className="font-bold text-emerald-400 font-mono break-all select-all">
                    {selectedAccount.accountNumber}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedAccount.accountNumber, selectedAccount.id)}
                  aria-label="Copy payment account number"
                  className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors shrink-0 cursor-pointer"
                >
                  {copiedField === selectedAccount.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-[11px] text-amber-200/70">
                Send <strong>Rs. {requiredAmount.toLocaleString()}</strong> to this official account, then enter your Transaction ID (TID) below.
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-amber-200/80 mb-1">
                Transaction ID (TID) / Hash *
              </label>
              <input
                type="text"
                required
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                placeholder="e.g. 056388675271"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#03130c] border border-amber-500/30 text-amber-200 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-amber-200/80 mb-1">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 rounded-xl bg-[#03130c] border border-amber-500/30 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-200/80 mb-1">
                  Sender Mobile
                </label>
                <input
                  type="text"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="03xxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl bg-[#03130c] border border-amber-500/30 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#04140d] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting
                ? language === 'ur'
                  ? 'جمع کیا جا رہا ہے...'
                  : 'Submitting...'
                : `${t[language].submitMedicalTidBtn} (Rs. ${requiredAmount.toLocaleString()})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

