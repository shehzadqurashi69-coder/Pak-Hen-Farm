import React, { useState, useEffect } from 'react';
import { UserAccount, UserAlert } from '../types/farm';
import { t } from '../utils/translations';
import { apiPayMedicalFee, apiMarkAlertsAsRead } from '../services/api';
import { MedicalPaymentModal } from './MedicalPaymentModal';
import {
  Bell,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Warehouse,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  Inbox,
  Filter,
} from 'lucide-react';

interface NotificationsViewProps {
  user: UserAccount;
  alerts: UserAlert[];
  lang: 'en' | 'ur';
  onUserUpdated?: (updatedUser: UserAccount) => void;
  onMarkAllRead?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  user,
  alerts,
  lang,
  onUserUpdated,
  onMarkAllRead,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  // Mark all unread alerts as read on opening the Farm Inbox
  useEffect(() => {
    if (!user?.id) return;
    try {
      const readKey = `pakhen_read_alerts_${user.id}`;
      const existingRaw = localStorage.getItem(readKey);
      const existingList: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      const currentIds = alerts.map((a) => a.id);
      const merged = Array.from(new Set([...existingList, ...currentIds]));
      localStorage.setItem(readKey, JSON.stringify(merged));
    } catch {
      // Ignore storage errors
    }

    if (alerts.length > 0) {
      apiMarkAlertsAsRead(user.id, alerts.map((a) => a.id)).catch(() => {});
    }
    if (onMarkAllRead) {
      onMarkAllRead();
    }
  }, [user?.id, alerts.length]);

  const [filter, setFilter] = useState<'all' | 'mortality' | 'sickness' | 'admin'>('all');
  const [modalAlert, setModalAlert] = useState<UserAlert | null>(null);
  const [payingAlertId, setPayingAlertId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'mortality') return a.type === 'mortality';
    if (filter === 'sickness') return a.type === 'sickness';
    if (filter === 'admin') return a.type === 'admin_message';
    return true;
  });

  const handlePayMedical = async (alertId: string) => {
    try {
      setPayingAlertId(alertId);
      setPayError(null);
      const updatedUser = await apiPayMedicalFee(user, alertId);
      setPaySuccess(strings.feePaidSuccess);
      if (onUserUpdated) onUserUpdated(updatedUser);
      setTimeout(() => setPaySuccess(null), 5000);
    } catch (err: any) {
      setPayError(err.message || 'Payment failed');
    } finally {
      setPayingAlertId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0a2618] via-[#0d3420] to-[#051a10] p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-[#d4af37]">
          <Bell className="h-44 w-44" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3df88] shadow-lg shadow-[#d4af37]/15">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#d4af37] font-serif">
                {strings.notificationsTitle}
              </h2>
              <p className="text-xs text-[#f3df88]/80 font-medium mt-0.5">
                {strings.notificationsSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#051a10]/80 px-3 py-1.5 text-xs font-mono font-bold text-[#f3df88] self-start sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
            <span>
              {isUr ? `کل اطلاعات: ${alerts.length}` : `Total Alerts: ${alerts.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* Pay feedback toasts */}
      {paySuccess && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-4 text-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{paySuccess}</span>
        </div>
      )}
      {payError && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-4 text-rose-200">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{payError}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'all'
              ? 'bg-gradient-to-r from-[#d4af37] to-[#b38f20] text-[#051a10] shadow-md shadow-[#d4af37]/20 font-black'
              : 'border border-[#d4af37]/20 bg-[#0a2618]/60 text-[#f4efe6]/70 hover:text-[#f4efe6] hover:bg-[#0a2618]'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>{isUr ? 'تمام اطلاعات' : 'All Alerts'} ({alerts.length})</span>
        </button>

        <button
          onClick={() => setFilter('mortality')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'mortality'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#051a10] shadow-md shadow-amber-500/20 font-black'
              : 'border border-[#d4af37]/20 bg-[#0a2618]/60 text-[#f4efe6]/70 hover:text-[#f4efe6] hover:bg-[#0a2618]'
          }`}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          <span>
            {isUr ? 'قدرتی نقصانات (مضاربہ)' : 'Mortality & Loss'} (
            {alerts.filter((a) => a.type === 'mortality').length})
          </span>
        </button>

        <button
          onClick={() => setFilter('sickness')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'sickness'
              ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-900/30 font-black'
              : 'border border-[#d4af37]/20 bg-[#0a2618]/60 text-[#f4efe6]/70 hover:text-[#f4efe6] hover:bg-[#0a2618]'
          }`}
        >
          <HeartPulse className="h-3.5 w-3.5" />
          <span>
            {isUr ? 'طبی و ہیلتھ الرٹس' : 'Medical Care'} (
            {alerts.filter((a) => a.type === 'sickness').length})
          </span>
        </button>

        <button
          onClick={() => setFilter('admin')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'admin'
              ? 'bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/30 font-black'
              : 'border border-[#d4af37]/20 bg-[#0a2618]/60 text-[#f4efe6]/70 hover:text-[#f4efe6] hover:bg-[#0a2618]'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {isUr ? 'سرکاری پیغامات' : 'Official Notices'} (
            {alerts.filter((a) => a.type === 'admin_message').length})
          </span>
        </button>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/50 p-12 text-center space-y-3">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-[#051a10] border border-[#d4af37]/30 text-[#f3df88]/60">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-[#f4efe6]">
            {strings.noNotifications}
          </h3>
          <p className="text-xs text-[#f4efe6]/50 max-w-sm mx-auto">
            {isUr
              ? 'فارم انتظامیہ کی جانب سے تمام الرٹس، سرکاری پیغامات اور اموات کی رپورٹس یہاں باقاعدگی سے محفوظ ہوتی ہیں۔'
              : 'All official farm updates, admin notices, mortality adjustments, and veterinary care notices will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-3xl border p-5 sm:p-6 shadow-xl space-y-4 transition-all ${
                alert.type === 'admin_message'
                  ? 'border-[#d4af37] bg-gradient-to-br from-[#123824] via-[#0a2618] to-[#051a10] ring-1 ring-[#d4af37]/40'
                  : alert.type === 'sickness'
                  ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-[#0a2618] to-[#051a10]'
                  : 'border-amber-500/40 bg-gradient-to-br from-[#0e2a1b] via-[#0a2618] to-[#051a10]'
              }`}
            >
              {/* REQUIREMENT 4: Prominently display From: Pak Hen Farm header for manual admin messages */}
              {alert.type === 'admin_message' && (
                <div className="flex items-center justify-between bg-[#d4af37]/20 border border-[#d4af37]/50 rounded-2xl px-4 py-2 text-xs font-black text-[#f3df88]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
                    <span className="tracking-wide">{alert.senderHeader || strings.fromPakHenFarm}</span>
                  </div>
                  <span className="rounded-full bg-[#d4af37] px-2 py-0.5 text-[10px] text-[#051a10] font-black uppercase">
                    {strings.officialBadge}
                  </span>
                </div>
              )}

              {/* Alert Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      alert.type === 'admin_message'
                        ? 'border-[#d4af37]/60 bg-[#d4af37]/20 text-[#f3df88]'
                        : alert.type === 'sickness'
                        ? 'border-rose-500/40 bg-rose-950/60 text-rose-400'
                        : 'border-amber-500/40 bg-amber-950/60 text-amber-400'
                    }`}
                  >
                    {alert.type === 'admin_message' ? (
                      <Sparkles className="h-4 w-4 text-[#d4af37]" />
                    ) : alert.type === 'sickness' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#f4efe6]">
                      {isUr ? alert.titleUrdu || alert.titleUr : alert.title || alert.titleEn}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-[#f4efe6]/50 mt-0.5">
                      {alert.shedId && alert.shedId !== 'ALL' && (
                        <>
                          <span className="flex items-center gap-1">
                            <Warehouse className="h-3 w-3 text-[#d4af37]" />
                            <span className="font-mono text-[#f3df88] font-bold">{alert.shedId}</span>
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(alert.createdAt).toLocaleString(isUr ? 'ur-PK' : 'en-US')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="self-start sm:self-auto">
                  {alert.type === 'admin_message' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-[#d4af37]/50 bg-[#d4af37]/20 text-[#f3df88]">
                      <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span>{isUr ? 'سرکاری نوٹس' : 'Farm Notice'}</span>
                    </span>
                  ) : alert.type === 'sickness' ? (
                    alert.medicalFeePaid ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/40 bg-emerald-950/70 text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{strings.medicalFeePaidBadge}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/50 bg-rose-950/80 text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                        <span>{strings.urgentSickness}</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/40 bg-amber-950/60 text-amber-300 font-mono">
                      {isUr ? 'شرعی شراکت نفع و نقصان' : 'Mudarabah Loss Log'}
                    </span>
                  )}
                </div>
              </div>

              {/* Message Body */}
              <p className="text-xs sm:text-sm text-[#f4efe6]/85 leading-relaxed">
                {isUr ? alert.messageUrdu || alert.messageUr : alert.message || alert.messageEn}
              </p>

              {/* Loss Specifics Card */}
              {alert.type === 'mortality' && (
                <div className="rounded-2xl border border-amber-500/25 bg-[#051a10]/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#f3df88]/80 block">
                      {isUr ? 'فلاک پر اثر انداز نقصان' : 'Flock Loss Deduction'}
                    </span>
                    <span className="font-mono text-sm font-black text-rose-400">
                      {alert.financialLossDeducted !== undefined || alert.amountDeducted !== undefined
                        ? isUr
                          ? `-Rs. ${(alert.financialLossDeducted ?? alert.amountDeducted ?? 0).toLocaleString()} (والیٹ سے منہا)`
                          : `-Rs. ${(alert.financialLossDeducted ?? alert.amountDeducted ?? 0).toLocaleString()} (Deducted from Wallet)`
                        : alert.hensDeducted !== undefined
                        ? isUr
                          ? `-${alert.hensDeducted} مرغیاں (${alert.percentageLoss || 0}٪ نقصان)`
                          : `-${alert.hensDeducted} Hens (${alert.percentageLoss || 0}% Loss)`
                        : isUr
                        ? 'متناسب مالی کٹوتی نافذ شدہ'
                        : 'Proportional financial deduction applied'}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#f4efe6]/60 max-w-xs text-right">
                    {isUr
                      ? 'شرعی مضاربہ کے اصول کے تحت حقیقی فلاک میں قدرتی اموات تمام شراکت داروں کے درمیان متناسب تقسیم ہوتی ہیں۔'
                      : 'Under Islamic Mudarabah, natural flock mortality is shared proportionately among active partners.'}
                  </div>
                </div>
              )}

              {/* Sickness Action & Pause Warning */}
              {alert.type === 'sickness' && (
                <div className="space-y-2.5">
                  {!alert.medicalFeePaid && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5">
                      <div className="text-xs text-rose-200">
                        <span className="font-bold">⚠️ {strings.profitPausedWarning.replace('{shedId}', alert.shedId)}</span>
                      </div>
                      {alert.paymentPendingVerification ? (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/60 px-4 py-2 text-xs font-bold text-[#f3df88]">
                          <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>{isUr ? 'TID موصول! ایڈمن تصدیق زیر التواء' : 'TID Submitted • Verification Pending'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setModalAlert(alert)}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-2.5 text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-950/50 whitespace-nowrap"
                        >
                          <HeartPulse className="h-4 w-4" />
                          <span>{strings.payMedicalFeeBtn}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Medical Payment Modal */}
      {modalAlert && (
        <MedicalPaymentModal
          isOpen={!!modalAlert}
          onClose={() => setModalAlert(null)}
          user={user}
          alert={modalAlert}
          language={lang}
          onSuccess={(updatedUser) => {
            setModalAlert(null);
            setPaySuccess(strings.feePaidSuccess);
            if (updatedUser && onUserUpdated) onUserUpdated(updatedUser);
            setTimeout(() => setPaySuccess(null), 5000);
          }}
        />
      )}
    </div>
  );
};
