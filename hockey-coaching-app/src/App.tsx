import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Teams from './pages/Teams';
import Games from './pages/Games';
import LiveTracking from './pages/LiveTracking';
import Seasons from './pages/Seasons';
import DataAnalysis from './pages/DataAnalysis';
import ShotTracking from './pages/LiveTracking/ShotTracking';
import DrawPlay from './pages/LiveTracking/DrawPlay';
import QuickStats from './pages/LiveTracking/QuickStats';

function App() {
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
        
        {/* Live tracking subpages */}
        <Route path="/live/tracking" element={<ShotTracking />} />
        <Route path="/live/draw" element={<DrawPlay />} />
        <Route path="/live/stats" element={<QuickStats />} />
      </Routes>
    </Router>
  );
}

export default App;
