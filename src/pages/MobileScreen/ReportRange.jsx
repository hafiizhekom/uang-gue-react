import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6', '#14b8a6'];

const formatShort = (val) => {
  if (!val) return 'Rp0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1_000).toFixed(0)}K`;
  return `${sign}Rp${abs}`;
};

const formatIDR = (val) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(val || 0);

const currentYearRange = () => {
  const year = new Date().getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
};

const TREND_META = {
  increasingly_wasteful: { label: 'Getting Worse', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  increasingly_frugal:   { label: 'Getting Better', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  stable:                { label: 'Stable', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  not_enough_data:       { label: 'Not Enough Data', color: 'text-slate-400 bg-slate-50 border-slate-100' },
};

export default function ReportRange() {
  const defaults = currentYearRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [appliedRange, setAppliedRange] = useState(defaults);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    const fetchRange = async () => {
      setLoading(true);
      setErrorInfo(null);
      setRange(null);
      try {
        const res = await axios.get('/report-range', {
          params: { start_date: appliedRange.start, end_date: appliedRange.end },
        });
        setRange(res.data.data);
      } catch (err) {
        setErrorInfo(err.response?.data?.message || 'Failed to load range report.');
      } finally {
        setLoading(false);
      }
    };
    fetchRange();
  }, [appliedRange]);

  const handleApply = () => {
    if (!startDate || !endDate) return;
    setAppliedRange({ start: startDate, end: endDate });
    setPickerOpen(false);
  };

  const periodChartData = useMemo(() => {
    if (!range?.periods) return [];
    return range.periods.map(p => ({
      name: p.name,
      income_total: Number(p.total_income || 0),
      outcome_total: Number(p.total_outcome || 0),
    }));
  }, [range]);

  const categoryChartData = range?.chart_data?.outcome_by_category_per_period || range?.outcome_by_category_per_period;
  const outcomeTypeChartData = range?.chart_data?.outcome_by_type_per_period || range?.outcome_by_type_per_period;
  const tagsChartData     = range?.chart_data?.outcome_by_tags_per_period || range?.outcome_by_tags_per_period;
  const incomeTypeChartData  = range?.chart_data?.income_by_type_per_period || range?.income_by_type_per_period;

  return (
    <div className="bg-slate-50 min-h-screen pb-6">
      {/* ── TOP HEADER ── */}
      <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem]">
        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Report</p>
        <h1 className="text-lg font-black text-white tracking-tighter mt-0.5">Range Comparison</h1>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-4 w-full flex items-center justify-between bg-white/15 active:bg-white/25 rounded-2xl px-4 py-3 transition-colors"
        >
          <div className="text-left">
            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-100/70">Date Range</p>
            <p className="text-sm font-black text-white tracking-tight">{appliedRange.start} → {appliedRange.end}</p>
          </div>
          <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Comparing periods...
          </div>
        ) : errorInfo ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-2">
            <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900">No Data</h3>
            <p className="text-slate-500 font-bold text-xs">{errorInfo}</p>
          </div>
        ) : range ? (
          <>
            {/* SUMMARY */}
            <div className="grid grid-cols-3 gap-2">
              <StatPill label="Income" value={formatShort(range.summary.total_income)} color="text-emerald-500" />
              <StatPill label="Outcome" value={formatShort(range.summary.total_outcome)} color="text-rose-500" />
              <StatPill label="Net" value={formatShort(range.summary.net_savings)} color="text-indigo-500" />
            </div>

            {/* BALANCE GROWTH — starting balance vs ending balance across the range */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance Growth</p>
              <div className="flex items-center justify-between gap-2">
                <div className="text-left">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Starting</p>
                  <p className="text-xs font-black text-slate-600 mt-0.5">{formatShort(range.summary.starting_balance)}</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="text-left">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ending</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5">{formatShort(range.summary.ending_balance)}</p>
                </div>
                <div className={`text-right px-3 py-1.5 rounded-xl border flex-shrink-0 ${range.summary.total_balance_growth >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <p className={`text-[8px] font-black uppercase tracking-widest ${range.summary.total_balance_growth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {range.summary.total_balance_growth >= 0 ? 'Growth' : 'Decline'}
                  </p>
                  <p className={`text-xs font-black mt-0.5 ${range.summary.total_balance_growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {range.summary.total_balance_growth >= 0 ? '+' : ''}{formatShort(range.summary.total_balance_growth)}
                  </p>
                </div>
              </div>
            </div>

            {/* TREND HIGHLIGHT */}
            <div className={`p-4 rounded-2xl border shadow-sm ${TREND_META[range.summary.overall_trend]?.color || TREND_META.stable.color}`}>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Overall Trend</p>
              <p className="text-base font-black tracking-tight mt-0.5">{TREND_META[range.summary.overall_trend]?.label || range.summary.overall_trend}</p>
              {range.summary.avg_change_percent !== null && (
                <p className="text-[11px] font-bold opacity-70 mt-0.5">
                  Avg {range.summary.avg_change_percent > 0 ? '+' : ''}{range.summary.avg_change_percent}% / period
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                <p className="text-[8px] font-black uppercase tracking-widest text-rose-400">Most Wasteful</p>
                <p className="text-xs font-black tracking-tight text-rose-700 mt-0.5 truncate">{range.summary.most_wasteful_period?.name || '-'}</p>
                <p className="text-[10px] font-bold text-rose-500 mt-0.5">{formatShort(range.summary.most_wasteful_period?.total_outcome)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Most Frugal</p>
                <p className="text-xs font-black tracking-tight text-emerald-700 mt-0.5 truncate">{range.summary.most_frugal_period?.name || '-'}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{formatShort(range.summary.most_frugal_period?.total_outcome)}</p>
              </div>
            </div>

            {/* DEFICIT/SURPLUS HIGHLIGHT — pure period performance (income - outcome), not covered by opening balance */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                <p className="text-[8px] font-black uppercase tracking-widest text-rose-400">Most Deficit</p>
                <p className="text-xs font-black tracking-tight text-rose-700 mt-0.5 truncate">{range.summary.most_deficit_period?.name || '-'}</p>
                <p className="text-[10px] font-bold text-rose-500 mt-0.5">{formatShort(range.summary.most_deficit_period?.period_surplus_deficit)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Most Surplus</p>
                <p className="text-xs font-black tracking-tight text-emerald-700 mt-0.5 truncate">{range.summary.most_surplus_period?.name || '-'}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">+{formatShort(range.summary.most_surplus_period?.period_surplus_deficit)}</p>
              </div>
            </div>

            {/* TREND CHART */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Income vs Outcome</p>
                <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">Per Period</h3>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 8, fontWeight: '800', fill: '#334155' }} />
                    <YAxis
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tick={{ fontSize: 8, fontWeight: '800', fill: '#1e293b' }}
                      tickFormatter={(val) => {
                        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}m`;
                        if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                        return val;
                      }}
                    />
                    <Tooltip content={<PeriodTooltip formatShort={formatShort} />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="income_total" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="outcome_total" name="Outcome" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PERIOD COMPARISON LIST */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Month over Month</p>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">Period Comparison</h3>
                </div>
                <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 flex-shrink-0 text-right">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block flex-shrink-0" />
                  Balance gap
                </div>
              </div>
              <div className="space-y-2">
                {range.periods.map((p) => (
                  <PeriodComparisonCard key={p.id} period={p} />
                ))}
              </div>
            </div>

            {/* BREAKDOWN PER PERIOD */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Breakdown / Period</p>
              <div className="space-y-3">
                <PeriodBreakdownCard title="Outcome by Category" chartData={categoryChartData} colors={COLORS} />
                <PeriodBreakdownCard title="Outcome by Type" chartData={outcomeTypeChartData} colors={COLORS} />
                <PeriodBreakdownCard title="Outcome by Detail Tag" chartData={tagsChartData} colors={COLORS} />
                <PeriodBreakdownCard title="Income by Type" chartData={incomeTypeChartData} colors={COLORS} />
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* ── DATE RANGE PICKER BOTTOM SHEET ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div
            className="bg-white rounded-t-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Select Range</h3>
              <button onClick={() => setPickerOpen(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl px-2">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3.5 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3.5 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-4 mt-2 bg-slate-900 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl active:scale-95"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function StatPill({ label, value, color }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-sm font-black tracking-tight mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function PeriodTooltip({ active, payload, label, formatShort }) {
  if (!active || !payload || !payload.length) return null;
  const incomeObj = payload.find(p => p.dataKey === 'income_total');
  const outcomeObj = payload.find(p => p.dataKey === 'outcome_total');
  const incVal = incomeObj ? Number(incomeObj.value) : 0;
  const outVal = outcomeObj ? Number(outcomeObj.value) : 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm p-2.5 rounded-xl shadow-xl border border-slate-800 text-white text-[10px] min-w-[140px]">
      <p className="text-slate-400 font-mono font-black mb-1.5 pb-1 border-b border-slate-800 text-[9px] uppercase tracking-wider">{label}</p>
      <div className="flex justify-between items-center gap-2 my-0.5">
        <span className="text-emerald-400 font-bold uppercase text-[9px]">Income</span>
        <span className="text-emerald-400 font-black">{formatShort(incVal)}</span>
      </div>
      <div className="flex justify-between items-center gap-2 my-0.5">
        <span className="text-rose-400 font-bold uppercase text-[9px]">Outcome</span>
        <span className="text-rose-400 font-black">{formatShort(outVal)}</span>
      </div>
    </div>
  );
}

function TrendBadge({ trend, changePercent }) {
  if (!trend) return <span className="text-slate-300 font-normal text-[10px]">-</span>;

  const meta = {
    up:   { icon: '▲', color: 'bg-rose-50 text-rose-700 border-rose-200/60' },
    down: { icon: '▼', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
    flat: { icon: '▬', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  }[trend];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold border flex-shrink-0 ${meta.color}`}>
      {meta.icon} {changePercent !== null ? `${Math.abs(changePercent)}%` : ''}
    </span>
  );
}

/**
 * Expandable mobile card for one period's row in the comparison list.
 * Collapsed: name, closing balance, deficit/surplus badge, trend badge.
 * Expanded: full breakdown — opening balance, income, outcome, surplus/deficit, closing balance.
 */
function PeriodComparisonCard({ period: p }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
            {p.name}
            {p.opening_balance_continuous === false && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block flex-shrink-0" />
            )}
          </p>
          <p className={`text-[10px] font-bold mt-0.5 ${p.closing_balance >= 0 ? 'text-slate-500' : 'text-rose-500'}`}>
            Balance: {formatShort(p.closing_balance)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TrendBadge trend={p.trend} changePercent={p.outcome_change_percent} />
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Income</p>
              <p className="text-[11px] font-black text-emerald-600 mt-0.5">{formatShort(p.total_income)}</p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Outcome</p>
              <p className="text-[11px] font-black text-rose-600 mt-0.5">{formatShort(p.total_outcome)}</p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Surplus / Deficit</p>
              <p className={`text-[11px] font-black mt-0.5 ${p.is_deficit_period ? 'text-rose-600' : 'text-emerald-600'}`}>
                {p.period_surplus_deficit >= 0 ? '+' : ''}{formatShort(p.period_surplus_deficit)}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Opening Balance</p>
              <p className="text-[11px] font-black text-slate-600 mt-0.5">{formatShort(p.opening_balance)}</p>
            </div>
          </div>

          {p.opening_balance_continuous === false && (
            <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block flex-shrink-0 mt-1" />
              <p className="text-[9px] font-bold text-amber-700 leading-relaxed">
                Opening balance is off by {formatIDR(Math.abs(p.opening_balance_gap))} from the previous period's closing balance.
              </p>
            </div>
          )}

          <p className="text-[9px] font-bold text-slate-400 pt-0.5">{p.start_date} → {p.end_date}</p>
        </div>
      )}
    </div>
  );
}

function PeriodBreakdownCard({ title, chartData, colors }) {
  const series = useMemo(() => chartData?.series || [], [chartData]);
  const data = chartData?.data || [];

  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setSelectedSeries(series);
  }, [series]);

  const toggleSeries = (name) => {
    setSelectedSeries((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleToggleAll = () => {
    if (selectedSeries.length === series.length) {
      setSelectedSeries([]);
    } else {
      setSelectedSeries(series);
    }
  };

  const activeSeries = useMemo(() => {
    return series.filter((name) => selectedSeries.includes(name));
  }, [series, selectedSeries]);

  const seriesTotals = useMemo(() => {
    return activeSeries
      .map((name) => ({
        name,
        total: data.reduce((sum, row) => sum + Number(row[name] || 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [activeSeries, data]);

  const grandTotal = useMemo(() => seriesTotals.reduce((s, i) => s + i.total, 0), [seriesTotals]);
  const visibleLegend = expanded ? seriesTotals : seriesTotals.slice(0, 3);

  const colorFor = (name) => {
    const idx = series.indexOf(name);
    return colors[idx % colors.length];
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3 relative">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</p>
          <p className="text-sm font-black text-slate-800 tracking-tight mt-0.5">{formatShort(grandTotal)}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Multi-Select Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-700 transition-colors flex items-center gap-1"
            >
              Filter ({selectedSeries.length}/{series.length})
              <span className="text-[7px]">▼</span>
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2.5 space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 px-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Select Items</span>
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-[9px] font-black uppercase text-emerald-600 hover:underline"
                  >
                    {selectedSeries.length === series.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {series.map((name) => {
                    const isChecked = selectedSeries.includes(name);
                    return (
                      <label
                        key={name}
                        onClick={() => toggleSeries(name)}
                        className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-slate-50 cursor-pointer text-[11px] font-bold text-slate-700 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0 w-3 h-3"
                        />
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(name) }} />
                        <span className="truncate">{name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle Button */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'chart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}
            >
              Chart
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {activeSeries.length === 0 ? (
        <p className="text-[10px] text-slate-300 font-bold text-center py-6">No items selected</p>
      ) : viewMode === 'chart' ? (
        <>
          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="period" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 8, fontWeight: '800', fill: '#334155' }} />
                <YAxis
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fontSize: 8, fontWeight: '800', fill: '#1e293b' }}
                  tickFormatter={(val) => {
                    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}m`;
                    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                    return val;
                  }}
                />
                <Tooltip content={<StackedTooltipMobile />} cursor={{ fill: '#f1f5f9' }} />
                {activeSeries.map((name) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={colorFor(name)} maxBarSize={14} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {visibleLegend.map((item) => {
              const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
              return (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(item.name) }} />
                    <span className="text-[11px] font-bold text-slate-600 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] font-black text-slate-400">{pct.toFixed(0)}%</span>
                    <span className="text-[11px] font-black text-slate-700">{formatShort(item.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {seriesTotals.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
              {expanded ? '▲ Show less' : `▼ +${seriesTotals.length - 3} more`}
            </button>
          )}
        </>
      ) : (
        /* Mobile Matrix Pivot Table */
        <div className="overflow-x-auto max-h-[260px] overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900 text-white z-10">
              <tr className="text-[9px] font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">Item</th>
                {data.map((row) => (
                  <th key={row.period_id || row.period} className="py-2.5 px-3 text-right whitespace-nowrap">
                    {row.period}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right bg-slate-800">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
              {seriesTotals.map((item) => (
                <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 flex items-center gap-1.5 font-extrabold text-slate-800 min-w-[120px]">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(item.name) }} />
                    <span className="truncate">{item.name}</span>
                  </td>
                  {data.map((row) => {
                    const val = Number(row[item.name] || 0);
                    return (
                      <td key={row.period_id || row.period} className="py-2.5 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                        {val > 0 ? formatShort(val) : <span className="text-slate-300">-</span>}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-slate-50/70 whitespace-nowrap">
                    {formatShort(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StackedTooltipMobile({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const nonZero = payload.filter((p) => Number(p.value) > 0);

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm p-2.5 rounded-xl shadow-xl border border-slate-800 text-white text-[10px] min-w-[130px]">
      <p className="text-slate-400 font-mono font-black mb-1.5 pb-1 border-b border-slate-800 text-[9px] uppercase tracking-wider">{label}</p>
      {nonZero.length > 0 ? (
        nonZero.map((p) => (
          <div key={p.dataKey} className="flex justify-between items-center gap-2 my-0.5">
            <span className="font-bold flex items-center gap-1 text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.fill }} />
              {p.dataKey}
            </span>
            <span className="font-black">{formatShort(p.value)}</span>
          </div>
        ))
      ) : (
        <p className="text-[9px] text-slate-500 italic">No transactions</p>
      )}
    </div>
  );
}