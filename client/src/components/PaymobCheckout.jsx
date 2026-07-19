

import { useState, useEffect } from 'react';
import '../styles/pages/PaymobCheckout.css';



const PAYMOB_IFRAME_ID = import.meta.env.VITE_PAYMOB_IFRAME_ID || '';


export default function PaymobCheckout({
  paymentKey,
  amount       = 5000,
  currency     = 'EGP',
  onSuccess,
  onError,
}) {
  const [errorMsg, setErrorMsg] = useState('');

  
  const displayAmount = (amount / 100).toFixed(2);

  
  useEffect(() => {
    function handleMessage(event) {
      if (!event.origin.includes('paymob.com') && !event.origin.includes('accept.paymob')) {
        return;
      }

      const { data } = event;
      if (!data) return;

      
      if (typeof data === 'object') {
        if (data.type === 'TRANSACTION_COMPLETED' || data.success === true || data.txn_response_code === '0') {
          onSuccess?.(data);
        } else if (data.type === 'TRANSACTION_FAILED' || data.success === false) {
          setErrorMsg('Payment was not completed. ' + (data.data?.message || ''));
          onError?.(data);
        }
      }

      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success === true || parsed.txn_response_code === '0') {
            onSuccess?.(parsed);
          } else if (parsed.success === false) {
            setErrorMsg('Payment failed or was declined.');
            onError?.(parsed);
          }
        } catch {
          
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError]);

  
  if (!PAYMOB_IFRAME_ID) {
    return (
      <div className="paymob-error-container">
        <h3>Configuration Error</h3>
        <p>VITE_PAYMOB_IFRAME_ID is missing from the frontend .env file.</p>
      </div>
    );
  }

  if (!paymentKey) {
    return (
      <div className="paymob-error-container">
        <h3>Payment Error</h3>
        <p>No payment key was provided by the server.</p>
      </div>
    );
  }

  
  const iframeSrc = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

  
  
  

  return (
    <div className="paymob-checkout" style={{ width: '100%', maxWidth: '100%', margin: '0 auto', border: 'none' }}>
      
      
      <div className="paymob-header" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.2rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Secure Checkout
        </h2>
        <div className="paymob-amount-display" style={{ marginTop: '0.5rem' }}>
          <span className="paymob-amount-value">{displayAmount}</span>
          <span className="paymob-amount-currency" style={{ marginLeft: '4px' }}>{currency}</span>
        </div>
      </div>

      
      {errorMsg && (
        <div className="paymob-error-container" style={{ margin: '1rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
          <p style={{ margin: 0 }}><strong>Error:</strong> {errorMsg}</p>
        </div>
      )}

      
      <div className="paymob-iframe-wrapper" style={{ width: '100%', height: '700px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <iframe
          src={iframeSrc}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Paymob Secure Payment"
          allow="payment"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
