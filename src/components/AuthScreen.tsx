import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types/farm';
import { OFFICIAL_INFO, generateReferralCode } from '../utils/farmRules';
import { setCurrentUser } from '../services/storage';
import { apiLogin, apiRegister, apiResetPassword } from '../services/api';
import { TrustBadge } from './TrustBadge';
import { t, TERMS_MODAL_ITEMS } from '../utils/translations';
import { Lock, Mail, User, Phone, Gift, Languages, ArrowRight, CheckCircle2, AlertCircle, KeyRound, ArrowLeft, FileText, ShieldCheck, X } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: UserAccount) => void;
  lang: 'en' | 'ur';
  onToggleLang: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, lang, onToggleLang }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Reset password fields
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  // Register fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Allow Escape key to close the Terms modal cleanly
  useEffect(() => {
    if (!showTermsModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTermsModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTermsModal]);

  // Check URL query for referral parameter (e.g., ?ref=PHF-1234)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setReferralCode(ref);
        setMode('register');
      }
    } catch {
      // Ignore URL parsing fallback
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg(isUr ? 'براہ کرم ای میل اور پاس ورڈ درج کریں۔' : 'Please provide email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await apiLogin(cleanEmail, cleanPass);
      setCurrentUser(user);
      onSuccess(user);
    } catch (err: any) {
      setErrorMsg(isUr ? 'لاگ ان ناکام رہا۔ براہ کرم ای میل اور پاس ورڈ چیک کریں۔' : err.message || 'Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Immediate debouncing guard against rapid spam clicks
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanEmail || !cleanPass || !cleanPhone) {
      setErrorMsg(isUr ? 'براہ کرم تمام لازمی فیلڈز مکمل کریں۔' : 'Please fill in all required fields.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMsg(isUr ? 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔' : 'Password must be at least 6 characters long.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg(strings.mustAgreeTermsError);
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await apiRegister({
        email: cleanEmail,
        password: cleanPass,
        fullName: cleanName,
        phone: cleanPhone,
        referralCode: referralCode.trim() || '',
      });

      setCurrentUser(user);
      setSuccessMsg(isUr ? 'اکاؤنٹ بن گیا! لاگ ان ہو رہا ہے...' : 'Account created successfully! Logging you in...');
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: any) {
      setErrorMsg(isUr ? 'اکاؤنٹ بنانے میں خرابی: ' + (err.message || '') : err.message || 'Error creating account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = resetPhone.trim();
    const cleanNewPass = newPassword.trim();
    const cleanConfirmPass = confirmPassword.trim();

    if (!cleanEmail || !cleanPhone || !cleanNewPass || !cleanConfirmPass) {
      setErrorMsg(isUr ? 'براہ کرم تمام لازمی فیلڈز مکمل کریں۔' : 'Please fill in all required fields.');
      return;
    }

    if (cleanNewPass.length < 6) {
      setErrorMsg(isUr ? 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔' : 'Password must be at least 6 characters long.');
      return;
    }

    if (cleanNewPass !== cleanConfirmPass) {
      setErrorMsg(strings.passwordsDoNotMatch);
      return;
    }

    try {
      setSubmittingReset(true);
      const user = await apiResetPassword({
        email: cleanEmail,
        phoneOrEasypaisa: cleanPhone,
        newPassword: cleanNewPass,
      });

      setCurrentUser(user);
      setSuccessMsg(strings.passwordResetSuccess);
      setTimeout(() => {
        onSuccess(user);
      }, 700);
    } catch (err: any) {
      setErrorMsg(isUr ? 'خرابی: ' + (err.message || '') : err.message || 'Password reset failed');
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#051a10] px-4 py-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient gold & green glow */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-[#0a3821]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Language Switcher on Auth Screen */}
      <div className="w-full max-w-md flex justify-end mb-3">
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#0a2618]/90 px-3.5 py-1.5 text-xs font-bold text-[#f3df88] hover:border-[#d4af37] hover:bg-[#0f3422] transition-colors cursor-pointer shadow-md"
        >
          <Languages className="h-3.5 w-3.5 text-[#d4af37]" />
          <span>{isUr ? 'English' : 'اردو'}</span>
        </button>
      </div>

      <div className="w-full max-w-md space-y-5 relative z-10">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#d4af37] bg-gradient-to-br from-[#0d3420] to-[#051a10] p-2 shadow-xl shadow-[#d4af37]/20">
            <img
              src="/golden-hen.svg"
              alt="Pak Hen Farm Golden Hen Profile"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#d4af37] font-serif">
            {strings.appName}
          </h1>
          <p className="text-xs text-[#f3df88]/80 font-medium">
            {strings.tagline}
          </p>
        </div>

        {/* Prominent Trust Badge as strictly required */}
        <TrustBadge lang={lang} />

        {/* Auth Card */}
        <div className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/95 p-6 sm:p-7 shadow-2xl backdrop-blur-md">
          {/* Tab Selector or Back Button */}
          {mode === 'forgot' ? (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f3df88] hover:underline cursor-pointer mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{strings.backToSignIn}</span>
              </button>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#d4af37]" />
                <h2 className="text-lg font-bold text-[#f4efe6]">
                  {strings.resetPasswordTitle}
                </h2>
              </div>
              <p className="text-xs text-[#f4efe6]/60 mt-0.5">
                {strings.resetPasswordSubtitle}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#051a10]/80 p-1 border border-[#d4af37]/20 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b38f20] text-[#051a10] shadow-md shadow-[#d4af37]/20'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  {strings.signInBtn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b38f20] text-[#051a10] shadow-md shadow-[#d4af37]/20'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  {strings.createAccountBtn}
                </button>
              </div>

              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#f4efe6]">
                  {mode === 'signin' ? strings.signInTitle : strings.createAccountTitle}
                </h2>
                <p className="text-xs text-[#f4efe6]/60 mt-0.5">
                  {mode === 'signin' ? strings.signInSubtitle : strings.createAccountSubtitle}
                </p>
              </div>
            </>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/50 bg-rose-950/60 p-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          {mode === 'forgot' ? (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {strings.emailLabel} *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {strings.phoneOrEasypaisaLabel} *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                  <input
                    type="text"
                    required
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value)}
                    placeholder="03001234567"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {strings.newPasswordLabel} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {strings.confirmNewPasswordLabel} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingReset}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] py-3 text-sm font-extrabold text-[#051a10] shadow-lg shadow-[#d4af37]/25 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingReset ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#051a10] border-t-transparent" />
                ) : (
                  <>
                    <span>{strings.resetPasswordBtn}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={mode === 'signin' ? handleSignIn : handleRegister} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                    {strings.fullNameLabel} *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isUr ? 'اپنا پورا نام درج کریں' : 'e.g. Muhammad Ali'}
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {strings.emailLabel} *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                  {strings.passwordLabel} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
                {mode === 'signin' && (
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[11px] font-semibold text-[#f3df88] hover:underline cursor-pointer"
                    >
                      {strings.forgotPasswordLink}
                    </button>
                  </div>
                )}
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      {strings.phoneLabel} *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="03001234567"
                        className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88]/80 mb-1">
                      {strings.referralCodeOptional}
                    </label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-3 h-4 w-4 text-[#d4af37]/60" />
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        placeholder="e.g. PHF-XXXX-1234"
                        className="w-full rounded-xl border border-[#d4af37]/20 bg-[#051a10]/80 py-2.5 pl-9 pr-3 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      />
                    </div>
                  </div>

                  {/* Mandatory Bilingual Terms & Conditions Agreement Box */}
                  <div
                    dir={isUr ? 'rtl' : 'ltr'}
                    className={`rounded-2xl border p-3.5 transition-colors space-y-2 ${
                      agreedToTerms
                        ? 'border-emerald-500/50 bg-emerald-950/35'
                        : 'border-[#d4af37]/30 bg-[#051a10]/80'
                    }`}
                  >
                    <label
                      htmlFor="agree-terms-checkbox"
                      className="flex items-start gap-2.5 cursor-pointer select-none"
                    >
                      <input
                        id="agree-terms-checkbox"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => {
                          setAgreedToTerms(e.target.checked);
                          if (e.target.checked) setErrorMsg('');
                        }}
                        aria-required="true"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#d4af37]/60 bg-[#051a10] text-[#d4af37] accent-[#d4af37] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-[#f4efe6] leading-snug">
                        {strings.agreeTermsLabel} <span className="text-[#d4af37]">*</span>
                      </span>
                    </label>

                    <p className="text-[11px] text-[#f4efe6]/70 leading-relaxed pl-6 pr-1">
                      {strings.agreeTermsPreview}{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="inline font-extrabold text-[#f3df88] underline decoration-[#d4af37]/70 underline-offset-2 hover:text-[#d4af37] cursor-pointer"
                      >
                        {strings.readMoreBtn}
                      </button>
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] py-3 text-sm font-extrabold text-[#051a10] shadow-lg shadow-[#d4af37]/25 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#051a10] border-t-transparent" />
                    <span>{isUr ? 'اکاؤنٹ بن رہا ہے...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? strings.signInBtn : strings.createAccountBtn}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Toggle helper footer */}
          {mode !== 'forgot' && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'register' : 'signin');
                  setErrorMsg('');
                }}
                className="text-xs font-semibold text-[#f3df88] hover:underline cursor-pointer"
              >
                {mode === 'signin' ? strings.dontHaveAccount : strings.alreadyHaveAccount}
              </button>
            </div>
          )}
        </div>

        {/* Security & Admin Notice */}
        <p className="text-center text-[11px] text-[#f4efe6]/40 leading-relaxed px-2">
          {strings.authAdminNote}
        </p>
      </div>

      {/* Bilingual Terms & Conditions Modal */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-heading"
            dir={isUr ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border-2 border-[#d4af37]/60 bg-[#0a2618] shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#d4af37]/25 bg-[#051a10] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="terms-modal-heading" className="text-sm sm:text-base font-black text-[#f3df88] leading-snug">
                    {strings.termsModalHeading}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{isUr ? 'اسلامی مضاربہ و مشارکہ پالیسی' : 'Islamic Mudarabah & Musharakah Charter'}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#0a2618] px-2.5 py-1 text-[11px] font-bold text-[#f3df88] hover:border-[#d4af37] cursor-pointer"
                >
                  <Languages className="h-3 w-3 text-[#d4af37]" />
                  <span>{isUr ? 'English' : 'اردو'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  aria-label={isUr ? 'بند کریں' : 'Close Terms Modal'}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d4af37]/30 bg-[#0a2618] text-[#f4efe6]/80 hover:text-white hover:border-[#d4af37] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Terms Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-3">
              {TERMS_MODAL_ITEMS[lang].map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#d4af37]/25 bg-[#051a10]/85 p-3.5 sm:p-4 space-y-1"
                >
                  <h4 className="text-xs sm:text-sm font-black text-[#d4af37]">
                    {section.title}
                  </h4>
                  <p className="text-xs text-[#f4efe6]/85 leading-relaxed">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t border-[#d4af37]/25 bg-[#051a10] px-5 py-3.5">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="rounded-xl border border-[#d4af37]/30 px-4 py-2 text-xs font-bold text-[#f4efe6]/80 hover:bg-[#0a2618] cursor-pointer"
              >
                {isUr ? 'بند کریں' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setErrorMsg('');
                  setShowTermsModal(false);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] px-5 py-2 text-xs font-black text-[#051a10] shadow-lg shadow-[#d4af37]/20 hover:brightness-105 active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{strings.termsModalCloseBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
