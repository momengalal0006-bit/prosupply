import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/pages/admin.css';

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { to: '/admin', label: '📊 Dashboard' },
    { to: '/admin/users', label: '👥 Users' },
    { to: '/admin/ads', label: '📦 Ads' },
    { to: '/admin/applications', label: '📋 Applications' },
    { to: '/admin/commissions', label: '💰 Commissions' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-logo-link"><img src="/images/logo.png" alt="ProSupply" className="admin-logo-img" /></Link>
        <p>Admin Panel</p>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className={path === item.to ? 'active' : ''}>{item.label}</Link>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          {children}
          <button className="admin-logout" onClick={async () => { await logout(); window.location.href = '/login'; }}>Logout</button>
        </div>
      </main>
    </div>
  );
}
