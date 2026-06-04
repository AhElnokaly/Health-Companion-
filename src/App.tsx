/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import Water from './pages/Water';
import Diet from './pages/Diet';
import Sleep from './pages/Sleep';
import WomensHealth from './pages/WomensHealth';
import AddMedicationScreen from './pages/AddMedicationScreen';
import SymptomTracker from './pages/SymptomTracker';
import AIInsights from './pages/AIInsights';
import TimeTable from './pages/TimeTable';
import History from './pages/History';
import Profile from './pages/Profile';
import Family from './pages/Family';
import Reports from './pages/Reports';
import Vault from './pages/Vault';
import HomePharmacy from './pages/HomePharmacy';
import Challenges from './pages/Challenges';
import { SOS, Spiritual } from './pages/Placeholders';
import Onboarding from './pages/Onboarding';
import Wallet from './pages/Wallet';
import WorkLog from './pages/WorkLog';
import WorkHistory from './pages/WorkHistory';
import Actions from './pages/Actions';
import Weight from './pages/Weight';
import FastingHub from './pages/FastingHub';
import PartnerSync from './pages/PartnerSync';
import NotificationsSetup from './pages/NotificationsSetup';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { AppProvider } from './context/AppContext';
import { Activity } from 'lucide-react';


function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, signInWithGoogle, signInGuest } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F9F9]">
        <Activity className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F5F9F9] p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Life Companion</h1>
        <p className="text-gray-500 mb-8">رفيقك الذكي للصحة والعبادة والتوازن.</p>
        <div className="space-y-4 w-full max-w-xs">
          <button 
            onClick={signInGuest}
            className="w-full bg-primary text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95"
          >
            ابدأ الآن
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">أو باستخدام</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button 
            onClick={signInWithGoogle}
            className="w-full bg-white text-gray-800 font-bold py-3 px-8 rounded-full shadow hover:bg-gray-50 transition-all active:scale-95 border border-gray-100"
          >
            تسجيل الدخول بـ Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <UIProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="medications" element={<Medications />} />
                <Route path="add-medication" element={<AddMedicationScreen />} />
                <Route path="water" element={<Water />} />
                <Route path="diet" element={<Diet />} />
                <Route path="sleep" element={<Sleep />} />
                <Route path="womens-health" element={<WomensHealth />} />
                <Route path="symptoms" element={<SymptomTracker />} />
                <Route path="ai-insights" element={<AIInsights />} />
                <Route path="timetable" element={<TimeTable />} />
                <Route path="history" element={<History />} />
                <Route path="profile" element={<Profile />} />
                <Route path="family" element={<Family />} />
                <Route path="reports" element={<Reports />} />
                <Route path="vault" element={<Vault />} />
                <Route path="home-pharmacy" element={<HomePharmacy />} />
                <Route path="challenges" element={<Challenges />} />
                <Route path="onboarding" element={<Onboarding />} />
                <Route path="sos" element={<SOS />} />
                <Route path="spiritual" element={<Spiritual />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="work-log" element={<WorkLog />} />
                <Route path="work-history" element={<WorkHistory />} />
                <Route path="actions" element={<Actions />} />
                <Route path="weight" element={<Weight />} />
                <Route path="fasting-hub" element={<FastingHub />} />
                <Route path="partner-sync" element={<PartnerSync />} />
                <Route path="notifications-setup" element={<NotificationsSetup />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </UIProvider>
      </AppProvider>
    </AuthProvider>
  );
}
