import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

const Inventory = () => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [summary, setSummary] = useState({ totalProducts: 0, totalItems: 0, totalValue: 0 });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [search, setSearch] = useState('');
    const fileRef = useRef();

    const sid = new URLSearchParams(window.location.search).get('subdomain') ||
                localStorage.getItem('storeAdminSubdomain');
    const storeId = localStorage.getItem('currentStoreId');

    useEffect(() => { fetchInventory(); }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/store/${storeId}/inventory`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('storeAdminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                setInventory(data.data);
                setSummary(data.summary);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/store/${storeId}/inventory/sync`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('storeAdminToken')}` }
            });
            await fetchInventory();
        } catch (e) {}
        setSyncing(false);
    };

    const handleUpdateStock = async (id, value) => {
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/store/${storeId}/inventory/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('storeAdminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stock_quantity: parseInt(value) })
            });
            setEditingId(null);
            await fetchInventory();
        } catch (e) {}
    };

    const handleDownloadCSV = () => {
        window.open(`${import.meta.env.VITE_API_URL}/api/store/${storeId}/inventory/download-csv?token=${localStorage.getItem('storeAdminToken')}`, '_blank');
    };

    const handleUploadCSV = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/store/${storeId}/inventory/upload-csv`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('storeAdminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ csvData: text })
            });
            const data = await res.json();
            setUploadResult(data);
            await fetchInventory();
        } catch (e) {}
        fileRef.current.value = '';
    };

    const filtered = inventory.filter(item =>
        item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.variation_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            <Sidebar />
            <div style={{ marginLeft: 260, flex: 1, padding: 0 }}>
            <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📦 Inventory</h1>
                    <p style={styles.subtitle}>Manage stock levels for your products</p>
                </div>
                <div style={styles.actions}>
                    <button onClick={handleSync} disabled={syncing} style={styles.btnSecondary}>
                        {syncing ? '⏳ Syncing...' : '🔄 Sync Products'}
                    </button>
                    <button onClick={handleDownloadCSV} style={styles.btnSecondary}>⬇️ Download CSV</button>
                    <button onClick={() => fileRef.current.click()} style={styles.btnPrimary}>⬆️ Upload CSV</button>
                    <input ref={fileRef} type="file" accept=".csv" onChange={handleUploadCSV} style={{ display: 'none' }} />
                </div>
            </div>

            {/* Upload Result */}
            {uploadResult && (
                <div style={{ ...styles.card, marginBottom: 16, background: uploadResult.errors?.length ? '#fff8f0' : '#f0fff4', border: `1px solid ${uploadResult.errors?.length ? '#f59e0b' : '#22c55e'}` }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        ✅ {uploadResult.updated} rows updated, {uploadResult.skipped} skipped
                    </p>
                    {uploadResult.errors?.map((e, i) => (
                        <p key={i} style={{ margin: '4px 0 0', color: '#dc2626', fontSize: 13 }}>⚠️ {e}</p>
                    ))}
                    <button onClick={() => setUploadResult(null)} style={{ ...styles.btnSecondary, marginTop: 8, fontSize: 12, padding: '4px 12px' }}>Dismiss</button>
                </div>
            )}

            {/* Summary Cards */}
            <div style={styles.summaryRow}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{summary.totalProducts}</div>
                    <div style={styles.summaryLabel}>Total SKUs</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{summary.totalItems}</div>
                    <div style={styles.summaryLabel}>Total Stock</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{ ...styles.summaryValue, color: '#16a34a' }}>
                        ₹{parseFloat(summary.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div style={styles.summaryLabel}>Total Value</div>
                </div>
            </div>

            {/* Search */}
            <div style={styles.card}>
                <input
                    type="text"
                    placeholder="🔍 Search products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* Table */}
            <div style={styles.card}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>Loading inventory...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                        No inventory found. Click "Sync Products" to load your products.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thead}>
                                    <th style={styles.th}>Image</th>
                                    <th style={styles.th}>Product</th>
                                    <th style={styles.th}>Variant</th>
                                    <th style={styles.th}>Size</th>
                                    <th style={styles.th}>Price</th>
                                    <th style={{ ...styles.th, color: '#2563eb' }}>InStock</th>
                                    <th style={styles.th}>Sold</th>
                                    <th style={styles.th}>Returned</th>
                                    <th style={{ ...styles.th, color: '#16a34a' }}>Current Stock</th>
                                    <th style={styles.th}>Total Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => {
                                    const currentStock = parseInt(item.current_stock || 0);
                                    const isLow = currentStock > 0 && currentStock < 5;
                                    const isOut = currentStock <= 0;
                                    return (
                                        <tr key={item.id} style={{ ...styles.tr, background: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#fff' }}>
                                            <td style={styles.td}>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                                                ) : (
                                                    <div style={{ width: 40, height: 40, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                                                )}
                                            </td>
                                            <td style={styles.td}><span style={{ fontWeight: 500 }}>{item.product_name}</span></td>
                                            <td style={styles.td}>{item.variation_name}</td>
                                            <td style={styles.td}>{item.size_label}</td>
                                            <td style={styles.td}>₹{parseFloat(item.price).toLocaleString('en-IN')}</td>
                                            <td style={styles.td}>
                                                {editingId === item.id ? (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            style={styles.stockInput}
                                                            min="0"
                                                            autoFocus
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleUpdateStock(item.id, editValue);
                                                                if (e.key === 'Escape') setEditingId(null);
                                                            }}
                                                        />
                                                        <button onClick={() => handleUpdateStock(item.id, editValue)} style={styles.saveBtn}>✓</button>
                                                        <button onClick={() => setEditingId(null)} style={styles.cancelBtn}>✕</button>
                                                    </div>
                                                ) : (
                                                    <span
                                                        onClick={() => { setEditingId(item.id); setEditValue(item.stock_quantity); }}
                                                        style={{ ...styles.stockBadge, cursor: 'pointer' }}
                                                        title="Click to edit"
                                                    >
                                                        {item.stock_quantity} ✏️
                                                    </span>
                                                )}
                                            </td>
                                            <td style={styles.td}>{item.total_sold}</td>
                                            <td style={styles.td}>{item.total_returned}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a'
                                                }}>
                                                    {currentStock}
                                                    {isOut && ' ⚠️'}
                                                    {isLow && ' 🔸'}
                                                </span>
                                            </td>
                                            <td style={styles.td}>₹{parseFloat(item.total_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: 24, maxWidth: 1400, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
    title: { fontSize: 28, fontWeight: 700, margin: 0, color: '#111' },
    subtitle: { color: '#666', margin: '4px 0 0', fontSize: 14 },
    actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14 },
    card: { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 },
    summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 },
    summaryCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' },
    summaryValue: { fontSize: 32, fontWeight: 700, color: '#111' },
    summaryLabel: { fontSize: 13, color: '#666', marginTop: 4 },
    searchInput: { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    thead: { background: '#f9fafb' },
    th: { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s' },
    td: { padding: '12px 16px', verticalAlign: 'middle' },
    stockInput: { width: 70, border: '2px solid #2563eb', borderRadius: 6, padding: '4px 8px', fontSize: 14, outline: 'none' },
    stockBadge: { background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: 6, fontWeight: 600, display: 'inline-block' },
    saveBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' },
    cancelBtn: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' },
};

export default Inventory;
