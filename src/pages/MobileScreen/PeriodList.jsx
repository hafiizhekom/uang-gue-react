import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function PeriodList() {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('/master-periods')
            .then(res => {
                const sorted = (res.data?.data || []).sort((a, b) => b.id - a.id);
                setPeriods(sorted);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                Loading...
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-24 text-slate-800 animate-in fade-in duration-500">
            
            {/* ── TOP HEADER (ADAPTED FROM DASHBOARD) ── */}
            <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem] shadow-sm">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Transactions</p>
                    <h1 className="text-xl font-black text-white tracking-tighter mt-0.5">Select Period</h1>
                    <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">Choose a period to manage records</p>
                </div>
            </div>

            {/* ── MAIN CONTENT AREA ── */}
            <div className="px-4 mt-6">
                
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">
                    Available Periods ({periods.length})
                </p>

                <div className="space-y-3">
                    {periods.length > 0 ? (
                        periods.map(p => (
                            <button 
                                key={p.id} 
                                onClick={() => navigate(`/transactions/${p.id}`)}
                                className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.99] transition-all text-left"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fiscal Period</p>
                                        <h4 className="font-black text-slate-800 text-base truncate leading-tight mt-0.5">{p.name}</h4>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-2.5 rounded-xl flex-shrink-0 text-slate-400 group-active:bg-slate-900 group-active:text-white transition-colors ml-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-10 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-5">
                            <div className="space-y-1">
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter">No Periods Found</h3>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                                    Please create a master period first.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate('/master-period')} 
                                className="px-6 py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-md active:scale-95"
                            >
                                Create Master Period
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}