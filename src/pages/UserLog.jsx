import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

export default function UserLog() {
    const { toast, showToast, hideToast } = useToast();
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`/activity-logs?page=${page}`);
            // DEBUG: Cek di console (F12) strukturnya bener gak
            console.log("Full Response:", res.data);
            const { data, ...meta } = res.data.data;
            setLogs(data);
            setPagination(meta);
        } catch (err) {
            console.error(err);
            showToast("Failed to load activity logs", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchLogs(currentPage);
    }, [currentPage, fetchLogs]);

    const formatDate = (isoString) => {
        if (!isoString) return "-";
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(isoString));
    };

    const formatTime = (isoString) => {
        if (!isoString) return "-";
        return new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(isoString));
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return "-";
    
        const formatted = new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(isoString));

        // Menghilangkan koma bawaan Intl.DateTimeFormat
        return formatted.replace(',', '');
    };

    const formatIDR = (val) => {
        if (!val) return "-";
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(val);
    };

    if (loading && logs.length === 0) {
        return <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest text-[10px]">Loading Logs...</div>;
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
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-6 px-8">
                                    <p className="text-xs font-bold text-slate-700">{formatDate(log.created_at)}<br></br>{formatTime(log.created_at)}</p>
                                </td>
                                <td className="p-6 px-8">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        log.description === 'created' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                        log.description === 'updated' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                        'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                        {log.properties.action || log.description}
                                    </span>
                                </td>
                                <td className="p-6 px-8 max-w-md">
                                    
                                    {/* 2. Jika action-nya UPDATED (Bandingin before vs after) */}
                                    {log.description === 'updated' && log.properties?.before && log.properties?.after && (
                                        <div className="mt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 font-mono text-[10px] max-w-xs">
                                            {(() => {
                                                // 1. Definisikan urutan prioritas key yang sama seperti created
                                                const priorityOrder = ['title', 'amount', 'note', 'date'];

                                                // 2. Ambil semua key perubahan dari objek 'after' lalu urutkan
                                                const sortedKeys = Object.keys(log.properties.after).sort((a, b) => {
                                                    const indexA = priorityOrder.indexOf(a);
                                                    const indexB = priorityOrder.indexOf(b);

                                                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                                    if (indexA !== -1) return -1;
                                                    if (indexB !== -1) return 1;
                                                    
                                                    return a.localeCompare(b);
                                                });

                                                // 3. Render list perubahan
                                                return sortedKeys.map((key) => {
                                                    if (['updated_at', 'created_at'].includes(key)) return null;

                                                    const valLama = log.properties.before[key];
                                                    const valBaru = log.properties.after[key];

                                                    // Hanya tampilkan field yang nilainya beneran berubah
                                                    if (valLama === valBaru) return null;

                                                    const formatValue = (value) => {
                                                        if (value === null || value === undefined || value === 'kosong' || value === '') return '-';
                                                        
                                                        if (key.includes('amount') || key.includes('balance')) {
                                                            const num = Number(value.toString().replace(/\D/g, ''));
                                                            return isNaN(num) ? value : new Intl.NumberFormat('id-ID', {
                                                                style: 'currency',
                                                                currency: 'IDR',
                                                                minimumFractionDigits: 0
                                                            }).format(num);
                                                        }

                                                        if (key.includes('date')) {
                                                            try {
                                                                const parsedDate = new Date(value);
                                                                if (isNaN(parsedDate.getTime())) return value;
                                                                return formatDateTime(value);
                                                            } catch (e) {
                                                                return value;
                                                            }
                                                        }

                                                        return String(value);
                                                    };

                                                    const cleanKey = key
                                                        .split('_')
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(' ');

                                                    const isPrimary = ['title', 'amount'].includes(key);

                                                    return (
                                                        <div key={key} className="leading-tight flex justify-between gap-4 text-slate-500 font-bold">
                                                            {/* Label Key di sebelah kiri */}
                                                            <span className="text-slate-400 min-w-[60px]">{cleanKey}</span>
                                                            
                                                            {/* Detail Perubahan rata kanan */}
                                                            <span className="text-right flex items-center gap-1 flex-wrap justify-end">
                                                                <span className="text-slate-400 line-through font-normal">
                                                                    {formatValue(valLama)}
                                                                </span>
                                                                <span className="text-slate-400 font-normal">→</span>
                                                                <span className={`font-black ${isPrimary ? 'text-slate-900' : 'text-slate-800'}`}>
                                                                    {formatValue(valBaru)}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}

                                    {/* 3. Jika action-nya CREATED (Tampilkan snapshot inputan awal) */}
                                    {log.description === 'created' && log.properties && (
                                        <div className="mt-2 flex flex-col space-y-1 font-mono text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-xs">
                                            {(() => {
                                                // 1. Definisikan urutan prioritas key yang lo mau
                                                const priorityOrder = ['title', 'amount', 'note', 'date'];

                                                // 2. Ambil semua key, lalu urutkan berdasarkan priorityOrder di atas
                                                const sortedKeys = Object.keys(log.properties).sort((a, b) => {
                                                    const indexA = priorityOrder.indexOf(a);
                                                    const indexB = priorityOrder.indexOf(b);

                                                    // Kalau ada di list prioritas, taruh di atas sesuai urutan indeksnya
                                                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                                    if (indexA !== -1) return -1;
                                                    if (indexB !== -1) return 1;
                                                    
                                                    // Sisanya (Parent, Period, Payment, dll) diurutkan alfabetis biasa di paling bawah
                                                    return a.localeCompare(b);
                                                });

                                                // 3. Loop key yang sudah rapi urutannya
                                                return sortedKeys.map((key) => {
                                                    if (['action', 'updated_at', 'created_at'].includes(key)) return null;

                                                    const rawValue = log.properties[key];

                                                    const formatValue = (val) => {
                                                        if (val === null || val === undefined || val === '') return '-';

                                                        if (key.includes('amount') || key.includes('balance')) {
                                                            const num = Number(val.toString().replace(/\D/g, ''));
                                                            return isNaN(num) ? val : new Intl.NumberFormat('id-ID', {
                                                                style: 'currency',
                                                                currency: 'IDR',
                                                                minimumFractionDigits: 0
                                                            }).format(num);
                                                        }

                                                        if (key.includes('date')) {
                                                            try {
                                                                const parsedDate = new Date(val);
                                                                if (isNaN(parsedDate.getTime())) return val;
                                                                return formatDateTime(val);
                                                            } catch (e) {
                                                                return val;
                                                            }
                                                        }

                                                        return String(val);
                                                    };

                                                    const cleanKey = key
                                                        .split('_')
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(' ');

                                                    // Style khusus pembeda: Kalau baris Title atau Amount, kita bikin teksnya lebih kontras/tebel
                                                    const isPrimary = ['title', 'amount'].includes(key);

                                                    return (
                                                        <p key={key} className="leading-tight flex justify-between gap-4">
                                                            <span className="font-bold text-slate-400 min-w-[60px]">{cleanKey}</span>
                                                            <span className={`text-right ${isPrimary ? 'text-slate-900 font-black' : 'text-slate-700 font-medium'}`}>
                                                                {formatValue(rawValue)}
                                                            </span>
                                                        </p>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                    
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                        {log.log_name} #{log.subject_id}
                                    </p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* PAGINATION FOOTER */}
                <div className="p-6 px-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {pagination.from} to {pagination.to} of {pagination.total} entries
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={!pagination.prev_page_url || loading}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-100 transition-all"
                        >
                            Prev
                        </button>
                        <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black">
                            {pagination.current_page}
                        </div>
                        <button 
                            disabled={!pagination.next_page_url || loading}
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