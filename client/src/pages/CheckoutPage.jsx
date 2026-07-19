

import { useLocation, useNavigate } from 'react-router-dom';
import PaymobCheckout from '../components/PaymobCheckout';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { paymentKey, amount } = location.state || {};

  
  if (!paymentKey) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', minHeight: '60vh' }}>
        <h2>Invalid Checkout Session</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please initiate checkout from your cart.</p>
        <button className="pg-btn pg-active" onClick={() => navigate('/cart')}>Return to Cart</button>
      </div>
    );
  }

  
  const handleSuccess = (data) => {
    console.log('✅ Payment success callback:', data);
    setTimeout(() => navigate('/orders'), 2000);
  };

  const handleError = (err) => {
    console.error('❌ Payment error callback:', err);
  };

  return (
    <div style={{ padding: '2rem 1rem', minHeight: '60vh', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Secure Payment</h1>
      
      <PaymobCheckout
        paymentKey={paymentKey}
        amount={amount ? Math.round(amount * 100) : 0} 
        currency="EGP"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
