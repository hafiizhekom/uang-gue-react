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

const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(d).replace(',', '');
};

const formatValue = (key, val) => {
    if (val === null || val === undefined || val === '') return '-';
    if (key.includes('date')) return formatDateTime(val);
    return formatCurrency(key, val);
};

const badgeClass = (desc) => {
    if (desc === 'created') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (desc === 'updated') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-rose-50 text-rose-600 border-rose-100';
};

export default function UserLog() {
    const { toast, showToast, hideToast } = useToast();
    const [logs, setLogs]               = useState([]);
    const [pagination, setPagination]   = useState({});
    const [loading, setLoading]         = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`/activity-logs?page=${page}`);
            setLogs(res.data.data);
            setPagination(res.data.meta);
        } catch (err) {
            console.error(err);
            showToast('Failed to load activity logs', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchLogs(currentPage);
    }, [currentPage, fetchLogs]);

    if (loading && logs.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest text-[10px]">
                Loading Logs...
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-50 text-slate-800">
            <Toast data={toast} onClose={hideToast} />

            <header>
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Activity Log</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Log for all activities</p>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="p-6 px-8">Timestamp</th>
                            <th className="p-6 px-8">Action</th>
                            <th className="p-6 px-8">Object</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {logs.map((log) => {
                            // created_at: "16-05-2026 16:45" → split jadi date & time
                            const [date, time] = (log.created_at ?? '').split(' ');
                            const props        = log.properties ?? {};

                            return (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    {/* Timestamp */}
                                    <td className="p-6 px-8">
                                        <p className="text-xs font-bold text-slate-700">
                                            {formatDate(date)}<br />{time || ''}
                                        </p>
                                    </td>

                                    {/* Action badge */}
                                    <td className="p-6 px-8">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${badgeClass(log.description)}`}>
                                            {props.action || log.description}
                                        </span>
                                    </td>

                                    {/* Object detail */}
                                    <td className="p-6 px-8 max-w-md">

                                        {/* UPDATED */}
                                        {log.description === 'updated' && props.before && props.after && (
                                            <div className="mt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 font-mono text-[10px] max-w-xs">
                                                {sortByPriority(Object.keys(props.after)).map((key) => {
                                                    if (IGNORED_KEYS.includes(key)) return null;

                                                    const valBefore = props.before[key];
                                                    const valAfter  = props.after[key];
                                                    if (valBefore === valAfter) return null;

                                                    const isPrimary = ['title', 'name', 'amount', 'balance'].includes(key);

                                                    return (
                                                        <div key={key} className="leading-tight flex justify-between gap-4 text-slate-500 font-bold">
                                                            <span className="text-slate-400 min-w-[60px]">{toLabel(key)}</span>
                                                            <span className="text-right flex items-center gap-1 flex-wrap justify-end">
                                                                <span className="text-slate-400 line-through font-normal">
                                                                    {formatValue(key, valBefore)}
                                                                </span>
                                                                <span className="text-slate-400 font-normal">→</span>
                                                                <span className={`font-black ${isPrimary ? 'text-slate-900' : 'text-slate-800'}`}>
                                                                    {formatValue(key, valAfter)}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* CREATED */}
                                        {log.description === 'created' && (
                                            <div className="mt-2 flex flex-col space-y-1 font-mono text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-xs">
                                                {sortByPriority(Object.keys(props)).map((key) => {
                                                    if (IGNORED_KEYS.includes(key)) return null;

                                                    const rawValue  = props[key];
                                                    const isPrimary = ['title', 'name', 'amount', 'balance'].includes(key);

                                                    return (
                                                        <p key={key} className="leading-tight flex justify-between gap-4">
                                                            <span className="font-bold text-slate-400 min-w-[60px]">{toLabel(key)}</span>
                                                            <span className={`text-right ${isPrimary ? 'text-slate-900 font-black' : 'text-slate-700 font-medium'}`}>
                                                                {formatValue(key, rawValue)}
                                                            </span>
                                                        </p>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                            {log.subject_type} #{log.subject_id}
                                        </p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="p-6 px-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {pagination.from} to {pagination.to} of {pagination.total} entries
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={pagination.current_page <= 1 || loading}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-100 transition-all"
                        >
                            Prev
                        </button>
                        <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black">
                            {pagination.current_page}
                        </div>
                        <button
                            disabled={pagination.current_page >= pagination.last_page || loading}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-100 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}