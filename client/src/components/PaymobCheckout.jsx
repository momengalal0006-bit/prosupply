/**
 * ═══════════════════════════════════════════════════════════════
 *  PaymobCheckout — Classic Iframe Payment Component
 * ═══════════════════════════════════════════════════════════════
 *
 *  This component renders the standard Paymob checkout inside an 
 *  iframe, skipping the "Welcome/Login" screen entirely.
 *
 *  It requires:
 *    • paymentKey: The classic 3-step payment key from the backend.
 *    • VITE_PAYMOB_IFRAME_ID: The Iframe ID from the Paymob Dashboard.
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import '../styles/pages/PaymobCheckout.css';

// ── The Paymob Iframe ID ───────────────────────────────────────
// This must be set in the frontend .env file (e.g., VITE_PAYMOB_IFRAME_ID=1040682)
const PAYMOB_IFRAME_ID = import.meta.env.VITE_PAYMOB_IFRAME_ID || '';

/**
 * @param {Object}   props
 * @param {string}   props.paymentKey       – The classic payment key from the backend
 * @param {number}   [props.amount]         – Subtotal displayed (in cents)
 * @param {string}   [props.currency]       – Currency displayed (default: EGP)
 * @param {Function} [props.onSuccess]        – Callback on payment success
 * @param {Function} [props.onError]          – Callback on payment error
 */
export default function PaymobCheckout({
  paymentKey,
  amount       = 5000,
  currency     = 'EGP',
  onSuccess,
  onError,
}) {
  const [errorMsg, setErrorMsg] = useState('');

  // Format the display amount (cents → major units)
  const displayAmount = (amount / 100).toFixed(2);

  // Listen for postMessage events from the Paymob iframe to detect success/failure
  useEffect(() => {
    function handleMessage(event) {
      if (!event.origin.includes('paymob.com') && !event.origin.includes('accept.paymob')) {
        return;
      }

      const { data } = event;
      if (!data) return;

      // The Classic Iframe sends different postMessage payloads, usually checking for success flag
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
          // Ignore non-JSON strings
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError]);

  // Handle configuration errors
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

  // Construct the secure iframe URL
  const iframeSrc = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="paymob-checkout" style={{ width: '100%', maxWidth: '100%', margin: '0 auto', border: 'none' }}>
      
      {/* ── Header ──────────────────────────────────────── */}
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

      {/* ── Error Display ───────────────────────────────── */}
      {errorMsg && (
        <div className="paymob-error-container" style={{ margin: '1rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
          <p style={{ margin: 0 }}><strong>Error:</strong> {errorMsg}</p>
        </div>
      )}

      {/* ── Checkout Iframe ─────────────────────────────── */}
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
