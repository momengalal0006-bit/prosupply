import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import Spinner from '../components/common/Spinner';
import '../styles/pages/order-detail.css';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiFetch(`/api/orders/${id}`);
      if (res?.success) setOrder(res.data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Spinner text="Loading order..." />;
  if (!order) return <main className="order-detail-page"><p>Order not found.</p></main>;

  const o = order;
  return (
    <main className="order-detail-page">
      <Link to="/orders" className="back-link">← Back to Orders</Link>
      <div className="order-detail-card">
        <h1>Order #{o.id}</h1>
        <div className="detail-row"><span className="label">Product</span><span className="value">{o.adTitle}</span></div>
        <div className="detail-row"><span className="label">Unit Price</span><span className="value">EGP {parseFloat(o.unitPrice).toFixed(2)}</span></div>
        <div className="detail-row"><span className="label">Quantity</span><span className="value">{o.quantity}</span></div>
        <div className="detail-row"><span className="label">Payment Method</span><span className="value">{o.paymentMethod}</span></div>
        <div className="detail-row"><span className="label">Payment Status</span><span className="value"><span className={`badge badge-${o.paymentStatus}`}>{o.paymentStatus}</span></span></div>
        <div className="detail-row"><span className="label">Order Status</span><span className="value"><span className={`badge badge-${o.orderStatus}`}>{o.orderStatus}</span></span></div>
        <div className="detail-row"><span className="label">Seller</span><span className="value">{o.seller?.fullName || 'N/A'}</span></div>
        <div className="detail-row"><span className="label">Date</span><span className="value">{new Date(o.createdAt).toLocaleString()}</span></div>
        <div className="detail-row detail-total"><span className="label">Total</span><span className="value">EGP {parseFloat(o.totalPrice).toFixed(2)}</span></div>
        {o.orderStatus === 'delivered' && (
          <Link to={`/product/${o.adId}`} className="btn-rate">⭐ Rate this Product</Link>
        )}
      </div>
    </main>
  );
}
