import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const Inventory = () => {
    const storeId = localStorage.getItem('currentStoreId');
    const token = localStorage.getItem('storeAdminToken');
    const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const [inventory, setInventory] = useState([]);
    const [summary, setSummary] = useState({ totalProducts: 0, totalItems: 0, totalValue: 0 });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [expandedProducts, setExpandedProducts] = useState({});
    const [expandedVariants, setExpandedVariants] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [threshold, setThreshold] = useState(10);
    const [thresholdInput, setThresholdInput] = useState(10);
    const [savingThreshold, setSavingThreshold] = useState(false);
    const [dineInLabel, setDineInLabel] = useState('Dine In');
    const fileRef = useRef();

    useEffect(() => {
        fetchInventory();
        fetchThreshold();
        // Fetch store config for dineInLabel
        const subdomain = localStorage.getItem('currentStoreSubdomain') || localStorage.getItem('currentStoreName');
        if (subdomain) {
            fetch(`${API}/api/public/store/${subdomain}`)
                .then(r => r.json())
                .then(d => { if (d?.success) setDineInLabel(d.data?.config?.cart?.dineInLabel || 'Dine In'); })
                .catch(() => {});
        }
    }, []);

    const fetchThreshold = async () => {
        try {
            const res = await fetch(`${API}/api/store/${storeId}/inventory/threshold`, { headers: hdrs });
            const data = await res.json();
            if (data.success) { setThreshold(data.data.threshold); setThresholdInput(data.data.threshold); }
        } catch (e) {}
    };

    const saveThreshold = async () => {
        setSavingThreshold(true);
        try {
            const res = await fetch(`${API}/api/store/${storeId}/inventory/threshold`, {
                method: 'PUT', headers: hdrs,
                body: JSON.stringify({ threshold: parseInt(thresholdInput) })
            });
            const data = await res.json();
            if (data.success) setThreshold(data.data.threshold);
        } catch (e) {}
        setSavingThreshold(false);
    };

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/store/${storeId}/inventory`, { headers: hdrs });
            const data = await res.json();
            if (data.success) {
                setInventory(data.data);
                setSummary(data.summary);
                const exp = {};
                data.data.forEach(item => { exp[item.product_id] = true; });
                setExpandedProducts(exp);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await fetch(`${API}/api/store/${storeId}/inventory/sync`, { method: 'POST', headers: hdrs });
            await fetchInventory();
        } catch (e) {}
        setSyncing(false);
    };

    const handleUpdateStock = async (id, value) => {
        try {
            await fetch(`${API}/api/store/${storeId}/inventory/${id}`, {
                method: 'PUT', headers: hdrs,
                body: JSON.stringify({ stock_quantity: parseInt(value) })
            });
            setEditingId(null);
            await fetchInventory();
        } catch (e) {}
    };

    const handleDownloadCSV = async () => {
        try {
            const res = await fetch(`${API}/api/store/${storeId}/inventory/download-csv`, { headers: hdrs });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory-${storeId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) { console.error(e); }
    };

    const handleUploadCSV = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
            const res = await fetch(`${API}/api/store/${storeId}/inventory/upload-csv`, {
                method: 'POST', headers: hdrs,
                body: JSON.stringify({ csvData: text })
            });
            const data = await res.json();
            setUploadResult(data);
            await fetchInventory();
        } catch (e) { console.error(e); }
        fileRef.current.value = '';
    };

    // Group inventory
    const grouped = {};
    inventory.forEach(item => {
        if (!grouped[item.product_id]) {
            grouped[item.product_id] = { product_id: item.product_id, product_name: item.product_name, image_url: item.image_url, variants: {} };
        }
        if (!grouped[item.product_id].variants[item.variation_id]) {
            grouped[item.product_id].variants[item.variation_id] = { variation_id: item.variation_id, variation_name: item.variation_name, image_url: item.image_url, sizes: [] };
        }
        grouped[item.product_id].variants[item.variation_id].sizes.push(item);
    });

    // Aggregate helpers
    const sumSizes = (sizes, key) => sizes.reduce((s, r) => s + (parseInt(r[key]) || 0), 0);
    const avgPrice = (sizes) => sizes.length ? sizes.reduce((s, r) => s + parseFloat(r.price || 0), 0) / sizes.length : 0;

    const filteredGroups = Object.values(grouped).filter(p =>
        !search || p.product_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortArrow = ({ col }) => (
        <span style={{ marginLeft: 4, opacity: sortKey === col ? 1 : 0.4, fontSize: 10 }}>
            {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
    );

    const toggleProduct = (id) => setExpandedProducts(p => ({ ...p, [id]: !p[id] }));
    const toggleVariant = (id) => setExpandedVariants(p => ({ ...p, [id]: !p[id] }));

    const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            <Sidebar />
            <div style={{ marginLeft: window.innerWidth <= 900 ? 0 : 260, flex: 1, padding: window.innerWidth <= 900 ? '60px 16px 16px' : 24 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>📦 Inventory</h1>
                        <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>Manage stock levels for your products</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={handleSync} disabled={syncing} style={styles.btnSecondary}>{syncing ? 'Syncing...' : '🔄 Sync'}</button>
                        <button onClick={handleDownloadCSV} style={styles.btnSecondary}>⬇️ Download CSV</button>
                        <button onClick={() => fileRef.current.click()} style={styles.btnPrimary}>⬆️ Upload CSV</button>
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleUploadCSV} style={{ display: 'none' }} />
                    </div>
                </div>

                {/* Upload Result */}
                {uploadResult && (
                    <div style={{ background: uploadResult.errors?.length ? '#fff8f0' : '#f0fff4', border: `1px solid ${uploadResult.errors?.length ? '#f59e0b' : '#22c55e'}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>✅ {uploadResult.updated} rows updated, {uploadResult.skipped} skipped</p>
                        {uploadResult.errors?.map((e, i) => <p key={i} style={{ margin: '4px 0 0', color: '#dc2626', fontSize: 13 }}>⚠️ {e}</p>)}
                        <button onClick={() => setUploadResult(null)} style={{ ...styles.btnSecondary, marginTop: 8, fontSize: 12, padding: '4px 12px' }}>Dismiss</button>
                    </div>
                )}

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
                    {[
                        { label: 'Total SKUs', value: summary.totalProducts },
                        { label: 'Total Stock', value: summary.totalItems },
                        { label: 'Total Value', value: `₹${fmt(summary.totalValue)}`, color: '#16a34a' }
                    ].map(s => (
                        <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: s.color || '#111' }}>{s.value}</div>
                            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                    <input type="text" placeholder="🔍 Search products..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Low Stock Threshold */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Low Stock Alert</span>
                    <span style={{ fontSize: 14, color: '#556067' }}>Highlight products below</span>
                    <input type="number" min="1" value={thresholdInput}
                        onChange={e => setThresholdInput(e.target.value)}
                        style={{ width: 70, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 14, outline: 'none', textAlign: 'center' }} />
                    <span style={{ fontSize: 14, color: '#556067' }}>units</span>
                    <button onClick={saveThreshold} disabled={savingThreshold}
                        style={{ background: '#006d2f', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        {savingThreshold ? 'Saving...' : 'Set'}
                    </button>
                    <span style={{ fontSize: 12, color: '#556067' }}>
                        🔴 Red = below {threshold} units &nbsp; Current default: {threshold}
                    </span>
                </div>

                {/* Table */}
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>Loading inventory...</div>
                    ) : filteredGroups.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No inventory found. Click Sync to load products.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={styles.th}>Image</th>
                                        <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('product_name')}>Product <SortArrow col="product_name" /></th>
                                        <th style={styles.th}>Variant</th>
                                        <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('size_label')}>Size <SortArrow col="size_label" /></th>
                                        <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('price')}>Price <SortArrow col="price" /></th>
                                        <th style={{ ...styles.th, color: '#2563eb', cursor: 'pointer' }} onClick={() => handleSort('stock_quantity')}>InStock <SortArrow col="stock_quantity" /></th>
                                        <th style={styles.th}>Sold</th>
                                        <th style={styles.th}>Sale Type</th>
                                        <th style={styles.th}>Returned</th>
                                        <th style={{ ...styles.th, color: '#16a34a', cursor: 'pointer' }} onClick={() => handleSort('current_stock')}>Current Stock <SortArrow col="current_stock" /></th>
                                        <th style={styles.th}>Total Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGroups.map(product => {
                                        const isProductExpanded = expandedProducts[product.product_id];
                                        const allSizes = Object.values(product.variants).flatMap(v => v.sizes);
                                        const variantCount = Object.keys(product.variants).length;
                                        const sizeCount = new Set(allSizes.map(s => s.size_label)).size;
                                        const allPrices = [...new Set(allSizes.map(s => parseFloat(s.price||0)))];
                                        const pMinPrice = Math.min(...allPrices);
                                        const pMaxPrice = Math.max(...allPrices);
                                        const pPriceDisplay = pMinPrice === pMaxPrice ? `₹${fmt(pMinPrice)}` : `₹${fmt(pMinPrice)} - ₹${fmt(pMaxPrice)}`;
                                        const pInStock = sumSizes(allSizes, 'stock_quantity');
                                        const pSold = sumSizes(allSizes, 'total_sold');
                                        const pReturned = sumSizes(allSizes, 'total_returned');
                                        const pCurrent = pInStock - pSold + pReturned;
                                        const pValue = allSizes.reduce((s, r) => s + parseFloat(r.total_value || 0), 0);

                                        return (
                                            <React.Fragment key={product.product_id}>
                                                {/* Product Row */}
                                                <tr style={{ background: '#f0faf4', borderBottom: '2px solid #d1fae5', cursor: 'pointer' }} onClick={() => toggleProduct(product.product_id)}>
                                                    <td style={styles.td}>
                                                        {product.image_url
                                                            ? <img src={product.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                                                            : <div style={{ width: 40, height: 40, background: '#e0e3e6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>}
                                                    </td>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: '#006d2f' }}>
                                                        <span style={{ marginRight: 8 }}>{isProductExpanded ? '▼' : '▶'}</span>
                                                        {product.product_name}
                                                    </td>
                                                    <td style={{ ...styles.td, color: '#556067', fontSize: 13 }}>{variantCount} variants</td>
                                                    <td style={{ ...styles.td, color: '#556067', fontSize: 13 }}>{sizeCount} sizes</td>
                                                    <td style={styles.td}>{pPriceDisplay}</td>
                                                    <td style={{ ...styles.td, color: '#2563eb', fontWeight: 600 }}>{pInStock}</td>
                                                    <td style={styles.td}>{pSold}</td>
                                        <td style={styles.td}>—</td>
                                                    <td style={styles.td}>{pReturned}</td>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: pCurrent <= 0 ? '#dc2626' : '#16a34a' }}>{pCurrent}</td>
                                                    <td style={styles.td}>₹{fmt(pValue)}</td>
                                                </tr>

                                                {/* Variants */}
                                                {isProductExpanded && Object.values(product.variants).map(variant => {
                                                    const varKey = `${product.product_id}_${variant.variation_id}`;
                                                    const isVariantExpanded = expandedVariants[varKey] !== false;
                                                    const vSizes = variant.sizes;
                                                    const vSizeCount = vSizes.length;
                                                    const vPrices = [...new Set(vSizes.map(s => parseFloat(s.price || 0)))];
                                                    const vMinPrice = Math.min(...vPrices);
                                                    const vMaxPrice = Math.max(...vPrices);
                                                    const vPriceDisplay = vMinPrice === vMaxPrice ? `₹${fmt(vMinPrice)}` : `₹${fmt(vMinPrice)} - ₹${fmt(vMaxPrice)}`;
                                                    const vInStock = sumSizes(vSizes, 'stock_quantity');
                                                    const vSold = sumSizes(vSizes, 'total_sold');
                                                    const vReturned = sumSizes(vSizes, 'total_returned');
                                                    const vCurrent = vInStock - vSold + vReturned;
                                                    const vValue = vSizes.reduce((s, r) => s + parseFloat(r.total_value || 0), 0);
                                                    const vHasLowStock = vSizes.some(s => parseInt(s.current_stock || 0) < threshold);

                                                    return (
                                                        <React.Fragment key={variant.variation_id}>
                                                            {/* Variant Row */}
                                                            <tr style={{ background: vHasLowStock ? '#fff5f5' : '#f9fafb', cursor: 'pointer', borderBottom: '1px solid #e5e7eb' }} onClick={() => toggleVariant(varKey)}>
                                                                <td style={styles.td}>
                                                                    {variant.image_url
                                                                        ? <img src={variant.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, marginLeft: 12 }} />
                                                                        : <div style={{ width: 36, height: 36, marginLeft: 12 }} />}
                                                                </td>
                                                                <td style={styles.td}></td>
                                                                <td style={{ ...styles.td, fontWeight: 600, color: '#374151' }}>
                                                                    <span style={{ marginRight: 8, color: '#888' }}>{isVariantExpanded ? '▼' : '▶'}</span>
                                                                    {variant.variation_name}
                                                                </td>
                                                                <td style={{ ...styles.td, color: '#556067', fontSize: 13 }}>{vSizeCount} sizes</td>
                                                                <td style={styles.td}>{vPriceDisplay}</td>
                                                                <td style={{ ...styles.td, color: '#2563eb', fontWeight: 600 }}>{vInStock}</td>
                                                                <td style={styles.td}>{vSold}</td>
                                                                <td style={styles.td}>—</td>
                                                                <td style={styles.td}>{vReturned}</td>
                                                                <td style={{ ...styles.td, fontWeight: 700, color: vCurrent <= 0 ? '#dc2626' : '#16a34a' }}>{vCurrent}</td>
                                                                <td style={styles.td}>₹{fmt(vValue)}</td>
                                                            </tr>

                                                            {/* Size Rows */}
                                                            {isVariantExpanded && vSizes.map(item => {
                                                                const currentStock = parseInt(item.current_stock || 0);
                                                                const isOut = currentStock <= 0;
                                                                const isLow = currentStock > 0 && currentStock < threshold;
                                                                return (
                                                                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#fff' }}>
                                                                        <td style={styles.td}></td>
                                                                        <td style={styles.td}></td>
                                                                        <td style={{ ...styles.td, paddingLeft: 40, color: '#556067', fontSize: 13 }}>{variant.variation_name}</td>
                                                                        <td style={styles.td}>{item.size_label}</td>
                                                                        <td style={styles.td}>₹{fmt(item.price)}</td>
                                                                        <td style={styles.td}>
                                                                            {editingId === item.id ? (
                                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                                    <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                                                                                        style={{ width: 60, border: '2px solid #2563eb', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
                                                                                        min="0" autoFocus
                                                                                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateStock(item.id, editValue); if (e.key === 'Escape') setEditingId(null); }} />
                                                                                    <button onClick={() => handleUpdateStock(item.id, editValue)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>✓</button>
                                                                                    <button onClick={() => setEditingId(null)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>✕</button>
                                                                                </div>
                                                                            ) : (
                                                                                <span onClick={() => { setEditingId(item.id); setEditValue(item.stock_quantity); }}
                                                                                    style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'inline-block' }}>
                                                                                    {item.stock_quantity} ✏️
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td style={styles.td}>{item.total_sold}</td>
                                                                        <td style={styles.td}>
                                                                            {item.instore_sold > 0 && <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e', marginRight: 4 }}>{dineInLabel}: {item.instore_sold}</span>}
                                                                            {item.online_sold > 0 && <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>Delivery: {item.online_sold}</span>}
                                                                        </td>
                                                                        <td style={styles.td}>{item.total_returned}</td>
                                                                        <td style={styles.td}>
                                                                            <span style={{ fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a' }}>
                                                                                {currentStock}{isOut ? ' ⚠️' : isLow ? ' 🔸' : ''}
                                                                            </span>
                                                                        </td>
                                                                        <td style={styles.td}>₹{fmt(item.total_value)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    th: { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
    td: { padding: '10px 16px', verticalAlign: 'middle' },
    btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14 },
};

export default Inventory;
