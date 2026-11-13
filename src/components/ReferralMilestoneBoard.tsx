import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types/farm';
import {
  MILESTONE_TARGETS,
  evaluateReferralMilestones,
  MilestoneProgressItem,
} from '../utils/farmRules';
import { subscribeToMyReferrals } from '../services/firebase';
import { apiClaimReferralMilestone } from '../services/api';
import { setCurrentUser } from '../services/storage';
import { t } from '../utils/translations';
import {
  Trophy,
  Target,
  Gift,
  Copy,
  Check,
  Share2,
  Sparkles,
  CheckCircle2,
  Award,
  ArrowRight,
  Loader2,
  Users,
} from 'lucide-react';

interface ReferralMilestoneBoardProps {
  user: UserAccount;
  lang: 'en' | 'ur';
  onUserUpdated?: (updatedUser: UserAccount) => void;
  onOpenFullInvite?: () => void;
  referralsOverride?: UserAccount[];
  compactShareBar?: boolean;
}

export const ReferralMilestoneBoard: React.FC<ReferralMilestoneBoardProps> = ({
  user,
  lang,
  onUserUpdated,
  onOpenFullInvite,
  referralsOverride,
  compactShareBar = false,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [referrals, setReferrals] = useState<UserAccount[]>(referralsOverride || []);
  const [copied, setCopied] = useState(false);
  const [claimingTargetId, setClaimingTargetId] = useState<string | null>(null);
  const [claimBanner, setClaimBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (referralsOverride) {
      setReferrals(referralsOverride);
      return;
    }
    if (!user?.referralCode) return;
    const unsub = subscribeToMyReferrals(user.referralCode, (list) => {
      setReferrals(list);
    });
    return () => unsub();
  }, [user?.referralCode, referralsOverride]);

  const referralUrl = `${window.location.origin}/?ref=${user.referralCode}`;
  const claimedTargets = user.claimedMilestoneTargets || [];
  const evaluation = evaluateReferralMilestones(referrals, claimedTargets);

  // Total 10%/15% direct commissions earned from approved referrals
  const directCommissionTotal = referrals.reduce((acc, refUser) => {
    const pkgs = refUser.packages || [];
    return (
      acc +
      pkgs.reduce((sum, p) => {
        const price = Number(p.purchasePrice) || 0;
        const rate =
          (price === 4000 || p.hens === 5) && evaluation.unlockedCommissionRateC === 15
            ? 15
            : (price === 8000 || p.hens === 10) && evaluation.unlockedCommissionRateD === 15
            ? 15
            : 10;
        return sum + Math.round((price * rate) / 100);
      }, 0)
    );
  }, 0);

  const totalMilestoneBonusCredited = Number(user.milestoneBonusesEarned) || 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const message = isUr
      ? `السلام علیکم! پاک ہین فارم میں شامل ہوں اور حقیقی فزیکل مرغیوں کے ذریعے روزانہ انڈے وصول کریں۔ اس لنک سے اکاؤنٹ بنائیں: ${referralUrl}`
      : `Join Pak Hen Farm (Real physical poultry farming across Pakistan) and earn daily returns! Sign up with my link: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleClaimMilestone = async (targetId: string) => {
    if (claimingTargetId) return;
    setClaimBanner(null);
    try {
      setClaimingTargetId(targetId);
      const res = await apiClaimReferralMilestone(user.id, targetId);
      if (res.creditedAmount > 0) {
        setCurrentUser(res.updatedUser);
        if (onUserUpdated) {
          onUserUpdated(res.updatedUser);
        }
        setClaimBanner({
          type: 'success',
          text: isUr
            ? `مبارک ہو! ${res.creditedAmount.toLocaleString()} روپے کا مائل اسٹون بونس آپ کے والٹ میں شامل کر دیا گیا۔`
            : `Milestone Unlocked! PKR ${res.creditedAmount.toLocaleString()} bonus credited directly to your wallet.`,
        });
      } else {
        setClaimBanner({
          type: 'error',
          text: isUr
            ? 'یہ ہدف پہلے ہی وصول کیا جا چکا ہے یا ابھی مکمل نہیں ہوا۔'
            : 'Target already claimed or qualifying referrals not yet reached.',
        });
      }
    } catch (err: any) {
      setClaimBanner({
        type: 'error',
        text: err?.message || 'Unable to claim milestone bonus right now.',
      });
    } finally {
      setClaimingTargetId(null);
    }
  };

  const renderTargetCard = (item: MilestoneProgressItem) => {
    const { target, cappedCount, progressPercent, isReached, isClaimed, isClaimable } = item;
    const isBoostTier = target.rewardType === 'commission_boost';

    return (
      <div
        key={target.id}
        className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between gap-3 ${
          isClaimed
            ? 'border-emerald-500/60 bg-gradient-to-br from-emerald-950/80 via-[#0a2618] to-[#051a10] shadow-lg shadow-emerald-950/30'
            : isClaimable
            ? 'border-[#f3df88] bg-gradient-to-br from-[#2b2408] via-[#0d3420] to-[#051a10] shadow-xl shadow-[#d4af37]/20'
            : 'border-[#d4af37]/30 bg-[#051a10]/85 hover:border-[#d4af37]/60'
        }`}
      >
        <div className="space-y-2.5">
          {/* Header Row: Tier Badge + Progress Pill */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-black text-xs shadow ${
                  isClaimed
                    ? 'bg-emerald-500 text-[#051a10]'
                    : 'bg-gradient-to-br from-[#d4af37] to-[#b38f20] text-[#051a10]'
                }`}
              >
                {target.code}
              </span>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-[#f4efe6] truncate">
                  {isUr ? target.titleUr : target.titleEn}
                </h4>
                <span className="text-[11px] font-bold text-[#f3df88]/90 block truncate">
                  {isUr ? target.packageLabelUr : target.packageLabelEn}
                </span>
              </div>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-mono font-black border ${
                isReached
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#0a2618] text-[#f3df88] border-[#d4af37]/40'
              }`}
            >
              {cappedCount}/{target.requiredReferrals} {isUr ? 'مکمل' : 'Completed'}
            </span>
          </div>

          {/* Description */}
          <p className="text-[11px] sm:text-xs text-[#f4efe6]/75 leading-relaxed">
            {isUr ? target.descUr : target.descEn}
          </p>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0a2618] border border-[#d4af37]/25">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isReached
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : 'bg-gradient-to-r from-[#b38f20] via-[#f3df88] to-[#d4af37]'
                }`}
                style={{ width: `${Math.max(progressPercent, cappedCount > 0 ? 8 : 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-[#f4efe6]/60">
              <span>
                {isUr
                  ? `${cappedCount} از ${target.requiredReferrals} مدعو خریدار`
                  : `${cappedCount} of ${target.requiredReferrals} referred buyers`}
              </span>
              <span className="font-mono text-[#f3df88]">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Bottom Reward Highlight & Action */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#d4af37]/15">
          <div className="flex items-center gap-1.5 min-w-0">
            {isBoostTier ? (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            ) : (
              <Gift className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
            )}
            <span className="text-[11px] sm:text-xs font-black text-emerald-300 truncate">
              {isUr ? target.rewardLabelUr : target.rewardLabelEn}
            </span>
          </div>

          {isClaimed ? (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-black text-emerald-300 shrink-0">
              <CheckCircle2 className="h-3 w-3" />
              <span>{isUr ? 'انعام وصول شدہ' : 'Unlocked ✓'}</span>
            </span>
          ) : isClaimable ? (
            <button
              type="button"
              disabled={claimingTargetId === target.id}
              onClick={() => handleClaimMilestone(target.id)}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] px-3 py-1.5 text-[11px] font-black text-[#051a10] shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-60"
            >
              {claimingTargetId === target.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Award className="h-3 w-3" />
              )}
              <span>
                {isUr ? `بونس حاصل کریں (Rs.${target.bonusAmountPkr})` : `Claim Rs. ${target.bonusAmountPkr.toLocaleString()}`}
              </span>
            </button>
          ) : (
            <span className="rounded-xl border border-[#d4af37]/25 bg-[#0a2618] px-2.5 py-1 text-[10px] font-bold text-[#f3df88]/70 shrink-0">
              {isUr
                ? `${target.requiredReferrals - cappedCount} مزید درکار`
                : `${target.requiredReferrals - cappedCount} left`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0d3420]/90 via-[#0a2618]/95 to-[#051a10] p-5 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b38f20] text-[#051a10] shadow-lg shadow-[#d4af37]/25">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-[#f3df88]">
                {isUr ? 'انوائٹ اینڈ ارن — مائل اسٹون ٹارگٹ بونس سسٹم' : 'Invite & Earn — Milestone Target Bonuses'}
              </h3>
              <span className="rounded-full bg-[#051a10] border border-[#d4af37]/40 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                {evaluation.unlockedCommissionRateC === 15 || evaluation.unlockedCommissionRateD === 15
                  ? isUr
                    ? '10% بیس + 15% VIP فعال'
                    : '10% Base + 15% Tier Active'
                  : isUr
                  ? '10% براہ راست کمیشن'
                  : '10% Direct Base Rate'}
              </span>
            </div>
            <p className="text-xs text-[#f4efe6]/70 mt-0.5">
              {isUr
                ? 'ہر منظور شدہ پیکج پر 10٪ کمیشن کے علاوہ ہدف A، B، C اور D مکمل کر کے اضافی نقد بونس اور 15٪ کمیشن انلاک کریں۔'
                : 'Earn standard 10% direct commission on every approved referral deposit, plus unlock extra wallet bonuses & 15% tier commissions via Targets A–D.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3 py-1.5 text-xs">
            <span className="text-[10px] text-[#f4efe6]/60 block">
              {isUr ? 'ریفرل کمیشن + بونس' : 'Earned + Bonuses'}
            </span>
            <span className="font-mono font-black text-emerald-400">
              Rs. {(directCommissionTotal + totalMilestoneBonusCredited).toLocaleString()}
            </span>
          </div>
          {onOpenFullInvite && (
            <button
              type="button"
              onClick={onOpenFullInvite}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f3df88] px-3.5 py-2 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow"
            >
              <Users className="h-3.5 w-3.5" />
              <span>{isUr ? 'مکمل ریفرل فہرست' : 'Full Referral Hub'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Claim / Action Notification */}
      {claimBanner && (
        <div
          className={`flex items-center gap-2 rounded-2xl border p-3.5 text-xs font-bold ${
            claimBanner.type === 'success'
              ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200'
              : 'border-rose-500/50 bg-rose-950/80 text-rose-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{claimBanner.text}</span>
        </div>
      )}

      {/* Optional Quick Share Strip (especially useful inside WalletView) */}
      {compactShareBar && (
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#051a10]/90 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase text-[#f3df88]/80">
                {strings.yourReferralCode}:
              </span>
              <span className="font-mono text-xs font-black text-[#d4af37]">
                {user.referralCode}
              </span>
            </div>
            <div className="truncate font-mono text-[11px] text-[#f4efe6]/70">
              {referralUrl}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f3df88] px-3.5 py-2 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? strings.linkCopied : isUr ? 'لنک کاپی کریں' : 'Copy Link'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-black text-white hover:bg-[#20ba5a] active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Milestone Target Cards (Targets A, B, C, D) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {evaluation.items.map((item) => renderTargetCard(item))}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#f4efe6]/60 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-[#d4af37]" />
          <span>
            {isUr
              ? 'کل {count} مدعو اراکین میں سے منظور شدہ خریداریوں پر پیشرفت خودکار شمار ہوتی ہے۔'.replace('{count}', String(referrals.length))
              : `Live progress tracked across ${referrals.length} invited member(s) with Admin-approved deposits.`}
          </span>
        </span>
        <span className="font-mono text-[#f3df88] font-bold">
          {MILESTONE_TARGETS.filter((t) => claimedTargets.includes(t.id)).length}/4 {isUr ? 'اہداف مکمل' : 'Targets Unlocked'}
        </span>
      </div>
    </div>
  );
};
