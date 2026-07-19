import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch, apiPut, apiDelete } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { normalizeDocUrl } from '../utils/helpers';
import Pagination from '../components/common/Pagination';
import '../styles/pages/admin.css';

function AdminSidebar() {
  const loc = useLocation();
  const navItems = [
    { to: '/admin', label: '📊 Dashboard' },
    { to: '/admin/users', label: '👥 Users' },
    { to: '/admin/ads', label: '📦 Ads' },
    { to: '/admin/applications', label: '📋 Applications' },
    { to: '/admin/commissions', label: '💰 Commissions' },
  ];
  return (
    <aside className="admin-sidebar">
      <Link to="/admin" className="admin-logo-link">
        <img src="/images/logo.png" alt="ProSupply" className="admin-logo-img" />
      </Link>
      <p>Admin Panel</p>
      <div className="admin-sidebar-header">
        <h3>Panel Navigation</h3>
      </div>
      <nav className="admin-nav">
        {navItems.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={`admin-sidebar-item${loc.pathname === n.to ? ' active' : ''}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function AdminHeader() {
  const { user } = useAuth();
  const { logout } = useAuth();
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <div className="admin-header">
      <div className="admin-header-inner">
        <div className="admin-avatar">{initials}</div>
        <div className="admin-header-info">
          <h1 className="admin-header-name">{user?.fullName || 'Administrator'}</h1>
          <div className="admin-header-meta">
            <span className="admin-role-badge">🛡️ Platform Administrator</span>
            <span className="admin-header-email">✉️ {user?.email}</span>
          </div>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-logout-btn"
            onClick={async () => {
              await logout();
              window.location.href = '/login';
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminShell({ title, children }) {
  return (
    <div className="admin-layout-wrapper">
      <AdminHeader />
      <div className="admin-body">
        <div className="admin-dashboard-layout">
          <AdminSidebar />
          <main className="admin-content-main">
            <h1 className="admin-section-heading">{title}</h1>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}


export function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [recalculating, setRecalculating] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    (async () => {
      const [r1, r2, r3] = await Promise.all([
        apiFetch('/api/admin/dashboard'),
        apiFetch('/api/admin/users?page=1&limit=10'),
        apiFetch('/api/admin/trust/flagged'),
      ]);
      if (r1?.success) setStats(r1.data);
      if (r2?.success) setUsers(r2.data.items || []);
      if (r3?.success) setFlagged(r3.data || []);
    })();
  }, []);

  async function recalcTrust() {
    setRecalculating(true);
    const r = await apiFetch('/api/admin/trust/recalculate', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (r?.success) {
      showToast(`Trust scores recalculated for ${r.data.results?.length || 0} sellers.`);
      const r3 = await apiFetch('/api/admin/trust/flagged');
      if (r3?.success) setFlagged(r3.data || []);
    } else {
      showToast(r?.message || 'Failed.', true);
    }
    setRecalculating(false);
  }

  function trustBadge(score) {
    const s = parseFloat(score);
    if (isNaN(s)) return <span className="badge badge-empty">—</span>;
    let cls = 'badge-approved', label = s;
    if (s < 40) cls = 'badge-banned';
    else if (s < 60) cls = 'badge-pending_review';
    return <span className={`badge ${cls}`}>{s}/100</span>;
  }

  return (
    <AdminShell title="Admin Dashboard">
      {stats && (
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="val">{stats.totalUsers}</span>
            <span className="lbl">Total Users</span>
          </div>
          <div className="admin-stat">
            <span className="val">{stats.pendingApplications}</span>
            <span className="lbl">Pending Applications</span>
          </div>
          <div className="admin-stat">
            <span className="val">{stats.activeAds}</span>
            <span className="lbl">Active Ads</span>
          </div>
          <div className="admin-stat">
            <span className="val">{stats.totalOrders}</span>
            <span className="lbl">Total Orders Processed</span>
          </div>
          <div className="admin-stat revenue-card">
            <span className="val">
              EGP {parseFloat(stats.totalCommissions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="lbl">Total Commission Earned</span>
          </div>
        </div>
      )}

      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>
            🛡️ Flagged Sellers — Fraud Detection{' '}
            <span className="ai-badge">AI Powered</span>
          </h2>
          <button
            className="admin-primary-btn"
            onClick={recalcTrust}
            disabled={recalculating}
          >
            {recalculating ? 'Recalculating...' : '🔄 Recalculate Scores'}
          </button>
        </div>
        {flagged.length === 0 ? (
          <p className="admin-empty-text">No flagged sellers. All sellers have good trust scores.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Email</th>
                  <th>Trust Score</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((f) => (
                  <tr key={f.id}>
                    <td>{f.fullName}</td>
                    <td>{f.email}</td>
                    <td>{trustBadge(f.trustAnalysis?.score)}</td>
                    <td>
                      {f.trustAnalysis?.flags?.length > 0 ? (
                        <ul className="flag-list">
                          {f.trustAnalysis.flags.map((fl, i) => (
                            <li key={i} className="flag-item">
                              ⚠️ {fl}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="badge badge-empty">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card">
        <h2>Recent Users</h2>
        {users.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Seller Status</th>
                  <th>Trust</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.sellerStatus}`}>{u.sellerStatus}</span>
                    </td>
                    <td>{u.sellerStatus === 'approved' ? trustBadge(u.trustScore) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty-text">No users.</p>
        )}
      </div>
    </AdminShell>
  );
}


export function AdminUsersPage() {
  const showToast = useToast();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  async function load(p, s) {
    const params = new URLSearchParams({ page: p || 1, limit: 15 });
    if (s) params.set('search', s);
    const res = await apiFetch(`/api/admin/users?${params}`);
    if (res?.success) { setUsers(res.data.items); setPage(res.data.pagination.page); setTotalPages(res.data.pagination.totalPages); }
  }
  useEffect(() => { load(1, ''); }, []);

  async function banUser(id) { const r = await apiPut(`/api/admin/users/${id}/ban`, {}); if (r?.success) { showToast('Banned.'); load(page, search); } else showToast(r?.message || 'Failed.', true); }
  async function unbanUser(id) { const r = await apiPut(`/api/admin/users/${id}/unban`, {}); if (r?.success) { showToast('Unbanned.'); load(page, search); } else showToast(r?.message || 'Failed.', true); }
  async function deleteUser(id) { const r = await apiDelete(`/api/admin/users/${id}`); setConfirmModal(null); if (r?.success) { showToast('Deleted.'); load(page, search); } else showToast(r?.message || 'Failed.', true); }

  const debounceRef = useRef(null);
  function onSearch(val) { setSearch(val); clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => load(1, val), 300); }

  return (
    <AdminShell title="User Management">
      <input
        className="search-bar"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Seller Status</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = u.role === 'admin' ? 'admin' : u.sellerStatus === 'approved' ? 'seller' : u.role;
              return (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge badge-${role}`}>{role}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${u.sellerStatus}`}>{u.sellerStatus}</span>
                  </td>
                  <td>
                    {u.isBanned ? (
                      <span className="badge badge-banned">Banned</span>
                    ) : (
                      <span className="badge badge-approved">Active</span>
                    )}
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    {u.isBanned ? (
                      <button className="action-btn btn-unban" onClick={() => unbanUser(u.id)}>
                        Unban
                      </button>
                    ) : (
                      <button className="action-btn btn-ban" onClick={() => banUser(u.id)}>
                        Ban
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button className="action-btn btn-delete" onClick={() => setConfirmModal(u)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={(p) => load(p, search)} />
      
      {confirmModal && (
        <div className="modal-overlay active">
          <div className="modal-card confirm-modal-card">
            <h3 className="confirm-modal-title">Delete User</h3>
            <p className="confirm-modal-message">
              Are you sure you want to delete user "{confirmModal.fullName}"? This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="confirm-modal-btn btn-delete"
                onClick={() => deleteUser(confirmModal.id)}
              >
                Yes, Delete
              </button>
              <button
                className="btn-cancel-modal confirm-modal-btn"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}


export function AdminAdsPage() {
  const showToast = useToast();
  const [ads, setAds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  async function load(p, s) {
    const params = new URLSearchParams({ page: p || 1, limit: 15 });
    if (s) params.set('search', s);
    const res = await apiFetch(`/api/admin/ads?${params}`);
    if (res?.success) { setAds(res.data.items); setPage(res.data.pagination.page); setTotalPages(res.data.pagination.totalPages); }
  }
  useEffect(() => { load(1, ''); }, []);

  async function deleteAd(id) {
    const r = await apiDelete(`/api/admin/ads/${id}`);
    if (r?.success) { showToast('Deleted.'); load(page, search); } else showToast(r?.message || 'Failed.', true);
  }

  const debounceRef = useRef(null);
  function onSearch(val) { setSearch(val); clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => load(1, val), 300); }

  return (
    <AdminShell title="Ads Management">
      <input
        className="search-bar"
        placeholder="Search ads..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Status</th>
              <th>Origin</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((a) => (
              <tr key={a.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => window.open(`/product/${a.id}`, '_blank', 'noopener,noreferrer')}
                    className="admin-table-link-btn"
                  >
                    {a.title}
                  </button>
                </td>
                <td>{a.seller?.fullName || 'N/A'}</td>
                <td>EGP {parseFloat(a.price).toFixed(2)}</td>
                <td>
                  <span className={`badge badge-${a.status}`}>{a.status}</span>
                </td>
                <td>{a.countryOfOrigin || '—'}</td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td>
                  {a.status === 'active' && (
                    <button className="action-btn btn-delete" onClick={() => deleteAd(a.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={(p) => load(p, search)} />
    </AdminShell>
  );
}


export function AdminApplicationsPage() {
  const showToast = useToast();
  const [apps, setApps] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  async function load(status) {
    const url = status ? `/api/admin/seller-applications?status=${status}` : '/api/admin/seller-applications';
    const res = await apiFetch(url);
    if (res?.success) setApps(res.data || []);
  }
  useEffect(() => { load(''); }, []);

  async function approve(id) { const r = await apiPut(`/api/admin/seller-applications/${id}/approve`, {}); if (r?.success) { showToast('Approved!'); load(statusFilter); } else showToast(r?.message||'Failed.', true); }
  async function reject(id) { const r = await apiPut(`/api/admin/seller-applications/${id}/reject`, {}); if (r?.success) { showToast('Rejected.'); load(statusFilter); } else showToast(r?.message||'Failed.', true); }

  return (
    <AdminShell title="Seller Applications">
      <div className="filter-tabs">
        {[
          { v: '', l: 'All' },
          { v: 'pending_review', l: 'Pending' },
          { v: 'approved', l: 'Approved' },
          { v: 'rejected', l: 'Rejected' },
        ].map((f) => (
          <button
            key={f.v}
            className={`filter-tab${statusFilter === f.v ? ' active' : ''}`}
            onClick={() => {
              setStatusFilter(f.v);
              load(f.v);
            }}
          >
            {f.l}
          </button>
        ))}
      </div>
      {apps.length === 0 ? (
        <p className="admin-empty-text">No applications.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Email</th>
                <th>Business</th>
                <th>Documents</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td>{a.User?.fullName || 'N/A'}</td>
                  <td>{a.User?.email || 'N/A'}</td>
                  <td>{a.businessName}</td>
                  <td>
                    {Array.isArray(a.documents) && a.documents.length > 0 ? (
                      a.documents.map((d, i) => (
                        <a key={i} href={normalizeDocUrl(d)} target="_blank" rel="noopener noreferrer">
                          Doc {i + 1}
                          <br />
                        </a>
                      ))
                    ) : (
                      <span className="badge badge-empty">No docs</span>
                    )}
                  </td>
                  <td>{new Date(a.submittedAt || a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    {a.status === 'pending_review' && (
                      <>
                        <button className="action-btn btn-approve" onClick={() => approve(a.id)}>
                          Approve
                        </button>
                        <button className="action-btn btn-reject" onClick={() => reject(a.id)}>
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}


export function AdminCommissionsPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  async function load(p) {
    const res = await apiFetch(`/api/admin/commissions?page=${p||1}&limit=15`);
    if (res?.success) { setItems(res.data.items); setPage(res.data.pagination.page); setTotalPages(res.data.pagination.totalPages); setTotalCommissions(res.data.totalCommissions); setTotalItems(res.data.pagination.totalItems); }
  }
  useEffect(() => { load(1); }, []);

  return (
    <AdminShell title="Commission Earnings">
      <div className="admin-stats">
        <div className="admin-stat revenue-card">
          <span className="val">
            EGP {parseFloat(totalCommissions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="lbl">Total Earned</span>
        </div>
        <div className="admin-stat">
          <span className="val">{totalItems}</span>
          <span className="lbl">Paid Orders</span>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Seller</th>
              <th>Value</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.seller?.fullName || 'N/A'}</td>
                <td>EGP {parseFloat(o.totalPrice).toFixed(2)}</td>
                <td>
                  <span className="badge badge-approved">{o.commissionRate}</span>
                </td>
                <td className="commission-amount">
                  EGP {parseFloat(o.commissionAmount).toFixed(2)}
                </td>
                <td>
                  <span className={`badge badge-${o.orderStatus === 'delivered' ? 'approved' : 'pending_review'}`}>
                    {o.orderStatus}
                  </span>
                </td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={load} />
    </AdminShell>
  );
}
