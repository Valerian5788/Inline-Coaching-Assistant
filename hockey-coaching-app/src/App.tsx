import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Teams from './pages/Teams';
import Games from './pages/Games';
import LiveTracking from './pages/LiveTracking';
import Seasons from './pages/Seasons';
import DataAnalysis from './pages/DataAnalysis';
import Training from './pages/Training';
import DrillDesigner from './pages/Training/DrillDesigner';
import PracticePlanner from './pages/Training/PracticePlanner';
import ShotTracking from './pages/LiveTracking/ShotTracking';
import DrawPlay from './pages/LiveTracking/DrawPlay';
import QuickStats from './pages/LiveTracking/QuickStats';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';

const AuthenticatedApp = () => {
  return (
    <Router>
      <Routes>
        {/* Main pages with layout */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/teams" element={<Layout><Teams /></Layout>} />
        <Route path="/games" element={<Layout><Games /></Layout>} />
        <Route path="/live" element={<Layout><LiveTracking /></Layout>} />
        <Route path="/seasons" element={<Layout><Seasons /></Layout>} />
        <Route path="/analysis" element={<Layout><DataAnalysis /></Layout>} />
        <Route path="/training" element={<Layout><Training /></Layout>} />
        
        {/* Live tracking subpages */}
        <Route path="/live/tracking" element={<ShotTracking />} />
        <Route path="/live/draw" element={<DrawPlay />} />
        <Route path="/live/stats" element={<QuickStats />} />
        
        {/* Training subpages */}
        <Route path="/training/drill-designer" element={<DrillDesigner />} />
        <Route path="/training/drill-designer/:id" element={<DrillDesigner />} />
        <Route path="/training/practice-planner" element={<PracticePlanner />} />
        <Route path="/training/practice-planner/:id" element={<PracticePlanner />} />
      </Routes>
    </Router>
  );
};

const AppContent = () => {
  const { currentUser } = useAuth();
  
  return currentUser ? <AuthenticatedApp /> : <Login />;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
