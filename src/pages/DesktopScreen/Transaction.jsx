import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

// Outcome dianggap ikut ke total kecuali kategorinya eksplisit is_counted === false
const isOutcomeCounted = (item) => item?.category?.is_counted !== false;

export default function Transaction() {
    const { toast, showToast, hideToast } = useToast();
    const { periodId } = useParams();
    const navigate = useNavigate();
    
    // --- STATES ---
    const [incomes, setIncomes] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filter States
    const [showFilters, setShowFilters] = useState(false);
    const [filterTxType, setFilterTxType] = useState('all'); // 'all', 'income', 'outcome'
    const [filterPayments, setFilterPayments] = useState([]);
    const [filterCategories, setFilterCategories] = useState([]);
    const [filterIncomeTypes, setFilterIncomeTypes] = useState([]);
    const [filterOutcomeTypes, setFilterOutcomeTypes] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterAmountMin, setFilterAmountMin] = useState('');
    const [filterAmountMax, setFilterAmountMax] = useState('');

    // Modal States
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
    const [masterPays, setMasterPays] = useState([]);
    const [masterTypes, setMasterTypes] = useState([]);

    // --- FORMATTERS ---
    const formatIDR = (amount) => {
        const absAmount = Math.abs(amount);
        const formatted = new Intl.NumberFormat('id-ID', { 
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0 
        }).format(absAmount);
        return amount < 0 ? `-${formatted}` : formatted;
    };

    const formatDateFull = (dateString) => {
        if (!dateString) return "-";
        
        // Pecah string (asumsi format dd-mm-yyyy atau dd/mm/yyyy)
        const parts = dateString.split(/[-/]/);
        
        let date;
        if (parts.length === 3 && parts[2].length === 4) {
            // Susun ulang jadi yyyy-mm-dd agar aman dibaca constructor Date
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
            // Fallback jika format sudah standar ISO
            date = new Date(dateString);
        }

        // Cek apakah hasil parsing valid
        if (isNaN(date.getTime())) return dateString;

        return new Intl.DateTimeFormat('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }).format(date);
    };

    const formatNumberInput = (val) => {
        if (!val) return '';
        const num = val.toString().replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(num);
    };

    // --- CALCULATIONS ---
    const totalInc = useMemo(() => incomes.reduce((s, i) => s + (Number(i?.amount) || 0), 0), [incomes]);

    // Outcome yang category-nya is_counted === false TIDAK masuk total
    const totalOut = useMemo(
        () => outcomes.reduce((s, i) => s + (isOutcomeCounted(i) ? (Number(i?.amount) || 0) : 0), 0),
        [outcomes]
    );

    const balance = useMemo(() => totalInc - totalOut, [totalInc, totalOut]);
    const isSurplus = balance >= 0;

    const dateLimits = useMemo(() => {
        if (!activePeriod) return { min: '', max: '' };
        return {
            min: activePeriod.start_date?.split('T')[0] || '',
            max: activePeriod.end_date?.split('T')[0] || ''
        };
    }, [activePeriod]);

    // --- INITIAL FETCH ---
    const fetchData = useCallback(async () => {
        if (!periodId) return;
        setLoading(true);
        try {
            const [resInc, resOut, resMI, resMC, resMP, resMT, resP] = await Promise.all([
                axios.get('/incomes', { params: { master_period_id: periodId } }),
                axios.get('/outcomes', { params: { master_period_id: periodId } }),
                axios.get('/master-income-types'),
                axios.get('/master-outcome-categories'),
                axios.get('/master-payments'), 
                axios.get('/master-outcome-types'),
                axios.get(`/master-periods/${periodId}`)
            ]);
            
            setIncomes(resInc.data?.data || resInc.data || []);
            setOutcomes(resOut.data?.data || resOut.data || []);
            setMasterIncs(resMI.data?.data || resMI.data || []);
            setMasterCats(resMC.data?.data || resMC.data || []);
            setMasterPays(resMP.data?.data || resMP.data || []);
            setMasterTypes(resMT.data?.data || resMT.data || []);
            setActivePeriod(resP.data?.data || resP.data || null);
        } catch (err) { 
            showToast("Failed to load transaction data.", "error");
        } 
        finally { setLoading(false); }
    }, [periodId, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- FORM HANDLERS ---
    const handleOpenModal = (type, data = null) => {
        setModalType(type);
        setIsEdit(!!data);
        setCurrentId(data?.id || null);
        
        setFormData(data ? {
            ...formData,
            master_income_type_id: data.type?.id || data.master_income_type_id || '',
            master_outcome_category_id: data.category?.id || data.master_outcome_category_id || '',
            master_payment_id: data.payment?.id || data.master_payment_id || '',
            master_outcome_type_id: data.type?.id || data.master_outcome_type_id || '',
            title: data.title || '',
            amount: String(data.amount || data.amount || ''),
            date: data.date ? data.date.split('-').reverse().join('-') : "",
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

        if (!formData.has_detail) {
            payload.amount = rawAmount;
            payload.master_payment_id = Number(formData.master_payment_id);
        }

        if (modalType === 'income') {
            payload.master_income_type_id = Number(formData.master_income_type_id);
            payload.master_payment_id = Number(formData.master_payment_id);
        } else {
            payload.master_outcome_category_id = Number(formData.master_outcome_category_id);
            if (!isEdit) payload.has_detail = formData.has_detail;
            if (formData.master_outcome_type_id) {
                payload.master_outcome_type_id = Number(formData.master_outcome_type_id);
            }
        }

        const path = modalType === 'income' ? '/incomes' : '/outcomes';
        try {
            const res = isEdit ? await axios.put(`${path}/${currentId}`, payload) : await axios.post(path, payload);
            const responseData = res.data?.data || res.data;

            if (isEdit) {
                if (modalType === 'income') {
                    setIncomes(prev => prev.map(item => item.id === currentId ? responseData : item));
                } else {
                    setOutcomes(prev => prev.map(item => item.id === currentId ? responseData : item));
                }
            } else {
                if (modalType === 'income') {
                    setIncomes(prev => [responseData, ...prev]);
                } else {
                    setOutcomes(prev => [responseData, ...prev]);
                }
            }
            showToast(`${modalType.toUpperCase()} saved successfully!`, "success");
            setShowModal(false);
        } catch (err) { 
            const errorData = err.response?.data;
            showToast(errorData?.message || "Error saving data.", "error", errorData?.errors);
        } finally { 
            setSubmitting(false); 
        }
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await axios.delete(`/${deleteTarget.type}s/${deleteTarget.id}`);
            if (deleteTarget.type === 'income') {
                setIncomes(prev => prev.filter(item => item.id !== deleteTarget.id));
            } else {
                setOutcomes(prev => prev.filter(item => item.id !== deleteTarget.id));
            }
            showToast(`${deleteTarget.type.toUpperCase()} deleted successfully!`, "success");
            setShowDeleteModal(false);
        } catch (err) { 
            showToast("Delete Failed!", "error");
        } 
        finally { setSubmitting(false); setDeleteTarget(null); }
    };

    const SelectGroup = ({ label, value, options = [], onChange, required = false, placeholder = "Select...", isAmber = false, className = "" }) => (
        <div className={`space-y-1 ${className}`}>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
            <div className="relative">
                <select required={required} value={value || ''} onChange={(e) => onChange(e.target.value)} className={`w-full p-4 bg-slate-100 rounded-2xl border-none focus:ring-2 ${isAmber ? 'focus:ring-amber-500' : 'focus:ring-slate-900'} font-bold text-slate-700 text-sm appearance-none cursor-pointer transition-all`}>
                    <option value="">{placeholder}</option>
                    {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
            </div>
        </div>
    );

    const [incSort, setIncSort] = useState({ key: 'date', direction: 'desc' });
    const [outSort, setOutSort] = useState({ key: 'date', direction: 'desc' });
    const sortedData = (data, config) => { // Tambah parameter config
        const sortableData = [...data];
        if (config.key !== null) {
            sortableData.sort((a, b) => {
                const getValue = (obj, path) => {
                    if (!path) return '';
                    return path.split('.').reduce((acc, part) => {
                        if (acc && typeof acc === 'object' && acc[part] !== undefined && acc[part] !== null) {
                            return acc[part];
                        }
                        return '';
                    }, obj);
                };

                let aValue = getValue(a, config.key);
                let bValue = getValue(b, config.key);

                if (config.key === 'date') {
                    const [ad, am, ay] = String(aValue).split('-');
                    const [bd, bm, by] = String(bValue).split('-');
                    aValue = new Date(`${ay}-${am}-${ad}`).getTime() || 0;
                    bValue = new Date(`${by}-${bm}-${bd}`).getTime() || 0;
                } 
                else if (config.key.includes('amount')) {
                    aValue = Number(aValue) || 0;
                    bValue = Number(bValue) || 0;
                } 
                else {
                    aValue = String(aValue).toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }

                if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    };

    const toISODateString = (dateStr) => {
        if (!dateStr) return '';
        const parts = String(dateStr).split(/[-/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
            if (parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        return String(dateStr);
    };

    const hasActiveFilters = 
        filterTxType !== 'all' ||
        filterPayments.length > 0 ||
        filterCategories.length > 0 ||
        filterIncomeTypes.length > 0 ||
        filterOutcomeTypes.length > 0 ||
        filterDateFrom ||
        filterDateTo ||
        filterAmountMin ||
        filterAmountMax;

    const handleFilterPayment = (paymentId) => {
        const pid = String(paymentId);
        setFilterPayments(prev =>
            prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
        );
    };

    const handleFilterCategory = (catId) => {
        const cid = String(catId);
        setFilterCategories(prev =>
            prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]
        );
    };

    const handleFilterIncomeType = (typeId) => {
        const tid = String(typeId);
        setFilterIncomeTypes(prev =>
            prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]
        );
    };

    const handleFilterOutcomeType = (typeId) => {
        const tid = String(typeId);
        setFilterOutcomeTypes(prev =>
            prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]
        );
    };

    const clearAllFilters = () => {
        setFilterTxType('all');
        setFilterPayments([]);
        setFilterCategories([]);
        setFilterIncomeTypes([]);
        setFilterOutcomeTypes([]);
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterAmountMin('');
        setFilterAmountMax('');
    };

    // Filtered Incomes
    const filteredIncomes = useMemo(() => {
        if (filterTxType === 'outcome') return [];
        return incomes.filter(row => {
            if (filterCategories.length > 0) return false;
            if (filterOutcomeTypes.length > 0) return false;

            if (filterDateFrom || filterDateTo) {
                const rowDate = toISODateString(row.date);
                if (filterDateFrom && rowDate < filterDateFrom) return false;
                if (filterDateTo && rowDate > filterDateTo) return false;
            }

            if (filterAmountMin || filterAmountMax) {
                const amount = Number(row.amount) || 0;
                if (filterAmountMin && amount < Number(filterAmountMin)) return false;
                if (filterAmountMax && amount > Number(filterAmountMax)) return false;
            }

            if (filterPayments.length > 0) {
                const payId = String(row.payment?.id || row.master_payment_id || '');
                if (!filterPayments.includes(payId)) return false;
            }

            if (filterIncomeTypes.length > 0) {
                const typeId = String(row.type?.id || row.master_income_type_id || '');
                if (!filterIncomeTypes.includes(typeId)) return false;
            }

            return true;
        });
    }, [incomes, filterTxType, filterCategories, filterOutcomeTypes, filterIncomeTypes, filterPayments, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

    // Filtered Outcomes
    const filteredOutcomes = useMemo(() => {
        if (filterTxType === 'income') return [];
        return outcomes.filter(row => {
            if (filterIncomeTypes.length > 0) return false;

            if (filterDateFrom || filterDateTo) {
                const rowDate = toISODateString(row.date);
                if (filterDateFrom && rowDate < filterDateFrom) return false;
                if (filterDateTo && rowDate > filterDateTo) return false;
            }

            if (filterAmountMin || filterAmountMax) {
                const amount = Number(row.amount) || 0;
                if (filterAmountMin && amount < Number(filterAmountMin)) return false;
                if (filterAmountMax && amount > Number(filterAmountMax)) return false;
            }

            if (filterPayments.length > 0) {
                const payId = String(row.payment?.id || row.master_payment_id || '');
                if (!filterPayments.includes(payId)) return false;
            }

            if (filterCategories.length > 0) {
                const catId = String(row.category?.id || row.master_outcome_category_id || '');
                if (!filterCategories.includes(catId)) return false;
            }

            if (filterOutcomeTypes.length > 0) {
                const typeId = String(row.type?.id || row.master_outcome_type_id || '');
                if (!filterOutcomeTypes.includes(typeId)) return false;
            }

            return true;
        });
    }, [outcomes, filterTxType, filterCategories, filterOutcomeTypes, filterIncomeTypes, filterPayments, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

    const sortedIncomes = useMemo(() => sortedData(filteredIncomes, incSort), [filteredIncomes, incSort]);
    const sortedOutcomes = useMemo(() => sortedData(filteredOutcomes, outSort), [filteredOutcomes, outSort]);

    const filteredTotalInc = useMemo(() => filteredIncomes.reduce((s, i) => s + (Number(i?.amount) || 0), 0), [filteredIncomes]);
    const filteredTotalOut = useMemo(
        () => filteredOutcomes.reduce((s, i) => s + (isOutcomeCounted(i) ? (Number(i?.amount) || 0) : 0), 0),
        [filteredOutcomes]
    );
    const filteredBalance = useMemo(() => filteredTotalInc - filteredTotalOut, [filteredTotalInc, filteredTotalOut]);

    const requestSortInc = (key) => {
        setIncSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const requestSortOut = (key) => {
        setOutSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]"><div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>Loading...</div>;

    return (
        <div className="p-8 space-y-10 min-h-screen bg-slate-50 text-slate-800">
            <Toast data={toast} onClose={hideToast} />
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900">{activePeriod?.name}</h2>
                    <p className="text-emerald-500 font-bold uppercase text-[12px] tracking-widest mb-6">({formatDateFull(dateLimits.min)} - {formatDateFull(dateLimits.max)})</p>
                    
                    <div className={`inline-flex flex-col p-5 rounded-[2rem] border shadow-sm ${
                        (hasActiveFilters ? filteredBalance : balance) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                    }`}>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                            {hasActiveFilters ? 'Filtered Balance' : 'Period Balance'}
                        </span>
                        <h4 className={`text-3xl font-black tracking-tighter ${
                            (hasActiveFilters ? filteredBalance : balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                            {formatIDR(hasActiveFilters ? filteredBalance : balance)}
                        </h4>
                    </div>
                </div>
                <button onClick={() => navigate('/transactions')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-100 shadow-sm transition-all active:scale-95">← Back to List</button>
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
                        <span className="text-[10px] font-bold text-slate-400">
                            Showing {filteredIncomes.length + filteredOutcomes.length} of {incomes.length + outcomes.length} transactions
                        </span>
                    )}
                </button>

                {/* Filter Content */}
                {showFilters && (
                    <div className="px-5 pb-5 space-y-5 border-t border-slate-100">
                        {/* Transaction Type */}
                        <div className="space-y-2 pt-5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Type</span>
                            <div className="flex items-center gap-1.5">
                                {[
                                    { id: 'all', label: 'All Transactions' },
                                    { id: 'income', label: 'Incomes Only' },
                                    { id: 'outcome', label: 'Outcomes Only' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setFilterTxType(t.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                            filterTxType === t.id
                                                ? 'bg-slate-900 text-white shadow-lg scale-105'
                                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range & Amount Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Date Range */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Range</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        min={dateLimits.min}
                                        max={dateLimits.max}
                                        value={filterDateFrom}
                                        onChange={(e) => setFilterDateFrom(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        placeholder="From"
                                    />
                                    <span className="text-[10px] font-black text-slate-300">→</span>
                                    <input
                                        type="date"
                                        min={dateLimits.min}
                                        max={dateLimits.max}
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

                        {/* Payment Filter */}
                        {masterPays.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {masterPays.map(p => (
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
                        )}

                        {/* Category Filter (Outcomes) */}
                        {filterTxType !== 'income' && masterCats.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category (Outcome)</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {masterCats.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleFilterCategory(c.id)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                filterCategories.includes(String(c.id))
                                                    ? 'bg-amber-600 text-white shadow-lg scale-105'
                                                    : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Types: Income Type & Outcome Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Income Type */}
                            {filterTxType !== 'outcome' && masterIncs.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Income Type</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {masterIncs.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => handleFilterIncomeType(t.id)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    filterIncomeTypes.includes(String(t.id))
                                                        ? 'bg-emerald-600 text-white shadow-lg scale-105'
                                                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                                }`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Outcome Type */}
                            {filterTxType !== 'income' && masterTypes.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outcome Type</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {masterTypes.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => handleFilterOutcomeType(t.id)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    filterOutcomeTypes.includes(String(t.id))
                                                        ? 'bg-rose-600 text-white shadow-lg scale-105'
                                                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                                }`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

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

            <div className="grid grid-cols-1 gap-12">
                {/* --- INCOME SECTION --- */}
                {filterTxType !== 'outcome' && (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <div className="flex items-baseline gap-4">
                                <h3 className="font-black uppercase tracking-widest text-slate-400 text-sm">Incomes</h3>
                                <p className="text-emerald-500 font-black text-2xl tracking-tighter">
                                    {formatIDR(hasActiveFilters ? filteredTotalInc : totalInc)}
                                </p>
                                {hasActiveFilters && (
                                    <span className="text-[10px] font-bold text-slate-400">
                                        ({filteredIncomes.length} of {incomes.length})
                                    </span>
                                )}
                            </div>
                            <button onClick={() => handleOpenModal('income')} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 shadow-lg transition-all active:scale-95">+ Add Income</button>
                        </div>
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-left font-bold">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="py-3 px-8 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortInc('date')}>
                                            Date {incSort.key === 'date' && (incSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortInc('title')}>
                                            Info {incSort.key === 'title' && (incSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 text-center cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortInc('payment.name')}>
                                            Payment {incSort.key === 'payment.name' && (incSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 text-right cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortInc('amount')}>
                                            Total {incSort.key === 'amount' && (incSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {sortedIncomes.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                                No incomes found
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedIncomes.map(inc => (
                                            <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-8 text-[11px] text-slate-400">{formatDateFull(inc.date)}</td>
                                                <td className="py-3 px-8">
                                                    <p className="text-slate-700">{inc.title}</p>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">{inc.type?.name}</span>
                                                </td>
                                                <td className="py-3 px-8 text-center">
                                                    <span className="text-[10px] border border-slate-200 px-3 py-1 rounded-full uppercase text-slate-500">{inc.payment?.name || '-'}</span>
                                                </td>
                                                <td className="py-3 px-8 text-right text-emerald-600">{formatIDR(inc.amount)}</td>
                                                <td className="py-3 px-8 text-right space-x-3">
                                                    <button onClick={() => handleOpenModal('income', inc)} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase">Edit</button>
                                                    <button onClick={() => { setDeleteTarget({ type: 'income', id: inc.id }); setShowDeleteModal(true); }} className="text-rose-300 hover:text-rose-600 font-black text-[10px] uppercase">Del</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* --- OUTCOME SECTION --- */}
                {filterTxType !== 'income' && (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <div className="flex items-baseline gap-4">
                                <h3 className="font-black uppercase tracking-widest text-slate-400 text-sm">Outcomes</h3>
                                <p className="text-rose-500 font-black text-2xl tracking-tighter">
                                    {formatIDR(hasActiveFilters ? filteredTotalOut : totalOut)}
                                </p>
                                {hasActiveFilters && (
                                    <span className="text-[10px] font-bold text-slate-400">
                                        ({filteredOutcomes.length} of {outcomes.length})
                                    </span>
                                )}
                            </div>
                            <button onClick={() => handleOpenModal('outcome')} className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase hover:bg-rose-600 shadow-lg transition-all active:scale-95">+ Add Outcome</button>
                        </div>
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-left font-bold">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="py-3 px-8 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortOut('date')}>
                                            Date {outSort.key === 'date' && (outSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortOut('title')}>
                                            Info {outSort.key === 'title' && (outSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortOut('category.name')}>
                                            Category {outSort.key === 'category.name' && (outSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 text-center cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortOut('payment.name')}>
                                            Payment {outSort.key === 'payment.name' && (outSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 text-right cursor-pointer hover:text-slate-900 transition-colors" onClick={() => requestSortOut('amount')}>
                                            Total {outSort.key === 'amount' && (outSort.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="py-3 px-8 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {sortedOutcomes.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                                No outcomes found
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedOutcomes.map(out => {
                                            const counted = isOutcomeCounted(out);
                                            return (
                                            <tr key={out.id} className={`hover:bg-slate-50/50 transition-colors ${!counted ? 'opacity-60' : ''}`}>
                                                <td className="py-3 px-8 text-[11px] text-slate-400">{formatDateFull(out.date)}</td>
                                                <td className="py-3 px-8">
                                                    <p className="text-slate-700">{out.title}</p>
                                                    {out.type?.name && (
                                                        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                                                            {out.type.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-8">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">{out.category?.name}</span>
                                                        {!counted && (
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded" title="Kategori ini tidak dihitung ke total outcome">
                                                                Not Counted
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-8 text-center">
                                                    <span className="text-[10px] border border-slate-200 px-3 py-1 rounded-full uppercase text-slate-500">{out.payment?.name || '-'}</span>
                                                </td>
                                                <td className="py-3 px-8 text-right text-rose-600">{formatIDR(out.amount)}</td>
                                                <td className="py-3 px-8 text-right">
                                                    <div className="flex justify-end gap-3 items-center">
                                                        {out.has_detail && <button 
                                                        onClick={() => navigate(`/outcome-detail/${out.id}`, { 
                                                            state: { outcomeTitle: out.title }
                                                        })}
                                                        className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg">DETAIL</button>}
                                                        <button onClick={() => handleOpenModal('outcome', out)} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase">Edit</button>
                                                        <button onClick={() => { setDeleteTarget({ type: 'outcome', id: out.id }); setShowDeleteModal(true); }} className="text-rose-300 hover:text-rose-600 font-black text-[10px] uppercase">Del</button>
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>

            {/* --- MODALS (Form & Delete) --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">{isEdit ? 'Update' : 'Add'} {modalType}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500 font-black text-2xl transition-colors">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Title</label>
                                <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {!formData.has_detail && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">Rp</span>
                                            <input required type="text" value={formatNumberInput(formData.amount)} onChange={(e) => setFormData({...formData, amount: e.target.value.replace(/\D/g, '')})} className="w-full p-4 pl-10 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" />
                                        </div>
                                    </div>
                                )}
                                <div className={`space-y-1 transition-all duration-300 ${formData.has_detail ? 'col-span-2' : ''}`}>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date</label>
                                    <input required type="date" min={dateLimits.min} max={dateLimits.max} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {modalType === 'income' ? (
                                    <>
                                        <SelectGroup label="Income Type" value={formData.master_income_type_id} options={masterIncs} onChange={(v) => setFormData({...formData, master_income_type_id: v})} required />
                                        <SelectGroup label="Payment Method" value={formData.master_payment_id} options={masterPays} onChange={(v) => setFormData({...formData, master_payment_id: v})} required />
                                    </>
                                ) : (
                                    <>
                                        <SelectGroup label="Category" value={formData.master_outcome_category_id} options={masterCats} onChange={(v) => setFormData({...formData, master_outcome_category_id: v})} required className={formData.has_detail ? "col-span-2" : ""} />
                                        {!formData.has_detail && (
                                            <SelectGroup label="Payment Method" value={formData.master_payment_id} options={masterPays} onChange={(v) => setFormData({...formData, master_payment_id: v})} required />
                                        )}
                                    </>
                                )}
                            </div>
                            {modalType === 'outcome' && (
                                <>
                                    <SelectGroup label="Outcome Type (Optional)" value={formData.master_outcome_type_id} options={masterTypes} onChange={(v) => setFormData({...formData, master_outcome_type_id: v})} placeholder="-" isAmber />
                                    {(() => {
                                        const selectedCat = masterCats.find(c => String(c.id) === String(formData.master_outcome_category_id));
                                        if (!selectedCat || selectedCat.is_counted !== false) return null;
                                        return (
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                    ⓘ Kategori ini tidak dihitung ke total outcome periode.
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                                        <div><p className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Transaction Detail</p><p className="text-[9px] text-slate-400 font-bold uppercase">Enable if this outcome has itemized list</p></div>
                                        <label className={`relative inline-flex items-center ${isEdit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                            <input type="checkbox" className="sr-only peer" checked={formData.has_detail} disabled={isEdit} onChange={(e) => setFormData({...formData, has_detail: e.target.checked})} />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                        </label>
                                    </div>
                                </>
                            )}
                            <button type="submit" disabled={submitting} className="w-full py-5 mt-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50">{submitting ? 'Saving...' : 'Save Changes'}</button>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Are you sure?</h3>
                            <p className="text-sm text-slate-400 font-bold leading-relaxed">This action cannot be undone.</p>
                        </div>
                        <div className="flex border-t border-slate-100">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-6 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={executeDelete} disabled={submitting} className="flex-1 py-6 font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 transition-colors border-l border-slate-100">{submitting ? 'Deleting...' : 'Yes, Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}