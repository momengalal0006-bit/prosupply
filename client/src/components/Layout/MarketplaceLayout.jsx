import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../../hooks/useAuth';

export default function MarketplaceLayout() {
  const { loading, isAdmin } = useAuth();
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/product/');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-dark)', color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    );
  }

  if (isAdmin && !isProductPage) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="marketplace-layout">
      <Navbar />
      <div className="page-content">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
