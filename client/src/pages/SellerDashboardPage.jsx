import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, apiPut, apiDelete, apiPostForm, apiPutForm } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { normalizeImageUrl, starsArray } from '../utils/helpers';
import Spinner from '../components/common/Spinner';
import '../styles/pages/seller-dashboard.css';
import '../styles/pages/category.css';
import '../styles/pages/product-detail.css';
import '../styles/pages/seller-profile.css';

const PLACEHOLDER = 'https://placehold.co/300x300/e2e8f0/1f2b3e?text=Product';

const BRANDS_BY_CAT = {
  'Spare Parts': ['Toyota','BMW','Mercedes','Ford','Honda','Hyundai','Universal'],
  'Auto Accessories': ['Toyota','BMW','Mercedes','Ford','Honda','Hyundai','Universal'],
  'Heavy Machinery': ['Caterpillar','Komatsu','Volvo','John Deere','Liebherr','Doosan','XCMG'],
};
const NEXT_STATUS = { placed:'delivered', confirmed:'delivered', shipped:'delivered' };
const ORIGINS = ['USA', 'Germany', 'Japan', 'China', 'Taiwan', 'South Korea', 'Sweden', 'Italy', 'France', 'UK', 'India', 'Turkey', 'Egypt'];

function formatEgp(value) {
  const n = parseFloat(value ?? 0);
  if (Number.isNaN(n)) return 'EGP 0.00';
  return `EGP ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TrustBadge({ score }) {
  if (score === null || score === undefined) return null;
  const s = parseFloat(score);
  let label, className;
  if (s >= 80) { label = 'Highly Trusted'; className = 'trust-high'; }
  else if (s >= 60) { label = 'Trusted'; className = 'trust-good'; }
  else if (s >= 40) { label = 'Moderate'; className = 'trust-moderate'; }
  else if (s >= 20) { label = 'Low Trust'; className = 'trust-low'; }
  else { label = 'Flagged'; className = 'trust-flagged'; }
  return <span className={`trust-badge ${className}`} title={`Trust Score: ${s}/100`}>🛡️ {label}</span>;
}

export default function SellerDashboardPage() {
  const showToast = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [ads, setAds] = useState([]);
  const [sales, setSales] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [adForm, setAdForm] = useState({ title:'',brand:'',category:'Spare Parts',price:'',quantity:'',origin:'',warranty:'0',description:'' });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null); 
  const fileRef = useRef(null);

  const [sortBy, setSortBy] = useState('newest');

  
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.sellerStatus !== 'approved') {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && user.sellerStatus === 'approved') {
      loadDashboard(true);
    }
  }, [user]);

  async function loadDashboard(isInitial = false) {
    if (isInitial || !stats) {
      setLoading(true);
    }
    const res = await apiFetch('/api/seller/dashboard');
    if (res?.success) {
      const d = res.data;
      setStats(d.stats);
      setAds(d.ads || []);
      setSales(d.recentSales || []);
      setReviews(d.reviews || []);
      setUnreadCount(d.unreadNotificationsCount || 0);
    }
    setLoading(false);
  }

  async function loadNotifications() {
    const res = await apiFetch('/api/seller/notifications');
    if (res?.success) setNotifs(res.data || []);
  }

  function switchTab(t) {
    setTab(t);
    if (t === 'notifications') loadNotifications();
  }

  async function advanceStatus(orderIds, newStatus) {
    const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
    let allSuccess = true;
    for (const id of ids) {
      const res = await apiPut(`/api/seller/${id}/status`, { status: newStatus });
      if (!res?.success) allSuccess = false;
    }
    if (allSuccess) { showToast(`Order marked as "${newStatus}".`); }
    else { showToast('Some items failed to update.', true); }
    loadDashboard();
  }

  async function deleteAd(id) {
    setConfirmDialog({
      message: 'Delete this ad? It will be marked as deleted.',
      onConfirm: async () => {
        setConfirmDialog(null);
        const res = await apiDelete(`/api/ads/${id}`);
        if (res?.success) { showToast('Ad deleted.'); loadDashboard(); } else showToast(res?.message || 'Failed.', true);
      }
    });
  }

  async function hardDeleteAd(id) {
    setConfirmDialog({
      message: 'Permanently remove this ad? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(null);
        const res = await apiDelete(`/api/ads/${id}/hard`);
        if (res?.success) { showToast('Ad removed.'); loadDashboard(); } else showToast(res?.message || 'Failed.', true);
      }
    });
  }

  async function editAd(id) {
    const res = await apiFetch(`/api/ads/${id}/edit`);
    if (res?.success) {
      const d = res.data;
      setEditData(d);
      setAdForm({ title:d.title||'',brand:d.brand||'',category:d.category||'Spare Parts',price:d.price||'',quantity:d.quantity||'',origin:d.countryOfOrigin||'',warranty:d.warrantyMonths||'0',description:d.description||'' });
      setShowModal(true);
    } else showToast(res?.message || 'Cannot edit.', true);
  }

  function openNewAd() { 
    if (!user?.deliveryStreet || !user?.deliveryCity || !user?.phone) {
      showToast('Please register your delivery address in your Profile before posting ads.', true);
      return;
    }
    setEditData(null); 
    setAdForm({ title:'',brand:'',category:'Spare Parts',price:'',quantity:'',origin:'',warranty:'0',description:'' }); 
    setImagePreviews([]); 
    setShowModal(true); 
  }

  async function submitAd(e) {
    e.preventDefault();
    if (!adForm.title.trim()) { showToast('Title is required.', true); return; }
    if (!adForm.brand) { showToast('Please select a brand.', true); return; }
    if (!adForm.category) { showToast('Please select a category.', true); return; }
    const brands = BRANDS_BY_CAT[adForm.category] || [];
    if (!brands.includes(adForm.brand)) { showToast('Select a valid brand.', true); return; }
    if (!adForm.price || parseFloat(adForm.price) <= 0) { showToast('Price must be greater than 0.', true); return; }
    if (!adForm.quantity || parseInt(adForm.quantity) <= 0) { showToast('Quantity must be greater than 0.', true); return; }
    if (!adForm.origin) { showToast('Please select origin country.', true); return; }
    if (adForm.warranty === '' || parseInt(adForm.warranty) < 0) { showToast('Warranty is required and must be 0 or more.', true); return; }
    if (!adForm.description.trim()) { showToast('Description is required.', true); return; }
    const files = fileRef.current?.files;
    if (!editData && (!files || files.length === 0)) { showToast('Please add at least one product image.', true); return; }
    const fd = new FormData();
    fd.append('title', adForm.title); fd.append('brand', adForm.brand); fd.append('category', adForm.category);
    fd.append('price', adForm.price); fd.append('quantity', adForm.quantity); fd.append('countryOfOrigin', adForm.origin);
    fd.append('warrantyMonths', adForm.warranty); fd.append('description', adForm.description);
    if (files) for (const f of files) fd.append('images', f);
    const url = editData ? `/api/ads/${editData.id}` : '/api/ads';
    const res = editData ? await apiPutForm(url, fd) : await apiPostForm(url, fd);
    if (res?.success) { showToast(editData ? 'Ad updated!' : 'Ad posted!'); setShowModal(false); loadDashboard(); }
    else showToast(res?.message || 'Failed.', true);
  }

  async function markAllRead() {
    await apiPut('/api/seller/notifications/read-all', {});
    showToast('All marked as read.'); setUnreadCount(0); loadNotifications();
  }

  async function clearNotifs() {
    setConfirmDialog({
      message: 'Clear all notifications?',
      onConfirm: async () => {
        setConfirmDialog(null);
        const res = await apiDelete('/api/seller/notifications/clear');
        if (res?.success) { showToast('Cleared.'); setUnreadCount(0); loadNotifications(); }
      }
    });
  }

  const brands = BRANDS_BY_CAT[adForm.category] || [];

  const groupedSales = [];
  const groupMap = {};
  sales.forEach(s => {
    const key = s.orderGroupId ? `${s.orderGroupId}-${s.orderStatus}` : s.id;
    if (!groupMap[key]) {
      groupMap[key] = {
        ...s,
        ids: [s.id],
        adTitles: [s.adTitle],
        totalQty: s.quantity,
        combinedTotal: parseFloat(s.totalPrice),
      };
      groupedSales.push(groupMap[key]);
    } else {
      groupMap[key].ids.push(s.id);
      groupMap[key].adTitles.push(s.adTitle);
      groupMap[key].totalQty += s.quantity;
      groupMap[key].combinedTotal += parseFloat(s.totalPrice);
    }
  });

  
  if (authLoading || loading || !user || user.sellerStatus !== 'approved') {
    return (
      <>
        <div className="seller-profile-header">
          <div className="seller-profile-header-inner">
            <div className="seller-avatar seller-profile-skeleton skeleton-avatar"></div>
            <div className="seller-header-info">
              <div className="seller-profile-skeleton skeleton-title"></div>
              <div className="seller-profile-skeleton skeleton-subtitle"></div>
            </div>
          </div>
        </div>
        <div className="seller-profile-body">
          <Spinner text={authLoading ? "Verifying access..." : "Loading dashboard..."} />
        </div>
      </>
    );
  }

  const initials = user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'S';
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A';

  return (
    <div className="seller-dash-wrapper">
      
      <div className="seller-profile-header">
        <div className="seller-profile-header-inner">
          <div className="seller-avatar">{initials}</div>
          <div className="seller-header-info">
            <h1 className="seller-header-name">{user.fullName}</h1>
            <div className="seller-header-meta">
              <span className="seller-member-since">📅 Member since {memberSince}</span>
              <div className="seller-header-rating">
                <span className="rating-star">★</span>
                <span className="rating-value">
                  {user.avgSellerRating ? parseFloat(user.avgSellerRating).toFixed(1) : '—'}
                </span>
                <span className="rating-count">({reviews.length} reviews)</span>
              </div>
              <TrustBadge score={user.trustScore} />
            </div>
          </div>
          <div className="seller-header-actions">
            <button className="btn-contact-seller" onClick={openNewAd}>
              + Post New Ad
            </button>
          </div>
        </div>
      </div>

      
      <div className="seller-profile-body">
        <div className="dashboard-layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <h3>Panel Navigation</h3>
            </div>
            <nav className="sidebar-nav">
              {['dashboard', 'listings', 'reviews', 'notifications'].map((t) => (
                <a
                  key={t}
                  href="#"
                  className={`sidebar-item${tab === t ? ' active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    switchTab(t);
                  }}
                >
                  <span className="sidebar-icon">
                    {t === 'dashboard' ? '📊' : t === 'listings' ? '📦' : t === 'reviews' ? '⭐' : '🔔'}
                  </span>
                  <span className="sidebar-text">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                  {t === 'notifications' && unreadCount > 0 && (
                    <span className="sidebar-badge-count">{unreadCount}</span>
                  )}
                </a>
              ))}
            </nav>
          </aside>

          <main className="main-content">
            
            {tab === 'dashboard' && stats && (
              <div className="tab-pane-content">
                <h2 className="seller-section-heading">📊 Dashboard Overview</h2>
                <div className="stats-row">
                  <div className="stat-card">
                    <span className="stat-val">{stats.totalSales}</span>
                    <span className="stat-lbl">Total Sales</span>
                  </div>
                  <div className="stat-card card-gross">
                    <span className="stat-val">{formatEgp(stats.grossRevenue)}</span>
                    <span className="stat-lbl">Gross Revenue</span>
                  </div>
                  <div className="stat-card card-comm">
                    <span className="stat-val">{formatEgp(stats.totalCommission)}</span>
                    <span className="stat-lbl">Commissions Deducted</span>
                  </div>
                  <div className="stat-card card-net">
                    <span className="stat-val">{formatEgp(stats.netRevenue)}</span>
                    <span className="stat-lbl">Net Revenue</span>
                  </div>
                </div>

                <div className="recent-sales-card">
                  <h2>Recent Sales Transactions</h2>
                  {sales.length === 0 ? (
                    <div className="seller-empty-state">
                      <span className="empty-icon">📈</span>
                      <p>No sales recorded yet.</p>
                      <small>When buyers purchase your products, they will appear here.</small>
                    </div>
                  ) : (
                    <div className="sales-table-wrap">
                      <table className="sales-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Buyer</th>
                            <th>Qty</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedSales.map((g) => {
                            const next = NEXT_STATUS[g.orderStatus];
                            return (
                              <tr key={g.id}>
                                <td>{g.adTitles.join(', ')}</td>
                                <td>{g.buyer?.fullName || 'N/A'}</td>
                                <td>{g.totalQty}</td>
                                <td>{formatEgp(g.combinedTotal)}</td>
                                <td>
                                  <span className={`badge badge-${g.orderStatus}`}>
                                    {g.orderStatus}
                                  </span>
                                </td>
                                <td>{new Date(g.createdAt).toLocaleDateString()}</td>
                                <td>
                                  {next ? (
                                    <button
                                      className="lc-btn lc-btn-edit"
                                      onClick={() => advanceStatus(g.ids, next)}
                                    >
                                      🚚 Mark Delivered
                                    </button>
                                  ) : (
                                    <span className="sales-done-badge">✓ Completed</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            
            {tab === 'listings' && (
              <div className="tab-pane-content">
                <div className="listings-header">
                  <h2 className="seller-section-heading">
                    📦 My Listings
                    <span className="section-count">{ads.length}</span>
                  </h2>
                  <button className="btn-contact-seller" onClick={openNewAd}>
                    + Post New Ad
                  </button>
                </div>

                {ads.length === 0 ? (
                  <div className="seller-empty-state">
                    <span className="empty-icon">📦</span>
                    <p>No product listings yet.</p>
                    <small>Click "+ Post New Ad" above to start selling on ProSupply.</small>
                  </div>
                ) : (
                  <div className="products-grid">
                    {ads.map((a) => {
                      const imgSrc = a.images?.length > 0 ? normalizeImageUrl(a.images[0], PLACEHOLDER) : PLACEHOLDER;
                      const sellerName = user.fullName;
                      const sellerRatingVal = user.avgSellerRating ? parseFloat(user.avgSellerRating).toFixed(1) : '—';
                      const stars = starsArray(a.avgRating || 0);

                      return (
                        <div className="product-card" key={a.id}>
                          <div className="product-img-wrap">
                            <Link to={`/product/${a.id}`}>
                              <img src={imgSrc} alt={a.title} loading="lazy" />
                            </Link>
                            <span className={`badge-status badge-${a.status}`}>{a.status}</span>
                          </div>
                          <div className="product-info">
                            <Link to={`/product/${a.id}`} className="product-name" title={a.title}>
                              {a.title}
                            </Link>
                            <span className="product-price">EGP {parseFloat(a.price).toFixed(2)}</span>
                            <div className="product-stars">
                              {stars.map((s) => (
                                <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>
                              ))}
                            </div>
                            <span className="seller-badge">
                              <span className="seller-name-link disabled">
                                {sellerName}
                              </span>
                              {' '}<span className="mini-star">★</span> {sellerRatingVal}
                              {(user.trustScore != null) && (() => {
                                const ts = parseFloat(user.trustScore);
                                let label, cls;
                                if (ts >= 80) { label = '✓ Trusted'; cls = 'trust-tag-good'; }
                                else if (ts >= 60) { label = '✓'; cls = 'trust-tag-ok'; }
                                else if (ts < 40) { label = '⚠'; cls = 'trust-tag-warn'; }
                                else return null;
                                return <span className={`trust-tag ${cls}`}>{label}</span>;
                              })()}
                            </span>
                            <div className="lc-meta">
                              <span>Qty: {a.quantity} available</span>
                              {a.countryOfOrigin && <span>🌍 {a.countryOfOrigin}</span>}
                            </div>
                            
                            <div className="lc-actions">
                              {a.status === 'active' ? (
                                <>
                                  <button className="lc-btn lc-btn-edit" onClick={() => editAd(a.id)}>✏️ Edit</button>
                                  <button className="lc-btn lc-btn-del" onClick={() => deleteAd(a.id)}>🗑 Delete</button>
                                </>
                              ) : (
                                <button className="lc-btn lc-btn-del" onClick={() => hardDeleteAd(a.id)}>🗑 Remove</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            
            {tab === 'reviews' && (() => {
              const totalReviews = reviews.length;
              const avgRating = totalReviews > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) : 0;
              const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
              reviews.forEach(r => {
                distribution[r.rating] = (distribution[r.rating] || 0) + 1;
              });

              
              const sortedReviews = [...reviews].sort((a, b) => {
                switch (sortBy) {
                  case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
                  case 'highest': return b.rating - a.rating;
                  case 'lowest': return a.rating - b.rating;
                  default: return new Date(b.createdAt) - new Date(a.createdAt); 
                }
              });

              return (
                <div className="tab-pane-content">
                  <h2 className="seller-section-heading">
                    ⭐ Ratings & Reviews
                    <span className="section-count">{totalReviews}</span>
                  </h2>

                  
                  {totalReviews > 0 && (
                    <div className="rating-distribution">
                      <div className="rating-overview">
                        <div className="rating-big-number">
                          <span className="big-value">{avgRating.toFixed(1)}</span>
                          <span className="big-stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={i < Math.round(avgRating) ? '' : 'empty'}>★</span>
                            ))}
                          </span>
                          <span className="big-total">{totalReviews} reviews</span>
                        </div>
                        <div className="rating-bars">
                          {[5, 4, 3, 2, 1].map((level) => {
                            const count = distribution[level] || 0;
                            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                              <div className="rating-bar-row" key={level}>
                                <span className="rating-bar-label">{level}★</span>
                                <div className="rating-bar-track">
                                  <div className="rating-bar-fill" style={{ width: `${pct}%` }}></div>
                                </div>
                                <span className="rating-bar-count">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {totalReviews > 0 && (
                    <div className="reviews-toolbar">
                      <span className="reviews-count-text">
                        Showing {sortedReviews.length} reviews
                      </span>
                      <select
                        className="reviews-sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                      </select>
                    </div>
                  )}

                  <div className="seller-reviews-list">
                    {sortedReviews.length === 0 ? (
                      <div className="seller-empty-state">
                        <span className="empty-icon">⭐</span>
                        <p>No customer reviews yet.</p>
                        <small>Reviews from buyers who rate your service will appear here.</small>
                      </div>
                    ) : (
                      sortedReviews.map((r) => {
                        const reviewStars = starsArray(r.rating);
                        return (
                          <div key={r.id} className="seller-review-card">
                            <div className="seller-review-header">
                              <strong>{r.buyer?.fullName || 'Anonymous'}</strong>
                              <div className="seller-review-stars">
                                {reviewStars.map((s) => (
                                  <span key={s.index} className={s.filled ? '' : 'empty'}>★</span>
                                ))}
                              </div>
                            </div>
                            <p className="seller-review-comment">{r.comment || 'No comment provided.'}</p>
                            <span className="seller-review-date">
                              {new Date(r.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            
            {tab === 'notifications' && (
              <div className="tab-pane-content">
                <div className="listings-header">
                  <h2 className="seller-section-heading">
                    🔔 Notifications
                    {unreadCount > 0 && <span className="section-count">{unreadCount} unread</span>}
                  </h2>
                  <div className="notif-actions">
                    <button className="btn-mark-read" onClick={markAllRead}>Mark all as read</button>
                    <button
                      className="btn-mark-read btn-clear-all"
                      onClick={clearNotifs}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                {notifs.length === 0 ? (
                  <div className="seller-empty-state">
                    <span className="empty-icon">🔔</span>
                    <p>No notifications.</p>
                    <small>Alerts about sales, system updates, and reviews will be sent here.</small>
                  </div>
                ) : (
                  <div className="notifs-list">
                    {notifs.map((n) => (
                      <div key={n.id} className={`notif-item${n.isRead ? '' : ' unread'}`}>
                        <span className="notif-icon">{n.type === 'new_order' ? '📦' : '🔔'}</span>
                        <div className="notif-body">
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <h2>{editData ? '✏️ Edit Listing' : '📦 Post New Listing'}</h2>
            <form onSubmit={submitAd}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={adForm.title}
                  onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                  placeholder="e.g. Front Brake Pads for Toyota Corolla"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Brand</label>
                  <select
                    value={adForm.brand}
                    onChange={(e) => setAdForm({ ...adForm, brand: e.target.value })}
                    required
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={adForm.category}
                    onChange={(e) => setAdForm({ ...adForm, category: e.target.value, brand: '' })}
                    required
                  >
                    <option value="Spare Parts">Spare Parts</option>
                    <option value="Auto Accessories">Auto Accessories</option>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={adForm.price}
                    onChange={(e) => setAdForm({ ...adForm, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={adForm.quantity}
                    onChange={(e) => setAdForm({ ...adForm, quantity: e.target.value })}
                    placeholder="1"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Origin</label>
                  <select
                    value={adForm.origin}
                    onChange={(e) => setAdForm({ ...adForm, origin: e.target.value })}
                    required
                  >
                    <option value="">Select Origin</option>
                    {ORIGINS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Warranty (months)</label>
                  <input
                    type="number"
                    min="0"
                    value={adForm.warranty}
                    onChange={(e) => setAdForm({ ...adForm, warranty: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={adForm.description}
                  onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                  placeholder="Provide detailed description of the product including specifications, compatibility, and state..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Images</label>
                <input type="file" ref={fileRef} accept=".jpg,.jpeg,.png" multiple />
                <small className="form-hint">
                  You can upload multiple images. Supported formats: JPG, PNG.
                </small>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-contact-seller">Save Listing</button>
                <button type="button" className="btn-cancel-modal" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay active">
          <div className="modal-card confirm-modal-card">
            <h3 className="confirm-modal-title">
              Confirm Action
            </h3>
            <p className="confirm-modal-message">
              {confirmDialog.message}
            </p>
            <div className="confirm-modal-actions">
              <button className="btn-contact-seller confirm-modal-btn" onClick={confirmDialog.onConfirm}>
                Yes, Confirm
              </button>
              <button className="btn-cancel-modal confirm-modal-btn" onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
