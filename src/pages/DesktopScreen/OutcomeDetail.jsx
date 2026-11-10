import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function OutcomeDetail() {
    const { outcomeId } = useParams();
    const location = useLocation();
    const { toast, showToast, hideToast } = useToast();

    const navigate = useNavigate();
    
    const [originalDetails, setOriginalDetails] = useState([]); // Master data dari DB
    const [details, setDetails] = useState([]); // Data yang dimanipulasi user di UI
    const [masterPayments, setMasterPayments] = useState([]);
    const [masterTags, setMasterTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
    const [filterTags, setFilterTags] = useState([]); // Tag IDs yang dipilih untuk filter
    const [filterPayments, setFilterPayments] = useState([]); // Payment IDs yang dipilih untuk filter
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterAmountMin, setFilterAmountMin] = useState('');
    const [filterAmountMax, setFilterAmountMax] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const outcomeTitle = location.state?.outcomeTitle || "";

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resDetail, resPay, resTag] = await Promise.all([
                axios.get('/outcome-details', { params: { outcome_id: Number(outcomeId) } }),
                axios.get('/master-payments'),
                axios.get('/master-outcome-detail-tags') 
            ]);

            const mapped = (resDetail.data?.data || []).map(item => ({
                id: item.id,
                title: item.title || '',
                amount: item.amount || 0,
                master_payment_id: item.payment?.id || '',
                note: item.note || '',
                date: item.date ? item.date.split('-').reverse().join('-') : new Date().toISOString().split('T')[0],
                tags: item.tags?.map(t => t.id) || [],
                isNew: false
            }));

            setDetails(mapped);
            setOriginalDetails(JSON.parse(JSON.stringify(mapped))); // Deep clone untuk komparasi
            setMasterPayments(resPay.data?.data || []);
            setMasterTags(resTag.data?.data || []);
        } catch (err) { 
            showToast("Failed to sync data with server", "error");
        } 
        finally { setLoading(false); }
    }, [outcomeId, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- UI HANDLERS ---
    const handleAddRow = () => {
        setSortConfig({ key: null, direction: 'asc' });
        
        setDetails([{
            id: `temp-${Date.now()}`,
            title: '',
            amount: 0,
            master_payment_id: '',
            note: '',
            date: new Date().toISOString().split('T')[0],
            tags: [],
            isNew: true
        },
        ...details]);
    };

    const handleInputChange = (id, field, value) => {
        setDetails(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleTagToggle = (rowId, tagId) => {
        setDetails(prev => prev.map(row => {
            if (row.id === rowId) {
                const newTags = row.tags.includes(tagId) ? row.tags.filter(id => id !== tagId) : [...row.tags, tagId];
                return { ...row, tags: newTags };
            }
            return row;
        }));
    };

    const handleRemoveRow = (id) => {
        setDetails(details.filter(d => d.id !== id));
    };

    // --- BATCH SAVE LOGIC ---
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
                type: 'DELETE',
                id: item.id,
                promise: axios.delete(`/outcome-details/${item.id}`).then(() => ({ id: item.id, type: 'DELETE' }))
            })),
            ...toUpdate.map(item => ({
                type: 'UPDATE',
                id: item.id,
                promise: axios.put(`/outcome-details/${item.id}`, {
                    outcome_id: Number(outcomeId),
                    master_payment_id: Number(item.master_payment_id),
                    title: item.title,
                    amount: Number(item.amount),
                    date: item.date,
                    note: item.note,
                    tags: item.tags
                }).then(() => ({ id: item.id, type: 'UPDATE', data: item }))
            })),
            ...toCreate.map(item => ({
                type: 'CREATE',
                id: item.id, // temp-id
                promise: axios.post('/outcome-details', {
                    outcome_id: Number(outcomeId),
                    master_payment_id: Number(item.master_payment_id),
                    title: item.title,
                    amount: Number(item.amount),
                    date: item.date,
                    note: item.note,
                    tags: item.tags
                }).then((res) => ({ 
                    id: item.id, 
                    type: 'CREATE', 
                    newId: res.data.data.id, // Ambil ID asli doang
                    data: item // Pake data yang diinput user tadi
                }))
            }))
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
            let errorMessages = [];

            results.forEach((result, index) => {
                
                const task = tasks[index];

                const currentItem = details.find(d => d.id === task.id) || originalDetails.find(o => o.id === task.id);
                const displayTitle = currentItem?.title || "Untitled Item";
                if (result.status === 'fulfilled') {
                    const info = result.value;
                    if (info.type === 'DELETE') {
                        newOriginals = newOriginals.filter(o => o.id !== info.id);
                    } 
                    else if (info.type === 'UPDATE') {
                        newOriginals = newOriginals.map(o => o.id === info.id ? JSON.parse(JSON.stringify(info.data)) : o);
                    } 
                    else if (info.type === 'CREATE') {
                        const savedItem = { ...info.data, id: info.newId, isNew: false };
                        newDetails = newDetails.map(d => d.id === info.id ? savedItem : d);
                        newOriginals.push(JSON.parse(JSON.stringify(savedItem)));
                    }
                } else {
                    const errorData = result.reason?.response?.data;
                    let specificError = "";

                    if (errorData?.errors) {
                        // Gabungin semua pesan error validasi (title, amount, payment, dll)
                        specificError = Object.values(errorData.errors).flat().join(', ');
                    } else {
                        specificError = errorData?.message || result.reason?.message || "Unknown Error";
                    }

                    const actionLabel = task.type.charAt(0) + task.type.slice(1).toLowerCase();
                    
                    // Format: (Action) - Title - Specific Error (e.g. The title field is required)
                    errorMessages.push(`(${actionLabel}) - ${displayTitle} - ${specificError}`);
                }
            });

            setDetails(newDetails);
            setOriginalDetails(newOriginals);

            if (errorMessages.length === 0) {
                showToast("All changes have been saved successfully.", "success");
            } else {
                showToast(
                    "Some changes failed to save.", 
                    "error", 
                    { batch_errors: errorMessages } // Custom format agar ditangkap Toast.jsx
                );
            }
        } catch (err) {
            console.error(err);
            showToast("Critical system error during batch save.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter semua kriteria, baru sort
    const hasActiveFilters = filterTags.length > 0 || filterPayments.length > 0 || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax;

    const filteredDetails = useMemo(() => {
        if (!hasActiveFilters) return details;
        return details.filter(row => {
            // Filter by Tags (OR — match salah satu aja cukup)
            if (filterTags.length > 0) {
                if (!filterTags.some(tagId => (row.tags || []).includes(tagId))) return false;
            }

            // Filter by Payment (OR — match salah satu)
            if (filterPayments.length > 0) {
                if (!filterPayments.includes(String(row.master_payment_id))) return false;
            }

            // Filter by Date Range
            if (filterDateFrom || filterDateTo) {
                const rowDate = row.date || '';
                if (filterDateFrom && rowDate < filterDateFrom) return false;
                if (filterDateTo && rowDate > filterDateTo) return false;
            }

            // Filter by Amount Range
            if (filterAmountMin || filterAmountMax) {
                const amount = Number(row.amount) || 0;
                if (filterAmountMin && amount < Number(filterAmountMin)) return false;
                if (filterAmountMax && amount > Number(filterAmountMax)) return false;
            }

            return true;
        });
    }, [details, filterTags, filterPayments, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, hasActiveFilters]);

    const sortedDetails = useMemo(() => {
        let sortableDetails = [...filteredDetails];
        if (sortConfig.key !== null) {
            sortableDetails.sort((a, b) => {
                let aValue, bValue;

                switch (sortConfig.key) {
                    case 'payment':
                        // Nyari nama payment berdasarkan ID yang ada di baris
                        aValue = masterPayments.find(p => String(p.id) === String(a.master_payment_id))?.name || '';
                        bValue = masterPayments.find(p => String(p.id) === String(b.master_payment_id))?.name || '';
                        break;
                    case 'amount':
                        // Pastiin beneran angka
                        aValue = Number(a.amount) || 0;
                        bValue = Number(b.amount) || 0;
                        break;
                    case 'tags':
                        // Sortir berdasarkan nama tag (alphabetical) biar tag yang sama saling berdekatan
                        aValue = (a.tags || [])
                            .map(tagId => masterTags.find(t => String(t.id) === String(tagId))?.name || '')
                            .sort()
                            .join(', ')
                            .toLowerCase();
                        bValue = (b.tags || [])
                            .map(tagId => masterTags.find(t => String(t.id) === String(tagId))?.name || '')
                            .sort()
                            .join(', ')
                            .toLowerCase();
                        break;
                    default:
                        // Untuk date, title, dan note
                        aValue = (a[sortConfig.key] || '').toString().toLowerCase();
                        bValue = (b[sortConfig.key] || '').toString().toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableDetails;
    }, [filteredDetails, sortConfig, masterPayments, masterTags]);

    const requestSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleFilterTag = (tagId) => {
        setFilterTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleFilterPayment = (paymentId) => {
        const pid = String(paymentId);
        setFilterPayments(prev =>
            prev.includes(pid)
                ? prev.filter(id => id !== pid)
                : [...prev, pid]
        );
    };

    const clearAllFilters = () => {
        setFilterTags([]);
        setFilterPayments([]);
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterAmountMin('');
        setFilterAmountMax('');
    };

    const formatNumberInput = (val) => {
        if (val === undefined || val === null || val === '') return '';
        // Hilangkan semua karakter non-digit
        const num = val.toString().replace(/\D/g, '');
        // Format ke IDR tanpa simbol Rp (karena nanti simbolnya di luar input biar rapi)
        return new Intl.NumberFormat('id-ID').format(num);
    };

    const totalAmount = useMemo(() => details.reduce((acc, curr) => acc + Number(curr.amount || 0), 0), [details]);
    const filteredTotalAmount = useMemo(() => sortedDetails.reduce((acc, curr) => acc + Number(curr.amount || 0), 0), [sortedDetails]);

    if (loading) return <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest text-[10px]">Syncing...</div>;

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-50 text-slate-800">
            <Toast data={toast} onClose={hideToast} />
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Outcome Detail {outcomeTitle}</h2>
                    <p className="text-rose-500 font-bold uppercase text-[10px] tracking-widest mt-2">REF: #{outcomeId}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-100 transition-all">Cancel</button>
                    <button onClick={handleAddRow} className="px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-100 transition-all">+ Add Line</button>
                    <button onClick={handleSaveAll} disabled={submitting} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50">
                        {submitting ? 'Saving All...' : 'Save All Changes'}
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {/* Toggle Header */}
                <button
                    onClick={() => setShowFilters(prev => !prev)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 9l-7 7-7-7" /></svg>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filters</span>
                        {hasActiveFilters && (
                            <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-lg">
                                ACTIVE
                            </span>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <span className="text-[10px] font-bold text-slate-300">
                            Showing {sortedDetails.length} of {details.length} items
                        </span>
                    )}
                </button>

                {/* Filter Content */}
                {showFilters && (
                    <div className="px-5 pb-5 space-y-5 border-t border-slate-100">

                        {/* Row 1: Date Range & Amount Range */}
                        <div className="grid grid-cols-2 gap-6 pt-5">
                            {/* Date Range */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Range</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={filterDateFrom}
                                        onChange={(e) => setFilterDateFrom(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        placeholder="From"
                                    />
                                    <span className="text-[10px] font-black text-slate-300">→</span>
                                    <input
                                        type="date"
                                        value={filterDateTo}
                                        onChange={(e) => setFilterDateTo(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        placeholder="To"
                                    />
                                </div>
                            </div>

                            {/* Amount Range */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Range</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-slate-900">
                                        <span className="text-[10px] text-slate-300 font-normal pl-3">Rp</span>
                                        <input
                                            type="text"
                                            value={filterAmountMin ? formatNumberInput(filterAmountMin) : ''}
                                            onChange={(e) => setFilterAmountMin(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 px-2 py-2"
                                            placeholder="Min"
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300">→</span>
                                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-slate-900">
                                        <span className="text-[10px] text-slate-300 font-normal pl-3">Rp</span>
                                        <input
                                            type="text"
                                            value={filterAmountMax ? formatNumberInput(filterAmountMax) : ''}
                                            onChange={(e) => setFilterAmountMax(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 px-2 py-2"
                                            placeholder="Max"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Payment Filter */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</span>
                            <div className="flex flex-wrap gap-1.5">
                                {masterPayments.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleFilterPayment(p.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                            filterPayments.includes(String(p.id))
                                                ? 'bg-slate-900 text-white shadow-lg scale-105'
                                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                        }`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 3: Tags Filter */}
                        {masterTags.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {masterTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleFilterTag(tag.id)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                filterTags.includes(tag.id)
                                                    ? 'bg-slate-900 text-white shadow-lg scale-105'
                                                    : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Clear All */}
                        {hasActiveFilters && (
                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                <button
                                    onClick={clearAllFilters}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                {/* Kolom Date */}
                                <th className="p-4 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('date')}>
                                    <div className="flex items-center justify-between">
                                        <span>Date</span>
                                        {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>

                                {/* Kolom Title */}
                                <th className="p-4 border-r border-slate-100 w-1/4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('title')}>
                                    <div className="flex items-center justify-between">
                                        <span>Title</span>
                                        {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>

                                {/* Kolom Amount */}
                                <th className="p-4 border-r border-slate-100 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('amount')}>
                                    <div className="flex items-center justify-between justify-end gap-2">
                                        <span>Amount</span>
                                        {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>

                                {/* Kolom Payment */}
                                <th className="p-4 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('payment')}>
                                    <div className="flex items-center justify-between">
                                        <span>Payment</span>
                                        {sortConfig.key === 'payment' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>

                                {/* Kolom Tags */}
                                <th className="p-4 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('tags')}>
                                    <div className="flex items-center justify-between">
                                        <span>Tags</span>
                                        {sortConfig.key === 'tags' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>

                                {/* Kolom Note */}
                                <th className="p-4 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('note')}>
                                    <div className="flex items-center justify-between">
                                        <span>Note</span>
                                        {sortConfig.key === 'note' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>

                                <th className="p-4 text-center">Del</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedDetails.map((row) => (
                                <tr key={row.id} className={`${row.isNew ? 'bg-amber-50/20' : ''} hover:bg-slate-50/50 transition-colors`}>
                                    <td className="p-0 border-r border-slate-100">
                                        <input type="date" value={row.date} onChange={(e) => handleInputChange(row.id, 'date', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-3" />
                                    </td>
                                    <td className="p-0 border-r border-slate-100">
                                        <input type="text" value={row.title} onChange={(e) => handleInputChange(row.id, 'title', e.target.value)} className="w-full bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-slate-900 text-sm font-bold text-slate-700 p-3" />
                                    </td>
                                    <td className="p-0 border-r border-slate-100">
                                        <input type="text" 
                                        value={row.amount} 
                                        onChange={(e) => handleInputChange(row.id, 'amount', e.target.value)}
                                        value={formatNumberInput(row.amount)} 
                                        onChange={(e) => {
                                            const rawValue = e.target.value.replace(/\D/g, '');
                                            
                                            handleInputChange(row.id, 'amount', rawValue);
                                        }} 
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-black text-rose-600 p-3 text-right" />
                                    </td>
                                    <td className="p-0 border-r border-slate-100">
                                        <select value={row.master_payment_id} onChange={(e) => handleInputChange(row.id, 'master_payment_id', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase text-slate-500 p-3">
                                            <option value="">- SELECT -</option>
                                            {masterPayments.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 border-r border-slate-100 min-w-[200px]">
                                        <div className="flex flex-wrap gap-1">
                                            {masterTags.map(tag => (
                                                <button key={tag.id} onClick={() => handleTagToggle(row.id, tag.id)}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${row.tags.includes(tag.id) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                                    {tag.name}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-0 border-r border-slate-100">
                                        <input type="text" value={row.note} onChange={(e) => handleInputChange(row.id, 'note', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[11px] text-slate-500 p-3" />
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-rose-300 hover:text-rose-600 transition-colors">
                                            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex gap-8 items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div>Lines: <span className="text-slate-900 text-lg ml-1">{hasActiveFilters ? `${sortedDetails.length} / ${details.length}` : details.length}</span></div>
                    <div className="w-px h-6 bg-slate-100"></div>
                    <div>Changes: <span className="text-amber-500 text-lg ml-1">{details.filter(d => d.isNew).length + (originalDetails.length - details.filter(d => !d.isNew).length)}</span></div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{hasActiveFilters ? 'Filtered Amount' : 'Total Table Amount'}</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                        <span className="text-slate-300 text-2xl mr-1 font-normal">Rp</span>
                        {hasActiveFilters ? filteredTotalAmount.toLocaleString('id-ID') : totalAmount.toLocaleString('id-ID')}
                    </p>
                </div>
            </footer>
        </div>
    );
}