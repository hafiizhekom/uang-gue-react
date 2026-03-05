import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const [openMaster, setOpenMaster] = useState(true);

  // Cek active state buat transaksi
  const isTransactionActive = location.pathname.startsWith('/transactions');
  // Cek active state buat wallet
  const isWalletActive = location.pathname === '/wallets';

  const masterMenus = [
    { name: 'Period', path: '/master-period' },
    { name: 'Income Type', path: '/master-income-type' },
    { name: 'Outcome Category', path: '/master-outcome-category' },
    { name: 'Outcome Type', path: '/master-outcome-type' },
    { name: 'Outcome Detail Tag', path: '/master-outcome-detail-tag' },
  ];

  const menuClass = (isActive) => 
    `flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-sm mb-1 ${
      isActive 
      ? 'bg-emerald-500/10 text-emerald-400' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  const subMenuClass = (path) => 
    `block p-2 pl-12 rounded-r-xl text-[11px] font-black uppercase tracking-widest transition-all ${
      location.pathname === path 
      ? 'text-emerald-400 border-l-4 border-emerald-400 bg-emerald-400/5' 
      : 'text-slate-500 hover:text-slate-200'
    }`;

  return (
    <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shrink-0 min-h-screen border-r border-slate-800 sticky top-0">
      <div className="p-8 text-2xl font-black border-b border-slate-800 tracking-tighter italic">
        Uang<span className="text-emerald-400">Ku</span>
      </div>
      
      <nav className="flex-1 p-4 mt-4 overflow-y-auto no-scrollbar">
        
        {/* 1. CONFIGURATION GROUP */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Configuration</p>
          
          {/* Master Data Dropdown */}
          <button 
            onClick={() => setOpenMaster(!openMaster)}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all outline-none mb-1 ${
                location.pathname.startsWith('/master') ? 'bg-slate-800/40 text-white' : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4" />
              </svg>
              <span className="text-xs font-black tracking-widest uppercase">Master Data</span>
            </div>
            <svg className={`w-4 h-4 transition-transform ${openMaster ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openMaster && (
            <div className="mt-1 mb-2 space-y-1 bg-slate-800/10 rounded-2xl py-2">
              {masterMenus.map((sub) => (
                <Link key={sub.path} to={sub.path} className={subMenuClass(sub.path)}>
                  {sub.name}
                </Link>
              ))}
            </div>
          )}

          {/* Wallets (Di luar Master Data, tapi tetap di group Configuration) */}
          <Link to="/wallets" className={menuClass(isWalletActive)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-xs font-black tracking-widest uppercase">My Wallets</span>
          </Link>
        </div>

        {/* 2. ACTIVITY GROUP */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Activity</p>
          
          <Link to="/" className={menuClass(location.pathname === '/')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="tracking-wide uppercase">Dashboard</span>
          </Link>

          <Link to="/transactions" className={menuClass(isTransactionActive)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="tracking-wide uppercase">Transaction</span>
          </Link>
        </div>

      </nav>
      
      {/* Logout button */}
      <div className="p-4 border-t border-slate-800">
        <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="w-full flex items-center justify-center gap-3 p-4 text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all font-black text-xs tracking-widest border border-rose-500/20 active:scale-95">
          LOGOUT
        </button>
      </div>
    </aside>
  );
}