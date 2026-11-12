import React, { useState, useEffect } from 'react';
import { UserAccount, HenPackage, HenOrder, PaymentAccount, PaymentSettings } from '../types/farm';
import { PACKAGES, OFFICIAL_INFO, calculatePackagePrice, isUserLocked } from '../utils/farmRules';
import { apiCreateOrder, subscribeToOrders, subscribeToPaymentMethods, subscribeToPaymentSettings } from '../services/api';
import { PaymentLogo } from './PaymentLogos';
import { t } from '../utils/translations';
import {
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Feather,
  ShieldCheck,
  ArrowRight,
  Clock,
  Minus,
  Plus,
  Scale,
  Sparkles,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  QrCode,
  ZoomIn,
  X,
  Trash2,
  Landmark,
  Smartphone,
  FileCheck,
} from 'lucide-react';

interface PackagesViewProps {
  user: UserAccount;
  onOrderPlaced: (order: HenOrder) => void;
  lang: 'en' | 'ur';
}

export const PackagesView: React.FC<PackagesViewProps> = ({ user, onOrderPlaced, lang }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  // Checkout flow state
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'payment'>('select');
  const [quantity, setQuantity] = useState<number>(1);
  const [isHalalAgreed, setIsHalalAgreed] = useState<boolean>(false);

  // Dynamic Payment Methods State (Admin Controlled)
  const [paymentMethods, setPaymentMethods] = useState<PaymentAccount[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  // Payment slip upload state
  const [proofSlipBase64, setProofSlipBase64] = useState<string>('');
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Payment form state
  const [tid, setTid] = useState('');
  const [senderTitle, setSenderTitle] = useState(user.easypaisaTitle || '');
  const [senderNumber, setSenderNumber] = useState(user.easypaisaNumber || '');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userOrders, setUserOrders] = useState<HenOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userLocked = isUserLocked(user);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  // Calculate dynamic price based on selected quantity
  const calculatedTotal = calculatePackagePrice(quantity);

  useEffect(() => {
    // Live subscription to orders from Firebase Cloud Database
    const unsubOrders = subscribeToOrders('user', user.id, (ords) => {
      setUserOrders(ords);
    });

    // Live subscription to dynamic payment accounts set by Admin
    const unsubPm = subscribeToPaymentMethods((methods) => {
      const activeMethods = methods.filter((m) => m.active);
      setPaymentMethods(activeMethods);
      if (activeMethods.length > 0) {
        setSelectedMethodId((prev) => {
          if (prev && activeMethods.some((m) => m.id === prev)) return prev;
          return activeMethods[0].id;
        });
      }
    });

    // Live subscription to payment settings (Custom Admin Greeting)
    const unsubSettings = subscribeToPaymentSettings((settings) => {
      setPaymentSettings(settings);
    });

    return () => {
      unsubOrders();
      unsubPm();
      unsubSettings();
    };
  }, [user.id]);

  const activeMethod = paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0];

  const handleCopyAccount = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleQuickSelect = (q: number) => {
    setQuantity(q);
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(isUr ? 'براہ کرم تصویر والی فائل منتخب کریں (PNG/JPG/WebP)' : 'Please select an image file (PNG/JPG/WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg(isUr ? 'فائل کا سائز 8MB سے کم ہونا چاہیے' : 'File size must be under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofSlipBase64(reader.result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProofSlip = () => {
    setProofSlipBase64('');
  };

  const handleSubmitTid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Strict debouncing: block rapid clicks
    setErrorMsg('');
    setSuccessMsg('');

    if (userLocked) {
      setErrorMsg(strings.lockedBuyBtn.replace('{status}', user.status || 'suspended'));
      return;
    }

    const cleanTid = tid.trim();
    const cleanTitle = senderTitle.trim();
    const cleanNumber = senderNumber.trim();

    if (!cleanTid) {
      setErrorMsg(
        isUr
          ? 'براہ کرم ٹرانزیکشن ہیش / TID درج کریں۔'
          : 'Please enter your Transaction ID (TxID) / Reference number.'
      );
      return;
    }

    // MANDATORY REQUIREMENT: Payment Slip / Screenshot upload
    if (!proofSlipBase64) {
      setErrorMsg(
        isUr
          ? 'براہ کرم ادائیگی کی رسید / اسکرین شاٹ لازمی اپ لوڈ کریں۔'
          : 'Mandatory: Please upload your payment slip / transfer screenshot before submitting.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const order = await apiCreateOrder(user, {
        packageId: `partner-flock-${quantity}-hens`,
        hensCount: quantity,
        amount: calculatedTotal,
        senderEasypaisaNumber: cleanNumber || user.phone || activeMethod?.accountNumber || 'Official Deposit',
        senderEasypaisaTitle: cleanTitle || user.fullName || activeMethod?.title || 'User Deposit',
        tid: cleanTid,
        paymentMethodId: activeMethod?.id,
        paymentMethodTitle: activeMethod?.title,
        proofSlipUrl: proofSlipBase64,
      });

      setSuccessMsg(strings.orderSubmittedSuccess);
      onOrderPlaced(order);
      setTid('');
      setProofSlipBase64('');
      setSenderTitle('');
      setSenderNumber('');
      setTimeout(() => {
        setCheckoutStep('select');
        setSuccessMsg('');
      }, 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-7 pb-10">
      {/* Title & Islamic Finance Header */}
      <div className="space-y-1 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 px-3 py-1 text-xs font-bold text-[#f3df88] mb-1">
          <Scale className="h-3.5 w-3.5 text-[#d4af37]" />
          <span>
            {isUr
              ? '100٪ اسلامی فنانس شراکت داری (نفع و نقصان)'
              : '100% Islamic Finance Compliance (Profit & Loss Sharing)'}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#d4af37] font-serif">
          {strings.howManyHensTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[#f4efe6]/70">
          {strings.howManyHensSubtitle}
        </p>
      </div>

      {/* Main Flow: Quantity Selection OR Easypaisa Payment Screen */}
      {checkoutStep === 'select' ? (
        <div className="rounded-3xl border-2 border-[#d4af37] bg-gradient-to-b from-[#0d3420] via-[#0a2618] to-[#051a10] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-[#f3df88] font-serif">
              {strings.howManyHensTitle}
            </h3>
            <p className="text-xs text-[#f4efe6]/70">
              {isUr
                ? 'مرغیوں کی مطلوبہ تعداد منتخب کریں۔ ملک گیر فزیکل فارم میں حقیقی دیکھ بھال کی جائے گی۔'
                : 'Choose your desired flock size. Maintained physically across our verified poultry farm.'}
            </p>
          </div>

          {/* Large Quantity Selector with - and + in the center */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#051a10]/80 border border-[#d4af37]/35 shadow-inner">
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {/* Minus Button */}
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 text-2xl font-black transition-all ${
                  quantity <= 1
                    ? 'border-stone-700 bg-stone-900/50 text-stone-600 cursor-not-allowed opacity-40'
                    : 'border-[#d4af37] bg-gradient-to-br from-[#0d3420] to-[#051a10] text-[#f3df88] hover:bg-[#d4af37]/20 active:scale-95 cursor-pointer shadow-lg shadow-[#d4af37]/20'
                }`}
              >
                <Minus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[3]" />
              </button>

              {/* Center Quantity Display */}
              <div className="flex flex-col items-center min-w-[140px] sm:min-w-[180px] text-center select-none">
                <span className="text-5xl sm:text-6xl font-black text-[#d4af37] font-serif tracking-tight drop-shadow-md">
                  {quantity}
                </span>
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#f4efe6]/80 mt-1">
                  {quantity === 1
                    ? strings.hensCount.replace('{count}', '')
                    : strings.hensCountPlural.replace('{count}', '')}
                </span>

                {/* Yield Description: Estimated Daily 1 Egg (Andazan) */}
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#f3df88]">
                  <Sparkles className="h-3 w-3 text-[#d4af37]" />
                  <span>
                    {isUr
                      ? quantity === 1
                        ? 'اندازاً روزانہ 1 انڈا'
                        : `اندازاً روزانہ ${quantity} انڈے`
                      : quantity === 1
                      ? 'Estimated Daily 1 Egg (Andazan)'
                      : `Estimated Daily ${quantity} Eggs (Andazan)`}
                  </span>
                </div>
              </div>

              {/* Plus Button */}
              <button
                type="button"
                onClick={handleIncrement}
                aria-label="Increase quantity"
                className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 border-[#d4af37] bg-gradient-to-br from-[#0d3420] to-[#051a10] text-2xl font-black text-[#f3df88] hover:bg-[#d4af37]/20 active:scale-95 cursor-pointer shadow-lg shadow-[#d4af37]/20 transition-all"
              >
                <Plus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[3]" />
              </button>
            </div>

            {/* Income estimation banner */}
            <div className="mt-5 text-center text-xs text-[#f4efe6]/70">
              <span className="text-[#f3df88] font-bold">
                {isUr
                  ? `تخمینی آمدن: ~Rs. ${(quantity * 30).toLocaleString()} یومیہ`
                  : `Estimated Income: ~Rs. ${(quantity * 30).toLocaleString()} / Day`}
              </span>
              <span className="mx-2">•</span>
              <span>{isUr ? 'شرح: 1 انڈا = 30 روپے نقد' : 'Rate: 1 Egg = Rs. 30'}</span>
            </div>
          </div>

          {/* 2x2 Grid of Quick-Select Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#f3df88]/80">
              <span>{isUr ? 'فوری انتخاب (Quick Select):' : 'Quick Select Flock Size:'}</span>
              <span className="text-[11px] text-[#f4efe6]/60">
                {isUr ? '90 دن کی مکمل دیکھ بھال' : '90 Days Total Physical Care'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { count: 1, labelEn: '1 Hen', labelUr: '1 مرغی', price: calculatePackagePrice(1) },
                { count: 3, labelEn: '3 Hens', labelUr: '3 مرغیاں', price: calculatePackagePrice(3) },
                { count: 5, labelEn: '5 Hens', labelUr: '5 مرغیاں', price: calculatePackagePrice(5) },
                { count: 10, labelEn: '10 Hens', labelUr: '10 مرغیاں', price: calculatePackagePrice(10) },
              ].map((item) => {
                const isActive = quantity === item.count;
                return (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => handleQuickSelect(item.count)}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#f3df88] bg-gradient-to-r from-[#d4af37] to-[#b38f20] text-[#051a10] ring-2 ring-[#f3df88] shadow-lg shadow-[#d4af37]/30 scale-[1.02]'
                        : 'border-[#d4af37]/30 bg-[#051a10]/60 text-[#f4efe6] hover:border-[#d4af37]/70 hover:bg-[#0a2618]'
                    }`}
                  >
                    <span className={`text-base font-black ${isActive ? 'text-[#051a10]' : 'text-[#f3df88]'}`}>
                      {isUr ? item.labelUr : item.labelEn}
                    </span>
                    <span className={`text-xs font-bold mt-0.5 ${isActive ? 'text-[#051a10]/90' : 'text-[#d4af37]'}`}>
                      PKR {item.price.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Professional Islamic Finance (Mudarabah) Terms & Conditions Area */}
          <div className="pt-2">
            <div className="rounded-2xl border-2 border-[#d4af37]/60 bg-gradient-to-b from-[#0a2c1b] via-[#051a10] to-[#04140c] p-4 sm:p-5 shadow-xl space-y-3.5 transition-all">
              {/* Highlighted Top Text Line in distinct Gold/Yellow color */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#f3df88] tracking-wide border-b border-[#d4af37]/25 pb-2.5">
                <Scale className="h-4 w-4 text-[#d4af37] shrink-0" />
                <span className={`font-serif drop-shadow-sm ${isUr ? 'text-sm font-bold' : 'italic'}`}>
                  "{strings.halalTopHighlight}"
                </span>
              </div>

              {/* Main Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  required
                  checked={isHalalAgreed}
                  onChange={(e) => setIsHalalAgreed(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-[#d4af37] bg-[#051a10] text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0 cursor-pointer shrink-0 accent-[#d4af37]"
                />
                <span className={`text-xs sm:text-sm text-[#f4efe6] font-medium leading-relaxed group-hover:text-[#f3df88] transition-colors ${isUr ? 'font-serif text-right leading-loose' : ''}`}>
                  {strings.halalCheckboxLabel}
                </span>
              </label>
            </div>
          </div>

          {/* Bottom Button: Dynamic Total and Strict Validation */}
          <div>
            <button
              type="button"
              disabled={!isHalalAgreed || userLocked}
              onClick={() => {
                if (isHalalAgreed && !userLocked) {
                  setCheckoutStep('payment');
                  setErrorMsg('');
                  setSuccessMsg('');
                }
              }}
              className={`w-full py-4 px-6 rounded-2xl text-sm sm:text-base font-black tracking-wide uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${
                userLocked
                  ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300/80 cursor-not-allowed opacity-60'
                  : isHalalAgreed
                  ? 'bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] text-[#051a10] hover:brightness-105 active:scale-98 shadow-[#d4af37]/30 cursor-pointer'
                  : 'bg-stone-800 border border-stone-700 text-stone-500 cursor-not-allowed opacity-50 shadow-none'
              }`}
            >
              <span>
                {userLocked
                  ? strings.lockedBuyBtn.replace('{status}', user.status || 'suspended')
                  : `CONTINUE TO PAYMENT (PKR ${calculatedTotal.toLocaleString()}) ->`}
              </span>
            </button>
            {!isHalalAgreed && (
              <p className="text-[11px] text-center text-amber-300/70 mt-2">
                {isUr
                  ? 'براہ کرم آگے بڑھنے کے لیے نفع و نقصان کی شراکت داری کا چیک باکس نشان زد کریں۔'
                  : 'Please check the box above to accept Profit & Loss partnership terms.'}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Dynamic Payment Method & Checkout Screen */
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          {/* Requirement 2: Custom Admin Greeting on Payment Screen (Top-side banner outside details box) */}
          {(paymentSettings?.customGreeting || paymentSettings?.customGreetingUr) && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#d4af37]/50 bg-gradient-to-r from-[#0d3420] via-[#124229] to-[#0a2618] px-4 py-3 text-xs sm:text-sm font-bold text-[#f3df88] shadow-lg shadow-[#051a10]/50">
              <Sparkles className="h-4 w-4 text-[#d4af37] shrink-0" />
              <span className="leading-snug">
                {isUr
                  ? paymentSettings.customGreetingUr || paymentSettings.customGreeting
                  : paymentSettings.customGreeting || paymentSettings.customGreetingUr}
              </span>
            </div>
          )}

          <div className="rounded-3xl border-2 border-[#d4af37] bg-gradient-to-b from-[#0d3420] to-[#0a2618] p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 px-3 py-0.5 text-[11px] font-black uppercase text-[#f3df88] mb-1">
                  <span>{activeMethod?.title || 'Payment Verification'}</span>
                </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#d4af37] font-serif">
                {activeMethod?.title ? `Payment via ${activeMethod.title}` : strings.orderModalTitle}
              </h3>
              <p className="text-xs text-[#f4efe6]/80 mt-0.5">
                {quantity} {quantity === 1 ? 'Hen' : 'Hens'} — Total: <span className="font-bold text-[#f3df88]">PKR {calculatedTotal.toLocaleString()}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutStep('select')}
              className="flex items-center gap-1.5 text-xs text-[#f3df88] hover:text-white cursor-pointer px-3 py-1.5 rounded-xl border border-[#d4af37]/40 bg-[#051a10]/80 transition-all hover:bg-[#d4af37]/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{isUr ? 'مرغیاں تبدیل کریں' : 'Change Quantity'}</span>
            </button>
          </div>

          {/* Dynamic Payment Method Tabs (Admin Controlled Accounts) */}
          {paymentMethods.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#f3df88] uppercase tracking-wider">
                {isUr ? 'طریقہ ادائیگی منتخب کریں:' : 'Select Payment Method:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentMethods.map((pm) => {
                  const isSelected = (activeMethod?.id || paymentMethods[0]?.id) === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethodId(pm.id);
                        setErrorMsg('');
                      }}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#f3df88] bg-gradient-to-r from-[#d4af37] to-[#b38f20] text-[#051a10] shadow-md shadow-[#d4af37]/30 ring-2 ring-[#f3df88]'
                          : 'border-[#d4af37]/30 bg-[#051a10]/70 text-[#f4efe6] hover:border-[#d4af37]/70 hover:bg-[#0a2618]'
                      }`}
                    >
                      <PaymentLogo method={pm.type} size="sm" />
                      <span className="truncate">{isUr && pm.titleUr ? pm.titleUr : pm.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Payment Account Details Card */}
          <div className="rounded-2xl border border-[#d4af37]/50 bg-[#051a10] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#d4af37]/20 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]/90 block">
                  {isUr ? 'سرکاری فارم اکاؤنٹ' : 'Official Farm Payment Account'}
                </span>
                <h4 className="text-base font-bold text-[#f3df88]">
                  {activeMethod?.title || 'Official Account'}
                </h4>
                {activeMethod?.bankName && (
                  <p className="text-xs text-[#f4efe6]/70">{activeMethod.bankName}</p>
                )}
              </div>

              <div className="text-right sm:text-right">
                <span className="text-[10px] uppercase text-[#f4efe6]/60 block">
                  {isUr ? 'مطلوبہ رقم' : 'Amount to Pay'}
                </span>
                <span className="text-lg font-black text-[#d4af37]">
                  PKR {calculatedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Account Details & Copy Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#0a2618] p-3.5 border border-[#d4af37]/30">
              <div className="space-y-1 overflow-hidden">
                <div className="text-[11px] text-[#f4efe6]/70">
                  <span className="text-[#f3df88] font-semibold">{isUr ? 'اکاؤنٹ کا عنوان:' : 'Account Title:'} </span>
                  <span className="font-bold text-[#f4efe6]">{activeMethod?.accountTitle || 'Pak Hen Farm Official'}</span>
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold text-[#f4efe6] select-all break-all">
                  <span className="text-[#f3df88]/80 text-xs font-sans mr-1">{isUr ? 'نمبر:' : 'Number / Address:'}</span>
                  {activeMethod?.accountNumber || OFFICIAL_INFO.usdtTrc20Address}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyAccount(activeMethod?.accountNumber || OFFICIAL_INFO.usdtTrc20Address)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] px-4 py-2.5 text-xs font-bold text-[#051a10] hover:brightness-105 transition-all cursor-pointer active:scale-95 shrink-0 shadow-md shadow-[#d4af37]/20"
              >
                {copiedNumber ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedNumber ? (isUr ? 'کاپی ہو گیا' : 'Copied!') : (isUr ? 'کاپی کریں' : 'Copy Number')}</span>
              </button>
            </div>

            {/* Admin Uploaded QR Code Display (if present) */}
            {activeMethod?.qrCodeUrl && (
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-[#0a2618]/70 border border-[#d4af37]/30 p-3.5">
                <div
                  onClick={() => setZoomImageUrl(activeMethod.qrCodeUrl || null)}
                  className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border-2 border-[#d4af37] p-1 bg-white shadow-md"
                >
                  <img
                    src={activeMethod.qrCodeUrl}
                    alt="Payment QR Code"
                    className="h-28 w-28 object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f3df88]">
                    <QrCode className="h-4 w-4 text-[#d4af37]" />
                    <span>{isUr ? 'آفیشل کیو آر کوڈ (Scan & Pay)' : 'Official QR Code (Scan to Pay)'}</span>
                  </div>
                  <p className="text-[11px] text-[#f4efe6]/80 leading-relaxed">
                    {isUr
                      ? 'اپنے موبائل ایپ سے اس کیو آر کوڈ کو اسکین کریں اور درست رقم منتقل کریں۔ کلک کر کے بڑا دیکھیں۔'
                      : 'Scan this QR code from your banking/wallet app to pay instantly. Click image to zoom.'}
                  </p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-[11px] text-[#f4efe6]/70 leading-relaxed bg-[#0a2618]/60 p-2.5 rounded-xl border border-[#d4af37]/15">
              {isUr
                ? activeMethod?.instructionsUr || `رقم (PKR ${calculatedTotal.toLocaleString()}) اوپر دیے گئے اکاؤنٹ پر منتقل کریں۔ ٹرانسفر مکمل ہونے کے بعد رسید / اسکرین شاٹ اپ لوڈ کریں اور TID درج کریں۔`
                : activeMethod?.instructions || `Transfer PKR ${calculatedTotal.toLocaleString()} to the account above. After payment, upload your receipt screenshot and enter your TID below.`}
            </div>
          </div>

          {/* Error & Success notifications */}
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/50 bg-rose-950/70 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/70 p-3.5 text-xs text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="font-bold">{successMsg}</p>
                <p className="mt-1 text-[11px] text-emerald-300/80">
                  {isUr
                    ? 'آپ کا آرڈر اور ادائیگی کی رسید کامیابی کے ساتھ جمع ہو گئی ہے۔'
                    : 'Your order and payment slip have been submitted successfully.'}
                </p>
              </div>
            </div>
          )}

          {/* Submission Form: Payment Slip Upload + TxID + Sender Details */}
          <form onSubmit={handleSubmitTid} className="space-y-4">
            {/* MANDATORY PAYMENT SLIP UPLOAD FIELD */}
            <div className="rounded-2xl border-2 border-dashed border-[#d4af37]/50 bg-[#051a10]/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-[#f3df88]">
                  <Upload className="h-4 w-4 text-[#d4af37]" />
                  <span>{isUr ? 'ادائیگی کی رسید / اسکرین شاٹ اپ لوڈ کریں * (لازمی)' : 'Upload Payment Slip / Screenshot * (Mandatory)'}</span>
                </label>
                {proofSlipBase64 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>{isUr ? 'رسید منتخب شدہ' : 'Slip Attached'}</span>
                  </span>
                )}
              </div>

              {!proofSlipBase64 ? (
                <div>
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-[#d4af37]/30 bg-[#0a2618]/60 hover:bg-[#0a2618] cursor-pointer transition-all">
                    <ImageIcon className="h-8 w-8 text-[#d4af37]" />
                    <span className="text-xs font-semibold text-[#f4efe6]">
                      {isUr ? 'رسید کی تصویر منتخب کریں (PNG, JPG, WebP)' : 'Click to browse & select Payment Slip image'}
                    </span>
                    <span className="text-[10px] text-[#f4efe6]/50">
                      {isUr ? 'زیادہ سے زیادہ سائز: 8MB' : 'Max size: 8MB'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0a2618] border border-[#d4af37]/40">
                  <div
                    onClick={() => setZoomImageUrl(proofSlipBase64)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={proofSlipBase64}
                      alt="Uploaded Slip"
                      className="h-14 w-14 object-cover rounded-lg border border-[#d4af37]/50"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#f3df88] group-hover:underline flex items-center gap-1">
                        <span>{isUr ? 'رسید منسلک ہے (دیکھنے کے لیے کلک کریں)' : 'Payment Slip Attached (Click to preview)'}</span>
                        <ZoomIn className="h-3.5 w-3.5 text-[#d4af37]" />
                      </p>
                      <p className="text-[10px] text-emerald-400">
                        {isUr ? 'ایڈمن تصدیق کے لیے تیار' : 'Ready for admin review'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveProofSlip}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{isUr ? 'تبدیل کریں' : 'Remove'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Transaction ID Input */}
            <div>
              <label className="block text-xs font-bold text-[#f3df88] mb-1">
                {isUr ? 'ٹرانزیکشن ہیش / TID / حوالہ نمبر *' : 'Transaction ID (TxID) / Ref Number *'}
              </label>
              <input
                type="text"
                required
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                placeholder={isUr ? 'مثال کے طور پر: 8293847291 یا ٹرانزیکشن ہیش' : 'e.g., 8293847291 or Blockchain Hash'}
                className="w-full rounded-xl border border-[#d4af37]/40 bg-[#051a10] py-3 px-4 font-mono text-xs sm:text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {isUr ? 'ارسال کنندہ کا نام / عنوان' : 'Sender Name / Account Title'}
                </label>
                <input
                  type="text"
                  value={senderTitle}
                  onChange={(e) => setSenderTitle(e.target.value)}
                  placeholder={isUr ? 'آپ کا اکاؤنٹ کا نام' : 'Your Account / Wallet Title'}
                  className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3 text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {isUr ? 'ارسال کنندہ کا موبائل / والٹ نمبر' : 'Sender Mobile / Wallet Number'}
                </label>
                <input
                  type="text"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder={isUr ? '0300... یا والٹ ایڈریس' : '0300... or Wallet address'}
                  className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3 text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] py-3.5 text-sm font-black text-[#051a10] shadow-xl shadow-[#d4af37]/30 transition-all ${
                isSubmitting ? 'opacity-60 cursor-not-allowed scale-98' : 'hover:brightness-105 active:scale-98 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#051a10] border-t-transparent" />
                  <span>{isUr ? 'آرڈر تصدیق جاری ہے...' : 'Verifying & Submitting Order...'}</span>
                </>
              ) : (
                <>
                  <span>{isUr ? 'ادائیگی کی رسید اور TID جمع کروائیں' : 'Submit Payment Slip & Order'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      )}

      {/* Fullscreen Image Preview Modal (for QR Code or Uploaded Slip) */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full rounded-2xl bg-[#0a2618] border-2 border-[#d4af37] p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-2">
              <span className="text-xs font-bold text-[#f3df88]">
                {isUr ? 'تصویر کا معائنہ' : 'Full Image View'}
              </span>
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="rounded-lg p-1 text-[#f3df88] hover:bg-[#d4af37]/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-black/40 rounded-xl p-2 max-h-[70vh] overflow-auto">
              <img
                src={zoomImageUrl}
                alt="Enlarged Preview"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Package Reference Overview Cards */}
      <div className="space-y-3 pt-4">
        <h3 className="text-lg font-bold text-[#f4efe6]">
          {isUr ? 'مقبول پارٹنرشپ پیکجز کا جائزہ' : 'Flock Partnership Tiers Overview'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PACKAGES.map((pkg) => {
            const isSelected = quantity === pkg.hens;
            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between rounded-3xl border p-5 backdrop-blur-md shadow-xl transition-all ${
                  isSelected
                    ? 'border-[#f3df88] bg-gradient-to-b from-[#0f3a24] to-[#0a2618] ring-2 ring-[#d4af37]'
                    : 'border-[#d4af37]/30 bg-[#0a2618]/90 hover:border-[#d4af37]/60'
                }`}
              >
                {/* Badge */}
                {pkg.badgeEn && (
                  <div className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-3 py-0.5 text-[11px] font-extrabold uppercase text-[#051a10] shadow-md shadow-[#d4af37]/20">
                    {isUr ? pkg.badgeUr : pkg.badgeEn}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#f3df88]">
                      <Feather className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#f4efe6]">
                        {isUr ? pkg.titleUr : pkg.titleEn}
                      </h4>
                      <span className="text-xs font-semibold text-[#f3df88]">
                        {pkg.hens} {pkg.hens === 1 ? 'Hen' : 'Hens'}
                      </span>
                    </div>
                  </div>

                  {/* Price display */}
                  <div className="rounded-xl bg-[#051a10]/70 p-3 border border-[#d4af37]/20">
                    <div className="text-xl sm:text-2xl font-extrabold text-[#d4af37]">
                      Rs. {pkg.price.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#f4efe6]/60 mt-0.5">
                      {isUr ? '90 دن کی مکمل پیداواری مدت' : 'One-time partnership for 90 days'}
                    </div>
                  </div>

                  {/* Perks list with Estimated Daily 1 Egg (Andazan) */}
                  <ul className="space-y-1.5 text-xs text-[#f4efe6]/85">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#d4af37] shrink-0" />
                      <span>
                        {isUr
                          ? pkg.dailyEggs === 1
                            ? 'اندازاً روزانہ 1 انڈا'
                            : `اندازاً روزانہ ${pkg.dailyEggs} انڈے`
                          : pkg.dailyEggs === 1
                          ? 'Estimated Daily 1 Egg (Andazan)'
                          : `Estimated Daily ${pkg.dailyEggs} Eggs (Andazan)`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#d4af37] shrink-0" />
                      <span>{strings.validityNotice}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#d4af37] shrink-0" />
                      <span>
                        {isUr
                          ? `تخمینی یومیہ آمدن: Rs. ${pkg.dailyEggs * 30}`
                          : `Est. Daily Income: Rs. ${pkg.dailyEggs * 30}`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{isUr ? 'حقیقی فزیکل فارم میں خصوصی دیکھ بھال' : 'Physical flock care across farm sheds'}</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setQuantity(pkg.hens);
                    setCheckoutStep('select');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`mt-4 w-full rounded-xl py-2.5 text-xs font-extrabold transition-all cursor-pointer shadow-md ${
                    isSelected
                      ? 'bg-[#f3df88] text-[#051a10] ring-1 ring-white/50'
                      : 'bg-gradient-to-r from-[#d4af37] to-[#b38f20] text-[#051a10] hover:brightness-105 active:scale-98'
                  }`}
                >
                  {isSelected
                    ? isUr
                      ? 'منتخب شدہ'
                      : 'Selected in Quantity'
                    : isUr
                    ? `یہ منتخب کریں (${pkg.hens} مرغیاں)`
                    : `Select (${pkg.hens} ${pkg.hens === 1 ? 'Hen' : 'Hens'})`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buy Hen & Order History Section (Scroll down to view orders) */}
      <div className="mt-8 rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <h3 className="text-base sm:text-lg font-black text-[#d4af37]">
              {isUr ? 'آپ کے جمع شدہ پارٹنرشپ آرڈرز' : 'Your Submitted Package Orders'}
            </h3>
          </div>
          <span className="rounded-full bg-[#051a10] border border-[#d4af37]/30 px-3 py-1 text-xs font-bold text-[#f3df88]">
            {userOrders.length} {isUr ? 'آرڈرز' : 'Orders'}
          </span>
        </div>

        {userOrders.length > 0 ? (
          <div className="space-y-3" id="userOrdersList">
            {userOrders.map((ord) => {
              const isApproved = ord.status === 'approved';
              const isRejected = ord.status === 'rejected';
              const statusColor = isApproved ? '#28a745' : isRejected ? '#dc3545' : '#d4af37';
              const statusText = isApproved
                ? (isUr ? 'منظور شدہ اور فعال' : 'Approved & Active')
                : isRejected
                ? (isUr ? 'مسترد شدہ' : 'Rejected')
                : (isUr ? 'زیرِ تصدیق' : 'Pending Verification');

              return (
                <div
                  key={ord.id}
                  className="rounded-xl border border-[#1e4d32] bg-[#112a1d] p-4 text-xs sm:text-sm shadow-md transition-all hover:border-[#d4af37]/40"
                  style={{ borderLeft: `4px solid ${statusColor}` }}
                >
                  <div className="flex items-center justify-between font-bold text-[#f4efe6]">
                    <span className="text-sm font-black text-[#f3df88]">
                      {ord.hensCount} {isUr ? 'مرغیاں' : 'Hens'} (Rs. {ord.amount.toLocaleString()})
                    </span>
                    <span
                      className="font-black text-xs uppercase px-2 py-0.5 rounded-full"
                      style={{
                        color: statusColor,
                        backgroundColor: isApproved ? 'rgba(40,167,69,0.15)' : isRejected ? 'rgba(220,53,69,0.15)' : 'rgba(212,175,55,0.15)',
                        border: `1px solid ${statusColor}40`,
                      }}
                    >
                      {statusText}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-[#b0b0b0] mt-2 pt-2 border-t border-[#1e4d32]/60">
                    <span className="font-mono">
                      TID: {ord.tid}
                    </span>
                    <span>
                      {new Date(ord.submittedAt).toLocaleString(isUr ? 'ur-PK' : 'en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      })}
                    </span>
                  </div>

                  {ord.adminNote && (
                    <div className="mt-2 text-[11px] text-[#f4efe6]/60 bg-[#051a10]/60 p-2 rounded-lg">
                      <span className="text-[#d4af37] font-semibold">{isUr ? 'ایڈمن کا نوٹ: ' : 'Admin Note: '}</span>
                      {ord.adminNote}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d4af37]/30 bg-[#051a10]/50 p-6 text-center text-xs text-[#b0b0b0]">
            <p className="font-semibold">
              {isUr
                ? 'فی الحال کوئی پیکج آرڈر جمع نہیں کروایا گیا۔ نیا فلاک پیکج خریدنے پر آپ کے تمام آرڈرز یہاں ظاہر ہوں گے۔'
                : 'No package orders submitted yet. When you buy a flock package, your pending, approved, and active orders will appear here automatically.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
