import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ApprovePage from './pages/ApprovePage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/approve" element={<ApprovePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
