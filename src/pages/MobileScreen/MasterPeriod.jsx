import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function MasterPeriod() {
  const { toast, showToast, hideToast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' });
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/master-periods');
      setData(res.data.data);
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("Failed to fetch period data.", "error");
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
      if (modalType === 'add') {
        await axios.post('/master-periods', formData);
        showToast("Period created successfully!", "success");
      } else if (modalType === 'edit') {
        await axios.put(`/master-periods/${selectedItem.id}`, formData);
        showToast("Period updated successfully!", "success");
      } else if (modalType === 'delete') {
        await axios.delete(`/master-periods/${selectedItem.id}`);
        showToast("Period deleted successfully!", "success");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Submit error:", err);
      showToast(err.response?.data?.message || "An error occurred.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
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

      {/* ── TOP HEADER (WITH BACK BUTTON) ── */}
      <div className="bg-emerald-500 px-5 pt-10 pb-6 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          {/* Back Button to /master */}
          <button 
            onClick={() => navigate('/master')}
            className="w-10 h-10 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Master Data</p>
            <h1 className="text-xl font-black text-white tracking-tighter mt-0.5">Periods</h1>
            <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">Kelola batasan siklus periode keuangan</p>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="px-4 mt-5 space-y-3">
        <div className="flex justify-between items-center px-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Period List ({data.length})
          </p>
          <button 
            onClick={() => openModal('add')} 
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl transition-all"
          >
            + Add New
          </button>
        </div>

        {/* MOBILE LIST CARDS */}
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-3 active:scale-[0.99] transition-all">
              
              {/* Info Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-800 text-sm truncate leading-snug">{item.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">ID: {item.id}</p>
                  </div>
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Start Date</p>
                  <p className="text-[11px] font-black text-slate-700 mt-0.5">{formatDate(item.start_date)}</p>
                </div>
                <div className="border-l border-slate-200">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">End Date</p>
                  <p className="text-[11px] font-black text-slate-700 mt-0.5">{formatDate(item.end_date)}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-50" />

              {/* Actions Row */}
              <div className="flex items-center justify-end gap-4 pt-0.5">
                <button 
                  onClick={() => openModal('edit', item)} 
                  className="text-indigo-500 hover:text-indigo-700 font-black text-[10px] uppercase tracking-wide transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => openModal('delete', item)} 
                  className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-wide transition-colors"
                >
                  Delete
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL SYSTEM ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 mb-[safe-area-pb]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">
                {modalType === 'add' && 'New Period'}
                {modalType === 'edit' && 'Update Period'}
                {modalType === 'delete' && 'Delete Period?'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl px-2">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 mb-4">
              {modalType === 'delete' ? (
                <div className="py-4 text-center space-y-2">
                  <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto font-black text-lg">!</div>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed px-4">
                    Apakah Anda yakin ingin menghapus periode <span className="text-slate-900 font-black">"{selectedItem?.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Period Name</label>
                    <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Mei 2026" className="w-full p-3.5 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Start Date</label>
                      <input required type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full p-3.5 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">End Date</label>
                      <input required type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full p-3.5 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={processing} className={`w-full py-4 mt-2 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl disabled:opacity-50 ${modalType === 'delete' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-900 hover:bg-emerald-500'}`}>
                {processing ? 'Processing...' : modalType === 'delete' ? 'Confirm Delete' : 'Save Changes'}
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}