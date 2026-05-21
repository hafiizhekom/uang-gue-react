import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function MasterBase({ title, endpoint, countKey, color }) {
  const { toast, showToast, hideToast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const navigate = useNavigate();

  // Mapping string warna untuk ikon avatar kecil di mobile card
  const badgeColorMap = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-500 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };
  const badgeClass = badgeColorMap[color] || "bg-slate-50 text-slate-600 border-slate-100";

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(endpoint);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      showToast(`Failed to load ${title} data.`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setFormData({
      name: item?.name || '',
      slug: item?.slug || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (modalType === 'add') {
        await axios.post(endpoint, formData);
        showToast(`${title} successfully created!`, "success");
      } else {
        await axios.put(`${endpoint}/${selectedItem.id}`, formData);
        showToast(`${title} successfully updated!`, "success");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "An error occurred.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const executeDelete = async () => {
    setProcessing(true);
    try {
      await axios.delete(`${endpoint}/${selectedItem.id}`);
      showToast(`${title} successfully deleted!`, "success");
      setShowDeleteModal(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Delete process failed.", "error");
    } finally {
      setProcessing(false);
    }
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
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Master Setup</p>
            <h1 className="text-xl font-black text-white tracking-tighter mt-0.5">{title}</h1>
            <p className="text-[10px] text-emerald-100/70 font-bold mt-0.5">Kelola konfigurasi data parameter {title.toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="px-4 mt-5 space-y-3">
        <div className="flex justify-between items-center px-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Records ({sortedData.length})
          </p>
          <button 
            onClick={() => handleOpenModal('add')} 
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl transition-all"
          >
            + Add New
          </button>
        </div>

        {/* MOBILE LIST CARDS */}
        <div className="space-y-3">
          {sortedData.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-3 active:scale-[0.99] transition-all">
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar box stylized by code params */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border flex-shrink-0 ${badgeClass}`}>
                    {item.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-800 text-sm truncate leading-snug">{item.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{item.slug}</p>
                  </div>
                </div>
                
                {countKey && (
                  <div className="text-right">
                    <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-100 uppercase">
                      Used: {item[countKey] || 0}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-50" />

              <div className="flex items-center justify-end gap-4 pt-0.5">
                <button 
                  onClick={() => handleOpenModal('edit', item)} 
                  className="text-indigo-500 hover:text-indigo-700 font-black text-[10px] uppercase tracking-wide transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} 
                  className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-wide transition-colors"
                >
                  Delete
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL CREATE / UPDATE (z-[60]) ── */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 mb-[safe-area-pb]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">
                {modalType === 'add' ? 'New' : 'Update'} {title}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl px-2">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Name</label>
                <input required type="text" value={formData.name} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      name: val,
                      slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                    });
                  }}
                  className="w-full p-3.5 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug</label>
                <input required type="text" value={formData.slug} 
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-400 text-sm italic" 
                />
              </div>

              <button type="submit" disabled={processing} className="w-full py-4 mt-2 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50">
                {processing ? 'Processing...' : 'Save Changes'}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ── DELETE MODAL (z-[70]) ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl text-center">
            <div className="p-8 space-y-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-1 font-black text-lg">!</div>
              <h3 className="text-lg font-black text-slate-900 uppercase">Delete Record?</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed px-2">
                Apakah Anda yakin ingin menghapus <span className="text-slate-900 font-black">"{selectedItem?.name}"</span>? Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={executeDelete} disabled={processing} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 border-l border-slate-100 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}