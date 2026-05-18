import { useState, useEffect } from 'react';
import { apiFetch, apiPut, apiPost } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { splitName, buildFullName } from '../utils/helpers';
import '../styles/pages/profile.css';

export default function ProfilePage() {
  const showToast = useToast();
  const { user, refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('personal-info');
  const [profile, setProfile] = useState(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [personalForm, setPersonalForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [addressForm, setAddressForm] = useState({ street: '', building: '', area: '', city: '', district: '', notes: '' });
  const [companyForm, setCompanyForm] = useState({ companyName: '', taxId: '', industry: '' });
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [cachedAddress, setCachedAddress] = useState(null);
  const [passForm, setPassForm] = useState({ code: '', newPass: '', confirmPass: '' });
  const [passError, setPassError] = useState('');
  const [showPass, setShowPass] = useState({ new: false, confirm: false });

  useEffect(() => {
    (async () => {
      const res = await apiFetch('/api/profile');
      if (res?.success) {
        setProfile(res.data);
        const { firstName, lastName } = splitName(res.data.fullName);
        setPersonalForm({ firstName, lastName, email: res.data.email || '', phone: res.data.phone || '' });
      }
    })();
  }, []);

  async function loadAddress() {
    if (addressLoaded) return;
    const res = await apiFetch('/api/profile/address');
    if (res?.success) {
      setCachedAddress(res.data);
      if (res.data) setAddressForm({ street: res.data.street || '', building: res.data.building || '', area: res.data.area || '', city: res.data.city || '', district: res.data.district || '', notes: res.data.notes || '' });
      setAddressLoaded(true);
    }
  }

  function handleTabClick(tab) {
    setActiveTab(tab);
    if (tab === 'delivery-address') loadAddress();
  }

  async function savePersonal(e) {
    e.preventDefault();
    const fullName = buildFullName(personalForm.firstName, personalForm.lastName);
    if (!fullName || fullName.length < 2) { showToast('Please enter a valid full name.', true); return; }
    const res = await apiPut('/api/profile', { fullName, email: personalForm.email.trim().toLowerCase(), phone: personalForm.phone.trim() });
    if (res?.success) { setProfile(res.data); showToast('Profile updated successfully.'); setEditingPersonal(false); refreshAuth(); }
    else showToast(res?.message || 'Failed to update.', true);
  }

  async function saveAddress(e) {
    e.preventDefault();
    const { street, building, area, city, district, notes } = addressForm;
    if (!street || !building || !area || !city || !district) { showToast('All required fields must be filled.', true); return; }
    const res = await apiPut('/api/profile/address', { street, building, area, city, district, notes });
    if (res?.success) { setCachedAddress(res.data); showToast('Address saved successfully.'); setEditingAddress(false); refreshAuth(); }
    else showToast(res?.message || 'Failed to save.', true);
  }

  async function requestCode() {
    const res = await apiPost('/api/profile/change-password/request');
    if (res?.success) showToast('Verification code sent to your email.');
    else showToast(res?.message || 'Could not send code.', true);
  }

  async function changePassword(e) {
    e.preventDefault();
    setPassError('');
    if (!/^\d{6}$/.test(passForm.code)) { setPassError('Code must be exactly 6 digits.'); return; }
    if (passForm.newPass.length < 8) { setPassError('Password must be at least 8 characters.'); return; }
    if (passForm.newPass !== passForm.confirmPass) { setPassError('Passwords do not match.'); return; }
    const res = await apiPost('/api/profile/change-password/confirm', { otp: passForm.code, newPassword: passForm.newPass });
    if (res?.success) { showToast('Password updated successfully.'); setPassForm({ code: '', newPass: '', confirmPass: '' }); }
    else setPassError(res?.message || 'Failed to update password.');
  }

  const accountType = profile?.role === 'admin' ? 'Admin Account' : profile?.sellerStatus === 'approved' ? 'Seller Account' : 'Buyer Account';

  return (
    <div className="profile-page-wrapper">
      <main className="profile-container">
        <aside className="profile-sidebar cyan-frame">
          <div className="sidebar-user">
            <div className="avatar">👤</div>
            <h3>{profile?.fullName || 'User'}</h3>
            <p>{profile?.email || ''}</p>
            <span className="profile-badge">{accountType}</span>
          </div>
          <nav className="sidebar-nav">
            {[{ id: 'personal-info', icon: '👤', label: 'Personal Info' },
              { id: 'delivery-address', icon: '📍', label: 'Delivery Address' },
              ...(profile?.role !== 'admin' ? [{ id: 'company-details', icon: '🏢', label: 'Company Details' }] : []),
              { id: 'security-pass', icon: '🔒', label: 'Security & Password' }
            ].map((t) => (
              <a key={t.id} href="#" className={`nav-item${activeTab === t.id ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabClick(t.id); }}>
                <span>{t.icon}</span> {t.label}
              </a>
            ))}
          </nav>
        </aside>

        <section className="profile-content cyan-frame">
          {/* Personal Info */}
          {activeTab === 'personal-info' && (
            <div className="content-section active">
              <div className="content-header"><h2>Personal Information</h2>
                <button className={`edit-toggle-btn${editingPersonal ? ' editing' : ''}`} onClick={() => setEditingPersonal(!editingPersonal)}>{editingPersonal ? 'Cancel Editing' : 'Edit Profile'}</button>
              </div>
              <form className="profile-form" onSubmit={savePersonal}>
                <div className="form-row">
                  <div className="form-group"><label>First Name</label><input type="text" value={personalForm.firstName} onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })} readOnly={!editingPersonal} /></div>
                  <div className="form-group"><label>Last Name</label><input type="text" value={personalForm.lastName} onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })} readOnly={!editingPersonal} /></div>
                </div>
                <div className="form-group"><label>Email</label><input type="email" value={personalForm.email} onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })} readOnly={!editingPersonal} /></div>
                <div className="form-group"><label>Phone Number</label><input type="tel" value={personalForm.phone} onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })} readOnly={!editingPersonal} /></div>
                {editingPersonal && <div className="form-actions"><button type="submit" className="save-btn">Save Changes</button></div>}
              </form>
            </div>
          )}

          {/* Delivery Address */}
          {activeTab === 'delivery-address' && (
            <div className="content-section active">
              <div className="content-header"><h2>Delivery Address</h2>
                <button className={`edit-toggle-btn${editingAddress ? ' editing' : ''}`} onClick={() => setEditingAddress(!editingAddress)}>{editingAddress ? 'Cancel Editing' : 'Edit Address'}</button>
              </div>
              <form className="profile-form" onSubmit={saveAddress}>
                <div className="form-group"><label>Street Address *</label><input type="text" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} readOnly={!editingAddress} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Building / Apt *</label><input type="text" value={addressForm.building} onChange={(e) => setAddressForm({ ...addressForm, building: e.target.value })} readOnly={!editingAddress} required /></div>
                  <div className="form-group"><label>Area *</label><input type="text" value={addressForm.area} onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })} readOnly={!editingAddress} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>City *</label><input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} readOnly={!editingAddress} required /></div>
                  <div className="form-group"><label>District *</label><input type="text" value={addressForm.district} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })} readOnly={!editingAddress} required /></div>
                </div>
                <div className="form-group"><label>Additional Directions</label><textarea rows="2" value={addressForm.notes} onChange={(e) => setAddressForm({ ...addressForm, notes: e.target.value })} readOnly={!editingAddress} /></div>
                {!cachedAddress?.street && !editingAddress && <div className="address-empty-state"><div className="empty-icon">📍</div><p>No delivery address saved yet.</p><small>Click "Edit Address" to add one.</small></div>}
                {editingAddress && <div className="form-actions"><button type="submit" className="save-btn">Save Address</button></div>}
              </form>
            </div>
          )}

          {/* Company Details */}
          {activeTab === 'company-details' && profile?.role !== 'admin' && (
            <div className="content-section active">
              <div className="content-header"><h2>Company Details</h2>
                <button className={`edit-toggle-btn${editingCompany ? ' editing' : ''}`} onClick={() => setEditingCompany(!editingCompany)}>{editingCompany ? 'Cancel Editing' : 'Edit Company'}</button>
              </div>
              <form className="profile-form" onSubmit={(e) => { e.preventDefault(); showToast('Company details updated locally.'); setEditingCompany(false); }}>
                <div className="form-group"><label>Company Name</label><input type="text" value={companyForm.companyName} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} readOnly={!editingCompany} /></div>
                <div className="form-group"><label>Tax ID</label><input type="text" value={companyForm.taxId} onChange={(e) => setCompanyForm({ ...companyForm, taxId: e.target.value })} readOnly={!editingCompany} /></div>
                <div className="form-group"><label>Industry</label><input type="text" value={companyForm.industry} onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })} readOnly={!editingCompany} /></div>
                {editingCompany && <div className="form-actions"><button type="submit" className="save-btn">Update Company</button></div>}
              </form>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security-pass' && (
            <div className="content-section active">
              <div className="content-header"><h2>Security & Password</h2></div>
              <form className="profile-form" onSubmit={changePassword}>
                <div className="form-actions"><button type="button" className="save-btn" onClick={requestCode}>Send Verification Code</button></div>
                <div className="form-group"><label>Enter your 6-digit code</label><input type="text" className="code-input" maxLength="6" value={passForm.code} onChange={(e) => setPassForm({ ...passForm, code: e.target.value })} required /></div>
                <div className="form-group"><label>New Password</label>
                  <div className="pass-wrapper"><input type={showPass.new ? 'text' : 'password'} value={passForm.newPass} onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })} required minLength="8" />
                    <span className="toggle-pass" onClick={() => setShowPass({ ...showPass, new: !showPass.new })}>{showPass.new ? '🙈' : '👁️'}</span>
                  </div>
                </div>
                <div className="form-group"><label>Confirm New Password</label>
                  <div className="pass-wrapper"><input type={showPass.confirm ? 'text' : 'password'} value={passForm.confirmPass} onChange={(e) => setPassForm({ ...passForm, confirmPass: e.target.value })} required minLength="8" />
                    <span className="toggle-pass" onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}>{showPass.confirm ? '🙈' : '👁️'}</span>
                  </div>
                </div>
                {passError && <p className="error-msg" style={{ display: 'block' }}>{passError}</p>}
                <div className="form-actions"><button type="submit" className="save-btn">Change Password</button></div>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
