import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Teams from './pages/Teams';
import Games from './pages/Games';
import LiveTracking from './pages/LiveTracking';
import Seasons from './pages/Seasons';
import DataAnalysis from './pages/DataAnalysis';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/games" element={<Games />} />
          <Route path="/live" element={<LiveTracking />} />
          <Route path="/seasons" element={<Seasons />} />
          <Route path="/analysis" element={<DataAnalysis />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
