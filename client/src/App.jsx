import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import ScrollToTop from './components/common/ScrollToTop';
import MarketplaceLayout from './components/Layout/MarketplaceLayout';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage from './pages/ProfilePage';
import SellerApplyPage from './pages/SellerApplyPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CheckoutPage from './pages/CheckoutPage';
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminAdsPage,
  AdminApplicationsPage,
  AdminCommissionsPage,
} from './pages/AdminPages';
import AdminRoute from './components/auth/AdminRoute';
import { useAuth } from './hooks/useAuth';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  const { isAdmin } = useAuth();
  const home = isAdmin ? '/admin' : '/';
  const label = isAdmin ? 'Return to Admin Dashboard' : 'Return Home';
  return (
    <div style={{ padding: '2rem', textAlign: 'center', minHeight: '50vh' }}>
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to={home}>{label}</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Auth pages — NO Navbar / Footer */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Marketplace pages with shared Navbar + Footer */}
            <Route element={<MarketplaceLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/spare-parts" element={<CategoryPage category="Spare Parts" key="spare-parts" />} />
              <Route path="/auto-accessories" element={<CategoryPage category="Auto Accessories" key="auto-accessories" />} />
              <Route path="/heavy-machinery" element={<CategoryPage category="Heavy Machinery" key="heavy-machinery" />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/seller/apply" element={<SellerApplyPage />} />
              <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
            </Route>

            {/* Admin pages */}
            <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="/admin/ads" element={<AdminRoute><AdminAdsPage /></AdminRoute>} />
            <Route path="/admin/applications" element={<AdminRoute><AdminApplicationsPage /></AdminRoute>} />
            <Route path="/admin/commissions" element={<AdminRoute><AdminCommissionsPage /></AdminRoute>} />

            {/* Catch-all fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
