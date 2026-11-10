import React, { useState, useMemo } from 'react';
import { FarmShed, ShedPerformancePoint } from '../types/farm';
import { generateShedDailyPerformance } from '../utils/farmRules';
import { t } from '../utils/translations';
import { TrendingUp, AlertTriangle, ShieldCheck, Activity, Calendar } from 'lucide-react';

interface ShedPerformanceChartProps {
  shed?: FarmShed;
  userHensInShed?: number;
  language: 'en' | 'ur';
}

export const ShedPerformanceChart: React.FC<ShedPerformanceChartProps> = ({
  shed,
  userHensInShed = 0,
  language,
}) => {
  const [rangeDays, setRangeDays] = useState<7 | 14>(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeShed: FarmShed = shed || {
    id: 'Shed-101',
    nameEn: 'Shed-101 (Alpha Flock)',
    nameUr: 'شیڈ-101 (الفا فلاک)',
    capacity: 5000,
    totalHens: 4850,
    mortalityCount: 4,
    crackedEggRate: 1.2,
    hasSicknessAlert: false,
    lastUpdated: new Date().toISOString(),
  };

  const points: ShedPerformancePoint[] = useMemo(() => {
    return generateShedDailyPerformance(activeShed, rangeDays);
  }, [activeShed, rangeDays]);

  const userOwnershipPercent = useMemo(() => {
    const total = activeShed.totalHens || 5000;
    if (total === 0 || userHensInShed === 0) return 0;
    return Math.round((userHensInShed / total) * 10000) / 100;
  }, [activeShed.totalHens, userHensInShed]);

  // Aggregate metrics
  const totals = useMemo(() => {
    const totalFresh = points.reduce((acc, p) => acc + p.freshEggs, 0);
    const totalLoss = points.reduce((acc, p) => acc + p.totalLoss, 0);
    const avgEfficiency = Math.round(
      (points.reduce((acc, p) => acc + p.efficiencyPercent, 0) / points.length) * 10
    ) / 10;
    const lossRatio = Math.round((totalLoss / (totalFresh + totalLoss || 1)) * 1000) / 10;
    return { totalFresh, totalLoss, avgEfficiency, lossRatio };
  }, [points]);

  // SVG Chart Dimensions
  const width = 640;
  const height = 220;
  const paddingX = 45;
  const paddingY = 28;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Max scale bounds
  const maxY = useMemo(() => {
    const maxVal = Math.max(...points.map((p) => p.freshEggs), activeShed.capacity || 5000);
    return Math.ceil(maxVal / 500) * 500;
  }, [points, activeShed.capacity]);

  const minY = 0;

  // Scales
  const getX = (index: number) => paddingX + (index / (points.length - 1)) * chartW;
  const getY = (val: number) => height - paddingY - ((val - minY) / (maxY - minY)) * chartH;

  // Path generator for Yield curve
  const yieldPath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.freshEggs).toFixed(1)}`)
      .join(' ');
  }, [points, maxY]);

  // Gradient area path for Yield
  const yieldAreaPath = useMemo(() => {
    if (points.length === 0) return '';
    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.freshEggs).toFixed(1)}`)
      .join(' ');
    const lastX = getX(points.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const baseY = (height - paddingY).toFixed(1);
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [points, maxY]);

  // Path generator for Loss curve (scaled to 10x for clear visual contrast against 5000 yield)
  // Loss scale: plotted against a local loss max (or scaled up so losses are visible alongside high yields)
  const maxLossY = useMemo(() => {
    const maxVal = Math.max(...points.map((p) => p.totalLoss), 50);
    return Math.ceil(maxVal / 20) * 20;
  }, [points]);

  const getLossY = (val: number) => height - paddingY - (val / (maxLossY || 50)) * (chartH * 0.75);

  const lossPath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getLossY(p.totalLoss).toFixed(1)}`)
      .join(' ');
  }, [points, maxLossY]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="bg-gradient-to-b from-[#0a2618] to-[#04140d] border border-amber-500/25 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-amber-500/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base sm:text-lg font-bold text-amber-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              {t[language].shedPnlChartTitle}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
              {activeShed.id}
            </span>
          </div>
          <p className="text-xs text-amber-200/60">{t[language].shedPnlChartSubtitle}</p>
        </div>

        {/* Range Buttons & Ownership Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {userOwnershipPercent > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t[language].ownershipShareLabel}: <strong className="text-emerald-200">{userOwnershipPercent}%</strong></span>
            </div>
          )}

          <div className="inline-flex rounded-lg bg-[#071d13] p-0.5 border border-amber-500/20 text-xs">
            <button
              onClick={() => setRangeDays(7)}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                rangeDays === 7
                  ? 'bg-amber-500 text-[#04140d] font-bold shadow-sm'
                  : 'text-amber-200/70 hover:text-amber-200'
              }`}
            >
              {t[language].range7Days}
            </button>
            <button
              onClick={() => setRangeDays(14)}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                rangeDays === 14
                  ? 'bg-amber-500 text-[#04140d] font-bold shadow-sm'
                  : 'text-amber-200/70 hover:text-amber-200'
              }`}
            >
              {t[language].range14Days}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
        <div className="bg-[#051a10] border border-emerald-500/20 rounded-xl p-3">
          <div className="text-[11px] text-amber-200/60 mb-0.5 flex items-center justify-between">
            <span>{t[language].dailyEggYieldLabel}</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-400">
            {activePoint ? activePoint.freshEggs.toLocaleString() : totals.totalFresh.toLocaleString()}{' '}
            <span className="text-xs font-normal text-amber-200/60">🥚/day</span>
          </div>
        </div>

        <div className="bg-[#051a10] border border-rose-500/20 rounded-xl p-3">
          <div className="text-[11px] text-amber-200/60 mb-0.5 flex items-center justify-between">
            <span>{t[language].dailyLossLabel}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-400">
            {activePoint ? activePoint.totalLoss.toLocaleString() : totals.totalLoss.toLocaleString()}{' '}
            <span className="text-xs font-normal text-rose-300/60">
              ({activePoint?.mortalityDeaths || 0} mort + {activePoint?.crackedEggs || 0} crack)
            </span>
          </div>
        </div>

        <div className="bg-[#051a10] border border-amber-500/20 rounded-xl p-3">
          <div className="text-[11px] text-amber-200/60 mb-0.5">
            {t[language].shedEfficiencyLabel}
          </div>
          <div className="text-base sm:text-lg font-bold text-amber-300">
            {activePoint ? activePoint.efficiencyPercent : totals.avgEfficiency}%
          </div>
        </div>

        <div className="bg-[#051a10] border border-amber-500/20 rounded-xl p-3">
          <div className="text-[11px] text-amber-200/60 mb-0.5">
            {t[language].lossRatioLabel}
          </div>
          <div className="text-base sm:text-lg font-bold text-amber-200">
            {totals.lossRatio}%
          </div>
        </div>
      </div>

      {/* Dynamic SVG Line Chart */}
      <div className="relative w-full bg-[#05170e]/80 border border-amber-500/15 rounded-xl p-2 sm:p-3 overflow-hidden">
        {/* Legend */}
        <div className="flex items-center justify-between mb-2 px-2 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
              <span className="text-emerald-300 text-[11px] font-medium">{t[language].dailyEggYieldLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-400 rounded-full" />
              <span className="text-rose-300 text-[11px] font-medium">{t[language].dailyLossLabel}</span>
            </div>
          </div>
          <div className="text-[11px] text-amber-300/50 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{rangeDays} {language === 'ur' ? 'دنوں کی تاریخ' : 'Days Track'}</span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48 sm:h-56 select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = paddingY + pct * chartH;
              const labelVal = Math.round(maxY * (1 - pct));
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="rgba(245, 158, 11, 0.12)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingX - 6}
                    y={y + 3}
                    fill="rgba(253, 230, 138, 0.45)"
                    fontSize="9"
                    textAnchor="end"
                  >
                    {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal}
                  </text>
                </g>
              );
            })}

            {/* Area under Yield Curve */}
            <path d={yieldAreaPath} fill="url(#yieldGrad)" />

            {/* Daily Egg Yield Path */}
            <path
              d={yieldPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Daily Losses Path */}
            <path
              d={lossPath}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Points & Vertical Bars */}
            {points.map((p, i) => {
              const cx = getX(i);
              const cyYield = getY(p.freshEggs);
              const cyLoss = getLossY(p.totalLoss);
              const isHovered = hoveredIndex === i;

              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Invisible touch/hover target bar */}
                  <rect
                    x={cx - (chartW / points.length) / 2}
                    y={paddingY}
                    width={chartW / points.length}
                    height={chartH}
                    fill="transparent"
                  />

                  {/* Active vertical guide line */}
                  {isHovered && (
                    <line
                      x1={cx}
                      y1={paddingY}
                      x2={cx}
                      y2={height - paddingY}
                      stroke="rgba(245, 158, 11, 0.5)"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Yield Point Dot */}
                  <circle
                    cx={cx}
                    cy={cyYield}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#10b981"
                    stroke="#04140d"
                    strokeWidth="2"
                    className="transition-all"
                  />

                  {/* Loss Point Dot */}
                  <circle
                    cx={cx}
                    cy={cyLoss}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#f43f5e"
                    stroke="#04140d"
                    strokeWidth="1.5"
                    className="transition-all"
                  />

                  {/* X Axis Date Label */}
                  <text
                    x={cx}
                    y={height - paddingY + 16}
                    fill={isHovered ? '#fde68a' : 'rgba(253, 230, 138, 0.5)'}
                    fontSize="9.5"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {p.date}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Floating Details Card */}
        {activePoint && (
          <div className="mt-2.5 pt-2 border-t border-amber-500/10 flex flex-wrap items-center justify-between text-xs text-amber-200/80 px-2">
            <span className="font-semibold text-amber-300">
              📅 {activePoint.fullDate} ({activePoint.date}):
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">
                🥚 {activePoint.freshEggs.toLocaleString()} Fresh Eggs
              </span>
              <span className="text-rose-400 font-medium">
                ⚠️ {activePoint.mortalityDeaths} Mort + {activePoint.crackedEggs} Cracked
              </span>
              <span className="text-amber-300 font-semibold">
                ✨ {activePoint.efficiencyPercent}% Rate
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
