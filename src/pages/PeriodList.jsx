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
        <div className="p-8 max-w-2xl mx-auto space-y-10 min-h-screen bg-slate-50">
            <header>
                <h2 className="text-4xl font-black tracking-tighter text-slate-900">Select Period</h2>
                <p className="text-slate-500 font-medium">Choose a period to manage transactions</p>
            </header>

            <div className="grid gap-4">
                {periods.map(p => (
                    <button 
                        key={p.id} 
                        onClick={() => navigate(`/transactions/${p.id}`)}
                        className="group flex justify-between items-center p-6 bg-white rounded-[2rem] border-2 border-transparent hover:border-slate-900 hover:shadow-xl transition-all text-left"
                    >
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Fiscal Period</p>
                            <p className="font-bold text-xl text-slate-800 group-hover:text-slate-900">{p.name}</p>
                        </div>
                        <div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}