import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import MasterPeriod from './pages/MasterPeriod';
import MasterBase from './pages/MasterBase';
import Login from './pages/Login';
import Transaction from './pages/Transaction';
import PeriodList from './pages/PeriodList';
import Wallet from './pages/MasterPayment';
import OutcomeDetail from './pages/OutcomeDetail';

export default function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/*" element={token ? (
          <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/master-period" element={<MasterPeriod />} />
                  <Route path="/master-income-type" element={
                    <MasterBase title="Income Type" endpoint="/master-income-types" countKey="count_incomes" color="emerald" />
                  } />

                  <Route path="/master-outcome-category" element={
                    <MasterBase title="Outcome Category" endpoint="/master-outcome-categories" countKey="count_outcomes" color="rose" />
                  } />

                  <Route path="/master-outcome-type" element={
                    <MasterBase title="Outcome Type" endpoint="/master-outcome-types" countKey="count_outcomes" color="amber" />
                  } />

                  <Route path="/wallets" element={<Wallet />} /> {/* Master Payment */}

                  <Route path="/master-outcome-detail-tag" element={
                    <MasterBase title="Outcome Detail Tag" endpoint="/master-outcome-detail-tags" countKey="count_outcome_details" color="purple" />
                  } />
                  
                  <Route path="/transactions" element={<PeriodList />} />
                  <Route path="/transactions/:periodId" element={<Transaction />} />

                  {/* Link ini yang dipake saat user klik tombol DETAIL di tabel Outcome */}
                  <Route path="/outcome-detail/:outcomeId" element={<OutcomeDetail />} />
                  
                  <Route path="*" element={<div className="p-20 text-center font-black uppercase text-slate-300">404 - Not Found</div>} />
                </Routes>
              </main>
            </div>
          </div>
        ) : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}