import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { apiPost } from '../services/api';
import '../styles/pages/auth.css';

const eyeOpenIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const eyeClosedIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;

const strengthColors = ['#FF4D6A', '#FF9900', '#FFD600', '#00E5FF'];
const strengthTexts  = ['Weak', 'Fair', 'Good', 'Strong'];

function getStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/[0-9]/.test(pwd))         score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  return score;
}

export default function RegisterPage() {
  const showToast = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { fullName, email, phone, password, confirmPassword } = formData;
    
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      showToast('Please fill in all fields.', true);
      return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters long.', true);
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost('/api/auth/register', formData);
      if (res?.success) {
        setRegisteredName(res.user?.fullName || fullName);
        setSuccessModal(true);
      } else {
        if (res?.errors && res.errors.length > 0) {
          const messages = res.errors.map(err => err.msg).join(' | ');
          showToast(messages, true);
        } else {
          showToast(res?.message || 'Registration failed', true);
        }
      }
    } catch (err) {
      showToast('Server error during registration', true);
    } finally {
      setSubmitting(false);
    }
  };

  const passScore = getStrength(formData.password);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-dark)', color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    );
  }

  if (user && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-container">
      <div className="login-sidebar">
        <div className="sidebar-overlay"></div>
        <div className="sidebar-content">
          <img src="/images/logo.png" alt="ProSupply" className="brand-logo-img" />
          <h1>Join ProSupply Today</h1>
          <p>Create your account and start exploring a world of verified suppliers, premium products, and seamless B2B transactions.</p>
        </div>
      </div>

      <div className="login-main">
        <div className="login-card">
          <h2>Create Account</h2>
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" required />
            </div>
            
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.com" required />
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+123456789" required />
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? eyeClosedIcon : eyeOpenIcon}
                </button>
              </div>
              <div className="strength-meter">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="strength-segment" style={{ background: i <= passScore ? strengthColors[passScore - 1] : 'var(--border-light)' }}></div>
                ))}
              </div>
              <span className="strength-label" style={{ color: formData.password ? strengthColors[passScore - 1] : '' }}>
                {formData.password ? strengthTexts[passScore - 1] : ''}
              </span>
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <div className="password-wrapper">
                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
                <button type="button" className="toggle-password" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? eyeClosedIcon : eyeOpenIcon}
                </button>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="register-prompt">
            Already have an account? <Link to="/login">Log in here</Link>
          </div>
        </div>
      </div>

      {successModal && (
        <div className="modal-overlay show">
          <div className="modal-content">
            <h3 className="modal-title">Registration Successful!</h3>
            <p>Welcome to ProSupply,<br/><b>{registeredName}</b></p>
            <button className="modal-btn" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
