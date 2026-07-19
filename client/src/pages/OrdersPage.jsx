import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch, apiDelete } from '../services/api';
import { useToast } from '../hooks/useToast';
import Spinner from '../components/common/Spinner';
import Pagination from '../components/common/Pagination';
import '../styles/pages/orders.css';


function groupOrders(orders) {
  const groups = [];
  const groupMap = new Map();

  for (const o of orders) {
    if (o.orderGroupId) {
      if (!groupMap.has(o.orderGroupId)) {
        const group = { groupId: o.orderGroupId, orders: [o], createdAt: o.createdAt };
        groupMap.set(o.orderGroupId, group);
        groups.push(group);
      } else {
        groupMap.get(o.orderGroupId).orders.push(o);
      }
    } else {
      
      groups.push({ groupId: null, orders: [o], createdAt: o.createdAt });
    }
  }

  return groups;
}

export default function OrdersPage() {
  const showToast = useToast();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showClearModal, setShowClearModal] = useState(false);
  const [paymentPopup, setPaymentPopup] = useState(null);

  const loadOrders = useCallback(async (p) => {
    setLoading(true);
    const currentPage = p || 1;
    setPage(currentPage);
    const res = await apiFetch(`/api/orders/history?page=${currentPage}&limit=50`);
    if (res?.success) {
      setOrders(res.data.items);
      setTotalPages(res.data.pagination.totalPages);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const orderId = searchParams.get('order_id');

    if (paymentStatus) {
      if (paymentStatus === 'success') {
        setPaymentPopup({
          type: 'success',
          message: `Your order #${orderId || ''} has been confirmed and is being processed.`
        });
      } else if (paymentStatus === 'failed') {
        setPaymentPopup({
          type: 'error',
          message: `We could not process your payment for order #${orderId || ''}. Please try again.`
        });
      }

      
      window.history.replaceState({}, document.title, window.location.pathname);

      
      setTimeout(() => setPaymentPopup(null), 5000);
    }

    loadOrders(1);
  }, [searchParams, loadOrders]);

  async function confirmClearAll() {
    setShowClearModal(false);
    const res = await apiDelete('/api/orders/history/clear');
    if (res?.success) { showToast('Order history cleared.'); loadOrders(1); }
    else showToast('Failed to clear order history.', true);
  }

  const grouped = groupOrders(orders);

  return (
    <main className="orders-page">
      <div className="orders-header-row">
        <h1 className="orders-heading">My Orders</h1>
        <button className="btn-clear-all" onClick={() => setShowClearModal(true)}>Clear All</button>
      </div>

      {paymentPopup && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          color: '#fff',
          backgroundColor: paymentPopup.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{paymentPopup.message}</span>
          <button 
            onClick={() => setPaymentPopup(null)} 
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            &times;
          </button>
        </div>
      )}

      {loading ? <Spinner text="Loading orders..." /> : grouped.length === 0 ? (
        <div className="empty-state"><h2>📦 No orders yet</h2><p>Start shopping to see your orders here.</p><Link to="/spare-parts">Browse Products →</Link></div>
      ) : (
        <>
          <div className="orders-list">
            {grouped.map((group) => {
              const isGrouped = group.orders.length > 1;
              const groupTotal = group.orders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0);
              const firstOrder = group.orders[0];

              if (!isGrouped) {
                
                const o = firstOrder;
                return (
                  <Link to={`/orders/${o.id}`} className="order-card" key={o.id}>
                    <div className="order-info">
                      <span className="order-title">{o.adTitle}</span>
                      <div className="order-meta">
                        <span>Qty: {o.quantity}</span>
                        <span>Unit: EGP {parseFloat(o.unitPrice).toFixed(2)}</span>
                        <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="order-badges">
                        <span className={`badge badge-${o.orderStatus}`}>{o.orderStatus}</span>
                        <span className={`badge badge-${o.paymentStatus}`}>{o.paymentStatus}</span>
                      </div>
                    </div>
                    <div className="order-right">
                      <span className="order-total">EGP {parseFloat(o.totalPrice).toFixed(2)}</span>
                    </div>
                  </Link>
                );
              }

              
              return (
                <div className="order-group-card" key={group.groupId}>
                  <div className="order-group-header">
                    <div className="order-group-title">
                      <span className="order-group-icon">📦</span>
                      <span>Order Group — {group.orders.length} items</span>
                    </div>
                    <div className="order-group-meta">
                      <span>{new Date(firstOrder.createdAt).toLocaleDateString()}</span>
                      <span className="order-group-total">Total: EGP {groupTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="order-group-items">
                    {group.orders.map((o) => (
                      <Link to={`/orders/${o.id}`} className="order-group-item" key={o.id}>
                        <div className="order-info">
                          <span className="order-title">{o.adTitle}</span>
                          <div className="order-meta">
                            <span>Qty: {o.quantity}</span>
                            <span>EGP {parseFloat(o.totalPrice).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="order-badges">
                          <span className={`badge badge-${o.orderStatus}`}>{o.orderStatus}</span>
                          <span className={`badge badge-${o.paymentStatus}`}>{o.paymentStatus}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={loadOrders} />
        </>
      )}
      {showClearModal && (
        <div className="modal-overlay active">
          <div className="modal-card-light">
            <h2>Clear Order History?</h2>
            <p>Are you sure?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowClearModal(false)}>Cancel</button>
              <button className="btn-submit-red" onClick={confirmClearAll}>Yes, Clear All</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
