import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6', '#14b8a6'];

const formatIDR = (val) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(val || 0);

const currentYearRange = () => {
  const year = new Date().getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
};

const TREND_META = {
  increasingly_wasteful: { label: 'Makin Boros', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  increasingly_frugal:   { label: 'Makin Hemat', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  stable:                { label: 'Stabil', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  not_enough_data:       { label: 'Data Kurang', color: 'text-slate-400 bg-slate-50 border-slate-100' },
};

export default function ReportRange() {
  const defaults = currentYearRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [appliedRange, setAppliedRange] = useState(defaults);

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
  };

  const periodChartData = useMemo(() => {
    if (!range?.periods) return [];
    return range.periods.map(p => ({
      name: p.name,
      income_total: Number(p.total_income || 0),
      outcome_total: Number(p.total_outcome || 0),
    }));
  }, [range]);

  return (
    <div className="p-8 space-y-10 bg-slate-50 min-h-screen text-slate-800">
      {/* HEADER + RANGE PICKER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Report Range</h2>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mt-2 font-mono">
            Bandingkan pengeluaran & pemasukan antar period
          </p>
        </div>

        <div className="flex items-end gap-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 rounded-xl border-none text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 rounded-xl border-none text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
          >
            Apply
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32 font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
          Comparing periods...
        </div>
      ) : errorInfo ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-16 text-center space-y-3">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">No Data</h3>
          <p className="text-slate-500 font-bold text-sm">{errorInfo}</p>
        </div>
      ) : range ? (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <StatCard title="Total Periods" value={range.summary.total_periods} isCount />
            <StatCard title="Total Income" value={range.summary.total_income} color="text-emerald-600 font-extrabold" />
            <StatCard title="Total Outcome" value={range.summary.total_outcome} color="text-rose-600 font-extrabold" />
            <StatCard
              title="Net Savings"
              value={range.summary.net_savings}
              color={range.summary.net_savings >= 0 ? "text-indigo-600 font-extrabold" : "text-rose-600 font-extrabold"}
            />
            <StatCard title="Avg Outcome / Period" value={range.summary.avg_outcome_per_period} color="text-slate-900 font-extrabold" />
          </div>

          {/* BALANCE GROWTH — saldo awal range vs saldo akhir range */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-5">Pertumbuhan Saldo Sepanjang Range</h4>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Awal</p>
                <p className="text-xl font-black tracking-tight text-slate-700 mt-1">{formatIDR(range.summary.starting_balance)}</p>
              </div>
              <svg className="w-6 h-6 text-slate-300 rotate-90 sm:rotate-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Akhir</p>
                <p className="text-xl font-black tracking-tight text-slate-900 mt-1">{formatIDR(range.summary.ending_balance)}</p>
              </div>
              <div className={`text-center sm:text-left px-5 py-3 rounded-2xl border ${range.summary.total_balance_growth >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${range.summary.total_balance_growth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {range.summary.total_balance_growth >= 0 ? 'Pertumbuhan' : 'Penurunan'}
                </p>
                <p className={`text-xl font-black tracking-tight mt-1 ${range.summary.total_balance_growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {range.summary.total_balance_growth >= 0 ? '+' : ''}{formatIDR(range.summary.total_balance_growth)}
                </p>
              </div>
            </div>
          </div>

          {/* TREND HIGHLIGHT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-[2rem] border shadow-sm ${TREND_META[range.summary.overall_trend]?.color || TREND_META.stable.color}`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Overall Trend</p>
              <p className="text-xl font-black tracking-tight mt-1">{TREND_META[range.summary.overall_trend]?.label || range.summary.overall_trend}</p>
              {range.summary.avg_change_percent !== null && (
                <p className="text-xs font-bold opacity-70 mt-1">
                  Rata-rata perubahan {range.summary.avg_change_percent > 0 ? '+' : ''}{range.summary.avg_change_percent}% / period
                </p>
              )}
            </div>

            <div className="p-6 rounded-[2rem] bg-rose-50 border border-rose-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Bulan Paling Boros</p>
              <p className="text-xl font-black tracking-tight text-rose-700 mt-1">{range.summary.most_wasteful_period?.name || '-'}</p>
              <p className="text-xs font-bold text-rose-500 mt-1">{formatIDR(range.summary.most_wasteful_period?.total_outcome)}</p>
            </div>

            <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Bulan Paling Hemat</p>
              <p className="text-xl font-black tracking-tight text-emerald-700 mt-1">{range.summary.most_frugal_period?.name || '-'}</p>
              <p className="text-xs font-bold text-emerald-600 mt-1">{formatIDR(range.summary.most_frugal_period?.total_outcome)}</p>
            </div>
          </div>

          {/* DEFICIT/SURPLUS HIGHLIGHT — performa period murni (income - outcome), gak ketutupan opening balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-[2rem] bg-rose-50 border border-rose-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Period Paling Defisit</p>
              <p className="text-xl font-black tracking-tight text-rose-700 mt-1">{range.summary.most_deficit_period?.name || '-'}</p>
              <p className="text-xs font-bold text-rose-500 mt-1">{formatIDR(range.summary.most_deficit_period?.period_surplus_deficit)}</p>
            </div>

            <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Period Paling Surplus</p>
              <p className="text-xl font-black tracking-tight text-emerald-700 mt-1">{range.summary.most_surplus_period?.name || '-'}</p>
              <p className="text-xs font-bold text-emerald-600 mt-1">+{formatIDR(range.summary.most_surplus_period?.period_surplus_deficit)}</p>
            </div>

            <div className="p-6 rounded-[2rem] bg-slate-100 border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Period Defisit</p>
              <p className="text-xl font-black tracking-tight text-slate-800 mt-1">
                {range.summary.deficit_periods_count} <span className="text-xs font-bold text-slate-400">/ {range.summary.total_periods} period</span>
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1">Outcome lebih besar dari income</p>
            </div>
          </div>

          {/* PER-PERIOD TREND CHART */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Income vs Outcome</h4>
              <p className="text-xl font-black tracking-tight text-slate-900 mt-1">Perbandingan Antar Period</p>
            </div>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodChartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 11, fontWeight: '800', fill: '#334155' }} />
                  <YAxis
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: '800', fill: '#1e293b' }}
                    tickFormatter={(val) => {
                      if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
                      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                      if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                      return val;
                    }}
                  />
                  <Tooltip content={<PeriodTooltip formatIDR={formatIDR} />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="income_total" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="outcome_total" name="Outcome" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* COMPARISON TABLE */}
          <PeriodComparisonTable periods={range.periods} formatIDR={formatIDR} />

          {/* CATEGORY, OUTCOME TYPE, DETAIL TAG, & INCOME TYPE BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PeriodBreakdownCard title="Outcome by Category / Period" chartData={range.chart_data?.outcome_by_category_per_period} colors={COLORS} />
            <PeriodBreakdownCard title="Outcome by Type / Period" chartData={range.chart_data?.outcome_by_type_per_period} colors={COLORS} />
            <PeriodBreakdownCard title="Outcome by Detail Tag / Period" chartData={range.chart_data?.outcome_by_tags_per_period} colors={COLORS} />
            <PeriodBreakdownCard title="Income by Type / Period" chartData={range.chart_data?.income_by_type_per_period} colors={COLORS} />
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StatCard({ title, value, color = 'text-slate-900 font-extrabold', isCount = false }) {
  return (
    <div className="bg-white text-slate-900 border border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <h3 className={`text-2xl font-black tracking-tighter ${color}`}>
        {isCount ? Number(value || 0).toLocaleString('id-ID') : formatIDR(value)}
      </h3>
    </div>
  );
}

function PeriodTooltip({ active, payload, label, formatIDR }) {
  if (!active || !payload || !payload.length) return null;
  const incomeObj = payload.find(p => p.dataKey === 'income_total');
  const outcomeObj = payload.find(p => p.dataKey === 'outcome_total');
  const incVal = incomeObj ? Number(incomeObj.value) : 0;
  const outVal = outcomeObj ? Number(outcomeObj.value) : 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800 text-white min-w-[200px]">
      <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest border-b border-slate-800/80 pb-1.5">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-4">
          <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Income
          </span>
          <span className="text-xs font-extrabold text-emerald-400">{formatIDR(incVal)}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Outcome
          </span>
          <span className="text-xs font-black text-rose-400">{formatIDR(outVal)}</span>
        </div>
      </div>
    </div>
  );
}

function PeriodComparisonTable({ periods, formatIDR }) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm p-8 space-y-6">
      <div className="border-b border-slate-100 pb-5 flex items-start justify-between gap-4">
        <div>
          <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Bulan ke Bulan</h4>
          <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">Period Comparison Table</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400" title="Muncul kalau saldo awal period tidak sama dengan saldo akhir period sebelumnya (ada penyesuaian manual di luar income/outcome tercatat)">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
          Saldo tidak nyambung dari bulan sebelumnya
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar border border-slate-200/80 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-900 text-white z-10">
            <tr className="text-[10px] font-black uppercase tracking-wider">
              <th className="py-3.5 px-6">Period</th>
              <th className="py-3.5 px-6 text-right">Saldo Awal</th>
              <th className="py-3.5 px-6 text-right">Income</th>
              <th className="py-3.5 px-6 text-right">Outcome</th>
              <th className="py-3.5 px-6 text-right">Surplus / Defisit</th>
              <th className="py-3.5 px-6 text-right">Saldo Akhir</th>
              <th className="py-3.5 px-6 text-right">vs Bulan Lalu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-bold">
            {periods.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-6">
                  <p className="text-slate-900 font-extrabold flex items-center gap-1.5">
                    {p.name}
                    {p.opening_balance_continuous === false && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block flex-shrink-0"
                        title={`Saldo awal beda ${formatIDR(Math.abs(p.opening_balance_gap))} dari saldo akhir period sebelumnya`}
                      />
                    )}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.start_date} → {p.end_date}</p>
                </td>
                <td className="py-3.5 px-6 text-right font-bold text-slate-500">{formatIDR(p.opening_balance)}</td>
                <td className="py-3.5 px-6 text-right font-extrabold text-emerald-600">{formatIDR(p.total_income)}</td>
                <td className="py-3.5 px-6 text-right font-black text-rose-600 bg-rose-50/60">{formatIDR(p.total_outcome)}</td>
                <td className={`py-3.5 px-6 text-right font-black ${p.is_deficit_period ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {p.period_surplus_deficit >= 0 ? '+' : ''}{formatIDR(p.period_surplus_deficit)}
                </td>
                <td className={`py-3.5 px-6 text-right font-black ${p.closing_balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {formatIDR(p.closing_balance)}
                </td>
                <td className="py-3.5 px-6 text-right">
                  <TrendBadge trend={p.trend} changePercent={p.outcome_change_percent} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendBadge({ trend, changePercent }) {
  if (!trend) return <span className="text-slate-300 font-normal text-[11px]">-</span>;

  const meta = {
    up:   { icon: '▲', color: 'bg-rose-50 text-rose-700 border-rose-200/60' },
    down: { icon: '▼', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
    flat: { icon: '▬', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  }[trend];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${meta.color}`}>
      {meta.icon} {changePercent !== null ? `${Math.abs(changePercent)}%` : ''}
    </span>
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
  const visibleLegend = expanded ? seriesTotals : seriesTotals.slice(0, 5);

  const colorFor = (name) => {
    const idx = series.indexOf(name);
    return colors[idx % colors.length];
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative flex flex-col justify-between">
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">{title}</h4>
            <p className="text-lg font-black text-slate-900 tracking-tight mt-0.5">{formatIDR(grandTotal)}</p>
          </div>

          <div className="flex items-center gap-2 self-start xl:self-auto">
            {/* Multi-Select Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 transition-colors flex items-center gap-1.5"
              >
                Filter ({selectedSeries.length}/{series.length})
                <span className="text-[8px]">▼</span>
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Items</span>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-[10px] font-black uppercase text-emerald-600 hover:underline"
                    >
                      {selectedSeries.length === series.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {series.map((name) => {
                      const isChecked = selectedSeries.includes(name);
                      return (
                        <label
                          key={name}
                          onClick={() => toggleSeries(name)}
                          className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0"
                          />
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(name) }} />
                          <span className="truncate">{name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  viewMode === 'chart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Chart
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {activeSeries.length === 0 ? (
          <p className="text-xs text-slate-300 font-bold text-center py-12">No items selected</p>
        ) : viewMode === 'chart' ? (
          <>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="period" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 9, fontWeight: '800', fill: '#334155' }} />
                  <YAxis
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: '800', fill: '#1e293b' }}
                    tickFormatter={(val) => {
                      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                      if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                      return val;
                    }}
                  />
                  <Tooltip content={<StackedTooltip colorFor={colorFor} />} cursor={{ fill: '#f1f5f9' }} />
                  {activeSeries.map((name) => (
                    <Bar key={name} dataKey={name} stackId="a" fill={colorFor(name)} maxBarSize={24} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5">
              {visibleLegend.map((item) => {
                const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
                return (
                  <div key={item.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(item.name) }} />
                      <span className="text-xs font-bold text-slate-600 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-[10px] font-black text-slate-400">{pct.toFixed(0)}%</span>
                      <span className="text-xs font-black text-slate-700">{formatIDR(item.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Pivot Table Matrix View */
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar border border-slate-200/80 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-10">
                <tr className="text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4">Item</th>
                  {data.map((row) => (
                    <th key={row.period_id || row.period} className="py-3 px-4 text-right whitespace-nowrap">
                      {row.period}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right bg-slate-800">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold">
                {seriesTotals.map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2 font-extrabold text-slate-800 min-w-[140px]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(item.name) }} />
                      <span className="truncate">{item.name}</span>
                    </td>
                    {data.map((row) => {
                      const val = Number(row[item.name] || 0);
                      return (
                        <td key={row.period_id || row.period} className="py-3 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                          {val > 0 ? formatIDR(val) : <span className="text-slate-300">-</span>}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right font-black text-slate-900 bg-slate-50/70 whitespace-nowrap">
                      {formatIDR(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewMode === 'chart' && seriesTotals.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? '▲ Show less' : `▼ +${seriesTotals.length - 5} more`}
        </button>
      )}
    </div>
  );
}

function StackedTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const nonZero = payload.filter((p) => Number(p.value) > 0);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-white min-w-[180px]">
      <p className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest border-b border-slate-800/80 pb-1.5">{label}</p>
      {nonZero.length > 0 ? (
        <div className="space-y-1.5">
          {nonZero.map((p) => (
            <div key={p.dataKey} className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold flex items-center gap-1.5 text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.fill }} />
                {p.dataKey}
              </span>
              <span className="text-[11px] font-black">{formatIDR(p.value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No transactions</p>
      )}
    </div>
  );
}