import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { apiPost } from '../services/api';
import '../styles/pages/auth.css';

const eyeOpenIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const eyeClosedIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;

export default function LoginPage() {
  const showToast = useToast();
  const navigate = useNavigate();
  const { refreshAuth, user, loading: authLoading, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [forgotModal, setForgotModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost('/api/auth/login', { email, password });
      if (res?.success) {
        await refreshAuth();
        showToast('Login Successful!');
        const dest = res.user?.role === 'admin' ? '/admin' : '/';
        navigate(dest);
      } else {
        showToast(res?.message || 'Login failed', true);
      }
    } catch (err) {
      showToast('Server error during login', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      showToast('Please enter your email', true);
      return;
    }
    setSubmitting(true);
    const res = await apiPost('/api/auth/forgot-password', { email: forgotEmail });
    setSubmitting(false);
    if (res?.success) {
      showToast(res.message);
      setForgotModal(false);
      setResetModal(true);
    } else {
      showToast(res?.message || 'Failed to send code', true);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || newPassword !== confirmNewPassword) {
      showToast('Please fill all fields correctly', true);
      return;
    }
    setSubmitting(true);
    const res = await apiPost('/api/auth/reset-password', {
      email: forgotEmail,
      otp,
      newPassword,
      confirmNewPassword
    });
    setSubmitting(false);
    if (res?.success) {
      showToast('Password reset successful. You can now log in.');
      setResetModal(false);
      setForgotEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      showToast(res?.message || 'Failed to reset password', true);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-dark)', color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    );
  }

  /* Logged-in buyers/sellers go home; admins may stay here to sign in (e.g. after logout or another account). */
  if (user && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-container">
      <div className="login-sidebar">
        <div className="sidebar-overlay"></div>
        <div className="sidebar-content">
          <img src="/images/logo.png" alt="ProSupply" className="brand-logo-img" />
          <h1>Welcome Back to ProSupply</h1>
          <p>Sign in to continue accessing the leading B2B marketplace for industrial parts and machinery.</p>
        </div>
      </div>

      <div className="login-main">
        <div className="login-card">
          <h2>Sign In</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="you@company.com" 
                required 
              />
            </div>
            
            <div className="input-group">
              <div className="label-row">
                <label>Password</label>
                <div className="forgot-container">
                  <button type="button" className="forgot-link" onClick={() => setForgotModal(true)}>
                    Forgot Password?
                  </button>
                </div>
              </div>
              <div className="password-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? eyeClosedIcon : eyeOpenIcon}
                </button>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="register-prompt">
            Don't have an account? <Link to="/register">Sign up here</Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div className="modal-overlay show">
          <div className="modal-content">
            <h3 className="modal-title">Reset Password</h3>
            <p id="modalMessage">Enter your email address and we'll send you a 6-digit code.</p>
            <div className="input-group">
              <input 
                type="email" 
                value={forgotEmail} 
                onChange={(e) => setForgotEmail(e.target.value)} 
                placeholder="Enter your email" 
              />
            </div>
            <button className="modal-btn" onClick={handleForgotPassword} disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Code'}
            </button>
            <button className="modal-btn cancel" onClick={() => setForgotModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="modal-overlay show">
          <div className="modal-content">
            <h3 className="modal-title">Enter Reset Code</h3>
            <div className="input-group">
              <input 
                type="text" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                placeholder="6-digit code" 
                maxLength="6"
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="New Password" 
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                value={confirmNewPassword} 
                onChange={(e) => setConfirmNewPassword(e.target.value)} 
                placeholder="Confirm New Password" 
              />
            </div>
            <button className="modal-btn" onClick={handleResetPassword} disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>
            <button className="modal-btn cancel" onClick={() => setResetModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
