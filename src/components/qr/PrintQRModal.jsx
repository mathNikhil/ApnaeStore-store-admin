import React, { useState, useEffect } from 'react';
import { renderQRPrintHTML } from './QRPrintTemplate';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const PrintQRModal = ({ storeId, onClose }) => {
  const token = localStorage.getItem('storeAdminToken');
  const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [products, setProducts]   = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [quantities, setQuantities] = useState({}); // item.id → qty (sticker mode)
  const [mode, setMode]           = useState('catalog'); // 'catalog' | 'sticker'
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');

  const storeName = localStorage.getItem('currentStoreName') || 'My Store';

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res  = await fetch(`${API}/api/store/${storeId}/inventory`, { headers: hdrs });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
        setSelected(new Set());
        // Default qty = 1 for every product
        const q = {};
        (data.data || []).forEach(p => { q[p.id] = 1; });
        setQuantities(q);
      }
    } catch {
      setError('Failed to load products');
    }
    setLoading(false);
  };

  const keyOf = (p) => String(p.id);

  const toggleProduct = (key) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const filteredProducts = products.filter(p =>
    !search ||
    (p.product_name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.variation_name|| '').toLowerCase().includes(search.toLowerCase()) ||
    (p.size_label    || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku           || '').toLowerCase().includes(search.toLowerCase())
  );

  const allFilteredSelected = filteredProducts.length > 0 &&
    filteredProducts.every(p => selected.has(keyOf(p)));

  const toggleAll = () => {
    const keys = filteredProducts.map(keyOf);
    if (allFilteredSelected) {
      setSelected(prev => { const n = new Set(prev); keys.forEach(k => n.delete(k)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); keys.forEach(k => n.add(k)); return n; });
    }
  };

  const setQty = (id, val) => {
    const n = Math.max(1, Math.min(99, parseInt(val) || 1));
    setQuantities(prev => ({ ...prev, [id]: n }));
  };

  // Total labels to print in sticker mode
  const totalLabels = [...selected].reduce((sum, key) => {
    const p = products.find(p => keyOf(p) === key);
    return sum + (p ? (quantities[p.id] || 1) : 0);
  }, 0);

  const handlePrint = async () => {
    setGenerating(true);
    setError('');
    try {
      const selectedProducts = products.filter(p => selected.has(keyOf(p)));
      if (selectedProducts.length === 0) {
        setError('Select at least one product');
        setGenerating(false);
        return;
      }

      const res = await fetch(`${API}/api/qr/generate/${storeId}`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          products: selectedProducts.map(p => ({
            product_id: p.product_id,
            variant_id: p.variation_id || p.variant_id || '',
            sku: p.size_id || p.sku || '',
            price: p.selling_price || p.price || 0,
          }))
        })
      });
      const tokenData = await res.json();
      if (!tokenData.success) throw new Error(tokenData.error || 'Failed to generate QR codes');

      // Map tokens back by index order
      const productsWithTokens = tokenData.tokens.map((t, i) => {
        const p = selectedProducts[i];
        return {
          token: t.token,
          product_name:  p.product_name  || 'Product',
          variation_name:p.variation_name|| '',
          size_label:    p.size_label    || '',
          image_url:     p.image_url     || '',
          selling_price: p.selling_price || p.price || 0,
          qty: mode === 'sticker' ? (quantities[p.id] || 1) : 1,
        };
      });

      const html = await renderQRPrintHTML(productsWithTokens, storeName, mode);
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
    } catch (err) {
      setError(err.message || 'Failed to generate QR print');
    }
    setGenerating(false);
  };

  const sizeNum = (label = '') => { const m = label.match(/^([\d.]+)/);   return m ? m[1] : label; };
  const sizeUnit= (label = '') => { const m = label.match(/^[\d.]+\s*(.*)/); return m ? m[1].trim() : ''; };

  const printLabel = mode === 'catalog'
    ? `🖨️ Print ${selected.size} Label${selected.size !== 1 ? 's' : ''}`
    : `🖨️ Print ${totalLabels} Sticker${totalLabels !== 1 ? 's' : ''} (${selected.size} variant${selected.size !== 1 ? 's' : ''})`;

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🖨️ Print QR Labels</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setMode('catalog')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: mode === 'catalog' ? '2px solid #1a56db' : '2px solid #e5e7eb',
              background: mode === 'catalog' ? '#eff6ff' : '#fafafa',
              color: mode === 'catalog' ? '#1a56db' : '#555',
            }}
          >
            📋 Catalog
            <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, color: mode === 'catalog' ? '#3b82f6' : '#888' }}>
              1 label per variant · A4 grid
            </div>
          </button>
          <button
            onClick={() => setMode('sticker')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: mode === 'sticker' ? '2px solid #16a34a' : '2px solid #e5e7eb',
              background: mode === 'sticker' ? '#f0fdf4' : '#fafafa',
              color: mode === 'sticker' ? '#16a34a' : '#555',
            }}
          >
            🏷️ Sticker Sheet
            <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, color: mode === 'sticker' ? '#22c55e' : '#888' }}>
              Set qty per variant · cut &amp; paste
            </div>
          </button>
        </div>

        {/* Info bar */}
        <div style={{
          background: mode === 'catalog' ? '#f0f7ff' : '#f0fdf4',
          border: `1px solid ${mode === 'catalog' ? '#bfdbfe' : '#bbf7d0'}`,
          borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12,
          color: mode === 'catalog' ? '#1e40af' : '#15803d'
        }}>
          {mode === 'catalog'
            ? '📄 Prints one label per selected variant — good for shelf displays and catalogues.'
            : '✂️ Set how many stickers you need per variant. All stickers print tightly on A4 — just cut and paste on physical products.'}
        </div>

        {/* Search */}
        <input
          type="text" placeholder="🔍 Search by name, variant, size or SKU..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
        />

        {/* Select all / count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#555' }}>
            {selected.size} variant{selected.size !== 1 ? 's' : ''} selected
            {mode === 'sticker' && selected.size > 0 && ` · ${totalLabels} total stickers`}
          </span>
          <button onClick={toggleAll} style={{ background: 'none', border: 'none', color: '#1a56db', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            {allFilteredSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading products...</div>}
        {error   && <div style={errorBox}>{error}</div>}

        {/* Table */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 14, overflowY: 'auto', maxHeight: 320 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={th}></th>
                <th style={th}>Image</th>
                <th style={{ ...th, textAlign: 'left' }}>Product</th>
                <th style={th}>Variant</th>
                <th style={th}>Size</th>
                <th style={th}>Unit</th>
                <th style={{ ...th, textAlign: 'right' }}>Price</th>
                {mode === 'sticker' && <th style={{ ...th, color: '#16a34a' }}>Qty</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const key        = keyOf(p);
                const isSelected = selected.has(key);
                const sl         = p.size_label || '';
                return (
                  <tr
                    key={key}
                    onClick={(e) => {
                      // Don't toggle when clicking the qty input
                      if (e.target.tagName === 'INPUT' && e.target.type === 'number') return;
                      toggleProduct(key);
                    }}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? (mode === 'sticker' ? '#f0fdf4' : '#eff6ff') : '#fff' }}
                  >
                    <td style={{ ...td, width: 32, textAlign: 'center' }}>
                      <input
                        type="checkbox" checked={isSelected} onChange={() => {}}
                        style={{ accentColor: mode === 'sticker' ? '#16a34a' : '#1a56db', width: 15, height: 15 }}
                      />
                    </td>
                    <td style={{ ...td, width: 44, textAlign: 'center' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, display: 'block', margin: '0 auto' }} />
                        : <div style={{ width: 36, height: 36, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, margin: '0 auto' }}>📦</div>
                      }
                    </td>
                    <td style={{ ...td, fontWeight: 600, color: '#111', maxWidth: 130 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product_name}</div>
                    </td>
                    <td style={{ ...td, color: '#555', textAlign: 'center' }}>{p.variation_name || '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{sizeNum(sl) || '—'}</td>
                    <td style={{ ...td, color: '#888', textAlign: 'center' }}>{sizeUnit(sl) || '—'}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#1a56db', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      ₹{Number(p.selling_price || p.price || 0).toLocaleString('en-IN')}
                    </td>
                    {mode === 'sticker' && (
                      <td style={{ ...td, textAlign: 'center', width: 60 }}>
                        <input
                          type="number" min={1} max={99}
                          value={quantities[p.id] || 1}
                          onClick={e => { e.stopPropagation(); if (!isSelected) toggleProduct(key); }}
                          onChange={e => { setQty(p.id, e.target.value); if (!isSelected) toggleProduct(key); }}
                          style={{
                            width: 48, textAlign: 'center', border: '1px solid #d1fae5',
                            borderRadius: 6, padding: '4px 6px', fontSize: 13, fontWeight: 700,
                            color: '#15803d', background: '#f0fdf4', outline: 'none'
                          }}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
              {!loading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={mode === 'sticker' ? 8 : 7} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Print button */}
        <button
          onClick={handlePrint}
          disabled={generating || selected.size === 0}
          style={{
            ...btnPrimary,
            width: '100%',
            background: mode === 'sticker' ? '#16a34a' : '#1a56db',
            opacity: (generating || selected.size === 0) ? 0.5 : 1
          }}
        >
          {generating ? 'Generating...' : printLabel}
        </button>
      </div>
    </div>
  );
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};
const modal = {
  background: '#fff', borderRadius: 16, padding: 20, width: '96%',
  maxWidth: 700, maxHeight: '92vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.22)'
};
const btnPrimary = {
  color: '#fff', border: 'none', borderRadius: 10,
  padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
};
const errorBox = {
  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
  padding: 10, color: '#dc2626', fontSize: 13, marginBottom: 10
};
const th = {
  padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center', whiteSpace: 'nowrap'
};
const td = { padding: '9px 10px', verticalAlign: 'middle', fontSize: 12 };

export default PrintQRModal;
