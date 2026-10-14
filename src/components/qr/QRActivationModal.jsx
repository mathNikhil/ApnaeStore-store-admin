import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const QRActivationModal = ({ storeId, onClose, onActivated }) => {
  const token = localStorage.getItem('storeAdminToken');
  const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [charge, setCharge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await fetch(`${API}/api/qr/pricing/${storeId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCharge(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load pricing');
    }
    setLoading(false);
  };

  const handleActivate = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/qr/initiate-payment`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ store_id: storeId })
      });
      const data = await res.json();

      if (data.is_test_user && data.active) {
        // Test user — directly activated
        onActivated();
        return;
      }

      if (!data.payment_session_id) throw new Error(data.error || 'Payment initiation failed');

      // Load Cashfree SDK and open checkout
      if (!window.Cashfree) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const cashfree = window.Cashfree({ mode: 'production' });
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/qr-payment-return?order_id=${data.order_id}`,
        onSuccess: () => { onActivated(); },
        onFailure: () => { setError('Payment failed. Please try again.'); setPaying(false); }
      });
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setPaying(false);
    }
  };

  const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📱 Activate QR Scanner</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>×</button>
        </div>

        <p style={{ color: '#555', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
          The QR Scanner lets your staff scan products in-store to add them directly to a customer's cart — no searching needed.
        </p>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading pricing...</div>}

        {error && <div style={errorBox}>{error}</div>}

        {charge && !loading && (
          <>
            <div style={priceBreakdown}>
              <div style={breakdownTitle}>Pricing Breakdown</div>
              <div style={breakdownRow}>
                <span>Annual price</span>
                <span>₹{fmt(charge.annual_price)}</span>
              </div>
              <div style={breakdownRow}>
                <span>Days remaining in your plan</span>
                <span>{charge.remaining_days} days</span>
              </div>
              <div style={breakdownRow}>
                <span>Prorated base charge</span>
                <span>₹{fmt(charge.base_charge)}</span>
              </div>
              <div style={breakdownRow}>
                <span>GST ({charge.gst_rate}%)</span>
                <span>₹{fmt(charge.gst_amount)}</span>
              </div>
              <div style={{ ...breakdownRow, fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 4, fontSize: 16 }}>
                <span>Total</span>
                <span style={{ color: '#1a56db' }}>₹{fmt(charge.total)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                Active until: {new Date(charge.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: '#15803d' }}>
              ✅ No extra charges for the scanner on your storefront. Customers scan for free.
            </div>

            <button
              onClick={handleActivate}
              disabled={paying}
              style={{ ...btnPrimary, opacity: paying ? 0.7 : 1, width: '100%' }}
            >
              {paying ? 'Processing...' : `Pay ₹${fmt(charge.total)} & Activate`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};
const modal = {
  background: '#fff', borderRadius: 16, padding: 28, width: '100%',
  maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
};
const priceBreakdown = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
  padding: 16, marginBottom: 20
};
const breakdownTitle = { fontWeight: 600, fontSize: 13, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' };
const breakdownRow = { display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: '#333' };
const btnPrimary = {
  background: '#1a56db', color: '#fff', border: 'none', borderRadius: 10,
  padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
};
const errorBox = {
  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
  padding: 12, color: '#dc2626', fontSize: 13, marginBottom: 16
};

export default QRActivationModal;
