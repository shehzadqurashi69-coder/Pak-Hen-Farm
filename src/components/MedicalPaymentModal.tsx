import React, { useState } from 'react';
import { UserAccount, UserAlert } from '../types/farm';
import { OFFICIAL_INFO, calculateMedicalFee } from '../utils/farmRules';
import { apiPayMedicalFee, apiSubmitMedicalPaymentTid } from '../services/api';
import { t } from '../utils/translations';
import {
  X,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Percent,
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
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'jazzcash' | 'usdt'>('wallet');
  const [tid, setTid] = useState('');
  const [senderName, setSenderName] = useState(user.fullName || '');
  const [senderNumber, setSenderNumber] = useState(user.phone || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate flock in this shed
  const userHensInShed = alert.hensCount || (user.packages || []).reduce((acc, p) => {
    const pShed = p.shedId || 'Shed-101';
    return pShed === alert.shedId && p.active && p.hens > 0 ? acc + p.hens : acc;
  }, 0) || 1;

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
        paymentMethod: paymentMethod === 'jazzcash' ? 'jazzcash' : 'usdt',
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
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-amber-200/60 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
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

        {/* Payment Method Selector Tabs */}
        <div className="flex rounded-xl bg-[#04120a] p-1 border border-amber-500/20 mb-4 gap-1">
          <button
            type="button"
            onClick={() => setPaymentMethod('wallet')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              paymentMethod === 'wallet'
                ? 'bg-amber-500 text-[#04140d] shadow-md'
                : 'text-amber-200/70 hover:text-amber-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{language === 'ur' ? 'والٹ بیلنس' : 'Wallet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('jazzcash')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              paymentMethod === 'jazzcash'
                ? 'bg-amber-500 text-[#04140d] shadow-md'
                : 'text-amber-200/70 hover:text-amber-200'
            }`}
          >
            <div className="w-4 h-4 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src="/assets/aistudio/download__2__550d514b.png"
                alt="JazzCash"
                className="w-full h-full object-contain"
              />
            </div>
            <span>JazzCash</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('usdt')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              paymentMethod === 'usdt'
                ? 'bg-amber-500 text-[#04140d] shadow-md'
                : 'text-amber-200/70 hover:text-amber-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>USDT (TRC20)</span>
          </button>
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
        {paymentMethod === 'wallet' && (
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
                onClick={handleWalletPay}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#04140d] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting
                  ? (language === 'ur' ? 'ادائیگی جاری ہے...' : 'Processing...')
                  : t[language].payFromWalletBtn.replace('{amount}', requiredAmount.toLocaleString())}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs">
                  {t[language].insufficientBalanceForFee
                    .replace('{balance}', user.walletBalance.toLocaleString())
                    .replace('{required}', requiredAmount.toLocaleString())}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('jazzcash')}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#072417] hover:bg-[#0c3120] text-amber-300 border border-amber-500/30 transition-all text-center"
                  >
                    Pay via JazzCash →
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('usdt')}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#072417] hover:bg-[#0c3120] text-amber-300 border border-amber-500/30 transition-all text-center"
                  >
                    Pay via USDT →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: JazzCash Official Account */}
        {paymentMethod === 'jazzcash' && (
          <form onSubmit={handleSubmitTid} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#061b11] border border-amber-500/25 space-y-2.5 text-xs">
              <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                  <img
                    src="/assets/aistudio/download__2__550d514b.png"
                    alt="JazzCash"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span>{t[language].officialJazzCashInfo}</span>
              </div>
              <div className="flex items-center justify-between bg-[#03130c] p-2.5 rounded-lg border border-amber-500/15">
                <div>
                  <div className="text-[10px] text-amber-200/60">Account Title</div>
                  <div className="font-bold text-amber-200">{OFFICIAL_INFO.jazzCashAccountTitle}</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-200/60">JazzCash Mobile Number</div>
                  <div className="font-bold text-emerald-400">{OFFICIAL_INFO.jazzCashAccountNumber}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(OFFICIAL_INFO.jazzCashAccountNumber, 'jazzcash')}
                  className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors"
                >
                  {copiedField === 'jazzcash' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[11px] text-amber-200/70">
                Send <strong>Rs. {requiredAmount.toLocaleString()}</strong> to the official JazzCash account above, then enter the Transaction ID (TID) below.
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-amber-200/80 mb-1">
                JazzCash Transaction ID (TID) *
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
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#04140d] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting
                ? (language === 'ur' ? 'جمع کیا جا رہا ہے...' : 'Submitting...')
                : `${t[language].submitMedicalTidBtn} (Rs. ${requiredAmount.toLocaleString()})`}
            </button>
          </form>
        )}

        {/* Tab 3: USDT (TRC20) Official Wallet */}
        {paymentMethod === 'usdt' && (
          <form onSubmit={handleSubmitTid} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#061b11] border border-amber-500/25 space-y-2.5 text-xs">
              <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <span>🪙 {t[language].officialUsdtInfo}</span>
              </div>
              <div className="bg-[#03130c] p-2.5 rounded-lg border border-amber-500/15">
                <div className="text-[10px] text-amber-200/60 mb-0.5">TRON (TRC20) Address:</div>
                <div className="font-mono text-xs text-amber-300 break-all select-all">
                  {OFFICIAL_INFO.usdtTrc20Address}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(OFFICIAL_INFO.usdtTrc20Address, 'usdt')}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-1.5 font-medium text-xs"
                >
                  {copiedField === 'usdt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'usdt' ? 'Copied!' : 'Copy TRC20 Address'}</span>
                </button>
              </div>
              <div className="text-[11px] text-amber-200/70">
                Amount: <strong>Rs. {requiredAmount.toLocaleString()}</strong> (~{(requiredAmount / 280).toFixed(2)} USDT at Rs. 280/USDT).
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-amber-200/80 mb-1">
                USDT (TRC20) Transaction Hash (TxID) *
              </label>
              <input
                type="text"
                required
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                placeholder="Paste TRON TxID Hash"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#03130c] border border-amber-500/30 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#04140d] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting
                ? (language === 'ur' ? 'جمع کیا جا رہا ہے...' : 'Submitting...')
                : `${t[language].submitMedicalTidBtn} (Rs. ${requiredAmount.toLocaleString()})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
