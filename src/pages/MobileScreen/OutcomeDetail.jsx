import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const formatIDR = (val) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(val || 0);

const formatNumberInput = (val) => {
    if (!val && val !== 0) return '';
    return new Intl.NumberFormat('id-ID').format(String(val).replace(/\D/g, ''));
};

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
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export default function OutcomeDetail() {
    const { outcomeId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { toast, showToast, hideToast } = useToast();

    const outcomeTitle = location.state?.outcomeTitle || '';

    const [originalDetails, setOriginalDetails] = useState([]);
    const [details, setDetails] = useState([]);
    const [masterPayments, setMasterPayments] = useState([]);
    const [masterTags, setMasterTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ID card yang sedang di-expand untuk edit
    const [expandedId, setExpandedId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resDetail, resPay, resTag] = await Promise.all([
                axios.get('/outcome-details', { params: { outcome_id: Number(outcomeId) } }),
                axios.get('/master-payments'),
                axios.get('/master-outcome-detail-tags'),
            ]);

            const mapped = (resDetail.data?.data || []).map(item => ({
                id: item.id,
                title: item.title || '',
                amount: item.amount || 0,
                master_payment_id: item.payment?.id || '',
                note: item.note || '',
                date: item.date ? item.date.split('-').reverse().join('-') : new Date().toISOString().split('T')[0],
                tags: item.tags?.map(t => t.id) || [],
                isNew: false,
            }));

            setDetails(mapped);
            setOriginalDetails(JSON.parse(JSON.stringify(mapped)));
            setMasterPayments(resPay.data?.data || []);
            setMasterTags(resTag.data?.data || []);
        } catch {
            showToast("Failed to load data", "error");
        } finally {
            setLoading(false);
        }
    }, [outcomeId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalAmount = useMemo(() => details.reduce((s, d) => s + Number(d.amount || 0), 0), [details]);

    const handleAddRow = () => {
        const newId = `temp-${Date.now()}`;
        const newRow = {
            id: newId,
            title: '',
            amount: 0,
            master_payment_id: '',
            note: '',
            date: new Date().toISOString().split('T')[0],
            tags: [],
            isNew: true,
        };
        setDetails(prev => [newRow, ...prev]);
        setExpandedId(newId);
    };

    const handleChange = (id, field, value) => {
        setDetails(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleTagToggle = (rowId, tagId) => {
        setDetails(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            const tags = r.tags.includes(tagId) ? r.tags.filter(t => t !== tagId) : [...r.tags, tagId];
            return { ...r, tags };
        }));
    };

    const handleRemoveRow = (id) => {
        setDetails(prev => prev.filter(r => r.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const handleSaveAll = async () => {
        if (submitting) return;
        setSubmitting(true);

        const toCreate = details.filter(d => d.isNew && d.title);
        const toUpdate = details.filter(d => {
            if (d.isNew) return false;
            const old = originalDetails.find(o => o.id === d.id);
            return JSON.stringify(old) !== JSON.stringify(d);
        });
        const toDelete = originalDetails.filter(o => !details.find(d => d.id === o.id));

        const tasks = [
            ...toDelete.map(item => ({
                type: 'DELETE', id: item.id,
                promise: axios.delete(`/outcome-details/${item.id}`).then(() => ({ id: item.id, type: 'DELETE' }))
            })),
            ...toUpdate.map(item => ({
                type: 'UPDATE', id: item.id,
                promise: axios.put(`/outcome-details/${item.id}`, {
                    outcome_id: Number(outcomeId),
                    master_payment_id: Number(item.master_payment_id),
                    title: item.title,
                    amount: Number(item.amount),
                    date: item.date,
                    note: item.note,
                    tags: item.tags,
                }).then(() => ({ id: item.id, type: 'UPDATE', data: item }))
            })),
            ...toCreate.map(item => ({
                type: 'CREATE', id: item.id,
                promise: axios.post('/outcome-details', {
                    outcome_id: Number(outcomeId),
                    master_payment_id: Number(item.master_payment_id),
                    title: item.title,
                    amount: Number(item.amount),
                    date: item.date,
                    note: item.note,
                    tags: item.tags,
                }).then(res => ({ id: item.id, type: 'CREATE', newId: res.data.data.id, data: item }))
            })),
        ];

        if (tasks.length === 0) {
            showToast("No changes detected.", "info");
            setSubmitting(false);
            return;
        }

        try {
            const results = await Promise.allSettled(tasks.map(t => t.promise));
            let newDetails = [...details];
            let newOriginals = [...originalDetails];
            let errors = [];

            results.forEach((result, i) => {
                const task = tasks[i];
                if (result.status === 'fulfilled') {
                    const info = result.value;
                    if (info.type === 'DELETE') {
                        newOriginals = newOriginals.filter(o => o.id !== info.id);
                    } else if (info.type === 'UPDATE') {
                        newOriginals = newOriginals.map(o => o.id === info.id ? JSON.parse(JSON.stringify(info.data)) : o);
                    } else if (info.type === 'CREATE') {
                        const saved = { ...info.data, id: info.newId, isNew: false };
                        newDetails = newDetails.map(d => d.id === info.id ? saved : d);
                        newOriginals.push(JSON.parse(JSON.stringify(saved)));
                    }
                } else {
                    const errData = result.reason?.response?.data;
                    const msg = errData?.errors
                        ? Object.values(errData.errors).flat().join(', ')
                        : errData?.message || 'Unknown error';
                    errors.push(`${task.type} - ${msg}`);
                }
            });

            setDetails(newDetails);
            setOriginalDetails(newOriginals);

            if (errors.length === 0) {
                showToast("All changes saved!", "success");
                setExpandedId(null);
            } else {
                showToast("Some changes failed.", "error", { batch_errors: errors });
            }
        } catch {
            showToast("Critical error during save.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Syncing...
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen pb-32">
            <Toast data={toast} onClose={hideToast} />

            {/* ── HEADER ── */}
            <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem] sticky top-0 z-40 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center text-white flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Outcome Detail</p>
                        <h1 className="text-lg font-black text-white tracking-tighter truncate">
                            {outcomeTitle || `#${outcomeId}`}
                        </h1>
                    </div>
                </div>

                {/* Summary bar */}
                <div className="mt-4 bg-slate-900 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Total</p>
                        <p className="text-xl font-black text-white tracking-tight mt-0.5">{formatIDR(totalAmount)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Lines</p>
                        <p className="text-xl font-black text-emerald-400 mt-0.5">{details.length}</p>
                    </div>
                </div>
            </div>

            {/* ── CARDS ── */}
            <div className="px-4 mt-5 space-y-3">
                {details.length === 0 && (
                    <p className="text-center text-[10px] text-slate-400 font-black uppercase py-12">
                        Belum ada detail. Tap + untuk tambah.
                    </p>
                )}

                {details.map(row => {
                    const isExpanded = expandedId === row.id;
                    const paymentName = masterPayments.find(p => String(p.id) === String(row.master_payment_id))?.name;

                    return (
                        <div key={row.id}
                            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${row.isNew ? 'border-amber-200' : 'border-slate-100'}`}>

                            {/* ── Card Header (always visible) ── */}
                            <button className="w-full p-4 text-left"
                                onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-slate-800 text-sm truncate">
                                            {row.title || <span className="text-slate-300 italic">Untitled</span>}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {paymentName && (
                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                                                    💳 {paymentName}
                                                </span>
                                            )}
                                            {row.tags.length > 0 && (
                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                                                    🏷 {row.tags.length} tag
                                                </span>
                                            )}
                                            {row.isNew && (
                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-amber-50 text-amber-500 rounded-md">
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-black text-rose-500 tracking-tight">{formatIDR(row.amount)}</p>
                                        <p className="text-[8px] text-slate-400 font-black mt-0.5">{formatDate(row.date)}</p>
                                    </div>
                                </div>
                            </button>

                            {/* ── Expanded Edit Form ── */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
                                    {/* Title */}
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Title</label>
                                        <input type="text" value={row.title}
                                            onChange={e => handleChange(row.id, 'title', e.target.value)}
                                            className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Amount */}
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Amount</label>
                                            <input type="text" value={formatNumberInput(row.amount)}
                                                onChange={e => handleChange(row.id, 'amount', e.target.value.replace(/\D/g, ''))}
                                                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-black text-rose-500 focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
                                        </div>

                                        {/* Date */}
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date</label>
                                            <input type="date" value={row.date}
                                                onChange={e => handleChange(row.id, 'date', e.target.value)}
                                                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
                                        </div>
                                    </div>

                                    {/* Payment */}
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Payment</label>
                                        <select value={row.master_payment_id}
                                            onChange={e => handleChange(row.id, 'master_payment_id', e.target.value)}
                                            className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-transparent appearance-none">
                                            <option value="">- Select -</option>
                                            {masterPayments.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Tags */}
                                    {masterTags.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tags</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {masterTags.map(tag => (
                                                    <button key={tag.id}
                                                        onClick={() => handleTagToggle(row.id, tag.id)}
                                                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all ${row.tags.includes(tag.id) ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                                        {tag.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Note */}
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Note</label>
                                        <input type="text" value={row.note}
                                            onChange={e => handleChange(row.id, 'note', e.target.value)}
                                            placeholder="Optional..."
                                            className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-500 focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => setExpandedId(null)}
                                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 active:bg-slate-100 transition-all">
                                            Done
                                        </button>
                                        <button onClick={() => handleRemoveRow(row.id)}
                                            className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── BOTTOM ACTION BAR ── */}
            <div className="fixed bottom-20 left-0 right-0 px-4 z-30 pointer-events-none">
                <div className="max-w-md mx-auto flex gap-2 pointer-events-auto">
                    <button onClick={handleAddRow}
                        className="flex-1 bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all">
                        + Add Line
                    </button>
                    <button onClick={handleSaveAll} disabled={submitting}
                        className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">
                        {submitting ? 'Saving...' : 'Save All'}
                    </button>
                </div>
            </div>
        </div>
    );
}