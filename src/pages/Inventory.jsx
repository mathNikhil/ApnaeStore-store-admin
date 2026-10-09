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

    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [editingTallyId, setEditingTallyId] = useState(null);
    const [tallyValue, setTallyValue] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [threshold, setThreshold] = useState(10);
    const [thresholdInput, setThresholdInput] = useState(10);
    const [savingThreshold, setSavingThreshold] = useState(false);
    const [dineInLabel, setDineInLabel] = useState('Dine In');

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

    const handleDownloadTallyCSV = async () => {
        try {
            const res = await fetch(`${API}/api/store/${storeId}/inventory/download-tally-csv`, { headers: hdrs });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tally-inventory-${storeId}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) { alert('Download failed'); }
    };

    const handleDownloadCSV = async () => {
        try {
            const res = await fetch(`${API}/api/store/${storeId}/inventory/download-csv`, { headers: hdrs });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory-${storeId}.xlsx`;
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
    };

    const handleSaveTallyName = async (id, value) => {
        try {
            await fetch(`${API}/api/store/${storeId}/inventory/${id}/tally-name`, {
                method: 'PATCH', headers: hdrs,
                body: JSON.stringify({ tally_item_name: value })
            });
            setEditingTallyId(null);
            setInventory(prev => prev.map(item => item.id === id ? { ...item, tally_item_name: value } : item));
        } catch (e) {}
    };

    // Flat inventory - no grouping needed
    // Flat inventory list with search and sort
    const filteredItems = inventory
        .filter(item => !search || item.product_name?.toLowerCase().includes(search.toLowerCase()) || item.variation_name?.toLowerCase().includes(search.toLowerCase()) || item.size_label?.toLowerCase().includes(search.toLowerCase()) || (item.tally_item_name || "").toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (!sortKey) return 0;
            const av = a[sortKey]; const bv = b[sortKey];
            const cmp = isNaN(av) ? String(av||"").localeCompare(String(bv||"")) : parseFloat(av||0) - parseFloat(bv||0);
            return sortDir === "asc" ? cmp : -cmp;
        });

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
    };

    const SortArrow = ({ col }) => (
        <span style={{ marginLeft: 4, opacity: sortKey === col ? 1 : 0.4, fontSize: 10 }}>
            {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : "▲▼"}
        </span>
    );

    const fmt = (n) => parseFloat(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

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
                        <button onClick={handleDownloadCSV} style={styles.btnSecondary}>⬇️ Download XLSX</button>
                        <button onClick={handleDownloadTallyCSV} style={{...styles.btnSecondary, borderColor:'#0066cc', color:'#0066cc'}}>📊 Download for Tally</button>

                    </div>
                </div>

                {/* Upload Result */}

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
                    ) : filteredItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No inventory found. Click Sync to load products.</div>
                    ) : (
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.th, position: "sticky", left: 0, zIndex: 3, background: "#f8fafc", minWidth: 60 }}>Image</th>
                                        <th style={{ ...styles.th, cursor: "pointer", position: "sticky", left: 60, zIndex: 3, background: "#f8fafc", minWidth: 140 }} onClick={() => handleSort("product_name")}>Product <SortArrow col="product_name" /></th>
                                        <th style={{ ...styles.th, position: "sticky", left: 200, zIndex: 3, background: "#f8fafc", minWidth: 100 }}>Variant</th>
                                        <th style={{ ...styles.th, cursor: "pointer", position: "sticky", left: 300, zIndex: 3, background: "#f8fafc", minWidth: 80 }} onClick={() => handleSort("size_label")}>Size <SortArrow col="size_label" /></th>
                                        <th style={{ ...styles.th, position: "sticky", left: 380, zIndex: 3, background: "#f8fafc", minWidth: 60 }}>Unit</th>
                                        <th style={styles.th}>Account Name</th>
                                        <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('price')}>Price <SortArrow col="price" /></th>
                                        <th style={{ ...styles.th, color: '#006d2f', cursor: 'pointer' }} onClick={() => handleSort('stock_quantity')}>Stock In <SortArrow col="stock_quantity" /></th>
                                        <th style={styles.th}>Sold</th>
                                        <th style={styles.th}>Sale Type</th>
                                        <th style={styles.th}>Returned</th>
                                        <th style={styles.th}>Stock Out</th>
                                        <th style={{ ...styles.th, color: '#16a34a', cursor: 'pointer' }} onClick={() => handleSort('current_stock')}>Closing Balance <SortArrow col="current_stock" /></th>
                                        <th style={styles.th}>Total Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(item => {
                                        const currentStock = parseInt(item.current_stock || 0);
                                        const stockOut = parseInt(item.total_sold || 0) - parseInt(item.total_returned || 0);
                                        const isOut = currentStock <= 0;
                                        const isLow = currentStock > 0 && currentStock < threshold;
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: item.is_archived ? '#f3f4f6' : isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#fff', opacity: item.is_archived ? 0.4 : 1, pointerEvents: item.is_archived ? 'none' : 'auto', textDecoration: item.is_archived ? 'line-through' : 'none' }}>
                                                <td style={{ ...styles.td, position: "sticky", left: 0, background: "inherit", zIndex: 1, minWidth: 60 }}>
                                                    {item.image_url
                                                        ? <img src={item.image_url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8 }} />
                                                        : <div style={{ width: 40, height: 40, background: "#e0e3e6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>📦</div>}
                                                </td>
                                                <td style={{ ...styles.td, fontWeight: 600, color: "#006d2f", position: "sticky", left: 60, background: "inherit", zIndex: 1, minWidth: 140 }}>{item.product_name}</td>
                                                <td style={{ ...styles.td, color: "#556067", position: "sticky", left: 200, background: "inherit", zIndex: 1, minWidth: 100 }}>{item.variation_name}</td>
                                                <td style={{ ...styles.td, position: "sticky", left: 300, background: "inherit", zIndex: 1, minWidth: 80 }}>{item.size_label}</td>
                                                <td style={{ ...styles.td, position: "sticky", left: 380, background: "inherit", zIndex: 1, minWidth: 60, color: "#556067", fontSize: 12 }}>{(item.size_label||"").replace(/^[\d.]+\s*/, "")}</td>
                                                <td style={styles.td}>
                                                    {editingTallyId === item.id ? (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <input type="text" value={tallyValue} onChange={e => setTallyValue(e.target.value)}
                                                                style={{ width: 120, border: '2px solid #006d2f', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
                                                                autoFocus placeholder="Tally item name"
                                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveTallyName(item.id, tallyValue); if (e.key === 'Escape') setEditingTallyId(null); }} />
                                                            <button onClick={() => handleSaveTallyName(item.id, tallyValue)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>✓</button>
                                                            <button onClick={() => setEditingTallyId(null)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <span onClick={() => { setEditingTallyId(item.id); setTallyValue(item.tally_item_name || ''); }}
                                                            style={{ background: item.tally_item_name ? '#f0faf4' : '#f9fafb', color: item.tally_item_name ? '#006d2f' : '#9ca3af', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'inline-block', minWidth: 80 }}>
                                                            {item.tally_item_name || '+ Add name'} ✏️
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>₹{fmt(item.price)}</td>
                                                <td style={styles.td}>
                                                    {editingId === item.id ? (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                                                                style={{ width: 60, border: '2px solid #006d2f', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
                                                                min="0" autoFocus
                                                                onKeyDown={e => { if (e.key === 'Enter') handleUpdateStock(item.id, editValue); if (e.key === 'Escape') setEditingId(null); }} />
                                                            <button onClick={() => handleUpdateStock(item.id, editValue)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>✓</button>
                                                            <button onClick={() => setEditingId(null)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <span onClick={() => { setEditingId(item.id); setEditValue(item.stock_quantity); }}
                                                            style={{ background: '#f0faf4', color: '#006d2f', padding: '4px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'inline-block' }}>
                                                            {item.stock_quantity} ✏️
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>{item.total_sold}</td>
                                                <td style={styles.td}>
                                                    {item.instore_sold > 0 && <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e', marginRight: 4 }}>{dineInLabel}: {item.instore_sold}</span>}
                                                    {item.online_sold > 0 && <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#e8f5e9', color: '#005a27' }}>Delivery: {item.online_sold}</span>}
                                                </td>
                                                <td style={styles.td}>{item.total_returned}</td>
                                                <td style={styles.td}><span style={{ fontWeight: 600, color: stockOut < 0 ? '#16a34a' : '#374151' }}>{stockOut}</span></td>
                                                <td style={styles.td}>
                                                    <span style={{ fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a' }}>
                                                        {currentStock}{isOut ? ' ⚠️' : isLow ? ' 🔸' : ''}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>₹{fmt(item.total_value)}</td>
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
    );
};

const styles = {
    tableContainer: { background: 'white', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #eee' },
    th: { padding: '14px 16px', background: '#f8f9fa', color: '#556067', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: '2px solid #eee', borderRight: '1px solid #eee', whiteSpace: 'nowrap' },
    td: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', verticalAlign: 'middle', color: '#2d3436', lineHeight: '1.5' },
    btnPrimary: { background: '#006d2f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14 },
};

export default Inventory;
