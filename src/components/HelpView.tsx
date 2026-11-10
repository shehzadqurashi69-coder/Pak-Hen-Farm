import React, { useState, useEffect } from 'react';
import { UserAccount, SupportTicket } from '../types/farm';
import { OFFICIAL_INFO } from '../utils/farmRules';
import { apiGetTickets, apiCreateTicket, subscribeToTickets } from '../services/api';
import { t } from '../utils/translations';
import { Phone, MessageSquare, Send, CheckCircle2, AlertCircle, Headphones, Clock, Check } from 'lucide-react';

interface HelpViewProps {
  user: UserAccount;
  lang: 'en' | 'ur';
}

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
          <div className="flex items-center gap-4">
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

          <div className="flex items-center gap-2.5 shrink-0">
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
