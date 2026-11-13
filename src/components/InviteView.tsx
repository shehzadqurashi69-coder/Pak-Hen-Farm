import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types/farm';
import { t } from '../utils/translations';
import { subscribeToMyReferrals } from '../services/firebase';
import {
  evaluateReferralMilestones,
  getReferralCommissionRateForPackage,
} from '../utils/farmRules';
import { ReferralMilestoneBoard } from './ReferralMilestoneBoard';
import {
  Copy,
  Check,
  Share2,
  Users,
  Award,
  ShieldCheck,
  Coins,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';

interface InviteViewProps {
  user: UserAccount;
  lang: 'en' | 'ur';
  onUserUpdated?: (updatedUser: UserAccount) => void;
}

export const InviteView: React.FC<InviteViewProps> = ({ user, lang, onUserUpdated }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const referralUrl = `${window.location.origin}/?ref=${user.referralCode}`;

  useEffect(() => {
    const unsub = subscribeToMyReferrals(user.referralCode, (list) => {
      setReferrals(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user.referralCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const message = isUr
      ? `السلام علیکم! پاک ہین فارم میں شامل ہوں اور حقیقی فزیکل مرغیوں کے ذریعے روزانہ انڈے وصول کریں۔ اس لنک سے اکاؤنٹ بنائیں: ${referralUrl}`
      : `Join Pak Hen Farm (Real physical poultry farming across Pakistan) and collect fresh daily eggs directly to your wallet! Sign up with my link: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const milestoneEval = evaluateReferralMilestones(referrals, user.claimedMilestoneTargets || []);
  const unlockedTargetIds = milestoneEval.items
    .filter((item) => item.isReached || item.isClaimed)
    .map((item) => item.target.id);

  // Calculate total direct commission earned from approved referrals (10% base or 15% unlocked tier)
  const totalCommissionEarned = referrals.reduce((acc, refUser) => {
    const pkgs = refUser.packages || [];
    const earned = pkgs.reduce((sum, p) => {
      const price = Number(p.purchasePrice) || 0;
      const rate = getReferralCommissionRateForPackage(price, p.hens, unlockedTargetIds);
      return sum + Math.round((price * rate) / 100);
    }, 0);
    return acc + earned;
  }, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-black text-[#d4af37] font-serif">
          {strings.inviteTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[#f4efe6]/70">
          {strings.inviteSubtitle}
        </p>
      </div>

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0d3420] via-[#0a2618] to-[#051a10] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 px-3 py-1 text-xs font-bold text-[#f3df88]">
              <Award className="h-4 w-4" />
              <span>{isUr ? '10٪ بیس + 15٪ VIP مائل اسٹون پروگرام' : '10% Base + 15% Milestone Tiers'}</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#f4efe6]">
              {isUr ? 'دوستوں کو پولٹری فارمنگ سے جوڑیں' : 'Grow the Farm Community'}
            </h3>
            <p className="text-xs sm:text-sm text-[#f4efe6]/75 max-w-lg leading-relaxed">
              {isUr
                ? 'اپنے دوستوں کو پاک ہین فارم پر مدعو کریں۔ ہر منظور شدہ فلاک پیکج پر 10٪ براہِ راست کمیشن اور ہدف A–D مکمل کر کے اضافی نقد بونس و 15٪ VIP کمیشن پائیں۔'
                : 'Invite friends to Pak Hen Farm across Pakistan. Receive a standard 10% auto-commission on every approved flock deposit, plus unlock cash milestone bonuses and 15% enhanced commissions via Targets A–D.'}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#d4af37] bg-[#051a10] p-4 text-center min-w-[210px] shadow-xl shadow-[#d4af37]/20">
            <span className="text-[10px] font-bold uppercase text-[#f3df88]/80 block mb-1">
              {strings.yourReferralCode}
            </span>
            <div className="text-xl font-mono font-black text-[#d4af37] tracking-wider">
              {user.referralCode}
            </div>
            {(totalCommissionEarned > 0 || (user.milestoneBonusesEarned || 0) > 0) && (
              <div className="mt-2 pt-2 border-t border-[#d4af37]/30 text-xs text-emerald-400 font-bold">
                +{isUr ? 'کمیشن و بونس' : 'Earned'}: Rs. {(totalCommissionEarned + (user.milestoneBonusesEarned || 0)).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Share inputs */}
        <div className="mt-8 pt-6 border-t border-[#d4af37]/25 space-y-4">
          <label className="block text-xs font-bold text-[#f3df88]">
            {strings.referralLink}
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="flex-1 rounded-xl border border-[#d4af37]/40 bg-[#051a10] px-4 py-3 font-mono text-xs text-[#f4efe6] select-all outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] px-5 py-3 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-98 transition-all cursor-pointer shadow-lg shadow-[#d4af37]/20 shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? strings.linkCopied : strings.copyLink}</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-xs font-black text-white hover:bg-[#20ba5a] active:scale-98 transition-all cursor-pointer shadow-lg shadow-emerald-900/30 shrink-0"
            >
              <Share2 className="h-4 w-4" />
              <span>{strings.shareWhatsApp}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Milestone & Target Bonus System */}
      <ReferralMilestoneBoard
        user={user}
        lang={lang}
        onUserUpdated={onUserUpdated}
        referralsOverride={referrals}
      />

      {/* 10% Auto-Commission Rule Box */}
      <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0a2618] via-[#0d3420] to-[#0a2618] p-4 sm:p-5 shadow-lg flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88]">
          <Coins className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-bold text-[#f3df88]">
            {isUr ? '10٪ خودکار کمیشن پالیسی' : '10% Auto-Commission Guarantee'}
          </h4>
          <p className="text-xs text-[#f4efe6]/80 leading-relaxed">
            {strings.referralCommissionNotice}
          </p>
        </div>
      </div>

      {/* 'My Referrals' List Section */}
      <div className="rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/90 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#f3df88]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#d4af37]">
                {strings.myReferralsTitle}
              </h3>
              <p className="text-[11px] text-[#f4efe6]/60">
                {isUr
                  ? `کل مدعو اراکین: ${referrals.length}`
                  : `Total Invited Members: ${referrals.length}`}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-[#051a10] border border-[#d4af37]/40 px-3 py-1 text-xs font-mono font-bold text-[#f3df88]">
            {referrals.length} {isUr ? 'اراکین' : 'Members'}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#f4efe6]/60 animate-pulse">
            {isUr ? 'ریفرلز لوڈ ہو رہے ہیں...' : 'Loading your referrals...'}
          </div>
        ) : referrals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d4af37]/30 bg-[#051a10]/50 p-8 text-center space-y-2">
            <UserCheck className="h-8 w-8 text-[#d4af37]/40 mx-auto" />
            <p className="text-xs sm:text-sm text-[#f4efe6]/70 max-w-md mx-auto">
              {strings.noReferralsYet}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#f4efe6]">
              <thead>
                <tr className="border-b border-[#d4af37]/20 text-[11px] font-bold text-[#f3df88] uppercase tracking-wider">
                  <th className="py-2.5 px-3">{strings.colName}</th>
                  <th className="py-2.5 px-3">{strings.colDate}</th>
                  <th className="py-2.5 px-3 text-center">{strings.colStatus}</th>
                  <th className="py-2.5 px-3 text-right">{strings.colCommission}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4af37]/10">
                {referrals.map((refUser) => {
                  const hasPurchased =
                    (refUser.packages && refUser.packages.length > 0) ||
                    (refUser.activeHens && refUser.activeHens > 0);

                  const earnedCommission = (refUser.packages || []).reduce((sum, p) => {
                    const price = Number(p.purchasePrice) || 0;
                    const rate = getReferralCommissionRateForPackage(price, p.hens, unlockedTargetIds);
                    return sum + Math.round((price * rate) / 100);
                  }, 0);

                  const dateFormatted = refUser.createdAt
                    ? new Date(refUser.createdAt).toLocaleDateString(isUr ? 'ur-PK' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-';

                  return (
                    <tr
                      key={refUser.id}
                      className="hover:bg-[#0d3420]/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#f4efe6]">{refUser.fullName}</div>
                        <div className="text-[10px] text-[#f4efe6]/50 font-mono">
                          {refUser.email}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#f4efe6]/75 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasPurchased ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{strings.statusPackageBought}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                            <Clock className="h-3 w-3" />
                            <span>{strings.statusPendingRef}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold">
                        {hasPurchased ? (
                          <span className="text-emerald-400">
                            +Rs. {earnedCommission.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#f4efe6]/40 text-[11px]">
                            {isUr ? '10٪ زیرِ التواء' : '10% Pending'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Perks Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-[#d4af37]/25 bg-[#0a2618]/80 p-5 shadow-xl flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#f3df88]">
            <Coins className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#f4efe6]">{strings.invitePerk1}</h4>
            <p className="text-xs text-[#f4efe6]/60 leading-relaxed">
              {isUr
                ? 'ہر پیکج جیسے کہ 1,000 روپے پر 100 روپے، 5,000 روپے پر 500 روپے فوری کریڈٹ ہوتے ہیں۔'
                : 'Earn Rs. 100 on a Rs. 1,000 flock, Rs. 500 on a Rs. 5,000 flock, directly credited.'}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-[#d4af37]/25 bg-[#0a2618]/80 p-5 shadow-xl flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#f4efe6]">{strings.invitePerk2}</h4>
            <p className="text-xs text-[#f4efe6]/60 leading-relaxed">
              {isUr
                ? 'فارم ماہرین کی طرف سے آپ کے دوستوں کو مکمل رہنمائی اور معاونت۔'
                : 'Dedicated customer guidance for all referred farm flock owners.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
