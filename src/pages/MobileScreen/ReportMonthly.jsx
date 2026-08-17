import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const formatShort = (val) => {
  if (!val) return 'Rp0';
  if (val >= 1_000_000_000) return `Rp${(val / 1_000_000_000).toFixed(1)}M`;
  if (val >= 1_000_000) return `Rp${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp${(val / 1_000).toFixed(0)}rb`;
  return `Rp${val}`;
};

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

  const [pickerOpen, setPickerOpen] = useState(false);

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

  // ── If URL has no periodId (e.g. accessed via bottom-nav's plain /report),
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

  const processedDailyTable = useMemo(() => {
    if (!report?.daily_table || !Array.isArray(report.daily_table)) return [];
    return report.daily_table.map(item => ({
      ...item,
      income_total: Number(item.income_total || 0),
      outcome_total: Number(item.outcome_total || 0),
    }));
  }, [report]);

  const selectedPeriod = periods.find(p => String(p.id) === String(periodId));

  if (loadingPeriods) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
        Loading...
      </div>
    );
  }

  if (!loadingPeriods && periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tighter text-slate-900 uppercase">No Periods Yet</h2>
          <p className="text-slate-500 font-bold text-xs mt-1">Create a period first to generate a report.</p>
        </div>
        <button onClick={() => navigate('/master-period')}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
          Add Period
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-6">
      {/* ── TOP HEADER ── */}
      <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem]">
        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Report</p>
        <h1 className="text-lg font-black text-white tracking-tighter mt-0.5">Financial Summary</h1>

        {/* Period Picker Trigger */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-4 w-full flex items-center justify-between bg-white/15 active:bg-white/25 rounded-2xl px-4 py-3 transition-colors"
        >
          <div className="text-left">
            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-100/70">Period</p>
            <p className="text-sm font-black text-white tracking-tight">{selectedPeriod?.name || 'Select period'}</p>
          </div>
          <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {loadingReport || !periodId ? (
          <div className="flex items-center justify-center py-24 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Building report...
          </div>
        ) : errorInfo ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-2">
            <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900">No Data</h3>
            <p className="text-slate-500 font-bold text-xs">{errorInfo}</p>
          </div>
        ) : report ? (
          <>
            {/* STATS ROW */}
            <div className="grid grid-cols-3 gap-2">
              <StatPill label="Income" value={formatShort(report.balance.total_income)} color="text-emerald-500" />
              <StatPill label="Outcome" value={formatShort(report.balance.total_outcome)} color="text-rose-500" />
              <StatPill label="Net" value={formatShort(report.balance.net_savings)} color="text-indigo-500" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex justify-between items-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Transactions</p>
              <p className="text-sm font-black tracking-tight text-slate-700">
                {Number(report.balance.count_transactions || 0).toLocaleString('id-ID')}
              </p>
            </div>

            {/* DAILY BAR CHART */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Statistics</p>
                <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">Expenses & Cashflow</h3>
              </div>
              <DailyBarChart data={processedDailyTable} formatShort={formatShort} />
            </div>

            {/* DAILY TRANSACTION TABLE */}
            <DailyCashflowTableMobile data={processedDailyTable} formatShort={formatShort} />

            {/* DAILY BREAKDOWN CHARTS (stacked per day) */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Breakdown / Day</p>
              <div className="space-y-3">
                <DailyBreakdownCard title="Outcome by Category" chartData={report.daily_chart_data.expense_breakdown.by_category} colors={COLORS} />
                <DailyBreakdownCard title="Outcome by Type" chartData={report.daily_chart_data.expense_breakdown.by_type} colors={COLORS} />
                <DailyBreakdownCard title="Outcome by Tags" chartData={report.daily_chart_data.expense_breakdown.by_tags} colors={COLORS} />
                <DailyBreakdownCard title="Income by Type" chartData={report.daily_chart_data.income_breakdown.by_type} colors={['#10b981', '#34d399', '#059669']} />
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* ── PERIOD PICKER BOTTOM SHEET ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div
            className="bg-white rounded-t-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Select Period</h3>
              <button onClick={() => setPickerOpen(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl px-2">×</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1.5">
              {periods.slice().reverse().map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { navigate(`/report/${p.id}`); setPickerOpen(false); }}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl transition-colors flex items-center justify-between gap-3 ${String(p.id) === String(periodId) ? 'bg-emerald-50' : 'active:bg-slate-50'}`}
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
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function DailyBarChart({ data, formatShort }) {
  const [viewMode, setViewMode] = useState('all');

  const stats = useMemo(() => {
    if (!data.length) return { avgOut: 0, maxOut: 0 };
    let totalOut = 0, maxOut = 0;
    data.forEach(item => {
      totalOut += item.outcome_total;
      if (item.outcome_total > maxOut) maxOut = item.outcome_total;
    });
    return { avgOut: Math.round(totalOut / data.length), maxOut };
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5 text-[9px] font-black uppercase">
          <button type="button" onClick={() => setViewMode('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${viewMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>All</button>
          <button type="button" onClick={() => setViewMode('outcome')}
            className={`px-2.5 py-1 rounded-lg transition-all ${viewMode === 'outcome' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>Outcome</button>
          <button type="button" onClick={() => setViewMode('income')}
            className={`px-2.5 py-1 rounded-lg transition-all ${viewMode === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>Income</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-left">
        <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Average/Day</p>
          <p className="text-xs font-black text-rose-600 tracking-tight mt-0.5">{formatShort(stats.avgOut)}</p>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Peak Outcome</p>
          <p className="text-xs font-black text-rose-600 tracking-tight mt-0.5">{formatShort(stats.maxOut)}</p>
        </div>
      </div>

      <div className="h-[220px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 0, left: -20, bottom: 0 }} barGap={2}>
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
              tick={{ fontSize: 8, fontWeight: '800', fill: '#1e293b' }}
              tickFormatter={(val) => {
                if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}b`;
                if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}m`;
                if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                return val;
              }}
            />
            <Tooltip content={<MobileTooltip formatShort={formatShort} />} cursor={{ fill: '#f1f5f9' }} />
            {(viewMode === 'all' || viewMode === 'income') && (
              <Bar dataKey="income_total" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={16} />
            )}
            {(viewMode === 'all' || viewMode === 'outcome') && (
              <Bar dataKey="outcome_total" name="Outcome" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={16} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DailyCashflowTableMobile({ data, formatShort }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!searchTerm) return data;
    return data.filter(item => item.date?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data, searchTerm]);

  const summary = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      acc.income += Number(item.income_total || 0);
      acc.outcome += Number(item.outcome_total || 0);
      return acc;
    }, { income: 0, outcome: 0 });
  }, [filteredData]);

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch (e) {}
    return dateStr;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Breakdown</p>
        <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">Daily Transaction Table</h3>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
        <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
        <div>
          <p className="text-[7px] font-black uppercase text-slate-400">Income</p>
          <p className="text-[11px] font-extrabold text-emerald-600">{formatShort(summary.income)}</p>
        </div>
        <div>
          <p className="text-[7px] font-black uppercase text-slate-400">Outcome</p>
          <p className="text-[11px] font-extrabold text-rose-600">{formatShort(summary.outcome)}</p>
        </div>
        <div>
          <p className="text-[7px] font-black uppercase text-slate-400">Net</p>
          <p className={`text-[11px] font-extrabold ${summary.income - summary.outcome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatShort(summary.income - summary.outcome)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[280px] overflow-y-auto custom-scrollbar border border-slate-200/80 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-900 text-white z-10 text-[9px] font-black uppercase">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3 text-right">Income</th>
              <th className="py-2.5 px-3 text-right">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => {
                const inc = Number(row.income_total || 0);
                const out = Number(row.outcome_total || 0);
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-900 font-extrabold whitespace-nowrap">{formatDateShort(row.date)}</td>
                    <td className="py-2 px-3 text-right font-extrabold text-emerald-600">
                      {inc > 0 ? formatShort(inc) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-rose-600 bg-rose-50/60">
                      {out > 0 ? formatShort(out) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="3" className="py-4 text-center text-slate-400 font-medium">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileTooltip({ active, payload, label, formatShort }) {
  if (!active || !payload || !payload.length) return null;
  const incomeObj = payload.find(p => p.dataKey === 'income_total');
  const outcomeObj = payload.find(p => p.dataKey === 'outcome_total');
  const incVal = incomeObj ? Number(incomeObj.value) : 0;
  const outVal = outcomeObj ? Number(outcomeObj.value) : 0;

  let displayDate = label;
  if (label && label.includes('-')) {
    const parts = label.split('-');
    if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}`;
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm p-2.5 rounded-xl shadow-xl border border-slate-800 text-white text-[10px] min-w-[150px]">
      <p className="text-slate-400 font-mono font-black mb-1.5 pb-1 border-b border-slate-800 text-[9px] uppercase tracking-wider">
        Date: {displayDate}
      </p>
      {incVal > 0 && (
        <div className="flex justify-between items-center gap-2 my-0.5">
          <span className="text-emerald-400 font-bold uppercase text-[9px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Income
          </span>
          <span className="text-emerald-400 font-black">{formatShort(incVal)}</span>
        </div>
      )}
      {outVal > 0 && (
        <div className="flex justify-between items-center gap-2 my-0.5">
          <span className="text-rose-400 font-bold uppercase text-[9px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span> Outcome
          </span>
          <span className="text-rose-400 font-black">{formatShort(outVal)}</span>
        </div>
      )}
      {incVal === 0 && outVal === 0 && <p className="text-[9px] text-slate-500 italic">No transactions</p>}
    </div>
  );
}

/**
 * Renders a per-day breakdown: { series: string[], data: [{date, [seriesName]: number}] }
 * as a compact stacked bar chart, plus a ranked legend of totals underneath.
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
  const visibleLegend = expanded ? seriesTotals : seriesTotals.slice(0, 3);

  const colorFor = (name) => {
    const idx = seriesTotals.findIndex(s => s.name === name);
    return colors[idx % colors.length];
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <p className="text-sm font-black text-slate-800 tracking-tight">{formatShort(grandTotal)}</p>
      </div>

      {series.length === 0 ? (
        <p className="text-[10px] text-slate-300 font-bold text-center py-6">No data</p>
      ) : (
        <>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fontSize: 8, fontWeight: '800', fill: '#334155' }}
                  tickFormatter={(str) => {
                    if (!str) return '';
                    const parts = str.split('-');
                    return parts.length >= 3 ? parts[2] : str;
                  }}
                />
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
                <Tooltip content={<StackedTooltipMobile formatShort={formatShort} />} cursor={{ fill: '#f1f5f9' }} />
                {series.map((name) => (
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
            <button onClick={() => setExpanded(e => !e)}
              className="w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
              {expanded ? '▲ Show less' : `▼ +${seriesTotals.length - 3} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-sm font-black tracking-tight mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function StackedTooltipMobile({ active, payload, label, formatShort }) {
  if (!active || !payload || !payload.length) return null;

  let displayDate = label;
  if (label && label.includes('-')) {
    const parts = label.split('-');
    if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}`;
  }

  const nonZero = payload.filter(p => Number(p.value) > 0);

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm p-2.5 rounded-xl shadow-xl border border-slate-800 text-white text-[10px] min-w-[140px]">
      <p className="text-slate-400 font-mono font-black mb-1.5 pb-1 border-b border-slate-800 text-[9px] uppercase tracking-wider">
        Date: {displayDate}
      </p>
      {nonZero.length > 0 ? nonZero.map((p) => (
        <div key={p.dataKey} className="flex justify-between items-center gap-2 my-0.5">
          <span className="font-bold flex items-center gap-1 text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.fill }}></span>
            {p.dataKey}
          </span>
          <span className="font-black">{formatShort(p.value)}</span>
        </div>
      )) : (
        <p className="text-[9px] text-slate-500 italic">No transactions</p>
      )}
    </div>
  );
}