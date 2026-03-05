import { useEffect, useState } from 'react';
import axios from 'axios';

export default function MasterPeriod() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/master-periods');
      setData(res.data.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setFormData({ name: item?.name || '', start_date: item?.start_date || '', end_date: item?.end_date || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (modalType === 'add') { await axios.post('/master-periods', formData); }
      else if (modalType === 'edit') { await axios.put(`/master-periods/${selectedItem.id}`, formData); }
      else if (modalType === 'delete') { await axios.delete(`/master-periods/${selectedItem.id}`); }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Master Period</h2>
          <p className="text-slate-500 text-sm">Manage financial reporting timeframes</p>
        </div>
        <button 
          disabled={loading}
          onClick={() => openModal('add')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
        >
          {loading ? 'Synchronizing data...' : '+ New Period'}
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
            <tr>
              <th className="p-5 px-8">Period Name</th>
              <th className="p-5 px-8 text-center">Date Range</th>
              <th className="p-5 px-8 text-center text-emerald-600">Incomes</th>
              <th className="p-5 px-8 text-center text-rose-600">Outcomes</th>
              <th className="p-5 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="5" className="p-16 text-center text-slate-400 animate-pulse font-medium italic">Synchronizing data...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="5" className="p-16 text-center text-slate-400">No data available.</td></tr>
            ) : data.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-5 px-8 font-bold text-slate-700">{item.name}</td>
                <td className="p-5 px-8 text-center">
                   <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500">
                      {item.start_date} <span className="text-slate-300">→</span> {item.end_date}
                   </div>
                </td>
                <td className="p-5 px-8 text-center font-black text-emerald-500">{item.count_incomes}</td>
                <td className="p-5 px-8 text-center font-black text-rose-500">{item.count_outcomes}</td>
                <td className="p-5 px-8 text-right space-x-5">
                  <button onClick={() => openModal('edit', item)} className="text-indigo-500 hover:text-indigo-700 font-bold text-xs uppercase tracking-tighter transition-colors">Edit</button>
                  <button onClick={() => openModal('delete', item)} className="text-rose-500 hover:text-rose-700 font-bold text-xs uppercase tracking-tighter transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/30 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {modalType === 'add' ? 'CREATE PERIOD' : modalType === 'edit' ? 'UPDATE PERIOD' : 'CONFIRM DELETION'}
            </h3>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {modalType === 'delete' ? (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <p className="text-rose-700 text-sm font-medium text-center">Delete <span className="font-black underline">"{selectedItem?.name}"</span>?</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Period Name</label>
                    <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-semibold" placeholder="e.g. February 2026" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                      <input required type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                      <input required type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold" />
                    </div>
                  </div>
                </>
              )}
              <div className="flex flex-col gap-3 mt-10">
                <button type="submit" disabled={processing} className={`w-full py-4 rounded-2xl text-white font-black text-sm shadow-xl transition-transform active:scale-95 disabled:opacity-50 ${modalType === 'delete' ? 'bg-rose-500 shadow-rose-500/30' : 'bg-slate-900 shadow-slate-900/30'}`}>
                  {processing ? 'SYNCING...' : 'CONFIRM ACTION'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}