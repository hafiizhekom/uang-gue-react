import { useNavigate } from 'react-router-dom';

const masterItems = [
  {
    label: 'Period',
    path: '/master-period',
    desc: 'Manage Period',
    color: 'bg-indigo-50 text-indigo-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Income Type',
    path: '/master-income-type',
    desc: 'Manage Income Types',
    color: 'bg-emerald-50 text-emerald-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    label: 'Outcome Category',
    path: '/master-outcome-category',
    desc: 'Manage Outcome Categories',
    color: 'bg-rose-50 text-rose-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: 'Outcome Type',
    path: '/master-outcome-type',
    desc: 'Manage Outcome Types',
    color: 'bg-amber-50 text-amber-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Outcome Detail Tag',
    path: '/master-outcome-detail-tag',
    desc: 'Manage Outcome Detail Tags',
    color: 'bg-purple-50 text-purple-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  },
];

export default function MasterMenu() {
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen pb-24 text-slate-800 animate-in fade-in duration-500">
      
      {/* ── TOP HEADER (ADAPTED FROM DASHBOARD) ── */}
      <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem] shadow-sm">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Settings & Setup</p>
          <h1 className="text-xl font-black text-white tracking-tighter mt-0.5">Master Data</h1>
          <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">Config</p>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="px-4 mt-6">
        
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">
          Configuration List ({masterItems.length})
        </p>

        <div className="space-y-3">
          {masterItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all text-left"
            >
              {/* Icon Container */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                {item.icon}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-800 uppercase tracking-wide leading-snug">
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {item.desc}
                </p>
              </div>

              {/* Arrow Indicator */}
              <div className="bg-slate-50 p-2 rounded-xl flex-shrink-0 text-slate-300 transition-colors ml-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}