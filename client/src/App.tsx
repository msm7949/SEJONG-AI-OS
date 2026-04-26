import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ApprovePage from './pages/ApprovePage';
import ChatPage from './pages/ChatPage';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/approve" element={<ApprovePage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
