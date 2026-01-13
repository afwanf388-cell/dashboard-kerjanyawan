import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

// Lazy Load Pages for Performance (Code Splitting)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const DataLogin = React.lazy(() => import('./pages/DataLogin'));
const CatatanKerja = React.lazy(() => import('./pages/CatatanKerja'));
const KesalahanStaf = React.lazy(() => import('./pages/KesalahanStaf'));
const JadwalResult = React.lazy(() => import('./pages/JadwalResult'));
const PemahamanBola = React.lazy(() => import('./pages/PemahamanBola'));
const Keuangan = React.lazy(() => import('./pages/Keuangan'));
const GlobalChat = React.lazy(() => import('./pages/GlobalChat'));
const KalkulatorTogel = React.lazy(() => import('./pages/KalkulatorTogel'));
const KalkulatorBola = React.lazy(() => import('./pages/KalkulatorBola'));
const JadwalBank = React.lazy(() => import('./pages/JadwalBank'));

// Simple Loading Spinner
const LoadingFallback = () => (
  <div style={{
    height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: 'white'
  }}>
    <div style={{
      width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)',
      borderTop: '3px solid #0ea5e9', borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <span style={{ marginTop: '16px', fontSize: '14px', color: '#94a3b8' }}>Memuat Dashboard...</span>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/data-login" element={<DataLogin />} />
              <Route path="/catatan" element={<CatatanKerja />} />
              <Route path="/kesalahan-staf" element={<KesalahanStaf />} />
              <Route path="/jadwal" element={<JadwalResult />} />
              <Route path="/bola" element={<PemahamanBola />} />
              <Route path="/keuangan" element={<Keuangan />} />
              <Route path="/chat" element={<GlobalChat />} />
              <Route path="/kalkulator-togel" element={<KalkulatorTogel />} />
              <Route path="/kalkulator-bola" element={<KalkulatorBola />} />
              <Route path="/jadwal-bank" element={<JadwalBank />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
