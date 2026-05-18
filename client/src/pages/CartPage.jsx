import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiPut, apiDelete, apiPost } from '../services/api';
import { normalizeImageUrl, formatPrice } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/common/Spinner';
import '../styles/pages/cart.css';

export default function CartPage() {
  const showToast = useToast();
  const navigate = useNavigate();
  const { refreshCartBadge, refreshAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ itemCount: 0, subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressView, setAddressView] = useState('saved'); // 'saved' | 'form'
  const [cachedAddress, setCachedAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({ street: '', building: '', area: '', city: '', district: '', notes: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadCart(); }, []);

  async function loadCart() {
    setLoading(true);
    const [cartRes, summaryRes] = await Promise.all([apiFetch('/api/cart'), apiFetch('/api/cart/summary')]);
    if (cartRes && summaryRes) {
      setItems(cartRes.data || []);
      setSummary(summaryRes.data?.summary || { itemCount: 0, subtotal: 0 });
    }
    setLoading(false);
  }

  // Silent refresh — no spinner, just updates data in background
  const silentRefresh = useCallback(async () => {
    const [cartRes, summaryRes] = await Promise.all([apiFetch('/api/cart'), apiFetch('/api/cart/summary')]);
    if (cartRes && summaryRes) {
      setItems(cartRes.data || []);
      setSummary(summaryRes.data?.summary || { itemCount: 0, subtotal: 0 });
    }
  }, []);

  // Recalculate summary from local items
  function recalcSummary(updatedItems) {
    const subtotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.Ad.price) * item.quantity, 0);
    setSummary({ itemCount: updatedItems.length, subtotal });
  }

  async function updateQty(adId, newQty) {
    if (newQty < 1) return removeItem(adId);
    if (updatingId) return; // Prevent rapid overlapping clicks

    // Optimistic update — immediately reflect in UI
    setUpdatingId(adId);
    setItems(prev => {
      const updated = prev.map(item =>
        item.adId === adId ? { ...item, quantity: newQty } : item
      );
      recalcSummary(updated);
      return updated;
    });

    const res = await apiPut(`/api/cart/${adId}`, { quantity: newQty });
    if (res?.success) {
      refreshCartBadge();
      // Silently sync with server to ensure consistency
      await silentRefresh();
    } else {
      showToast(res?.message || 'Failed to update.', true);
      // Revert on failure
      await silentRefresh();
    }
    setUpdatingId(null);
  }

  async function removeItem(adId) {
    if (updatingId) return;

    // Optimistic remove
    setUpdatingId(adId);
    setItems(prev => {
      const updated = prev.filter(item => item.adId !== adId);
      recalcSummary(updated);
      return updated;
    });

    const res = await apiDelete(`/api/cart/${adId}`);
    if (res?.success) {
      showToast('Item removed.');
      refreshCartBadge();
      await silentRefresh();
    } else {
      showToast(res?.message || 'Failed to remove.', true);
      await silentRefresh();
    }
    setUpdatingId(null);
  }

  async function startCheckoutFlow() {
    const res = await apiFetch('/api/profile/address');
    if (!res) { showToast('Could not check delivery address.', true); return; }
    setCachedAddress(res.data);
    const hasSaved = res.data?.street && res.data?.city;
    if (hasSaved) {
      setAddressView('saved');
    } else {
      setAddressView('form');
      setAddressForm({ street: '', building: '', area: '', city: '', district: '', notes: '' });
    }
    setShowAddressModal(true);
  }

  async function proceedToFinalCheckout() {
    setProcessing(true);
    const res = await apiPost('/api/orders/checkout-cart');
    if (res?.success && res.data?.paymentKey) {
      setShowAddressModal(false);
      // Navigate to the checkout page and pass the paymentKey and subtotal
      navigate('/checkout', { 
        state: { 
          paymentKey: res.data.paymentKey, 
          amount: summary.subtotal 
        } 
      });
      refreshCartBadge();
    } else {
      showToast(res?.message || 'Checkout failed.', true);
    }
    setProcessing(false);
  }

  async function saveAddressAndCheckout() {
    const { street, building, area, city, district, notes } = addressForm;
    if (!street) { showToast('Street address is required.', true); return; }
    if (!building) { showToast('Building / Apt is required.', true); return; }
    if (!area) { showToast('Area is required.', true); return; }
    if (!city) { showToast('City is required.', true); return; }
    if (!district) { showToast('District is required.', true); return; }

    setProcessing(true);
    const res = await apiPut('/api/profile/address', { street, building, area, city, district, notes });
    if (!res?.success) {
      showToast(res?.message || 'Failed to save address.', true);
      setProcessing(false);
      return;
    }
    setCachedAddress(res.data);
    showToast('Address saved!');
    refreshAuth();
    await proceedToFinalCheckout();
  }

  if (loading) return <main className="cart-page"><Spinner text="Loading cart..." /></main>;

  return (
    <main className="cart-page">
      <h1 className="cart-heading">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="empty-cart"><h2>🛒 Your cart is empty</h2><p>Browse our catalog and add items to your cart.</p></div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const ad = item.Ad;
              const imgSrc = ad.images?.length > 0 ? normalizeImageUrl(ad.images[0]) : 'https://placehold.co/90x90/e2e8f0/1f2b3e?text=Item';
              const lineTotal = (parseFloat(ad.price) * item.quantity).toFixed(2);
              const isUpdating = updatingId === item.adId;
              return (
                <div className={`cart-item${isUpdating ? ' updating' : ''}`} key={item.adId}>
                  <div className="cart-item-img"><img src={imgSrc} alt={ad.title} /></div>
                  <div className="cart-item-info">
                    <span className="cart-item-name">{ad.title}</span>
                    <span className="cart-item-price">{formatPrice(ad.price)}</span>
                  </div>
                  <div className="cart-qty-stepper">
                    <button onClick={() => updateQty(item.adId, item.quantity - 1)} disabled={isUpdating} aria-label="Decrease quantity">−</button>
                    <input type="text" className="qty-val" value={item.quantity} readOnly />
                    <button onClick={() => updateQty(item.adId, item.quantity + 1)} disabled={isUpdating} aria-label="Increase quantity">+</button>
                  </div>
                  <span className="cart-line-total">EGP {lineTotal}</span>
                  <button className="cart-remove-btn" onClick={() => removeItem(item.adId)} disabled={isUpdating}>✕</button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row"><span className="label">Items</span><span className="value">{summary.itemCount}</span></div>
            <div className="summary-divider"></div>
            <div className="summary-total"><span>Total</span><span className="value">EGP {summary.subtotal.toFixed(2)}</span></div>
            <button className="btn-checkout" onClick={startCheckoutFlow}>Proceed to Checkout</button>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="address-modal-overlay open">
          <div className="address-modal">
            <div className="address-modal-header">
              <div className="address-modal-icon">📍</div>
              <h2>{addressView === 'saved' ? 'Confirm Delivery Address' : cachedAddress?.street ? 'Update Delivery Address' : 'Add Delivery Address'}</h2>
              <p className="address-modal-subtitle">
                {addressView === 'saved' ? 'Would you like your order delivered to this address?' : cachedAddress?.street ? 'Enter your new delivery address' : 'Please add your delivery address to continue checkout'}
              </p>
            </div>

            {addressView === 'saved' && cachedAddress && (
              <div className="address-view">
                <div className="saved-address-card">
                  {['street', 'building', 'area', 'city', 'district', 'notes'].map((f) => (
                    <div className="saved-addr-row" key={f}>
                      <span className="addr-label">{f === 'building' ? 'Building / Apt' : f.charAt(0).toUpperCase() + f.slice(1)}</span>
                      <span className="addr-value">{cachedAddress[f] || '—'}</span>
                    </div>
                  ))}
                </div>
                <p className="address-confirm-text">Would you like your order delivered to this address?</p>
                <div className="address-modal-actions">
                  <button className="addr-btn addr-btn-confirm" onClick={proceedToFinalCheckout} disabled={processing}>{processing ? 'Processing…' : '✓ Confirm & Checkout'}</button>
                  <button className="addr-btn addr-btn-change" onClick={() => {
                    setAddressView('form');
                    setAddressForm({
                      street: cachedAddress.street || '', building: cachedAddress.building || '',
                      area: cachedAddress.area || '', city: cachedAddress.city || '',
                      district: cachedAddress.district || '', notes: cachedAddress.notes || ''
                    });
                  }}>Change Address</button>
                </div>
              </div>
            )}

            {addressView === 'form' && (
              <form className="address-form" onSubmit={(e) => { e.preventDefault(); saveAddressAndCheckout(); }}>
                <div className="addr-form-row">
                  <div className="addr-form-group">
                    <label>Street Address <span className="required">*</span></label>
                    <input type="text" placeholder="e.g. 15 Tahrir Street" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} required />
                  </div>
                </div>
                <div className="addr-form-row addr-form-row-2">
                  <div className="addr-form-group">
                    <label>Building / Apt <span className="required">*</span></label>
                    <input type="text" placeholder="e.g. Building 3, Floor 5" value={addressForm.building} onChange={(e) => setAddressForm({ ...addressForm, building: e.target.value })} required />
                  </div>
                  <div className="addr-form-group">
                    <label>Area <span className="required">*</span></label>
                    <input type="text" placeholder="e.g. Downtown" value={addressForm.area} onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })} required />
                  </div>
                </div>
                <div className="addr-form-row addr-form-row-2">
                  <div className="addr-form-group">
                    <label>City <span className="required">*</span></label>
                    <input type="text" placeholder="e.g. Cairo" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} required />
                  </div>
                  <div className="addr-form-group">
                    <label>District <span className="required">*</span></label>
                    <input type="text" placeholder="e.g. Maadi" value={addressForm.district} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })} required />
                  </div>
                </div>
                <div className="addr-form-row">
                  <div className="addr-form-group">
                    <label>Additional Directions</label>
                    <textarea rows="2" placeholder="e.g. Near the gas station, gate #2" value={addressForm.notes} onChange={(e) => setAddressForm({ ...addressForm, notes: e.target.value })} />
                  </div>
                </div>
                <div className="address-modal-actions">
                  <button type="submit" className="addr-btn addr-btn-confirm" disabled={processing}>{processing ? 'Processing…' : 'Save & Checkout'}</button>
                  {cachedAddress?.street && <button type="button" className="addr-btn addr-btn-cancel" onClick={() => setAddressView('saved')}>Cancel</button>}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
