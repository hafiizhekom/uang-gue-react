import { useFinanceStore } from '../store/useFinanceStore';

export default function Dashboard() {
  const { balance, transactions, addTransaction } = useFinanceStore();

  const handleAddSimple = () => {
    addTransaction({
      id: Date.now(),
      title: 'Makan Enak',
      amount: 50000,
      type: 'expense',
      date: new Date().toLocaleDateString('id-ID')
    });
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
        <button 
          onClick={handleAddSimple}
          className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
        >
          + Transaksi Cepat
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Total Saldo</p>
          <h3 className="text-3xl font-bold mt-1 text-slate-900">Rp {balance.toLocaleString('id-ID')}</h3>
        </div>
        {/* Kamu bisa tambah card income/outcome di sini nanti */}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50">
          <h3 className="font-bold text-slate-700">Transaksi Terakhir</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {transactions.map((t) => (
            <div key={t.id} className="p-4 px-6 flex justify-between items-center hover:bg-slate-50 transition">
              <div>
                <p className="font-semibold text-slate-700">{t.title}</p>
                <p className="text-xs text-slate-400">{t.date}</p>
              </div>
              <span className={`font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {t.type === 'income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}