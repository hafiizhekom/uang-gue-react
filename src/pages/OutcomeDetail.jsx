import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

export default function OutcomeDetail() {
    const { outcomeId } = useParams();
    const navigate = useNavigate();
    
    const [originalDetails, setOriginalDetails] = useState([]); // Master data dari DB
    const [details, setDetails] = useState([]); // Data yang dimanipulasi user di UI
    const [masterPayments, setMasterPayments] = useState([]);
    const [masterTags, setMasterTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    }, [outcomeId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- UI HANDLERS ---
    const handleAddRow = () => {
        setDetails([...details, {
            id: `temp-${Date.now()}`,
            title: '',
            amount: 0,
            master_payment_id: '',
            note: '',
            date: new Date().toISOString().split('T')[0],
            tags: [],
            isNew: true
        }]);
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
        setSubmitting(true);
        
        // 1. Identifikasi baris baru (POST)
        const toCreate = details.filter(d => d.isNew && d.title);
        
        // 2. Identifikasi baris lama yang berubah (PUT)
        const toUpdate = details.filter(d => {
            if (d.isNew) return false;
            const old = originalDetails.find(o => o.id === d.id);
            return JSON.stringify(old) !== JSON.stringify(d);
        });

        // 3. Identifikasi baris yang dihapus (DELETE)
        const toDelete = originalDetails.filter(o => !details.find(d => d.id === o.id));

        try {
            const promises = [];

            // Execute Deletes
            toDelete.forEach(item => promises.push(axios.delete(`/outcome-details/${item.id}`)));

            // Execute Updates
            toUpdate.forEach(item => {
                promises.push(axios.put(`/outcome-details/${item.id}`, {
                    outcome_id: Number(outcomeId),
                    master_payment_id: Number(item.master_payment_id),
                    title: item.title,
                    amount: Number(item.amount),
                    date: item.date,
                    note: item.note,
                    tags: item.tags
                }));
            });

            // Execute Creates
            toCreate.forEach(item => {
                promises.push(axios.post('/outcome-details', {
                    outcome_id: Number(outcomeId),
                    master_payment_id: Number(item.master_payment_id),
                    title: item.title,
                    amount: Number(item.amount),
                    date: item.date,
                    note: item.note,
                    tags: item.tags
                }));
            });

            await Promise.all(promises);
            alert("All changes saved successfully!");
            fetchData(); // Sync ulang
        } catch (err) {
            console.error(err);
            alert("Some changes failed to save.");
        } finally {
            setSubmitting(false);
        }
    };

    const totalAmount = useMemo(() => details.reduce((acc, curr) => acc + Number(curr.amount || 0), 0), [details]);

    if (loading) return <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest text-[10px]">Syncing...</div>;

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-50 text-slate-800">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">OUTCOME BATCH EDIT</h2>
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

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="p-4 border-r border-slate-100">Date</th>
                                <th className="p-4 border-r border-slate-100 w-1/4">Title</th>
                                <th className="p-4 border-r border-slate-100 text-right">Amount</th>
                                <th className="p-4 border-r border-slate-100">Payment</th>
                                <th className="p-4 border-r border-slate-100">Tags</th>
                                <th className="p-4 border-r border-slate-100">Note</th>
                                <th className="p-4 text-center">Del</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {details.map((row) => (
                                <tr key={row.id} className={`${row.isNew ? 'bg-amber-50/20' : ''} hover:bg-slate-50/50 transition-colors`}>
                                    <td className="p-0 border-r border-slate-100">
                                        <input type="date" value={row.date} onChange={(e) => handleInputChange(row.id, 'date', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-3" />
                                    </td>
                                    <td className="p-0 border-r border-slate-100">
                                        <input type="text" value={row.title} onChange={(e) => handleInputChange(row.id, 'title', e.target.value)} className="w-full bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-slate-900 text-sm font-bold text-slate-700 p-3" />
                                    </td>
                                    <td className="p-0 border-r border-slate-100">
                                        <input type="number" value={row.amount} onChange={(e) => handleInputChange(row.id, 'amount', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm font-black text-rose-600 p-3 text-right" />
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
                    <div>Lines: <span className="text-slate-900 text-lg ml-1">{details.length}</span></div>
                    <div className="w-px h-6 bg-slate-100"></div>
                    <div>Changes: <span className="text-amber-500 text-lg ml-1">{details.filter(d => d.isNew).length + (originalDetails.length - details.filter(d => !d.isNew).length)}</span></div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Table Amount</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                        <span className="text-slate-300 text-2xl mr-1 font-normal">Rp</span>
                        {totalAmount.toLocaleString('id-ID')}
                    </p>
                </div>
            </footer>
        </div>
    );
}