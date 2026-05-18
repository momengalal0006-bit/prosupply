import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, isLoggedIn, isAdmin, isSeller, cartCount, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAboutUs = (e) => {
    e.preventDefault();
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar" id="navbar">
      <div className="nav-left">
        {isLoggedIn && !isAdmin && (
          <>
            {isSeller ? (
              <Link to="/seller/dashboard" className="nav-link">Seller Dashboard</Link>
            ) : (
              <Link to="/seller/apply" className="nav-link">Become a Seller</Link>
            )}
          </>
        )}
        {isAdmin && (
          <Link to="/admin" className="nav-link">Admin Panel</Link>
        )}
      </div>
      <div className="nav-center">
        <Link to="/" className="nav-link nav-logo"><img src="/images/logo.png" alt="ProSupply" className="nav-logo-img" /></Link>
      </div>
      <div className="nav-right">
        <a href="#footer" className="nav-link" onClick={handleAboutUs}>About Us</a>
        {isLoggedIn && (
          <>
            <Link to="/orders" className="nav-link">My Orders</Link>
            <Link to="/cart" className="nav-link cart-link">
              🛒 Cart
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            <Link to="/profile" className="nav-profile" aria-label="User profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
            <button className="nav-logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
        {!isLoggedIn && (
          <Link to="/login" className="nav-link">Login</Link>
        )}
      </div>
    </nav>
  );
}
