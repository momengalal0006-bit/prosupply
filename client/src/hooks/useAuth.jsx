import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API, apiFetch } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetch('/api/profile');
      if (res && res.success) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCartBadge = useCallback(async () => {
    try {
      const res = await apiFetch('/api/cart/summary');
      if (res && res.success) {
        setCartCount(res.data?.summary?.itemCount || 0);
      }
    } catch {
      
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    document.cookie = 'accessToken=; Max-Age=0; path=/;';
    document.cookie = 'refreshToken=; Max-Age=0; path=/;';
    setUser(null);
    setCartCount(0);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      refreshCartBadge();
    }
  }, [user, refreshCartBadge]);

  const value = {
    user,
    loading,
    cartCount,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isSeller: user?.sellerStatus === 'approved',
    isPendingSeller: user?.sellerStatus === 'pending_review',
    logout,
    refreshAuth: checkAuth,
    refreshCartBadge,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
