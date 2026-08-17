import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { isMobile } from 'react-device-detect';
import { useAuthStore } from './store/useAuthStore';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ReactGA from 'react-ga4';
import { useLocation } from 'react-router-dom';

// ─── Deteksi Mobile: device-detect ATAU screen width < 768px ─────────────────
const MOBILE_BREAKPOINT = 768;
ReactGA.initialize(import.meta.env.VITE_GA_ID);

function useIsMobile() {
  const [mobile, setMobile] = useState(
    isMobile || window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const handler = () => setMobile(isMobile || window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return mobile;
}

function GATracker() {
  const location = useLocation();
  useEffect(() => {
    ReactGA.send({ hitType: 'pageview', page: location.pathname });
  }, [location]);
  return null;
}

// ─── Helper: auto-pilih folder Desktop atau Mobile ───────────────────────────
// Lazy import tetap static (dipilih saat pertama load)
// Layout-nya yang reactive mengikuti useIsMobile()
const isMobileDevice = isMobile || window.innerWidth < MOBILE_BREAKPOINT;
const screen = (desktopImport, mobileImport) =>
  lazy(isMobileDevice ? mobileImport : desktopImport);

// ─── Lazy imports ─────────────────────────────────────────────────────────────
const Login       = screen(() => import('./pages/DesktopScreen/Login'),       () => import('./pages/MobileScreen/Login'));
const Dashboard   = screen(() => import('./pages/DesktopScreen/Dashboard'),   () => import('./pages/MobileScreen/Dashboard'));
const MasterPeriod= screen(() => import('./pages/DesktopScreen/MasterPeriod'),() => import('./pages/MobileScreen/MasterPeriod'));
const MasterBase  = screen(() => import('./pages/DesktopScreen/MasterBase'),  () => import('./pages/MobileScreen/MasterBase'));
const Transaction = screen(() => import('./pages/DesktopScreen/Transaction'), () => import('./pages/MobileScreen/Transaction'));
const PeriodList  = screen(() => import('./pages/DesktopScreen/PeriodList'),  () => import('./pages/MobileScreen/PeriodList'));
const Wallet      = screen(() => import('./pages/DesktopScreen/MasterPayment'),() => import('./pages/MobileScreen/MasterPayment'));
const OutcomeDetail=screen(() => import('./pages/DesktopScreen/OutcomeDetail'),() => import('./pages/MobileScreen/OutcomeDetail'));
const ReportMonthly = screen(() => import('./pages/DesktopScreen/ReportMonthly'), () => import('./pages/MobileScreen/ReportMonthly'));
const ReportRange   = screen(() => import('./pages/DesktopScreen/ReportRange'),   () => import('./pages/MobileScreen/ReportRange'));
const UserLog     = screen(() => import('./pages/DesktopScreen/UserLog'),     () => import('./pages/MobileScreen/UserLog'));

// Mobile-only screen (tidak ada padanannya di desktop)
const MasterMenu  = lazy(() => import('./pages/MobileScreen/MasterMenu'));

// ─── Layout: Desktop pakai Sidebar+Header, Mobile tidak ──────────────────────
import DesktopLayout from './components/layout/DesktopLayout';
import MobileLayout from './components/layout/MobileLayout';

export default function App() {
  const token = useAuthStore((state) => state.token);
  const mobile = useIsMobile();
  const Layout = mobile ? MobileLayout : DesktopLayout;

  return (
    <Router>
      <GATracker />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>}>
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />

          <Route path="/*" element={token ? (
            <Layout>
              <Routes>
                <Route path="/"                          element={<Dashboard />} />
                <Route path="/master-period"             element={<MasterPeriod />} />
                <Route path="/master-income-type"        element={<MasterBase title="Income Type"           endpoint="/master-income-types"         countKey="count_incomes"         color="emerald" />} />
                <Route path="/master-outcome-category"   element={<MasterBase title="Outcome Category"      endpoint="/master-outcome-categories"    countKey="count_outcomes"        color="rose"    />} />
                <Route path="/master-outcome-type"       element={<MasterBase title="Outcome Type"          endpoint="/master-outcome-types"         countKey="count_outcomes"        color="amber"   />} />
                <Route path="/wallets"                   element={<Wallet />} />
                <Route path="/master-outcome-detail-tag" element={<MasterBase title="Outcome Detail Tag"    endpoint="/master-outcome-detail-tags"   countKey="count_outcome_details" color="purple"  />} />
                <Route path="/transactions"              element={<PeriodList />} />
                <Route path="/transactions/:periodId"    element={<Transaction />} />
                <Route path="/outcome-detail/:outcomeId" element={<OutcomeDetail />} />
                <Route path="/report/:periodId?" element={<ReportMonthly />} />
                <Route path="/report-range" element={<ReportRange />} />
                <Route path="/log"                       element={<UserLog />} />
                
                {/* Mobile-only: Master menu list — redirect ke / kalau desktop */}
                <Route path="/master" element={mobile ? <MasterMenu /> : <Navigate to="/" />} />
                <Route path="*" element={<div className="p-20 text-center font-black uppercase text-slate-300">404 - Not Found</div>} />
              </Routes>
            </Layout>
          ) : <Navigate to="/login" />} />
        </Routes>
      </Suspense>

      <Analytics />
      <SpeedInsights />
    </Router>
  );
}