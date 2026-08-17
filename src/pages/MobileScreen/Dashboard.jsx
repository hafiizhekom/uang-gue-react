import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const formatIDR = (val) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(val || 0);

const formatShort = (val) => {
  if (!val) return 'Rp0';
  if (val >= 1_000_000_000) return `Rp${(val / 1_000_000_000).toFixed(1)}M`;
  if (val >= 1_000_000) return `Rp${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp${(val / 1_000).toFixed(0)}rb`;
  return `Rp${val}`;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/dashboard');
        if (res.data.status === 'Error') { setErrorInfo(res.data.message); return; }

        const raw = res.data.data;
        const fmt = (arr) => (arr || []).map(i => ({ ...i, total: Number(i.total) }));
        raw.last_period_chart_data.expense_breakdown.by_category = fmt(raw.last_period_chart_data.expense_breakdown.by_category);
        raw.last_period_chart_data.expense_breakdown.by_type     = fmt(raw.last_period_chart_data.expense_breakdown.by_type);
        raw.last_period_chart_data.expense_breakdown.by_tags     = fmt(raw.last_period_chart_data.expense_breakdown.by_tags);
        raw.last_period_chart_data.income_breakdown.by_type      = fmt(raw.last_period_chart_data.income_breakdown.by_type);
        setData(raw);
      } catch (err) {
        if (err.response?.data?.status === 'Error') setErrorInfo(err.response.data.message);
        else console.error('Dashboard Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
      Loading...
    </div>
  );

  if (errorInfo) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-4">
      <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-black tracking-tighter text-slate-900 uppercase">No Active Period</h2>
        <p className="text-slate-500 font-bold text-xs mt-1">{errorInfo}</p>
      </div>
      <button onClick={() => navigate('/master-period')}
        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
        Add Period
      </button>
    </div>
  );

  if (!data) return null;

  const { last_period_balance: s, last_period_chart_data: charts, last_period_trend: trend } = data;
  const isUnder = s.status === 'under';

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* ── TOP HEADER ── */}
      <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem]">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Active Period</p>
            <h1 className="text-lg font-black text-white tracking-tighter mt-0.5">{s.active_period}</h1>
            <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">{s.period_range}</p>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Wallet Balance</p>
            <p className="text-lg font-black text-white tracking-tighter mt-0.5">{formatShort(s.total_wallet_amount)}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isUnder ? 'bg-white/20 text-white' : 'bg-rose-400/30 text-rose-100'}`}>
              {isUnder ? '✓ Under Budget' : '⚠ Over Budget'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Income" value={formatShort(s.monthly_income)} color="text-emerald-500" />
          <StatPill label="Outcome" value={formatShort(s.monthly_outcome)} color="text-rose-500" />
          <StatPill label="Net" value={formatShort(s.net_savings)} color="text-indigo-500" />
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex justify-between items-center">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Unaccounted Diff</p>
          <p className={`text-sm font-black tracking-tight ${s.total_wallet_amount - s.net_savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatIDR(Math.abs(s.total_wallet_amount - s.net_savings))}
          </p>
        </div>

        {/* DAILY BAR CHART */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Statistics</p>
            <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">Expenses & Cashflow</h3>
          </div>
          <DailyBarChart data={trend} formatShort={formatShort} formatIDR={formatIDR} />
        </div>

        {/* DAILY TRANSACTION TABLE */}
        <DailyCashflowTableMobile data={trend} formatShort={formatShort} formatIDR={formatIDR} />

        {/* BREAKDOWN */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Breakdown</p>
          <div className="space-y-3">
            <BreakdownCard title="Outcome by Category" data={charts.expense_breakdown.by_category} colors={COLORS} />
            <BreakdownCard title="Outcome by Type"     data={charts.expense_breakdown.by_type}     colors={COLORS} />
            <BreakdownCard title="Outcome by Tags"     data={charts.expense_breakdown.by_tags}     colors={COLORS} />
            <BreakdownCard title="Income by Type"      data={charts.income_breakdown.by_type}      colors={['#10b981','#34d399','#059669']} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function DailyBarChart({ data, formatShort, formatIDR }) {
  const [viewMode, setViewMode] = useState('all');

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => ({
      ...item,
      income_total: Number(item.income_total || 0),
      outcome_total: Number(item.outcome_total || 0),
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!processedData.length) return { avgOut: 0, maxOut: 0, activeDays: 0 };
    let totalOut = 0;
    let maxOut = 0;
    let activeDays = 0;
    processedData.forEach(item => {
      const out = item.outcome_total;
      totalOut += out;
      if (out > 0) activeDays++;
      if (out > maxOut) maxOut = out;
    });
    return {
      avgOut: Math.round(totalOut / processedData.length),
      maxOut,
      activeDays
    };
  }, [processedData]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5 text-[9px] font-black uppercase">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${viewMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setViewMode('outcome')}
            className={`px-2.5 py-1 rounded-lg transition-all ${viewMode === 'outcome' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            Outcome
          </button>
          <button
            type="button"
            onClick={() => setViewMode('income')}
            className={`px-2.5 py-1 rounded-lg transition-all ${viewMode === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            Income
          </button>
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
          <BarChart data={processedData} margin={{ top: 15, right: 0, left: -20, bottom: 0 }} barGap={2}>
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
            <Tooltip content={<MobileTooltip formatShort={formatShort} formatIDR={formatIDR} />} cursor={{ fill: '#f1f5f9' }} />
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

function DailyCashflowTableMobile({ data, formatShort, formatIDR }) {
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
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }
    } catch (e) {}
    return dateStr;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Breakdown</p>
          <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">Daily Transaction Table</h3>
        </div>
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
                    <td className="py-2 px-3 text-slate-900 font-extrabold whitespace-nowrap">
                      {formatDateShort(row.date)}
                    </td>
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
                <td colSpan="3" className="py-4 text-center text-slate-400 font-medium">
                  No data available
                </td>
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
      {incVal === 0 && outVal === 0 && (
        <p className="text-[9px] text-slate-500 italic">No transactions</p>
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

function BreakdownCard({ title, data, colors }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.total - a.total), [data]);
  const total  = useMemo(() => sorted.reduce((s, i) => s + i.total, 0), [sorted]);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sorted : sorted.slice(0, 3);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <p className="text-sm font-black text-slate-800 tracking-tight">{formatShort(total)}</p>
      </div>

      <div className="space-y-2.5">
        {visible.map((item, i) => {
          const pct = total > 0 ? (item.total / total) * 100 : 0;
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-[11px] font-bold text-slate-600 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-[10px] font-black text-slate-400">{pct.toFixed(0)}%</span>
                  <span className="text-[11px] font-black text-slate-700">{formatShort(item.total)}</span>
                </div>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length > 3 && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? '▲ Show less' : `▼ +${sorted.length - 3} more`}
        </button>
      )}
    </div>
  );
}