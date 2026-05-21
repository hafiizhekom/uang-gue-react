import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const PRIORITY_KEYS = ['title', 'name', 'amount', 'balance', 'note', 'date'];
const IGNORED_KEYS  = ['action', 'updated_at', 'created_at'];

const sortByPriority = (keys) =>
    [...keys].sort((a, b) => {
        const ia = PRIORITY_KEYS.indexOf(a);
        const ib = PRIORITY_KEYS.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
    });

const toLabel = (key) =>
    key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const formatCurrency = (key, value) => {
    if (key.includes('amount') || key.includes('balance')) {
        if (value === null || value === undefined || value === 'kosong' || value === '') return 'Rp 0';
        const num = Math.floor(parseFloat(value) || 0);
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    }
    return value === null || value === undefined || value === '' ? '-' : String(value);
};

const formatDate = (ddmmyyyy) => {
    if (!ddmmyyyy) return '-';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [d, m, y] = ddmmyyyy.split('-');
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

const formatValue = (key, val) => {
    if (val === null || val === undefined || val === '') return '-';
    if (key.includes('date')) return val;
    return formatCurrency(key, val);
};

const badgeStyle = (desc) => {
    if (desc === 'created') return 'bg-blue-50 text-blue-600';
    if (desc === 'updated') return 'bg-amber-50 text-amber-600';
    return 'bg-rose-50 text-rose-500';
};

export default function UserLog() {
    const { toast, showToast, hideToast } = useToast();
    const [logs, setLogs]               = useState([]);
    const [pagination, setPagination]   = useState({});
    const [loading, setLoading]         = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedId, setExpandedId]   = useState(null);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`/activity-logs?page=${page}`);
            setLogs(res.data.data);
            setPagination(res.data.meta);
        } catch {
            showToast('Failed to load activity logs', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchLogs(currentPage); }, [currentPage, fetchLogs]);

    if (loading && logs.length === 0) return (
        <div className="flex items-center justify-center min-h-screen text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Loading Logs...
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen pb-8">
            <Toast data={toast} onClose={hideToast} />

            {/* ── HEADER ── */}
            <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem]">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Riwayat</p>
                <h1 className="text-xl font-black text-white tracking-tighter mt-0.5">Activity Log</h1>
                {pagination.total && (
                    <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">
                        {pagination.total} total entries
                    </p>
                )}
            </div>

            {/* ── LOG CARDS ── */}
            <div className="px-4 mt-5 space-y-3">
                {logs.map(log => {
                    const [date, time] = (log.created_at ?? '').split(' ');
                    const props        = log.properties ?? {};
                    const isExpanded   = expandedId === log.id;

                    return (
                        <div key={log.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                            {/* Card Header */}
                            <button className="w-full p-4 text-left"
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        {/* Action badge */}
                                        <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5 ${badgeStyle(log.description)}`}>
                                            {props.action || log.description}
                                        </span>
                                        {/* Subject */}
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide truncate">
                                            {log.subject_type} <span className="text-slate-300">#{log.subject_id}</span>
                                        </p>
                                        {/* Preview: nama/title jika ada */}
                                        {(props.title || props.name) && (
                                            <p className="text-sm font-black text-slate-800 truncate mt-0.5">
                                                {props.title || props.name}
                                            </p>
                                        )}
                                        {/* Preview updated: field apa yang berubah */}
                                        {log.description === 'updated' && props.after && (
                                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                {Object.keys(props.after)
                                                    .filter(k => !IGNORED_KEYS.includes(k) && props.before?.[k] !== props.after[k])
                                                    .map(toLabel)
                                                    .join(', ')} changed
                                            </p>
                                        )}
                                    </div>
                                    {/* Timestamp */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-[9px] font-black text-slate-600">{formatDate(date)}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">{time || ''}</p>
                                        <p className="text-[9px] text-slate-300 mt-1">{isExpanded ? '▲' : '▼'}</p>
                                    </div>
                                </div>
                            </button>

                            {/* Expanded Detail */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3">

                                    {/* CREATED */}
                                    {log.description === 'created' && (
                                        <div className="space-y-1.5">
                                            {sortByPriority(Object.keys(props)).map(key => {
                                                if (IGNORED_KEYS.includes(key)) return null;
                                                const isPrimary = ['title', 'name', 'amount', 'balance'].includes(key);
                                                return (
                                                    <div key={key} className="flex justify-between items-center gap-4">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
                                                            {toLabel(key)}
                                                        </span>
                                                        <span className={`text-[10px] text-right ${isPrimary ? 'font-black text-slate-800' : 'font-bold text-slate-500'}`}>
                                                            {formatValue(key, props[key])}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* UPDATED */}
                                    {log.description === 'updated' && props.before && props.after && (
                                        <div className="space-y-2">
                                            {sortByPriority(Object.keys(props.after)).map(key => {
                                                if (IGNORED_KEYS.includes(key)) return null;
                                                if (props.before[key] === props.after[key]) return null;
                                                const isPrimary = ['title', 'name', 'amount', 'balance'].includes(key);
                                                return (
                                                    <div key={key}>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide mb-1">
                                                            {toLabel(key)}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 line-through font-normal">
                                                                {formatValue(key, props.before[key])}
                                                            </span>
                                                            <span className="text-slate-300 text-xs">→</span>
                                                            <span className={`text-[10px] ${isPrimary ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                                                                {formatValue(key, props.after[key])}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* DELETED */}
                                    {log.description === 'deleted' && (
                                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                                            Record dihapus
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── PAGINATION ── */}
            <div className="px-4 mt-5">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex justify-between items-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {pagination.from}–{pagination.to} / {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={pagination.current_page <= 1 || loading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase disabled:opacity-30 active:scale-95 transition-all">
                            ← Prev
                        </button>
                        <span className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black">
                            {pagination.current_page}
                        </span>
                        <button
                            disabled={pagination.current_page >= pagination.last_page || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase disabled:opacity-30 active:scale-95 transition-all">
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}