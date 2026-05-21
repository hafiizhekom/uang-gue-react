import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function Transaction() {
    const { toast, showToast, hideToast } = useToast();
    const { periodId } = useParams();
    const navigate = useNavigate();

    const [incomes, setIncomes] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentTab, setCurrentTab] = useState('income');

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalType, setModalType] = useState('income');
    const [isEdit, setIsEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [formData, setFormData] = useState({
        master_period_id: periodId,
        master_income_type_id: '',
        master_outcome_category_id: '',
        master_payment_id: '',
        master_outcome_type_id: '',
        title: '',
        amount: '',
        date: '',
        has_detail: false,
    });

    const [masterIncs, setMasterIncs] = useState([]);
    const [masterCats, setMasterCats] = useState([]);
    const [masterPayments, setMasterPayments] = useState([]);
    const [masterOutTypes, setMasterOutTypes] = useState([]);

    // ─── FORMATTERS ───────────────────────────────────────────────────────────
    const formatIDR = (amount) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount || 0);

    // Fix: sama persis dengan desktop — handle format dd-mm-yyyy dari backend
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const parts = dateString.split(/[-/]/);
        let date;
        if (parts.length === 3 && parts[2].length === 4) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime())) return dateString;
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(date);
    };

    const formatNumberInput = (val) => {
        if (!val) return '';
        const num = val.toString().replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(num);
    };

    // ─── FETCH ────────────────────────────────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [resInc, resOut, resPeriod, mInc, mCat, mPay, mOutTy] = await Promise.all([
                axios.get(`/incomes?master_period_id=${periodId}`),
                axios.get(`/outcomes?master_period_id=${periodId}`),
                axios.get(`/master-periods/${periodId}`),
                axios.get('/master-income-types'),
                axios.get('/master-outcome-categories'),
                axios.get('/master-payments'),
                axios.get('/master-outcome-types'),
            ]);

            setIncomes(resInc.data?.data || []);
            setOutcomes(resOut.data?.data || []);
            setActivePeriod(resPeriod.data?.data || resPeriod.data || { name: `Period #${periodId}` });
            setMasterIncs(mInc.data?.data || []);
            setMasterCats(mCat.data?.data || []);
            setMasterPayments(mPay.data?.data || []);
            setMasterOutTypes(mOutTy.data?.data || []);
        } catch (err) {
            showToast("Failed to load data", "error");
        } finally {
            setLoading(false);
        }
    }, [periodId]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const totalIncome  = useMemo(() => incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0), [incomes]);
    const totalOutcome = useMemo(() => outcomes.reduce((s, i) => s + (Number(i.amount) || 0), 0), [outcomes]);
    const netBalance   = useMemo(() => totalIncome - totalOutcome, [totalIncome, totalOutcome]);

    const dateLimits = useMemo(() => ({
        min: activePeriod?.start_date?.split('T')[0] || '',
        max: activePeriod?.end_date?.split('T')[0] || '',
    }), [activePeriod]);

    // ─── HANDLERS ─────────────────────────────────────────────────────────────
    const handleOpenModal = (type, data = null) => {
        setIsEdit(!!data);
        setModalType(type);
        setCurrentId(data?.id || null);
        setFormData(data ? {
            master_period_id: periodId,
            master_income_type_id: data.type?.id || data.master_income_type_id || '',
            master_outcome_category_id: data.category?.id || data.master_outcome_category_id || '',
            master_payment_id: data.payment?.id || data.master_payment_id || '',
            master_outcome_type_id: data.type?.id || data.master_outcome_type_id || '',
            title: data.title || '',
            amount: String(data.amount || ''),
            date: data.date ? data.date.split('-').reverse().join('-') : '',
            has_detail: data.has_detail || false,
        } : {
            master_period_id: periodId,
            master_income_type_id: '',
            master_outcome_category_id: '',
            master_payment_id: '',
            master_outcome_type_id: '',
            title: '',
            amount: '',
            date: dateLimits.min || new Date().toISOString().split('T')[0],
            has_detail: false,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const rawAmount = Number(formData.amount.toString().replace(/\D/g, ''));
        const payload = {
            master_period_id: Number(periodId),
            title: formData.title,
            date: formData.date,
        };

        if (modalType === 'income') {
            payload.amount = rawAmount;
            payload.master_income_type_id = Number(formData.master_income_type_id);
            payload.master_payment_id = Number(formData.master_payment_id);
        } else {
            payload.master_outcome_category_id = Number(formData.master_outcome_category_id);
            if (!isEdit) payload.has_detail = formData.has_detail;
            if (!formData.has_detail) {
                payload.amount = rawAmount;
                payload.master_payment_id = Number(formData.master_payment_id);
            }
            if (formData.master_outcome_type_id) {
                payload.master_outcome_type_id = Number(formData.master_outcome_type_id);
            }
        }

        const path = modalType === 'income' ? '/incomes' : '/outcomes';
        try {
            if (isEdit) {
                await axios.put(`${path}/${currentId}`, payload);
            } else {
                await axios.post(path, payload);
            }
            showToast(`${modalType} saved!`, "success");
            setShowModal(false);
            fetchAllData();
        } catch (err) {
            showToast(err.response?.data?.message || "Submit Failed!", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await axios.delete(`/${deleteTarget.type}s/${deleteTarget.id}`);
            if (deleteTarget.type === 'income') setIncomes(p => p.filter(i => i.id !== deleteTarget.id));
            else setOutcomes(p => p.filter(i => i.id !== deleteTarget.id));
            showToast("Deleted!", "success");
            setShowDeleteModal(false);
        } catch {
            showToast("Delete Failed!", "error");
        } finally {
            setSubmitting(false);
            setDeleteTarget(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse bg-slate-50">
            Loading...
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen pb-36 text-slate-800">
            <Toast data={toast} onClose={hideToast} />

            {/* ── HEADER ── */}
            <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem] shadow-sm sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/transactions')}
                        className="w-9 h-9 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center text-white transition-all flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Active Cycle</p>
                        <h1 className="text-lg font-black text-white tracking-tighter">{activePeriod?.name}</h1>
                    </div>
                </div>
                <div className="mt-4 bg-slate-900 rounded-2xl p-4 text-white shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Sisa Saldo Bersih</p>
                        <h2 className="text-xl font-black tracking-tight text-emerald-400 mt-0.5">{formatIDR(netBalance)}</h2>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-4">
                        <p className="text-[8px] font-bold text-emerald-300 uppercase">In: {formatIDR(totalIncome)}</p>
                        <p className="text-[8px] font-bold text-rose-400 uppercase mt-0.5">Out: {formatIDR(totalOutcome)}</p>
                    </div>
                </div>
            </div>

            {/* ── TAB SWITCHER ── */}
            <div className="px-4 mt-5">
                <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm grid grid-cols-2 gap-1">
                    {['income', 'outcome'].map(tab => (
                        <button key={tab} onClick={() => setCurrentTab(tab)}
                            className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${currentTab === tab ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
                            {tab === 'income' ? `💸 Incomes (${incomes.length})` : `🛒 Outcomes (${outcomes.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── LIST ── */}
            <div className="px-4 mt-4 space-y-3">
                {currentTab === 'income' ? (
                    incomes.length > 0 ? incomes.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        {item.type?.name || '-'}
                                    </p>
                                    <h4 className="font-black text-slate-800 text-sm truncate mt-0.5">{item.title}</h4>
                                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md mt-1.5 inline-block">
                                        💳 {item.payment?.name || '-'}
                                    </span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-black text-emerald-600 tracking-tight">{formatIDR(item.amount)}</p>
                                    <p className="text-[8px] text-slate-400 font-black mt-0.5">{formatDate(item.date)}</p>
                                </div>
                            </div>
                            <div className="border-t border-slate-50 pt-2 flex justify-end gap-4">
                                <button onClick={() => handleOpenModal('income', item)} className="text-indigo-500 font-black text-[9px] uppercase tracking-wider">Edit</button>
                                <button onClick={() => { setDeleteTarget({ type: 'income', id: item.id }); setShowDeleteModal(true); }} className="text-rose-500 font-black text-[9px] uppercase tracking-wider">Delete</button>
                            </div>
                        </div>
                    )) : <p className="text-center text-[10px] text-slate-400 font-black uppercase py-8">Belum ada data pemasukan</p>
                ) : (
                    outcomes.length > 0 ? outcomes.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        {item.type?.name || '-'}
                                    </p>
                                    <h4 className="font-black text-slate-800 text-sm truncate mt-0.5">{item.title}</h4>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                            📁 {item.category?.name || '-'}
                                        </span>
                                        {!item.has_detail && (
                                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                                                💳 {item.payment?.name || '-'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-black text-rose-500 tracking-tight">{formatIDR(item.amount)}</p>
                                    <p className="text-[8px] text-slate-400 font-black mt-0.5">{formatDate(item.date)}</p>
                                </div>
                            </div>
                            <div className="border-t border-slate-50 pt-2 flex justify-between items-center">
                                <div>
                                    {item.has_detail && (
                                        <button onClick={() => navigate(`/outcome-detail/${item.id}`, { state: { outcomeTitle: item.title } })}
                                            className="bg-amber-50 text-amber-600 font-black text-[8px] px-2 py-0.5 rounded uppercase tracking-wider">
                                            🔍 View Details
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => handleOpenModal('outcome', item)} className="text-indigo-500 font-black text-[9px] uppercase tracking-wider">Edit</button>
                                    <button onClick={() => { setDeleteTarget({ type: 'outcome', id: item.id }); setShowDeleteModal(true); }} className="text-rose-500 font-black text-[9px] uppercase tracking-wider">Delete</button>
                                </div>
                            </div>
                        </div>
                    )) : <p className="text-center text-[10px] text-slate-400 font-black uppercase py-8">Belum ada data pengeluaran</p>
                )}
            </div>

            {/* ── ADD BUTTONS ── */}
            <div className="fixed bottom-20 left-0 right-0 px-4 z-30 pointer-events-none">
                <div className="max-w-md mx-auto flex gap-2 pointer-events-auto">
                    <button onClick={() => handleOpenModal('income')}
                        className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                        + Add Income
                    </button>
                    <button onClick={() => handleOpenModal('outcome')}
                        className="flex-1 bg-rose-500 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                        + Add Outcome
                    </button>
                </div>
            </div>

            {/* ── FORM MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-base">
                                {isEdit ? 'Update' : 'New'} {modalType === 'income' ? 'Income' : 'Outcome'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl px-2">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Title</label>
                                <input required type="text" value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-xs" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {!formData.has_detail && (
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Amount</label>
                                        <input required type="text" value={formatNumberInput(formData.amount)}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value.replace(/\D/g, '') })}
                                            className="w-full p-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-slate-900 font-black text-slate-700 text-xs" />
                                    </div>
                                )}
                                <div className={`space-y-1 ${formData.has_detail ? 'col-span-2' : ''}`}>
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Date</label>
                                    <input required type="date" value={formData.date}
                                        min={dateLimits.min} max={dateLimits.max}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-xs" />
                                </div>
                            </div>

                            {modalType === 'income' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <SelectField label="Income Type" value={formData.master_income_type_id} options={masterIncs}
                                        onChange={v => setFormData({ ...formData, master_income_type_id: v })} required />
                                    <SelectField label="Payment" value={formData.master_payment_id} options={masterPayments}
                                        onChange={v => setFormData({ ...formData, master_payment_id: v })} required />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <SelectField label="Category" value={formData.master_outcome_category_id} options={masterCats}
                                            onChange={v => setFormData({ ...formData, master_outcome_category_id: v })} required
                                            className={formData.has_detail ? 'col-span-2' : ''} />
                                        {!formData.has_detail && (
                                            <SelectField label="Payment" value={formData.master_payment_id} options={masterPayments}
                                                onChange={v => setFormData({ ...formData, master_payment_id: v })} required />
                                        )}
                                    </div>
                                    {/* Fix: Outcome Type ada */}
                                    <SelectField label="Outcome Type (Optional)" value={formData.master_outcome_type_id}
                                        options={masterOutTypes} onChange={v => setFormData({ ...formData, master_outcome_type_id: v })}
                                        placeholder="-" />
                                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <input type="checkbox" id="has_detail" checked={formData.has_detail} disabled={isEdit}
                                            onChange={e => setFormData({ ...formData, has_detail: e.target.checked })}
                                            className="w-4 h-4 rounded" />
                                        <label htmlFor="has_detail" className="text-[10px] font-black uppercase text-slate-600 select-none">
                                            Has Detail Item?
                                        </label>
                                    </div>
                                </>
                            )}

                            <button type="submit" disabled={submitting}
                                className="w-full py-3.5 mt-2 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all">
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE MODAL ── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl text-center">
                        <div className="p-6 space-y-2">
                            <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto font-black text-lg">!</div>
                            <h3 className="text-base font-black text-slate-900 uppercase">Delete?</h3>
                            <p className="text-xs text-slate-400 font-bold">This action cannot be undone.</p>
                        </div>
                        <div className="flex border-t border-slate-100">
                            <button onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={executeDelete} disabled={submitting}
                                className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 border-l border-slate-100 transition-colors">
                                {submitting ? 'Deleting...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SelectField({ label, value, options = [], onChange, required = false, placeholder = "Select...", className = '' }) {
    return (
        <div className={`space-y-1 ${className}`}>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">{label}</label>
            <select required={required} value={value || ''}
                onChange={e => onChange(e.target.value)}
                className="w-full p-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-xs appearance-none">
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
        </div>
    );
}