import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom'; // Tambahin ini buat navigasi

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null); // State baru buat nampung info error
  const navigate = useNavigate();

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/dashboard');
        
        // Cek jika response sukses tapi membawa data kosong atau status khusus
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
        // Cek jika backend ngirim 404 atau Error period not found
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
      Building Analytics...
    </div>
  );

  // --- ERROR STATE UI ---
  // Ditampilkan jika periode belum dibuat
  if (errorInfo) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 text-center space-y-6">
      <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[2rem] flex items-center justify-center shadow-sm">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Periode Tidak Aktif</h2>
        <p className="text-slate-500 font-bold text-sm leading-relaxed">{errorInfo}</p>
      </div>
      <button 
        onClick={() => navigate('/master-period')} 
        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
      >
        Buat Master Periode
      </button>
    </div>
  );

  // Jika data belum ada dan tidak ada errorInfo (antisipasi edge case)
  if (!data) return null;

  const { last_period_balance: stats, last_period_chart_data: charts, last_period_trend: trend } = data;

  return (
    <div className="p-8 space-y-10 bg-slate-50 min-h-screen text-slate-800">
      {/* HEADER SECTION */}
      <header className="flex justify-between items-end">
        <div>          
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">DASHBOARD</h2>
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
        <StatCard title="Income" value={stats.monthly_income} color="text-emerald-500" />
        <StatCard title="Outcome" value={stats.monthly_outcome} color="text-rose-500" />
        <StatCard title="Net Savings" value={stats.net_savings} color="text-indigo-500" />
        <StatCard 
          title="Unaccounted Diff" 
          value={Math.abs(stats.total_wallet_amount - stats.net_savings)} 
          color={stats.total_wallet_amount - stats.net_savings >= 0 ? "text-emerald-500" : "text-rose-500"} 
        />
      </div>

      {/* TREND CHART - REDESIGNED */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Cashflow Analytics</h4>
            <div className="flex gap-4 text-[10px] font-black uppercase">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Income</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Outcome</div>
            </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 'bold', fill: '#cbd5e1'}}
                tickFormatter={(str) => str.split('-')[2]}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip formatIDR={formatIDR} />} />
              <Area type="monotone" dataKey="income_total" stroke="#10b981" strokeWidth={4} fill="url(#gradInc)" animationDuration={1500} />
              <Area type="monotone" dataKey="outcome_total" stroke="#f43f5e" strokeWidth={4} fill="url(#gradOut)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

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

// --- HELPER COMPONENTS (Tetap Sama) ---
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
  // Kita urutkan data dari yang TERBESAR ke TERKECIL berdasarkan field 'total'
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
            {/* Pakai sortedData di sini */}
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
        {/* Dan pakai sortedData juga di list legend-nya */}
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
    return (
      <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-800">
        <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest border-b border-slate-800 pb-1 font-mono tracking-tighter">Date: {label}</p>
        {payload.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center gap-6 mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400">{p.name.split('_')[0]}</span>
                <span className={`text-xs font-black ${p.name.includes('income') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatIDR(p.value)}
                </span>
            </div>
        ))}
      </div>
    );
  }
  return null;
}