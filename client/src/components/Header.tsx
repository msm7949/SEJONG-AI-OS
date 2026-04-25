import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  const navItems = [
    { to: '/', label: '대시보드' },
    { to: '/approve', label: 'HMN 승인' },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-lg">
              世
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight">세종 OS</span>
              <span className="ml-2 text-xs text-slate-400">v1.6</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
