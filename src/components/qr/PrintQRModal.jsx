import React, { useState, useEffect } from 'react';
import { renderQRPrintHTML } from './QRPrintTemplate';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const PrintQRModal = ({ storeId, onClose }) => {
  const token = localStorage.getItem('storeAdminToken');
  const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const storeName = localStorage.getItem('currentStoreName') || 'My Store';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/api/store/${storeId}/inventory`, { headers: hdrs });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
        // Select all by default
        setSelected(new Set((data.data || []).map(p => `${p.product_id}_${p.variant_id || ''}`)));
      }
    } catch (err) {
      setError('Failed to load products');
    }
    setLoading(false);
  };

  const toggleProduct = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    const allKeys = filteredProducts.map(p => `${p.product_id}_${p.variant_id || ''}`);
    if (allKeys.every(k => selected.has(k))) {
      setSelected(prev => { const next = new Set(prev); allKeys.forEach(k => next.delete(k)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); allKeys.forEach(k => next.add(k)); return next; });
    }
  };

  const handlePrint = async () => {
    setGenerating(true);
    setError('');
    try {
      const selectedProducts = filteredProducts.filter(p => selected.has(`${p.product_id}_${p.variant_id || ''}`));

      if (selectedProducts.length === 0) {
        setError('Select at least one product');
        setGenerating(false);
        return;
      }

      // Generate QR tokens from backend
      const res = await fetch(`${API}/api/qr/generate`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          store_id: storeId,
          products: selectedProducts.map(p => ({
            product_id: p.product_id,
            variant_id: p.variant_id || '',
            sku: p.sku || '',
            price: p.selling_price || p.price || 0
          }))
        })
      });
      const tokenData = await res.json();
      if (!tokenData.success) throw new Error(tokenData.error || 'Failed to generate QR codes');

      // Map tokens back to product info
      const productsWithTokens = tokenData.tokens.map(t => {
        const match = selectedProducts.find(p =>
          String(p.product_id) === String(t.product_id) &&
          String(p.variant_id || '') === String(t.variant_id || '')
        );
        return {
          ...match,
          token: t.token,
          product_name: match?.product_name || match?.name || 'Product',
          name: match?.product_name || match?.name || 'Product',
          variation_name: match?.variation_name || match?.variant_name || '',
          variant_name: match?.variation_name || match?.variant_name || '',
          size_label: match?.size_label || match?.size || '',
          image_url: match?.image_url || '',
          sku: t.sku,
          selling_price: match?.selling_price || match?.price || 0,
          price: match?.selling_price || match?.price || 0
        };
      });

      const html = await renderQRPrintHTML(productsWithTokens, storeName);
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      setError(err.message || 'Failed to generate QR print');
    }
    setGenerating(false);
  };

  const filteredProducts = products.filter(p =>
    !search || (p.product_name || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🖨️ Print QR Codes</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>×</button>
        </div>

        {/* A4 grid info */}
        <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
          📄 Prints as A4 grid — 4 labels per row, with product image + details under each QR code
        </div>

        {/* Product search + select */}
        <input
          type="text" placeholder="🔍 Search products..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 14, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#555' }}>{selected.size} selected</span>
          <button onClick={toggleAll} style={{ background: 'none', border: 'none', color: '#1a56db', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            {filteredProducts.every(p => selected.has(`${p.product_id}_${p.variant_id || ''}`)) ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>Loading products...</div>}

        {error && <div style={errorBox}>{error}</div>}

        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
          {filteredProducts.map(p => {
            const key = `${p.product_id}_${p.variant_id || ''}`;
            const isSelected = selected.has(key);
            return (
              <div
                key={key}
                onClick={() => toggleProduct(key)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '10px 14px',
                  borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : '#fff'
                }}
              >
                <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ marginRight: 12, accentColor: '#1a56db' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.product_name || p.name}
                  </div>
                  {p.variant_name && <div style={{ fontSize: 12, color: '#666' }}>{p.variant_name}</div>}
                  {p.sku && <div style={{ fontSize: 11, color: '#999' }}>SKU: {p.sku}</div>}
                </div>
                <div style={{ fontWeight: 700, color: '#1a56db', fontSize: 13, marginLeft: 12 }}>
                  ₹{Number(p.selling_price || p.price || 0).toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
          {!loading && filteredProducts.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>No products found</div>
          )}
        </div>

        <button
          onClick={handlePrint}
          disabled={generating || selected.size === 0}
          style={{ ...btnPrimary, width: '100%', opacity: (generating || selected.size === 0) ? 0.6 : 1 }}
        >
          {generating ? 'Generating...' : `🖨️ Print ${selected.size} QR Code${selected.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};
const modal = {
  background: '#fff', borderRadius: 16, padding: 24, width: '100%',
  maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
};
const btnPrimary = {
  background: '#1a56db', color: '#fff', border: 'none', borderRadius: 10,
  padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
};
const errorBox = {
  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
  padding: 12, color: '#dc2626', fontSize: 13, marginBottom: 12
};

export default PrintQRModal;
