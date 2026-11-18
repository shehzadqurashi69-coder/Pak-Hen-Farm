import React, { useState, useEffect } from 'react';
import { UserAccount, SupportTicket } from '../types/farm';
import { OFFICIAL_INFO } from '../utils/farmRules';
import { apiCreateTicket, subscribeToTickets } from '../services/api';
import { t } from '../utils/translations';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Check,
  ExternalLink,
} from 'lucide-react';

interface HelpViewProps {
  user: UserAccount;
  lang: 'en' | 'ur';
}

const WhatsAppBrandIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M12.04 2C6.51 2 2 6.51 2 12.04c0 1.77.46 3.5 1.34 5.02L2 22l5.09-1.33a10.02 10.02 0 0 0 4.95 1.31h.01c5.53 0 10.04-4.51 10.04-10.04C22.09 6.51 17.57 2 12.04 2Zm5.84 14.15c-.25.7-1.45 1.34-2 1.42-.51.08-1.15.11-1.85-.11-.43-.14-.98-.32-1.69-.62-2.98-1.29-4.92-4.3-5.07-4.5-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.6.84 2.06.91 2.21.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.54-.15.15-.31.31-.13.61.18.3.8 1.32 1.71 2.13 1.18 1.05 2.17 1.38 2.47 1.53.3.15.48.13.66-.07.18-.2.76-.89.96-1.19.2-.3.4-.25.67-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.35.08.13.08.73-.17 1.43Z" />
  </svg>
);

const FacebookBrandIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H16.7V4.6c-.29-.04-1.28-.12-2.43-.12-2.41 0-4.06 1.47-4.06 4.17V10.9H7.5V14h2.71v8h3.29Z" />
  </svg>
);

const TikTokBrandIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.02-.07Z" />
  </svg>
);

export const HelpView: React.FC<HelpViewProps> = ({ user, lang }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    const unsub = subscribeToTickets('user', user.id, (list) => {
      setTickets(list);
    });
    return () => unsub();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanSubject = subject.trim();
    const cleanMsg = message.trim();

    if (!cleanSubject || !cleanMsg) {
      setErrorMsg(isUr ? 'براہ کرم عنوان اور پیغام درج کریں۔' : 'Please provide subject and message.');
      return;
    }

    try {
      await apiCreateTicket(user, cleanSubject, cleanMsg);
      setSuccessMsg(strings.ticketSubmittedSuccess);
      setSubject('');
      setMessage('');

      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting ticket');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-black text-[#d4af37] font-serif">
          {strings.helpTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[#f4efe6]/70">
          {strings.helpSubtitle}
        </p>
      </div>

      {/* Prominent Official Helpline Card */}
      <div className="rounded-3xl border-2 border-[#d4af37] bg-gradient-to-r from-[#0a2819] via-[#0f3a24] to-[#0a2819] p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f3df88] to-[#d4af37] text-[#051a10] shadow-lg shadow-[#d4af37]/30">
              <Headphones className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#f3df88]">
                {isUr ? 'سرکاری فارم کسٹمر سپورٹ و ہیلپ ڈیسک' : 'Official Customer Support & SOS Helpdesk'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {isUr ? '24/7 فارم کسٹمر ہیلپ ڈیسک' : '24/7 Farm Customer Helpdesk'}
              </div>
              <p className="text-xs text-[#f4efe6]/70">
                {isUr ? 'پورے پاکستان میں حقیقی فزیکل پولٹری فارم کسٹمر سروسز' : 'Physical poultry farm customer care across Pakistan'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('sos-form');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-5 py-3 text-xs font-bold text-[#051a10] hover:brightness-105 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{isUr ? 'پیغام ارسال کریں' : 'Send SOS Inquiry'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Direct Support & Official Social Media Links */}
      <div className="rounded-3xl border border-[#d4af37]/40 bg-[#0a2618]/95 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#d4af37]/20 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#f3df88]">
              {isUr ? 'براہِ راست واٹس ایپ سپورٹ اور سرکاری سوشل میڈیا' : 'Direct Support & Official Social Channels'}
            </h3>
            <p className="text-xs text-[#f4efe6]/65">
              {isUr
                ? 'فوری مدد کے لیے واٹس ایپ پر رابطہ کریں یا ہمارے آفیشل فیس بک اور ٹک ٹاک پیجز پر وزٹ کریں۔'
                : 'Message our support team directly on WhatsApp or follow our official Facebook and TikTok channels.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Prominent WhatsApp Support Button */}
          <a
            href={OFFICIAL_INFO.whatsappSupportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl border-2 border-[#d4af37] bg-gradient-to-br from-[#12452b] via-[#0a2c1b] to-[#051a10] p-4 shadow-lg shadow-[#d4af37]/15 hover:border-[#f3df88] hover:shadow-[#d4af37]/30 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f3df88] to-[#d4af37] text-[#051a10] shadow-md group-hover:scale-105 transition-transform">
                <WhatsAppBrandIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#f3df88]">
                  {isUr ? 'براہِ راست واٹس ایپ سپورٹ' : 'WhatsApp Support'}
                </span>
                <span dir="ltr" className="block text-sm sm:text-base font-black font-mono text-white truncate">
                  {OFFICIAL_INFO.whatsappSupportPhone}
                </span>
                <span className="block text-[11px] font-semibold text-emerald-300/90">
                  {isUr ? 'ابھی چیٹ کریں' : 'Direct Chat Support'}
                </span>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/20 text-[#f3df88] border border-[#d4af37]/40 group-hover:bg-[#d4af37] group-hover:text-[#051a10] transition-colors">
              <ExternalLink className="h-4 w-4" />
            </div>
          </a>

          {/* 2. Official Facebook Page Button */}
          <a
            href={OFFICIAL_INFO.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/45 bg-[#051a10]/90 p-4 shadow-md hover:border-[#f3df88] hover:bg-[#0d3420]/70 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/50 bg-[#0d3420] text-[#f3df88] shadow-inner group-hover:bg-[#d4af37] group-hover:text-[#051a10] transition-colors">
                <FacebookBrandIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
                  {isUr ? 'آفیشل پیج' : 'Official Page'}
                </span>
                <span className="block text-sm sm:text-base font-black text-[#f4efe6] truncate">
                  {isUr ? 'فیس بک پیج' : 'Facebook Page'}
                </span>
                <span className="block text-[11px] text-[#f4efe6]/65 truncate">
                  {isUr ? 'فارم کی تازہ اپ ڈیٹس' : 'Visit Official Facebook'}
                </span>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#0a2618] text-[#f3df88] group-hover:border-[#d4af37] group-hover:bg-[#d4af37] group-hover:text-[#051a10] transition-colors">
              <ExternalLink className="h-4 w-4" />
            </div>
          </a>

          {/* 3. Official TikTok Account Button */}
          <a
            href={OFFICIAL_INFO.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/45 bg-[#051a10]/90 p-4 shadow-md hover:border-[#f3df88] hover:bg-[#0d3420]/70 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/50 bg-[#0d3420] text-[#f3df88] shadow-inner group-hover:bg-[#d4af37] group-hover:text-[#051a10] transition-colors">
                <TikTokBrandIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
                  {isUr ? 'آفیشل اکاؤنٹ' : 'Official Account'}
                </span>
                <span className="block text-sm sm:text-base font-black text-[#f4efe6] truncate">
                  {isUr ? 'ٹک ٹاک اکاؤنٹ' : 'TikTok Account'}
                </span>
                <span dir="ltr" className="block text-[11px] font-mono text-[#f3df88]/80 truncate">
                  @pakhenfarm
                </span>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#0a2618] text-[#f3df88] group-hover:border-[#d4af37] group-hover:bg-[#d4af37] group-hover:text-[#051a10] transition-colors">
              <ExternalLink className="h-4 w-4" />
            </div>
          </a>
        </div>
      </div>

      {/* Ticket Submission Form */}
      <div id="sos-form" className="rounded-3xl border border-[#d4af37]/40 bg-[#0a2618]/95 p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <h3 className="text-base font-bold text-[#f4efe6] mb-4">
          {isUr ? 'فارم عملے کو پیغام / مسئلہ ارسال کریں' : 'Send an Inquiry to Farm Staff'}
        </h3>

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/50 bg-rose-950/70 p-3 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/70 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#f3df88] mb-1">
              {strings.ticketSubjectLabel} *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isUr ? 'مثال: آرڈر تصدیق، نکلوائی، یا انڈے جمع کرنے میں رہنمائی' : 'e.g. Order verification, withdrawal inquiry, or egg collection'}
              className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3.5 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#f3df88] mb-1">
              {strings.ticketMessageLabel} *
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isUr ? 'اپنا پیغام یا مسئلہ تفصیل کے ساتھ بیان کریں...' : 'Provide details regarding your question or flock inquiries...'}
              className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3.5 text-sm text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] resize-none"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] px-6 py-3 text-xs sm:text-sm font-extrabold text-[#051a10] hover:brightness-105 active:scale-98 transition-all cursor-pointer shadow-lg shadow-[#d4af37]/20"
          >
            <Send className="h-4 w-4" />
            <span>{strings.ticketSubmitBtn}</span>
          </button>
        </form>
      </div>

      {/* User's Ticket Inquiries & Staff Replies */}
      <div className="rounded-3xl border border-[#d4af37]/25 bg-[#0a2618]/80 p-5 sm:p-6 shadow-xl">
        <h3 className="text-base font-bold text-[#f4efe6] mb-4">
          {strings.yourTicketsTitle}
        </h3>

        {tickets.length === 0 ? (
          <p className="text-xs text-[#f4efe6]/50 text-center py-4">
            {isUr ? 'ابھی تک آپ کا کوئی پیغام یا ٹکٹ جمع نہیں ہوا۔' : 'No inquiry tickets submitted yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-4 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#f3df88] text-sm">{t.subject}</span>
                    <span className="font-mono text-[11px] text-[#f4efe6]/40">#{t.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#f4efe6]/50">
                      {new Date(t.createdAt).toLocaleDateString(isUr ? 'ur-PK' : 'en-US')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {t.status === 'resolved' ? (isUr ? 'حل شدہ' : 'Resolved') : (isUr ? 'زیرِ جائزہ' : 'Open')}
                    </span>
                  </div>
                </div>

                <p className="text-[#f4efe6]/80 leading-relaxed">{t.message}</p>

                {t.staffReply && (
                  <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{strings.staffReplyHeader}</span>
                    </div>
                    <p className="text-xs text-emerald-100/90">{t.staffReply}</p>
                    <span className="text-[10px] text-emerald-300/50 block">
                      {new Date(t.repliedAt || '').toLocaleString(isUr ? 'ur-PK' : 'en-US')}
                    </span>
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
