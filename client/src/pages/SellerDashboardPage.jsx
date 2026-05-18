import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, apiPut, apiDelete, apiPostForm, apiPutForm } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import '../styles/pages/seller-dashboard.css';

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

export default function SellerDashboardPage() {
  const showToast = useToast();
  const { user } = useAuth();
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
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const fileRef = useRef(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const res = await apiFetch('/api/seller/dashboard');
    if (!res?.success) return;
    const d = res.data;
    setStats(d.stats);
    setAds(d.ads || []);
    setSales(d.recentSales || []);
    setReviews(d.reviews || []);
    setUnreadCount(d.unreadNotificationsCount || 0);
  }

  async function loadNotifications() {
    const res = await apiFetch('/api/seller/notifications');
    if (res?.success) setNotifs(res.data || []);
  }

  function switchTab(t) {
    setTab(t);
    if (t === 'dashboard') loadDashboard();
    if (t === 'listings') loadDashboard();
    if (t === 'reviews') loadDashboard();
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
    const brands = BRANDS_BY_CAT[adForm.category] || [];
    if (adForm.brand && !brands.includes(adForm.brand)) { showToast('Select a valid brand.', true); return; }
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

  return (
    <div className="seller-dash-wrapper">
      <div className="dashboard-layout">
        <aside className="sidebar cyan-frame">
          <div className="sidebar-header"><h3>Seller Panel</h3></div>
          <nav className="sidebar-nav">
            {['dashboard','listings','reviews','notifications'].map((t) => (
              <a key={t} href="#" className={`sidebar-item${tab === t ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); switchTab(t); }}>
                {t === 'dashboard' ? '📊' : t === 'listings' ? '📦' : t === 'reviews' ? '⭐' : '🔔'} {t.charAt(0).toUpperCase() + t.slice(1)}
              </a>
            ))}
          </nav>
        </aside>
        <main className="main-content">
          {/* Dashboard Tab */}
          {tab === 'dashboard' && stats && (
            <div>
              <h1>Dashboard</h1>
              <div className="stats-row">
                <div className="stat-card"><span className="stat-val">{stats.totalSales}</span><span className="stat-lbl">Total Sales</span></div>
                <div className="stat-card"><span className="stat-val" style={{color:'#94a3b8'}}>{formatEgp(stats.grossRevenue)}</span><span className="stat-lbl">Gross Revenue</span></div>
                <div className="stat-card"><span className="stat-val" style={{color:'#f87171'}}>{formatEgp(stats.totalCommission)}</span><span className="stat-lbl">Commissions Deducted</span></div>
                <div className="stat-card"><span className="stat-val" style={{color:'#4ade80'}}>{formatEgp(stats.netRevenue)}</span><span className="stat-lbl">Net Revenue</span></div>
              </div>
              <div className="recent-sales cyan-frame"><h2>Recent Sales</h2>
                {sales.length === 0 ? <p style={{color:'rgba(255,255,255,0.5)'}}>No sales yet.</p> : (
                  <div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Product</th><th>Buyer</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                    <tbody>{groupedSales.map((g) => {
                      const next = NEXT_STATUS[g.orderStatus];
                      return (<tr key={g.id}><td>{g.adTitles.join(', ')}</td><td>{g.buyer?.fullName||'N/A'}</td><td>{g.totalQty}</td><td>EGP {g.combinedTotal.toFixed(2)}</td>
                        <td><span className="badge-status badge-active">{g.orderStatus}</span></td><td>{new Date(g.createdAt).toLocaleDateString()}</td>
                        <td>{next ? <button className="lc-btn lc-btn-edit" onClick={() => advanceStatus(g.ids, next)}>🚚 Mark Delivered</button> : <span style={{color:'#4ade80',fontWeight:600}}>✅ Done</span>}</td></tr>);
                    })}</tbody></table></div>
                )}
              </div>
            </div>
          )}

          {/* Listings Tab */}
          {tab === 'listings' && (
            <div>
              <div className="listings-header"><h1>My Listings</h1><button className="btn-new-ad" onClick={openNewAd}>+ Post New Ad</button></div>
              <div className="listings-grid">
                {ads.length === 0 ? <p style={{color:'rgba(255,255,255,0.5)'}}>No listings yet.</p> :
                  ads.map((a) => (
                    <div className="listing-card" key={a.id}>
                      <div className="lc-title">{a.title}</div>
                      <div className="lc-meta"><span>Qty: {a.quantity}</span><span className={`badge-status badge-${a.status}`}>{a.status}</span>{a.countryOfOrigin && <span>🌍 {a.countryOfOrigin}</span>}</div>
                      <div className="lc-price">EGP {parseFloat(a.price).toFixed(2)}</div>
                      <div className="lc-actions">
                        {a.status === 'active' ? (<><button className="lc-btn lc-btn-edit" onClick={() => editAd(a.id)}>✏️ Edit</button><button className="lc-btn lc-btn-del" onClick={() => deleteAd(a.id)}>🗑 Delete</button></>) :
                          <button className="lc-btn lc-btn-del" onClick={() => hardDeleteAd(a.id)}>🗑 Remove</button>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {tab === 'reviews' && (
            <div>
              <div className="listings-header"><h1>My Reviews</h1></div>
              <div className="cyan-frame" style={{ padding: '2rem' }}>
                {reviews.length === 0 ? <p style={{color:'rgba(255,255,255,0.5)'}}>No reviews yet.</p> :
                  reviews.map((r) => (
                    <div key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>{r.buyer?.fullName || 'Anonymous'}</strong>
                        <span style={{ color: '#facc15' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      </div>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>{r.comment || 'No comment provided.'}</p>
                      <small style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', display: 'block' }}>{new Date(r.createdAt).toLocaleDateString()}</small>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === 'notifications' && (
            <div>
              <div className="listings-header"><h1>Notifications</h1>
                <div><button className="btn-mark-read" onClick={markAllRead}>Mark all as read</button>
                  <button className="btn-mark-read" style={{background:'rgba(239,68,68,0.15)',borderColor:'#ef4444',color:'#ef4444',marginLeft:10}} onClick={clearNotifs}>Clear All</button></div>
              </div>
              {notifs.length === 0 ? <p style={{color:'rgba(255,255,255,0.5)'}}>No notifications.</p> :
                notifs.map((n) => (<div key={n.id} className={`notif-item${n.isRead ? '' : ' unread'}`}>
                  <span className="notif-icon">{n.type === 'new_order' ? '📦' : '🔔'}</span>
                  <div className="notif-body"><div className="notif-msg">{n.message}</div><div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div></div>
                </div>))}
            </div>
          )}
        </main>
      </div>

      {/* Ad Modal */}
      {showModal && (
        <div className="modal-overlay active">
          <div className="modal-card cyan-frame">
            <h2>{editData ? 'Edit Ad' : 'Post New Ad'}</h2>
            <form onSubmit={submitAd}>
              <div className="form-group"><label>Title</label><input type="text" value={adForm.title} onChange={(e) => setAdForm({...adForm, title: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Brand</label><select value={adForm.brand} onChange={(e) => setAdForm({...adForm, brand: e.target.value})}><option value="">Select Brand</option>{brands.map((b)=><option key={b} value={b}>{b}</option>)}</select></div>
                <div className="form-group"><label>Category</label><select value={adForm.category} onChange={(e) => setAdForm({...adForm, category: e.target.value, brand:''})}>
                  <option value="Spare Parts">Spare Parts</option><option value="Auto Accessories">Auto Accessories</option><option value="Heavy Machinery">Heavy Machinery</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Price (EGP)</label><input type="number" step="0.01" min="0" value={adForm.price} onChange={(e) => setAdForm({...adForm, price: e.target.value})} required /></div>
                <div className="form-group"><label>Quantity</label><input type="number" min="0" value={adForm.quantity} onChange={(e) => setAdForm({...adForm, quantity: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Origin</label><select value={adForm.origin} onChange={(e) => setAdForm({...adForm, origin: e.target.value})}><option value="">Select Origin</option>{ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="form-group"><label>Warranty (months)</label><input type="number" min="0" value={adForm.warranty} onChange={(e) => setAdForm({...adForm, warranty: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea rows="3" value={adForm.description} onChange={(e) => setAdForm({...adForm, description: e.target.value})} /></div>
              <div className="form-group"><label>Images</label><input type="file" ref={fileRef} accept=".jpg,.jpeg,.png" multiple /></div>
              <div className="modal-actions"><button type="submit" className="btn-submit">Save</button><button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay active">
          <div className="modal-card cyan-frame" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', color: '#00E5FF' }}>Confirm Action</h3>
            <p style={{ marginBottom: '2rem' }}>{confirmDialog.message}</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-submit" onClick={confirmDialog.onConfirm}>Yes</button>
              <button className="btn-cancel" onClick={() => setConfirmDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
