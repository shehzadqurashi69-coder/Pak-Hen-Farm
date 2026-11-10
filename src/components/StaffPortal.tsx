import React, { useState, useEffect } from 'react';
import { UserAccount, SupportTicket } from '../types/farm';
import { OFFICIAL_INFO } from '../utils/farmRules';
import { apiGetTickets, apiReplyTicket, subscribeToTickets } from '../services/api';
import { t } from '../utils/translations';
import { Headphones, CheckCircle2, Send, Clock, User, Phone, Mail, RefreshCw } from 'lucide-react';

interface StaffPortalProps {
  staffUser: UserAccount;
  lang: 'en' | 'ur';
}

export const StaffPortal: React.FC<StaffPortalProps> = ({ staffUser, lang }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  const fetchTickets = async () => {
    try {
      const list = await apiGetTickets(staffUser);
      setTickets(list);
    } catch (e) {
      console.error('Error fetching tickets:', e);
    }
  };

  useEffect(() => {
    const unsub = subscribeToTickets('staff', staffUser.id, (list) => {
      setTickets(list);
    });
    return () => unsub();
  }, [staffUser.id]);

  const handleReply = async (ticketId: string) => {
    const text = replyTextMap[ticketId]?.trim();
    if (!text) return;

    try {
      await apiReplyTicket(staffUser, ticketId, text);
      await fetchTickets();
      setReplyTextMap((prev) => ({ ...prev, [ticketId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Error replying to ticket');
    }
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d4af37]/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-[#051a10]">
              <Headphones className="h-4 w-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#d4af37] font-serif">
              {strings.staffPortalTitle}
            </h2>
          </div>
          <p className="text-xs text-[#f4efe6]/70 mt-1">
            {strings.staffHelplineNote} • Pakistan Nationwide Farm Services
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#0a2618] px-3 py-1.5 text-xs font-bold text-[#f3df88] hover:bg-[#0f3422] cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{isUr ? 'تازہ کریں' : 'Refresh Tickets'}</span>
        </button>
      </div>

      {/* Prominent Helpline Card */}
      <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-[#0a2819] to-[#0d3420] p-5 shadow-xl flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
            {isUr ? 'فارم سپورٹ سسٹم' : 'Farm Customer Helpdesk System'}
          </span>
          <div className="text-xl font-bold text-white">
            {isUr ? 'آن لائن ٹکٹنگ سروس' : 'Active Ticket Service'}
          </div>
        </div>

        <div className="rounded-xl bg-[#051a10] border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400">
          {openCount} {isUr ? 'کھلے ٹکٹس' : 'Active Inquiries'}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#f4efe6]">
          {strings.openTicketsTitle}
        </h3>

        {tickets.length === 0 ? (
          <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/60 p-8 text-center text-xs text-[#f4efe6]/50">
            {isUr ? 'کوئی نیا پیغام یا ٹکٹ موصول نہیں ہوا (ڈیٹا بیس خالی ہے)۔' : 'No support tickets received yet (Database starts empty).'}
          </div>
        ) : (
          <div className="space-y-3.5">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 shadow-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#f3df88]">{t.subject}</span>
                      <span className="font-mono text-xs text-[#f4efe6]/50">#{t.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#f4efe6]/60 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-[#d4af37]" />
                        {t.userName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-[#d4af37]" />
                        {t.userPhone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                        {t.userEmail}
                      </span>
                    </div>
                  </div>

                  <div>
                    {t.status === 'open' ? (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300 inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{isUr ? 'زیرِ جائزہ' : 'Awaiting Reply'}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{isUr ? 'حل شدہ' : 'Resolved'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#051a10]/70 p-3.5 text-xs text-[#f4efe6]/90 leading-relaxed">
                  {t.message}
                </div>

                {t.staffReply && (
                  <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 text-xs space-y-1">
                    <span className="text-[11px] font-bold text-emerald-300 block">
                      {isUr ? 'اسٹاف کا سرکاری جواب:' : 'Staff Official Reply:'}
                    </span>
                    <p className="text-emerald-100">{t.staffReply}</p>
                    <span className="text-[10px] text-emerald-300/60 block">
                      {new Date(t.repliedAt || '').toLocaleString()}
                    </span>
                  </div>
                )}

                {t.status === 'open' && (
                  <div className="pt-2 space-y-2">
                    <textarea
                      rows={2}
                      value={replyTextMap[t.id] || ''}
                      onChange={(e) =>
                        setReplyTextMap((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      placeholder={strings.replyPlaceholder}
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] p-2.5 text-xs text-[#f4efe6] placeholder-[#f4efe6]/30 focus:border-[#d4af37] focus:outline-none resize-none"
                    />

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleReply(t.id)}
                        disabled={!replyTextMap[t.id]?.trim()}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-4 py-2 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{strings.sendReplyBtn}</span>
                      </button>
                    </div>
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
