import { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const formatIDR = (val) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(val || 0);

export default function ReportMonthly() {
  const navigate = useNavigate();
  const { periodId } = useParams(); // URL is the source of truth for the selected period

  const [periods, setPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  const [chartViewMode, setChartViewMode] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // ── Fetch period list ──
  useEffect(() => {
    const fetchPeriods = async () => {
      setLoadingPeriods(true);
      try {
        const res = await axios.get('/master-periods');
        setPeriods(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch periods:', err);
      } finally {
        setLoadingPeriods(false);
      }
    };
    fetchPeriods();
  }, []);

  // ── If URL has no periodId (e.g. accessed via Sidebar's plain /report),
  //     redirect to the most recent period once periods are loaded ──
  useEffect(() => {
    if (loadingPeriods || periodId || periods.length === 0) return;
    const latest = periods[periods.length - 1];
    navigate(`/report/${latest.id}`, { replace: true });
  }, [loadingPeriods, periodId, periods, navigate]);

  // ── Fetch report data whenever the URL's periodId changes ──
  useEffect(() => {
    if (!periodId) return;

    const fetchReport = async () => {
      setLoadingReport(true);
      setErrorInfo(null);
      setReport(null);
      try {
        const res = await axios.get(`/report/${periodId}`);
        // ReportResource is Laravel-wrapped under `data`
        setReport(res.data.data);
      } catch (err) {
        setErrorInfo(err.response?.data?.message || 'Failed to load report.');
      } finally {
        setLoadingReport(false);
      }
    };
    fetchReport();
  }, [periodId]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const processedDailyTable = useMemo(() => {
    if (!report?.daily_table || !Array.isArray(report.daily_table)) return [];
    return report.daily_table.map(item => ({
      ...item,
      income_total: Number(item.income_total || 0),
      outcome_total: Number(item.outcome_total || 0),
    }));
  }, [report]);

  const trendStats = useMemo(() => {
    if (!processedDailyTable.length) return { avgOutcome: 0, maxOutcome: 0, maxOutcomeDate: '-', activeDays: 0 };
    let totalOut = 0, maxOut = 0, maxDate = '-', activeDays = 0;
    processedDailyTable.forEach(item => {
      const out = item.outcome_total;
      totalOut += out;
      if (out > 0) activeDays++;
      if (out > maxOut) { maxOut = out; maxDate = item.date; }
    });
    return {
      avgOutcome: Math.round(totalOut / processedDailyTable.length),
      maxOutcome: maxOut,
      maxOutcomeDate: maxDate,
      activeDays
    };
  }, [processedDailyTable]);

  const selectedPeriod = periods.find(p => String(p.id) === String(periodId));

  if (loadingPeriods) {
    return (
      <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
        Loading periods...
      </div>
    );
  }

  if (!loadingPeriods && periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[2rem] flex items-center justify-center shadow-sm">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">No Periods Yet</h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed">Create a financial period first to generate a report.</p>
        </div>
        <button
          onClick={() => navigate('/master-period')}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
        >
          Create Period
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 bg-slate-50 min-h-screen text-slate-800">
      {/* HEADER + PERIOD SELECTOR */}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Report</h2>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mt-2 font-mono">
            Financial summary by period
          </p>
        </div>

        {/* Period Picker */}
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-5 py-3.5 shadow-sm hover:border-slate-200 transition-all min-w-[220px]"
          >
            <div className="text-left flex-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Period</p>
              <p className="text-sm font-black text-slate-900 tracking-tight">{selectedPeriod?.name || 'Select period'}</p>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {pickerOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl z-20 overflow-hidden max-h-80 overflow-y-auto">
              {periods.slice().reverse().map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { navigate(`/report/${p.id}`); setPickerOpen(false); }}
                  className={`w-full text-left px-5 py-3.5 transition-colors flex items-center justify-between gap-3 ${String(p.id) === String(periodId) ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <div>
                    <p className={`text-xs font-black tracking-tight ${String(p.id) === String(periodId) ? 'text-emerald-600' : 'text-slate-800'}`}>{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.start_date} → {p.end_date}</p>
                  </div>
                  {String(p.id) === String(periodId) && (
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {loadingReport || !periodId ? (
        <div className="flex items-center justify-center py-32 font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
          Building report...
        </div>
      ) : errorInfo ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-16 text-center space-y-3">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">No Data</h3>
          <p className="text-slate-500 font-bold text-sm">{errorInfo}</p>
        </div>
      ) : report ? (
        <>
          {/* STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Income" value={report.balance.total_income} color="text-emerald-600 font-extrabold" />
            <StatCard title="Total Outcome" value={report.balance.total_outcome} color="text-rose-600 font-extrabold" />
            <StatCard
              title="Net Savings (with Opening Balance)"
              value={report.balance.net_savings}
              color={report.balance.net_savings >= 0 ? "text-indigo-600 font-extrabold" : "text-rose-600 font-extrabold"}
            />
            <StatCard title="Transactions" value={report.balance.count_transactions} color="text-slate-900 font-extrabold" isCount />
          </div>

          {/* DAILY TREND CHART (income vs outcome) */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Daily Financial Statistics</h4>
                <p className="text-xl font-black tracking-tight text-slate-900 mt-1">Daily Cashflow Chart</p>
              </div>
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                <button type="button" onClick={() => setChartViewMode('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${chartViewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>All</button>
                <button type="button" onClick={() => setChartViewMode('outcome')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${chartViewMode === 'outcome' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-600'}`}>Outcome</button>
                <button type="button" onClick={() => setChartViewMode('income')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${chartViewMode === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}>Income</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Outcome / Day (Avg)</p>
                <p className="text-2xl font-extrabold text-rose-600 tracking-tight mt-1">{formatIDR(trendStats.avgOutcome)}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Peak Daily Outcome</p>
                <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                  <span className="text-rose-600">{formatIDR(trendStats.maxOutcome)}</span>
                  {trendStats.maxOutcomeDate !== '-' && (
                    <span className="text-xs font-bold text-slate-500 ml-2">
                      (Date: {trendStats.maxOutcomeDate.split('-')[2] ?? trendStats.maxOutcomeDate})
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Spend Days</p>
                <p className="text-2xl font-extrabold text-indigo-600 tracking-tight mt-1">
                  {trendStats.activeDays} <span className="text-xs font-bold text-slate-500">/ {processedDailyTable.length} Days</span>
                </p>
              </div>
            </div>

            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedDailyTable} margin={{ top: 20, right: 10, left: 10, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: '800', fill: '#334155' }}
                    tickFormatter={(str) => {
                      if (!str) return '';
                      const parts = str.split('-');
                      return parts.length >= 3 ? parts[2] : str;
                    }}
                  />
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
                  <Tooltip content={<CustomTooltip formatIDR={formatIDR} />} cursor={{ fill: '#f1f5f9' }} />
                  {(chartViewMode === 'all' || chartViewMode === 'income') && (
                    <Bar dataKey="income_total" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={1000} />
                  )}
                  {(chartViewMode === 'all' || chartViewMode === 'outcome') && (
                    <Bar dataKey="outcome_total" name="Outcome" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={1000} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DAILY CASHFLOW TABLE */}
          <DailyCashflowTable data={processedDailyTable} formatIDR={formatIDR} />

          {/* DAILY BREAKDOWN CHARTS (stacked per day) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DailyBreakdownCard title="Outcome by Category / Day" chartData={report.daily_chart_data.expense_breakdown.by_category} colors={COLORS} />
            <DailyBreakdownCard title="Outcome by Type / Day" chartData={report.daily_chart_data.expense_breakdown.by_type} colors={COLORS} />
            <DailyBreakdownCard title="Outcome by Tags / Day" chartData={report.daily_chart_data.expense_breakdown.by_tags} colors={COLORS} />
            <DailyBreakdownCard title="Income by Type / Day" chartData={report.daily_chart_data.income_breakdown.by_type} colors={['#10b981', '#34d399', '#059669']} />
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StatCard({ title, value, color, isCount = false }) {
  return (
    <div className="bg-white text-slate-900 border border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <h3 className={`text-2xl font-black tracking-tighter ${color}`}>
        {isCount ? Number(value || 0).toLocaleString('id-ID') : formatIDR(value)}
      </h3>
    </div>
  );
}

function DailyCashflowTable({ data, formatIDR }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  const sortedAndFilteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    let filtered = [...data];
    if (searchTerm) {
      filtered = filtered.filter(item => item.date?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return filtered;
  }, [data, searchTerm, sortOrder]);

  const summary = useMemo(() => {
    return sortedAndFilteredData.reduce((acc, item) => {
      acc.income += Number(item.income_total || 0);
      acc.outcome += Number(item.outcome_total || 0);
      return acc;
    }, { income: 0, outcome: 0 });
  }, [sortedAndFilteredData]);

  const formatDateString = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Daily Financial Breakdown</h4>
          <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">Daily Income & Outcome Table</h3>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Order: {sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Income</p>
          <p className="text-base font-extrabold text-emerald-600 tracking-tight mt-0.5">{formatIDR(summary.income)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Outcome</p>
          <p className="text-base font-extrabold text-rose-600 tracking-tight mt-0.5">{formatIDR(summary.outcome)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Net</p>
          <p className={`text-base font-extrabold tracking-tight mt-0.5 ${summary.income - summary.outcome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatIDR(summary.income - summary.outcome)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar border border-slate-200/80 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-900 text-white z-10">
            <tr className="text-[10px] font-black uppercase tracking-wider">
              <th className="py-3.5 px-6">Date</th>
              <th className="py-3.5 px-6 text-right">Income</th>
              <th className="py-3.5 px-6 text-right">Outcome</th>
              <th className="py-3.5 px-6 text-right">Net Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-bold">
            {sortedAndFilteredData.length > 0 ? (
              sortedAndFilteredData.map((row, idx) => {
                const inc = Number(row.income_total || 0);
                const out = Number(row.outcome_total || 0);
                const net = inc - out;
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-6 text-slate-900 font-extrabold whitespace-nowrap">{formatDateString(row.date)}</td>
                    <td className="py-3.5 px-6 text-right font-extrabold text-emerald-600">
                      {inc > 0 ? formatIDR(inc) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-3.5 px-6 text-right font-black text-rose-600 bg-rose-50/60">
                      {out > 0 ? formatIDR(out) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-3.5 px-6 text-right font-black">
                      {inc > 0 || out > 0 ? (
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${net >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                          {net >= 0 ? '+' : ''}{formatIDR(net)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">No daily transaction data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Renders a per-day breakdown: { series: string[], data: [{date, [seriesName]: number}] }
 * as a stacked bar chart, plus a ranked legend of totals underneath.
 */
function DailyBreakdownCard({ title, chartData, colors }) {
  const series = chartData?.series || [];
  const data = chartData?.data || [];
  const [expanded, setExpanded] = useState(false);

  const seriesTotals = useMemo(() => {
    return series
      .map(name => ({
        name,
        total: data.reduce((sum, row) => sum + Number(row[name] || 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [series, data]);

  const grandTotal = useMemo(() => seriesTotals.reduce((s, i) => s + i.total, 0), [seriesTotals]);
  const visibleLegend = expanded ? seriesTotals : seriesTotals.slice(0, 5);

  const colorFor = (name) => {
    const idx = seriesTotals.findIndex(s => s.name === name);
    return colors[idx % colors.length];
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
      <div className="flex justify-between items-start">
        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">{title}</h4>
        <p className="text-lg font-black text-slate-900 tracking-tight">{formatIDR(grandTotal)}</p>
      </div>

      {series.length === 0 ? (
        <p className="text-xs text-slate-300 font-bold text-center py-12">No data</p>
      ) : (
        <>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: '800', fill: '#334155' }}
                  tickFormatter={(str) => {
                    if (!str) return '';
                    const parts = str.split('-');
                    return parts.length >= 3 ? parts[2] : str;
                  }}
                />
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
                <Tooltip content={<StackedTooltip series={series} colorFor={colorFor} />} cursor={{ fill: '#f1f5f9' }} />
                {series.map((name) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={colorFor(name)} radius={[0, 0, 0, 0]} maxBarSize={22} />
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

          {seriesTotals.length > 5 && (
            <button onClick={() => setExpanded(e => !e)}
              className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
              {expanded ? '▲ Show less' : `▼ +${seriesTotals.length - 5} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StackedTooltip({ active, payload, label, series, colorFor }) {
  if (!active || !payload || !payload.length) return null;

  let displayDate = label;
  if (label && label.includes('-')) {
    const parts = label.split('-');
    if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const nonZero = payload.filter(p => Number(p.value) > 0);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-white min-w-[180px]">
      <p className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest border-b border-slate-800/80 pb-1.5 font-mono">{displayDate}</p>
      {nonZero.length > 0 ? (
        <div className="space-y-1.5">
          {nonZero.map((p) => (
            <div key={p.dataKey} className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold flex items-center gap-1.5 text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.fill }}></span>
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

function CustomTooltip({ active, payload, label, formatIDR }) {
  if (active && payload && payload.length) {
    const incomeObj = payload.find(p => p.dataKey === 'income_total');
    const outcomeObj = payload.find(p => p.dataKey === 'outcome_total');
    const incVal = incomeObj ? Number(incomeObj.value) : 0;
    const outVal = outcomeObj ? Number(outcomeObj.value) : 0;
    const diff = incVal - outVal;

    let displayDate = label;
    if (label && label.includes('-')) {
      const parts = label.split('-');
      if (parts.length === 3) displayDate = `Date: ${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800 text-white min-w-[220px]">
        <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest border-b border-slate-800/80 pb-1.5 font-mono">{displayDate}</p>
        <div className="space-y-2">
          {incVal > 0 && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Income
              </span>
              <span className="text-xs font-extrabold text-emerald-400">{formatIDR(incVal)}</span>
            </div>
          )}
          {outVal > 0 && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Outcome
              </span>
              <span className="text-xs font-black text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">{formatIDR(outVal)}</span>
            </div>
          )}
          {incVal === 0 && outVal === 0 && <p className="text-xs text-slate-500 italic">No transactions</p>}
        </div>
        {(incVal > 0 || outVal > 0) && (
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Daily Net</span>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${diff >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              {diff >= 0 ? '+' : ''}{formatIDR(diff)}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
}