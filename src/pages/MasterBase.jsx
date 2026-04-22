import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

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

  const colorMap = {
    emerald: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-emerald-600 border-emerald-600 focus:ring-emerald-600",
    rose: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-rose-600 border-rose-600 focus:ring-rose-600",
    amber: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 text-amber-600 border-amber-600 focus:ring-amber-600",
    blue: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 text-blue-600 border-blue-600 focus:ring-blue-600",
    purple: "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20 text-purple-600 border-purple-600 focus:ring-purple-600",
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(endpoint);
      setData(res.data.data);
    } catch (err) { 
      showToast("Failed to load master data.", "error");
    } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [endpoint]);

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setFormData({ name: item?.name || '', slug: item?.slug || '' });
    if (type === 'delete') { setShowDeleteModal(true); } else { setShowModal(true); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (modalType === 'add') {
        const res = await axios.post(endpoint, formData);
        const newItem = res.data.data || res.data;
        setData((prev) => [...prev, newItem]);
        showToast(`${title} created successfully!`, 'success');
      } else {
        await axios.put(`${endpoint}/${selectedItem.id}`, { name: formData.name });
        setData((prev) => prev.map(item => 
          item.id === selectedItem.id ? { ...item, name: formData.name } : item
        ));
        showToast(`${title} updated successfully!`, 'success');
      }
      setShowModal(false);
    } catch (err) { 
      const errorData = err.response?.data;
      showToast(
          errorData?.message || "Something went wrong", 
          "error", 
          errorData?.errors
      );
    } finally { setProcessing(false); }
  };

  const executeDelete = async () => {
    setProcessing(true);
    try {
      await axios.delete(`${endpoint}/${selectedItem.id}`);
      setData((prev) => prev.filter(item => item.id !== selectedItem.id));
      setShowDeleteModal(false);
      showToast(`${title} deleted successfully!`, 'success');
    } catch (err) { 
      const errorData = err.response?.data;
      showToast(errorData?.message || "Delete failed", "error"); 
    } finally { setProcessing(false); }
  };

  // EARLY RETURN: Jangan render apapun kecuali loading screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          Loading...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <Toast data={toast} onClose={hideToast} />
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-slate-500 text-sm">Manage {title.toLowerCase()} records</p>
        </div>
        <button 
          onClick={() => openModal('add')}
          className={`px-6 py-2.5 rounded-xl font-bold text-white transition shadow-lg ${colorMap[color].split(' ').slice(0,3).join(' ')}`}
        >
          + New {title}
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
            <tr>
              <th className="p-5 px-8 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => requestSort('name')}>
                Name / Slug {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-5 px-8 text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => requestSort(countKey)}>
                Usage {sortConfig.key === countKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-5 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedData.length === 0 ? (
              <tr><td colSpan="3" className="p-16 text-center text-slate-400">No data available.</td></tr>
            ) : sortedData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-5 px-8">
                  <p className="font-bold text-slate-700">{item.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">{item.slug}</p>
                </td>
                <td className={`p-5 px-8 text-center font-black ${colorMap[color].split(' ')[3]}`}>
                  {item[countKey] || 0}
                </td>
                <td className="p-5 px-8 text-right space-x-5">
                  <button onClick={() => openModal('edit', item)} className="text-indigo-500 hover:text-indigo-700 font-bold text-xs uppercase tracking-tighter transition-colors">Edit</button>
                  <button onClick={() => openModal('delete', item)} className="text-rose-500 hover:text-rose-700 font-bold text-xs uppercase tracking-tighter transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">{modalType === 'add' ? 'New' : 'Update'} {title}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-rose-500 font-black text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Name</label>
                <input required type="text" value={formData.name} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData, name: val,
                      ...(modalType === 'add' && { slug: val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') })
                    });
                  }}
                  className="w-full p-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-700 text-sm" 
                />
              </div>
              {modalType === 'add' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug</label>
                  <input required type="text" value={formData.slug} 
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-400 text-sm italic" 
                  />
                </div>
              )}
              <button type="submit" disabled={processing} className="w-full py-5 mt-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50">
                {processing ? 'Processing...' : 'Save Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl text-center">
            <div className="p-10 space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-2xl">!</div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter text-center w-full">Delete {title}?</h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed">
                Confirm delete <span className="text-slate-900 underline">"{selectedItem?.name}"</span>?
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-6 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={executeDelete} disabled={processing} className="flex-1 py-6 font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 border-l border-slate-100 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}