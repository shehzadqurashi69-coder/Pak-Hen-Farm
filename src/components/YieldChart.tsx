import React from 'react';
import { EggCollectionRecord } from '../types/farm';
import { t } from '../utils/translations';
import { TrendingUp, Calendar, Egg, Coins } from 'lucide-react';

interface YieldChartProps {
  collections: EggCollectionRecord[];
  lang: 'en' | 'ur';
}

export const YieldChart: React.FC<YieldChartProps> = ({ collections, lang }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  // Take the most recent 7 collections
  const recent7 = [...collections]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-7);

  const hasData = recent7.length > 0;
  const maxEggs = hasData ? Math.max(...recent7.map((r) => r.eggsCollected), 5) : 5;

  return (
    <div className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/20 text-[#f3df88] border border-[#d4af37]/30">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#f4efe6]">{strings.recentYieldHistory}</h3>
            <p className="text-xs text-[#f4efe6]/60">
              {isUr ? 'آپ کے فلاک کے ذریعے روزانہ حاصل ہونے والے انڈے' : 'Verified daily collection history from your active flock'}
            </p>
          </div>
        </div>

        {hasData && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f3df88] bg-[#051a10] px-3 py-1.5 rounded-xl border border-[#d4af37]/20">
            <Coins className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>
              {isUr ? 'کل حاصل شدہ رقم:' : 'Total Yield Cash:'}{' '}
              Rs. {recent7.reduce((sum, c) => sum + c.cashEarned, 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-[#d4af37]/25 bg-[#051a10]/50 p-8 text-center">
          <Egg className="mx-auto h-12 w-12 text-[#d4af37]/40 mb-2" />
          <p className="text-sm font-semibold text-[#f4efe6]/80">{strings.noCollectionHistory}</p>
          <p className="text-xs text-[#f4efe6]/50 mt-1 max-w-sm mx-auto">
            {isUr
              ? 'جب آپ کے پاس ایکٹو مرغیاں ہوں گی، تو روزانہ "انڈے وصول کریں" کا بٹن دبا کر ریکارڈ درج کریں۔'
              : 'As soon as your package is active, click "Collect Daily Eggs" every 24 hours to generate records.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visual Bar Yield Chart */}
          <div className="grid grid-cols-7 gap-2 items-end h-44 pt-6 px-2 bg-[#051a10]/60 rounded-2xl border border-[#d4af37]/15">
            {recent7.map((record, index) => {
              const heightPct = Math.max(15, Math.round((record.eggsCollected / maxEggs) * 100));
              const dateObj = new Date(record.timestamp);
              const dayLabel = dateObj.toLocaleDateString(isUr ? 'ur-PK' : 'en-US', {
                weekday: 'short',
                day: 'numeric',
              });

              return (
                <div key={`${record.id || 'rec'}-${index}`} className="flex flex-col items-center h-full justify-end group">
                  {/* Tooltip on hover / view */}
                  <div className="text-[10px] font-bold text-[#f3df88] mb-1 opacity-90 group-hover:scale-110 transition-transform">
                    {record.eggsCollected} 🥚
                  </div>

                  {/* The bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-[#9e7b1a] via-[#d4af37] to-[#fff2b2] shadow-md shadow-[#d4af37]/30 transition-all duration-500 hover:brightness-110"
                  />

                  {/* Day label */}
                  <span className="text-[10px] font-medium text-[#f4efe6]/60 mt-2 truncate w-full text-center">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detailed entries list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {recent7.slice(-4).reverse().map((record, rIdx) => (
              <div
                key={`${record.id}-${rIdx}`}
                className="flex items-center justify-between rounded-xl border border-[#d4af37]/20 bg-[#051a10]/70 px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span className="text-[#f4efe6]/80 font-medium">
                    {new Date(record.timestamp).toLocaleDateString(isUr ? 'ur-PK' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#f3df88]">
                    {record.eggsCollected} {isUr ? 'انڈے' : 'Eggs'}
                  </span>
                  <span className="font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    +Rs. {record.cashEarned}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
