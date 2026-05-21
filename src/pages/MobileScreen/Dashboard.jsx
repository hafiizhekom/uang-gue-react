import { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { createChart } from 'lightweight-charts';
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

// ─── Quick Menu ───────────────────────────────────────────────────────────────
const quickMenus = [
  {
    label: 'Master Data',
    path: '/master',
    color: 'bg-indigo-50 text-indigo-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    label: 'Activity Log',
    path: '/log',
    color: 'bg-amber-50 text-amber-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

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
        Add Periode
      </button>
    </div>
  );

  if (!data) return null;

  const { last_period_balance: s, last_period_chart_data: charts, last_period_trend: trend } = data;
  const isUnder = s.status === 'under';

  return (
    <div className="bg-slate-50 min-h-screen pb-6">

      {/* ── TOP HEADER ── */}
      <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem]">
        <div className="flex justify-between items-start">
          {/* Kiri: Periode */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Active Period</p>
            <h1 className="text-lg font-black text-white tracking-tighter mt-0.5">{s.active_period}</h1>
            <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">{s.period_range}</p>
          </div>

          {/* Kanan: Wallet Balance */}
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

        {/* ── QUICK MENU ── */}
        <div className="grid grid-cols-2 gap-3">
          {quickMenus.map(m => (
            <button key={m.path} onClick={() => navigate(m.path)}
              className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm active:scale-95 transition-all text-left">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${m.color}`}>
                {m.icon}
              </div>
              <span className="font-black text-xs text-slate-700 uppercase tracking-wide leading-tight">{m.label}</span>
            </button>
          ))}
        </div>

        {/* ── STATS ROW ── */}
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

        {/* ── TREND CHART ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cashflow</p>
            <div className="flex gap-3 text-[9px] font-black uppercase text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Income</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>Outcome</span>
            </div>
          </div>
          <TradingChart data={trend} />
        </div>

        {/* ── BREAKDOWN ── */}
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

function TradingChart({ data }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data?.length) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        tickMarkFormatter: (t) => {
          const d = new Date(t * 1000);
          return `${d.getDate()}`;
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    console.log('chart methods:', Object.keys(chart));

    const incSeries = chart.addAreaSeries({
      lineColor: '#10b981',
      topColor: 'rgba(16,185,129,0.2)',
      bottomColor: 'rgba(16,185,129,0)',
      lineWidth: 2,
      priceLineVisible: false,
    });

    const outSeries = chart.addAreaSeries({
      lineColor: '#f43f5e',
      topColor: 'rgba(244,63,94,0.15)',
      bottomColor: 'rgba(244,63,94,0)',
      lineWidth: 2,
      priceLineVisible: false,
    });

    const toTime = (dateStr) => Math.floor(new Date(dateStr).getTime() / 1000);

    const incData = data
      .map(d => ({ time: toTime(d.date), value: Number(d.income_total) }))
      .sort((a, b) => a.time - b.time);

    const outData = data
      .map(d => ({ time: toTime(d.date), value: Number(d.outcome_total) }))
      .sort((a, b) => a.time - b.time);

    incSeries.setData(incData);
    outSeries.setData(outData);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
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
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <p className="text-sm font-black text-slate-800 tracking-tight">{formatShort(total)}</p>
      </div>

      {/* List */}
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
              {/* Progress bar */}
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {sorted.length > 3 && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? '▲ Show less' : `▼ +${sorted.length - 3} more`}
        </button>
      )}
    </div>
  );
}

function DonutCard({ title, data, colors }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.total - a.total), [data]);
  const total  = useMemo(() => sorted.reduce((s, i) => s + i.total, 0), [sorted]);

  return (
    <div className="flex-shrink-0 w-[160px] bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 truncate">{title}</p>
      <div className="h-[100px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sorted} innerRadius={32} outerRadius={44} paddingAngle={6} dataKey="total" stroke="none">
              {sorted.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[7px] font-black text-slate-300 uppercase">Total</p>
          <p className="text-[10px] font-black text-slate-700">{(total / 1_000_000).toFixed(1)}jt</p>
        </div>
      </div>
      <div className="space-y-1 mt-1">
        {sorted.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-slate-400 truncate flex-1">{item.name}</span>
          </div>
        ))}
        {sorted.length > 3 && (
          <p className="text-[8px] text-slate-300 font-bold">+{sorted.length - 3} more</p>
        )}
      </div>
    </div>
  );
}

function MiniTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 p-2.5 rounded-xl shadow-xl border border-slate-800 text-[10px]">
      <p className="text-slate-500 font-black mb-1">{label?.split('-')[2] ?? label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex gap-3 justify-between">
          <span className="text-slate-400 uppercase">{p.name.split('_')[0]}</span>
          <span className={p.name.includes('income') ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
            {formatShort(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}