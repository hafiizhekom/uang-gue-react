import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);
  const [chartViewMode, setChartViewMode] = useState('all');
  const navigate = useNavigate();

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/dashboard');
        
        if (res.data.status === "Error") {
          setErrorInfo(res.data.message);
          setLoading(false);
          return;
        }

        const rawData = res.data.data;
        
        const formatBreakdown = (arr) => (arr || []).map(item => ({
          ...item,
          total: Number(item.total)
        }));

        rawData.last_period_chart_data.expense_breakdown.by_category = formatBreakdown(rawData.last_period_chart_data.expense_breakdown.by_category);
        rawData.last_period_chart_data.expense_breakdown.by_type = formatBreakdown(rawData.last_period_chart_data.expense_breakdown.by_type);
        rawData.last_period_chart_data.expense_breakdown.by_tags = formatBreakdown(rawData.last_period_chart_data.expense_breakdown.by_tags);
        rawData.last_period_chart_data.income_breakdown.by_type = formatBreakdown(rawData.last_period_chart_data.income_breakdown.by_type);

        setData(rawData);
      } catch (err) {
        if (err.response?.data?.status === "Error") {
          setErrorInfo(err.response.data.message);
        } else {
          console.error("Dashboard Error:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatIDR = (val) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(val || 0);

  const processedTrend = useMemo(() => {
    if (!data?.last_period_trend || !Array.isArray(data.last_period_trend)) return [];
    return data.last_period_trend.map(item => ({
      ...item,
      income_total: Number(item.income_total || 0),
      outcome_total: Number(item.outcome_total || 0),
    }));
  }, [data]);

  const trendStats = useMemo(() => {
    if (!processedTrend.length) return { avgOutcome: 0, maxOutcome: 0, maxOutcomeDate: '-', activeDays: 0 };
    let totalOut = 0;
    let maxOut = 0;
    let maxDate = '-';
    let activeDays = 0;

    processedTrend.forEach(item => {
      const out = item.outcome_total;
      totalOut += out;
      if (out > 0) activeDays++;
      if (out > maxOut) {
        maxOut = out;
        maxDate = item.date;
      }
    });

    return {
      avgOutcome: processedTrend.length > 0 ? Math.round(totalOut / processedTrend.length) : 0,
      maxOutcome: maxOut,
      maxOutcomeDate: maxDate,
      activeDays
    };
  }, [processedTrend]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
      Building Analytics...
    </div>
  );

  if (errorInfo) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 text-center space-y-6">
      <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[2rem] flex items-center justify-center shadow-sm">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Inactive Period</h2>
        <p className="text-slate-500 font-bold text-sm leading-relaxed">{errorInfo}</p>
      </div>
      <button 
        onClick={() => navigate('/master-period')} 
        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
      >
        Create Master Period
      </button>
    </div>
  );

  if (!data) return null;

  const { last_period_balance: stats, last_period_chart_data: charts } = data;

  return (
    <div className="p-8 space-y-10 bg-slate-50 min-h-screen text-slate-800">
      {/* HEADER SECTION */}
      <header className="flex justify-between items-end">
        <div>          
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Dashboard</h2>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mt-2 font-mono">
            {stats.active_period} • {stats.period_range}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest ${stats.status === 'under' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
          Budget Status: {stats.status}
        </div>
      </header>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard title="Wallet Balance" value={stats.total_wallet_amount} color="text-slate-900" isDark />
        <StatCard title="Income" value={stats.monthly_income} color="text-emerald-600 font-extrabold" />
        <StatCard title="Outcome" value={stats.monthly_outcome} color="text-rose-600 font-extrabold" />
        <StatCard title="Net Savings" value={stats.net_savings} color="text-indigo-600 font-extrabold" />
        <StatCard 
          title="Unaccounted Diff" 
          value={Math.abs(stats.total_wallet_amount - stats.net_savings)} 
          color={stats.total_wallet_amount - stats.net_savings >= 0 ? "text-emerald-600 font-extrabold" : "text-rose-600 font-extrabold"} 
        />
      </div>

      {/* TREND CHART - REDESIGNED BAR CHART */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Daily Financial Statistics</h4>
            <p className="text-xl font-black tracking-tight text-slate-900 mt-1">Daily Cashflow Chart</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setChartViewMode('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${chartViewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('outcome')}
                className={`px-3 py-1.5 rounded-xl transition-all ${chartViewMode === 'outcome' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-600'}`}
              >
                Outcome
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('income')}
                className={`px-3 py-1.5 rounded-xl transition-all ${chartViewMode === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
              >
                Income
              </button>
            </div>
          </div>
        </div>

        {/* Informative Stats Summary */}
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
              {trendStats.activeDays} <span className="text-xs font-bold text-slate-500">/ {processedTrend.length} Days</span>
            </p>
          </div>
        </div>

        {/* Bar Chart Canvas */}
        <div className="h-[360px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedTrend} margin={{ top: 20, right: 10, left: 10, bottom: 0 }} barGap={6}>
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
                <Bar 
                  dataKey="income_total" 
                  name="Income" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={28}
                  animationDuration={1000}
                />
              )}
              {(chartViewMode === 'all' || chartViewMode === 'outcome') && (
                <Bar 
                  dataKey="outcome_total" 
                  name="Outcome" 
                  fill="#f43f5e" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={28}
                  animationDuration={1000}
                >
                  {chartViewMode === 'outcome' && (
                    <LabelList 
                      dataKey="outcome_total" 
                      position="top" 
                      formatter={(val) => val > 0 ? (val >= 1_000_000 ? `${(val/1_000_000).toFixed(1)}M` : `${(val/1000).toFixed(0)}k`) : ''} 
                      style={{ fontSize: '10px', fontWeight: '800', fill: '#e11d48' }}
                    />
                  )}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DAILY CASHFLOW TABLE SECTION */}
      <DailyCashflowTable data={processedTrend} formatIDR={formatIDR} />

      {/* DONUT CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <DonutCard title="Outcome Category" data={charts.expense_breakdown.by_category} colors={COLORS} formatIDR={formatIDR} />
        <DonutCard title="Outcome Type" data={charts.expense_breakdown.by_type} colors={COLORS} formatIDR={formatIDR} />
        <DonutCard title="Outcome Tags" data={charts.expense_breakdown.by_tags} colors={COLORS} formatIDR={formatIDR} />
        <DonutCard title="Income Type" data={charts.income_breakdown.by_type} colors={['#10b981', '#34d399', '#059669']} formatIDR={formatIDR} />
      </div>
    </div>
  );
}

// --- DAILY CASHFLOW TABLE ---
function DailyCashflowTable({ data, formatIDR }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  const sortedAndFilteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let filtered = [...data];
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.date?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
      {/* Header Table */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Daily Financial Breakdown</h4>
          <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">Daily Income & Outcome Table</h3>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
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
          {/* Sort Order Button */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Order: {sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Summary Header Pill */}
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

      {/* Table Container */}
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
                    <td className="py-3.5 px-6 text-slate-900 font-extrabold whitespace-nowrap">
                      {formatDateString(row.date)}
                    </td>
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
                <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">
                  No daily transaction data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---
function StatCard({ title, value, color, isDark = false }) {
    return (
        <div className={`${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-100'} p-8 rounded-[2.5rem] shadow-sm`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1`}>{title}</p>
          <h3 className={`text-2xl font-black tracking-tighter ${!isDark ? color : ''}`}>
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
          </h3>
        </div>
    );
}

function DonutCard({ title, data, colors, formatIDR }) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.total - a.total);
  }, [data]);

  const total = useMemo(() => sortedData.reduce((s, i) => s + i.total, 0), [sortedData]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center space-y-4">
      <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-center h-8 flex items-center">{title}</h4>
      <div className="h-[200px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sortedData} innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="total" stroke="none">
              {sortedData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Total</p>
            <p className="text-sm font-black text-slate-800 tracking-tighter">{Number(total).toLocaleString('id-ID')}</p>
        </div>
      </div>
      <div className="w-full space-y-2 overflow-y-auto pr-2 custom-scrollbar">
        {sortedData.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400 flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: colors[idx % colors.length]}}></span>
                    {item.name}
                </span>
                <span className="text-slate-700">{Number(item.total).toLocaleString('id-ID')}</span>
            </div>
        ))}
      </div>
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
      if (parts.length === 3) {
        displayDate = `Date: ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800 text-white min-w-[220px]">
        <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest border-b border-slate-800/80 pb-1.5 font-mono">
          {displayDate}
        </p>
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
          {incVal === 0 && outVal === 0 && (
            <p className="text-xs text-slate-500 italic">No transactions</p>
          )}
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