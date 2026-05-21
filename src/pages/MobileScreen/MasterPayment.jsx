import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function Wallet() {
    const { toast, showToast, hideToast } = useToast();
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

    const formatShort = (val) => {
        if (!val) return 'Rp0';
        if (val >= 1_000_000_000) return `Rp${(val / 1_000_000_000).toFixed(1)}M`;
        if (val >= 1_000_000) return `Rp${(val / 1_000_000).toFixed(1)}jt`;
        if (val >= 1_000) return `Rp${(val / 1_000).toFixed(0)}rb`;
        return `Rp${val}`;
    };

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
            ...(!isEdit && { slug: formData.slug }) 
        };

        try {
            if (isEdit) {
                const res = await axios.put(`/master-payments/${currentId}`, payload);
                const updated = res.data?.data || res.data;
                setWallets(prev => prev.map(w => w.id === currentId ? { ...w, ...updated } : w));
                showToast("Wallet updated successfully!", "success");
            } else {
                const res = await axios.post('/master-payments', payload);
                const newItem = res.data?.data || res.data;
                setWallets(prev => [...prev, newItem]);
                showToast("New wallet created successfully!", "success");
            }
            setShowModal(false);
        } catch (err) { 
            showToast("Failed to load wallets data.", "error");
        } 
        finally { setSubmitting(false); }
    };

    const executeDelete = async () => {
        setSubmitting(true);
        try {
            await axios.delete(`/master-payments/${deleteTarget}`);
            setWallets(prev => prev.filter(w => w.id !== deleteTarget));
            setShowDeleteModal(false);
            showToast("Wallet deleted successfully!", "success");
        } catch (err) { 
            showToast(err.response?.data?.message || "Delete Failed!", "error");
        } 
        finally { setSubmitting(false); setDeleteTarget(null); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse bg-slate-50">
                Loading...
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-24 text-slate-800 animate-in fade-in duration-500">
            <Toast data={toast} onClose={hideToast} />

            {/* ── TOP HEADER ── */}
            <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem] shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Master Data</p>
                        <h1 className="text-xl font-black text-white tracking-tighter mt-0.5">Wallets</h1>
                        <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">Manage accounts & payments</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Total Balance</p>
                        <p className="text-xl font-black text-white tracking-tighter mt-0.5">
                            {formatShort(totalAllBalances)}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT AREA ── */}
            <div className="px-4 mt-5 space-y-3">
                <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Account List ({wallets.length})
                    </p>
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl transition-all"
                    >
                        + Add New
                    </button>
                </div>

                <div className="space-y-3">
                    {wallets.map((wallet) => (
                        <div key={wallet.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-3 active:scale-[0.99] transition-all">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0">
                                        {wallet.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-slate-800 text-sm truncate leading-snug">{wallet.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">{wallet.slug}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-base font-black tracking-tight ${wallet.balance < 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                                        {formatIDR(wallet.balance)}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-slate-50" />

                            <div className="flex items-center justify-between pt-0.5">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 uppercase">In: {wallet.count_incomes || 0}</span>
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-400 uppercase">Out: {wallet.count_outcomes || 0}</span>
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-500 uppercase">Det: {wallet.count_outcome_details || 0}</span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => handleOpenModal(wallet)} 
                                        className="text-indigo-500 hover:text-indigo-700 font-black text-[10px] uppercase tracking-wide transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => { setDeleteTarget(wallet.id); setShowDeleteModal(true); }} 
                                        className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-wide transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── MODAL CREATE / UPDATE (z-[60]) ── */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 mb-[safe-area-pb]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{isEdit ? 'Update' : 'New'} Wallet</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl px-2">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 mb-4">
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
                                    className="w-full p-3.5 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" 
                                />
                            </div>

                            {!isEdit && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug (Identifier)</label>
                                    <input required type="text" value={formData.slug} 
                                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-400 text-sm italic" 
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Current Balance</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">Rp</span>
                                    <input required type="text" value={formatNumberInput(formData.balance)} 
                                        onChange={(e) => setFormData({...formData, balance: e.target.value.replace(/\D/g, '')})} 
                                        className="w-full p-3.5 pl-10 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" 
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full py-4 mt-2 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50">
                                {submitting ? 'Processing...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE MODAL (z-[70]) ── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl text-center">
                        <div className="p-8 space-y-3">
                            <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-1 font-black text-lg">!</div>
                            <h3 className="text-lg font-black text-slate-900 uppercase">Delete?</h3>
                            <p className="text-xs text-slate-400 font-bold leading-relaxed">This action cannot be undone.</p>
                        </div>
                        <div className="flex border-t border-slate-100">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={executeDelete} disabled={submitting} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 border-l border-slate-100 transition-colors">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}