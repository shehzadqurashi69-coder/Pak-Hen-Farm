import React from 'react';
import { ShieldCheck, MapPin } from 'lucide-react';
import { OFFICIAL_INFO } from '../utils/farmRules';

interface TrustBadgeProps {
  lang: 'en' | 'ur';
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ lang, className = '' }) => {
  const isUr = lang === 'ur';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0a2819] via-[#0d3420] to-[#0a2819] p-4 text-[#f4efe6] shadow-lg shadow-[#051a10]/50 ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f3df88] to-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/20">
          <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#f3df88]">
            <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>{isUr ? '100% تصدیق شدہ فزیکل پولٹری فارم' : '100% Verified Physical Farm'}</span>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-[#f4efe6]">
            {isUr ? OFFICIAL_INFO.trustBadgeUrdu : OFFICIAL_INFO.trustBadge}
          </p>
        </div>
      </div>
      {/* Decorative gold shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-60" />
    </div>
  );
};
