import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Wallet() {
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        balance: ''
    });

    // --- FORMATTERS ---
    const formatIDR = (amount) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount || 0);

    const formatNumberInput = (val) => {
        if (!val) return '';
        const num = val.toString().replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(num);
    };

    // --- FETCH DATA ---
    const fetchWallets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/master-payments');
            setWallets(res.data?.data || []);
        } catch (err) { console.error(err); } 
        finally { setTimeout(() => setLoading(false), 300); }
    }, []);

    useEffect(() => { fetchWallets(); }, [fetchWallets]);

    const totalAllBalances = useMemo(() => {
        return wallets.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
    }, [wallets]);

    // --- HANDLERS ---
    const handleOpenModal = (data = null) => {
        const editMode = !!data;
        setIsEdit(editMode);
        setCurrentId(data?.id || null);
        setFormData({
            name: data?.name || '',
            slug: data?.slug || '',
            balance: data?.balance || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const rawBalance = Number(formData.balance.toString().replace(/\D/g, ''));
        
        const payload = { 
            name: formData.name, 
            balance: rawBalance,
            ...( !isEdit && { slug: formData.slug } ) 
        };

        try {
            if (isEdit) {
                const res = await axios.put(`/master-payments/${currentId}`, payload);
                const updated = res.data?.data || res.data;
                setWallets(prev => prev.map(w => w.id === currentId ? { ...w, ...updated } : w));
            } else {
                const res = await axios.post('/master-payments', payload);
                const newItem = res.data?.data || res.data;
                setWallets(prev => [...prev, newItem]);
            }
            setShowModal(false);
        } catch (err) { alert("Action Failed!"); } 
        finally { setSubmitting(false); }
    };

    const executeDelete = async () => {
        setSubmitting(true);
        try {
            await axios.delete(`/master-payments/${deleteTarget}`);
            setWallets(prev => prev.filter(w => w.id !== deleteTarget));
            setShowDeleteModal(false);
        } catch (err) { alert("Delete Failed!"); } 
        finally { setSubmitting(false); setDeleteTarget(null); }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                Loading...
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-500">
            {/* HEADER SUMMARY */}
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Wallets</h2>
                    <p className="text-slate-500 text-sm">Manage wallets/master payments</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Total Balance</p>
                        <p className="text-xl font-bold text-emerald-600 tracking-tight">
                            {formatIDR(totalAllBalances)}
                        </p>
                    </div>
                </div>
            </header>

            {/* ACTION BAR */}
            <div className="flex justify-end pt-2">
                <button 
                    onClick={() => handleOpenModal()} 
                    className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Payment
                </button>
            </div>

            {/* LIST AREA */}
            <div className="space-y-2">
                <div className="flex px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    <div className="flex-1">Account & Usage</div>
                    <div className="w-40 text-right">Balance</div>
                    <div className="w-32 text-right">Actions</div>
                </div>

                {wallets.map((wallet) => (
                    <div key={wallet.id} className="bg-white p-5 px-8 rounded-[1.5rem] border border-slate-100 flex items-center justify-between hover:border-emerald-500/30 transition-all group">
                        <div className="flex items-center gap-5 flex-1">
                            <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors font-black text-xs">
                                {wallet.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-black text-slate-800 leading-tight">{wallet.name}</h4>
                                <div className="flex items-center gap-3">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">{wallet.slug}</p>
                                    <div className="flex gap-2 border-l border-slate-100 pl-3">
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase">In: {wallet.count_incomes || 0}</span>
                                        <span className="text-[9px] font-bold text-rose-400 uppercase">Out: {wallet.count_outcomes || 0}</span>
                                        <span className="text-[9px] font-bold text-amber-500 uppercase">Det: {wallet.count_outcome_details || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="w-40 text-right">
                            <p className={`text-lg font-black tracking-tighter ${wallet.balance < 0 ? 'text-rose-500' : 'text-slate-900'}`}>{formatIDR(wallet.balance)}</p>
                        </div>
                        <div className="w-32 text-right flex justify-end gap-4">
                            <button onClick={() => handleOpenModal(wallet)} className="text-indigo-500 hover:text-indigo-700 font-bold text-xs uppercase tracking-tighter transition-colors">Edit</button>
                            <button onClick={() => { setDeleteTarget(wallet.id); setShowDeleteModal(true); }} className="text-rose-500 hover:text-rose-700 font-bold text-xs uppercase tracking-tighter transition-colors">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL CREATE / UPDATE */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">{isEdit ? 'Update' : 'New'} Wallet</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Wallet Name</label>
                                <input required type="text" value={formData.name} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({
                                            ...formData, 
                                            name: val, 
                                            ...(!isEdit && { slug: val.toLowerCase().replace(/ /g, '-') })
                                        });
                                    }} 
                                    className="w-full p-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" 
                                />
                            </div>

                            {!isEdit && (
                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug (Identifier)</label>
                                    <input required type="text" value={formData.slug} 
                                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-400 text-sm italic" 
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Current Balance</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">Rp</span>
                                    <input required type="text" value={formatNumberInput(formData.balance)} 
                                        onChange={(e) => setFormData({...formData, balance: e.target.value.replace(/\D/g, '')})} 
                                        className="w-full p-4 pl-10 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" 
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full py-5 mt-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50">
                                {submitting ? 'Processing...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl text-center">
                        <div className="p-10 space-y-4">
                            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2 font-black">!</div>
                            <h3 className="text-xl font-black text-slate-900 uppercase">Delete?</h3>
                            <p className="text-sm text-slate-400 font-bold leading-relaxed">This action cannot be undone.</p>
                        </div>
                        <div className="flex border-t border-slate-100">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-6 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={executeDelete} disabled={submitting} className="flex-1 py-6 font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 border-l border-slate-100 transition-colors">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}