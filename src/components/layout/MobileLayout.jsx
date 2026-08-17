import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  {
    label: 'Dashboard',
    path: '/',
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Transaction',
    path: '/transactions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Wallet',
    path: '/wallets',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export default function MobileLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Modal & Report Sub-dropdown State
  const [moreModalOpen, setMoreModalOpen] = useState(false);
  const [reportSubOpen, setReportSubOpen] = useState(false);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const isMoreActive = 
    location.pathname.startsWith('/master') ||
    location.pathname.startsWith('/log') ||
    location.pathname.startsWith('/report');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* ── BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 safe-area-pb shadow-lg">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all"
              >
                <span className={active ? 'text-emerald-500' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* MORE BUTTON */}
          <button
            onClick={() => setMoreModalOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all"
          >
            <span className={isMoreActive || moreModalOpen ? 'text-emerald-500' : 'text-slate-400'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isMoreActive || moreModalOpen ? 'text-emerald-500' : 'text-slate-400'}`}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ── FULLSCREEN MORE MODAL (LIGHT THEME) ── */}
      {moreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col justify-between p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="space-y-6">
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b border-slate-200/80 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Navigation Menu</p>
                <h2 className="text-2xl font-black tracking-tighter italic text-slate-900">
                  Uang<span className="text-emerald-500">Gue</span>
                </h2>
              </div>
              <button
                onClick={() => setMoreModalOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 flex items-center justify-center font-black text-xl shadow-sm active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Menu List */}
            <div className="space-y-3">
              {/* 1. Master Data (Langsung Navigate ke /master, Tanpa Sub-menu) */}
              <button
                onClick={() => { setMoreModalOpen(false); navigate('/master'); }}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm font-black text-sm uppercase tracking-wider text-slate-800 text-left active:scale-95 transition-all hover:bg-slate-100/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4" />
                    </svg>
                  </span>
                  Master Data
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 2. Activity Log */}
              <button
                onClick={() => { setMoreModalOpen(false); navigate('/log'); }}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm font-black text-sm uppercase tracking-wider text-slate-800 text-left active:scale-95 transition-all hover:bg-slate-100/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  Activity Log
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 3. Report Group Dropdown */}
              <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-sm">
                <button
                  onClick={() => setReportSubOpen(!reportSubOpen)}
                  className="w-full flex justify-between items-center p-3 text-left font-black text-sm uppercase tracking-wider text-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6m3 6V7m3 10v-3m5 8H4a2 2 0 01-2-2V4a2 2 0 012-2h9l7 7v11a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                    Report
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${reportSubOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {reportSubOpen && (
                  <div className="pl-14 pr-3 py-2 space-y-2 border-t border-slate-100 mt-1">
                    <button
                      onClick={() => { setMoreModalOpen(false); navigate('/report'); }}
                      className="w-full text-left text-xs font-bold text-slate-600 hover:text-emerald-500 uppercase tracking-wider py-1.5"
                    >
                      Report Period
                    </button>
                    <button
                      onClick={() => { setMoreModalOpen(false); navigate('/report-range'); }}
                      className="w-full text-left text-xs font-bold text-slate-600 hover:text-emerald-500 uppercase tracking-wider py-1.5"
                    >
                      Report Range
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-6 border-t border-slate-200/80">
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              className="w-full py-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all font-black text-xs tracking-widest border border-rose-200 active:scale-95 bg-white shadow-sm"
            >
              LOGOUT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}