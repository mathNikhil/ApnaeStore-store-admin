import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';
import useStaffAccess from '../hooks/useStaffAccess';

// ── View-mode icons ───────────────────────────────────────────────────────────
const TableIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
);
const CardIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="14" height="4" rx="1"/>
        <rect x="1" y="7" width="14" height="4" rx="1"/>
        <rect x="1" y="13" width="14" height="2" rx="1"/>
    </svg>
);

// Sort indicator
const SortIcon = ({ active, dir }) => (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 11 }}>
        {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
);

const Orders = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { canEdit } = useStaffAccess('orders');
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [addressFilter, setAddressFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState(null);

    // ── Selection state ───────────────────────────────────────────────────────
    const [selectedOrders, setSelectedOrders] = useState(new Set());

    // ── Sort state ────────────────────────────────────────────────────────────
    const [sortBy, setSortBy]   = useState('date');   // 'customer' | 'date'
    const [sortDir, setSortDir] = useState('desc');   // 'asc' | 'desc'

    // Persist view preference in localStorage
    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('ordersViewMode') || 'table'; } catch { return 'table'; }
    });

    const setView = (mode) => {
        setViewMode(mode);
        try { localStorage.setItem('ordersViewMode', mode); } catch {}
    };

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) {
            navigate(`/login${window.location.search}`);
            return;
        }
        const storedStoreId = localStorage.getItem('currentStoreId');
        if (storedStoreId) {
            setStoreId(storedStoreId);
            fetchOrders(storedStoreId);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchOrders = async (sid) => {
        try {
            const result = await storeAdminAPI.getOrders(sid);
            if (result.success) {
                setOrders(result.data);
                setFilteredOrders(result.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Sort helper ───────────────────────────────────────────────────────────
    const applySortToList = useCallback((list, by, dir) => {
        return [...list].sort((a, b) => {
            let valA, valB;
            if (by === 'customer') {
                valA = (a.customer_name || a.customer_phone || '').toLowerCase();
                valB = (b.customer_name || b.customer_phone || '').toLowerCase();
                return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else { // date
                valA = new Date(a.created_at).getTime();
                valB = new Date(b.created_at).getTime();
                return dir === 'asc' ? valA - valB : valB - valA;
            }
        });
    }, []);

    const handleSort = (col) => {
        let newDir = 'asc';
        if (sortBy === col) newDir = sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(col);
        setSortDir(newDir);
        setFilteredOrders(prev => applySortToList(prev, col, newDir));
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        filterOrders(search, status, addressFilter, sortBy, sortDir);
    };

    const handleSearch = (term) => {
        setSearch(term);
        filterOrders(term, statusFilter, addressFilter, sortBy, sortDir);
    };

    const filterOrders = (term, status, address, by, dir) => {
        let filtered = orders;
        if (term) {
            filtered = filtered.filter(o =>
                (o.order_id || o.id).toLowerCase().includes(term.toLowerCase()) ||
                (o.customer_name || '').toLowerCase().includes(term.toLowerCase()) ||
                (o.customer_email || '').toLowerCase().includes(term.toLowerCase())
            );
        }
        if (status !== 'all') {
            filtered = filtered.filter(o => o.status === status);
        }
        const addr = address !== undefined ? address : addressFilter;
        if (addr !== 'all') {
            filtered = filtered.filter(o => (o.branch_name || 'Main Store') === addr);
        }
        setFilteredOrders(applySortToList(filtered, by || sortBy, dir || sortDir));
    };

    const handleAddressFilter = (addr) => {
        setAddressFilter(addr);
        filterOrders(search, statusFilter, addr, sortBy, sortDir);
    };

    const storeAddresses = ['all', ...new Set(orders.map(o => o.branch_name || 'Main Store'))];

    // ── Selection helpers ─────────────────────────────────────────────────────
    const toggleSelect = (orderId) => {
        setSelectedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
        }
    };

    const clearSelection = () => setSelectedOrders(new Set());

    const openCombinedInvoice = () => {
        if (selectedOrders.size < 1) return;
        const ids = [...selectedOrders].join(',');
        const subdomain = localStorage.getItem('currentStoreSubdomain') || '';
        navigate(`/orders/combined-invoice?ids=${ids}&subdomain=${subdomain}`);
    };

    // Single-order print helpers
    const openA4Invoice = (order) => {
        const subdomain = localStorage.getItem('currentStoreSubdomain') || '';
        const storeId   = localStorage.getItem('currentStoreId') || '';
        const token     = localStorage.getItem('storeAdminToken') || '';
        const orderId   = order.id;
        window.open(`/orders/combined-invoice?ids=${orderId}&subdomain=${subdomain}&storeId=${storeId}&t=${token}`, '_blank');
    };

    const openThermalBill = (order) => {
        const subdomain = localStorage.getItem('currentStoreSubdomain') || '';
        const storeId   = localStorage.getItem('currentStoreId') || '';
        const token     = localStorage.getItem('storeAdminToken') || '';
        const orderId   = order.id;
        window.open(`/orders/${orderId}/thermal?subdomain=${subdomain}&storeId=${storeId}&t=${token}`, '_blank');
    };

    // ── Status update ─────────────────────────────────────────────────────────
    const handleStatusUpdate = async (orderId, newStatus, currentStatus) => {
        if (newStatus === currentStatus) return;
        if (!window.confirm(`Change order status to ${newStatus.replace(/_/g, ' ').toUpperCase()}?`)) return;
        try {
            const result = await storeAdminAPI.updateOrderStatus(storeId, orderId, newStatus);
            if (result.success) {
                const updateStatus = (list) =>
                    list.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
                setOrders(prev => updateStatus(prev));
                setFilteredOrders(prev => updateStatus(prev));
            } else {
                alert(`❌ Failed to update order status: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert(`❌ Error: ${error.message || 'Failed to update order status'}`);
        }
    };

    const getStatusClass = (status) => `status-badge status-${status}`;

    const getStatusLabel = (status) => {
        if (status === 'accepted') return 'Accept for Production';
        return status.replace('_', ' ').toUpperCase();
    };

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'processing', label: 'Processing' },
        { value: 'accepted', label: 'Accept for Production' },
        { value: 'ready_to_deliver', label: 'Ready to Deliver' },
        { value: 'out_for_delivery', label: 'Out for Delivery' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    const allStatuses = [
        { value: 'pending', label: '⏳ Pending', displayOnly: true },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'processing', label: 'Processing' },
        { value: 'accepted', label: 'Accept for Production' },
        { value: 'ready_to_deliver', label: 'Ready to Deliver' },
        { value: 'out_for_delivery', label: 'Out for Delivery' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: '❌ Cancelled' },
    ];

    const STATUS_COLORS = {
        pending:          { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
        confirmed:        { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
        processing:       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
        accepted:         { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
        ready_to_deliver: { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
        out_for_delivery: { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
        delivered:        { bg: '#f0fdf4', color: '#166534', border: '#86efac' },
        cancelled:        { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    };

    const ORDER_TYPE_STYLE = {
        dine_in:  { bg: '#fff3e0', color: '#e65100', label: '🍽️ Dine In' },
        takeaway: { bg: '#e8f5e9', color: '#2e7d32', label: '🥡 Takeaway' },
        delivery: { bg: '#e3f2fd', color: '#1565c0', label: '🚚 Delivery' },
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div className="main-content" style={styles.main}>
                    <div style={styles.loading}>Loading orders...</div>
                </div>
            </div>
        );
    }

    if (!storeId) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div className="main-content" style={styles.main}>
                    <h1>Select a Store</h1>
                    <p style={{ color: '#8e9eab' }}>Please select a store to manage</p>
                </div>
            </div>
        );
    }

    // ── Card view ─────────────────────────────────────────────────────────────
    const OrderCard = ({ order }) => {
        const sc = STATUS_COLORS[order.status] || { bg: '#f8f9fa', color: '#556067', border: '#e0e0e0' };
        const ot = ORDER_TYPE_STYLE[order.order_type];
        const isSelected = selectedOrders.has(order.id);
        return (
            <div style={{ ...cardStyles.card, ...(isSelected ? { borderColor: '#006d2f', boxShadow: '0 0 0 2px #c8e6c9' } : {}) }}>
                {/* Selection + header */}
                <div style={cardStyles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(order.id)}
                            style={{ width: 16, height: 16, accentColor: '#006d2f', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={cardStyles.orderId}>#{order.order_id || order.id}</span>
                        {order.branch_name && (
                            <span style={cardStyles.branchBadge}>{order.branch_name}</span>
                        )}
                    </div>
                    <span style={{ ...cardStyles.statusBadge, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {getStatusLabel(order.status)}
                    </span>
                </div>

                {/* Customer + type row */}
                <div style={cardStyles.metaRow}>
                    <div style={cardStyles.customer}>
                        <span style={cardStyles.customerName}>{order.customer_name || order.customer_phone || '—'}</span>
                        {order.customer_phone && order.customer_name && (
                            <span style={cardStyles.customerSub}>{order.customer_phone}</span>
                        )}
                    </div>
                    {ot && (
                        <span style={{ ...cardStyles.typeBadge, background: ot.bg, color: ot.color }}>
                            {ot.label}
                        </span>
                    )}
                </div>

                {/* Items */}
                {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                    <div style={cardStyles.items}>
                        {order.items.map((item, idx) => (
                            <div key={idx} style={cardStyles.itemRow}>
                                <span style={cardStyles.itemName}>{item.product_name || item.name || '—'}</span>
                                <span style={cardStyles.itemMeta}>
                                    {[item.variation_name, item.size_label || item.size].filter(Boolean).join(' / ')}
                                    {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                                    {item.price ? ` · ₹${Number(item.price).toLocaleString()}` : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer: amount + date + actions */}
                <div style={cardStyles.cardFooter}>
                    <div>
                        <span style={cardStyles.amount}>₹{Number(order.total_amount).toLocaleString()}</span>
                        {order.coupon_code && (
                            <span style={cardStyles.coupon}>🏷️ {order.coupon_code} −₹{Number(order.discount_amount || 0).toLocaleString()}</span>
                        )}
                        <div style={cardStyles.date}>{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div style={cardStyles.cardActions}>
                        <button style={cardStyles.viewBtn} onClick={() => navigate(`/orders/${order.id}`)}>
                            View
                        </button>
                        <button
                            title="Tax Invoice (A4)"
                            style={{ padding: '6px 10px', background: '#fff', color: '#006d2f', border: '1.5px solid #006d2f', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onClick={() => openA4Invoice(order)}
                        >📄 A4</button>
                        <button
                            title="Thermal Bill (80mm)"
                            style={{ padding: '6px 10px', background: '#fff3e0', color: '#e65100', border: '1.5px solid #ffcc80', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onClick={() => openThermalBill(order)}
                        >🧾</button>
                        {canEdit && (
                            <select
                                style={cardStyles.statusSelect}
                                value={order.status}
                                onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.status)}
                            >
                                {allStatuses.map(s => (
                                    <option key={s.value} value={s.value} disabled={!!s.displayOnly}>{s.label}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const allVisible = filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length;

    return (
        <div style={styles.container}>
            <Sidebar />
            <div className="main-content" style={styles.main}>

                {/* Page header */}
                <div style={styles.header}>
                    <div>
                        <h1>📋 Orders</h1>
                        <p style={{ color: '#8e9eab', marginTop: '4px' }}>Manage and track all orders</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Invoice button — appears when 1+ orders selected */}
                        {selectedOrders.size >= 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e8f5e9', border: '1.5px solid #a5d6a7', borderRadius: 10, padding: '6px 12px' }}>
                                <span style={{ fontSize: 13, color: '#1b5e20', fontWeight: 600 }}>
                                    {selectedOrders.size} {selectedOrders.size === 1 ? 'order' : 'orders'} selected
                                </span>
                                <button
                                    style={{ padding: '7px 14px', background: '#006d2f', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                                    onClick={openCombinedInvoice}
                                >
                                    📄 Tax Invoice (A4)
                                </button>
                                <button
                                    style={{ padding: '7px 14px', background: '#fff', color: '#006d2f', border: '1.5px solid #006d2f', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                                    onClick={() => {
                                        const ids = [...selectedOrders].join(',');
                                        const subdomain = localStorage.getItem('currentStoreSubdomain') || '';
                                        const storeId2 = localStorage.getItem('currentStoreId') || '';
                                        const token2 = localStorage.getItem('storeAdminToken') || '';
                                        // For single order thermal open thermal route; for multi open combined (A4 only)
                                        if (selectedOrders.size === 1) {
                                            const orderId = [...selectedOrders][0];
                                            window.open(`/orders/${orderId}/thermal?subdomain=${subdomain}&storeId=${storeId2}&t=${token2}`, '_blank');
                                        } else {
                                            window.open(`/orders/combined-invoice?ids=${ids}&subdomain=${subdomain}&storeId=${storeId2}&t=${token2}`, '_blank');
                                        }
                                    }}
                                >
                                    🧾 Thermal Bill
                                </button>
                                <button
                                    style={{ padding: '6px 10px', background: 'transparent', color: '#556067', border: '1px solid #ccc', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}
                                    onClick={clearSelection}
                                    title="Clear selection"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* View toggle */}
                        <div style={styles.viewToggle}>
                            <button
                                title="Table view"
                                style={{ ...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : {}) }}
                                onClick={() => setView('table')}
                            >
                                <TableIcon /> Table
                            </button>
                            <button
                                title="Card view"
                                style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }}
                                onClick={() => setView('card')}
                            >
                                <CardIcon /> Cards
                            </button>
                        </div>
                        {canEdit && (
                            <button style={styles.exportBtn} onClick={() => {
                                const rows = [
                                    ['Order ID', 'Date', 'Customer', 'Phone', 'Order Type', 'Items Detail', 'Amount', 'Items Count', 'Status', 'Payment Method', 'Payment Status'],
                                    ...orders.map(o => [
                                        o.order_id,
                                        new Date(o.created_at).toLocaleString(),
                                        o.customer_name || '',
                                        o.customer_phone || '',
                                        o.order_type || '',
                                        o.items && Array.isArray(o.items) ? o.items.map(i => [i.product_name || i.name, i.variation_name, i.size_label || i.size, i.quantity > 1 ? 'x' + i.quantity : '', i.price ? '₹' + i.price : ''].filter(Boolean).join(' ')).join(' | ') : '',
                                        o.total_amount,
                                        o.items ? (Array.isArray(o.items) ? o.items.length : 1) : 1,
                                        o.status,
                                        o.payment_method || '',
                                        o.payment_status || ''
                                    ])
                                ];
                                const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'orders_' + new Date().toISOString().split('T')[0] + '.csv';
                                a.click();
                                URL.revokeObjectURL(url);
                            }}>
                                📥 Export CSV
                            </button>
                        )}
                    </div>
                </div>

                {/* Search / filter bar */}
                <div style={styles.searchBar}>
                    <input
                        type="text"
                        placeholder="Search by order ID, customer, email..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={styles.searchInput}
                    />
                    <select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)} style={styles.filterSelect}>
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select value={addressFilter} onChange={(e) => handleAddressFilter(e.target.value)} style={styles.filterSelect}>
                        {storeAddresses.map(addr => (
                            <option key={addr} value={addr}>{addr === 'all' ? 'All Locations' : addr}</option>
                        ))}
                    </select>
                    <span style={styles.resultCount}>{filteredOrders.length} orders found</span>
                </div>

                {/* ── TABLE VIEW ── */}
                {viewMode === 'table' && (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    {/* Select-all checkbox */}
                                    <th style={{ ...styles.th, width: 40, textAlign: 'center', paddingLeft: 12 }}>
                                        <input
                                            type="checkbox"
                                            checked={allVisible}
                                            onChange={toggleSelectAll}
                                            title={allVisible ? 'Deselect all' : 'Select all visible'}
                                            style={{ width: 15, height: 15, accentColor: '#006d2f', cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th style={styles.th}>Order ID</th>
                                    <th style={styles.th}>Store Address</th>
                                    {/* Sortable: Customer */}
                                    <th
                                        style={{ ...styles.th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                        onClick={() => handleSort('customer')}
                                        title="Sort by customer name"
                                    >
                                        Customer <SortIcon active={sortBy === 'customer'} dir={sortDir} />
                                    </th>
                                    <th style={styles.th}>Order Type</th>
                                    <th style={styles.th}>Items Detail</th>
                                    <th style={styles.th}>Amount</th>
                                    <th style={styles.th}>Status</th>
                                    {/* Sortable: Date */}
                                    <th
                                        style={{ ...styles.th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                        onClick={() => handleSort('date')}
                                        title="Sort by date"
                                    >
                                        Date <SortIcon active={sortBy === 'date'} dir={sortDir} />
                                    </th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const isSelected = selectedOrders.has(order.id);
                                    return (
                                        <tr key={order.id} style={isSelected ? { background: '#f0fdf4' } : {}}>
                                            {/* Row checkbox */}
                                            <td style={{ ...styles.td, textAlign: 'center', paddingLeft: 12 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(order.id)}
                                                    style={{ width: 15, height: 15, accentColor: '#006d2f', cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={styles.td}><strong style={{ fontSize: '12px' }}>{order.order_id || order.id}</strong></td>
                                            <td style={styles.td}>
                                                {order.branch_name ? (
                                                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: '#e8f5e9', color: '#006d2f', fontWeight: 600 }}>
                                                        {order.branch_name}
                                                    </span>
                                                ) : <span style={{ color: '#8e9eab', fontSize: '12px' }}>Main Store</span>}
                                            </td>
                                            <td style={styles.td}>
                                                <div>{order.customer_name || order.customer_phone || '—'}</div>
                                                <div style={{ fontSize: '12px', color: '#8e9eab' }}>{order.customer_email || order.customer_phone}</div>
                                            </td>
                                            <td style={styles.td}>
                                                {order.order_type ? (
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                                                        background: order.order_type === 'dine_in' ? '#fff3e0' : order.order_type === 'takeaway' ? '#e8f5e9' : '#e3f2fd',
                                                        color: order.order_type === 'dine_in' ? '#e65100' : order.order_type === 'takeaway' ? '#2e7d32' : '#1565c0'
                                                    }}>
                                                        {order.order_type === 'dine_in' ? '🍽️ Dine In' : order.order_type === 'takeaway' ? '🥡 Takeaway' : '🚚 Delivery'}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ maxWidth: '220px' }}>
                                                {order.items && Array.isArray(order.items) ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} style={{ fontSize: '12px', paddingBottom: idx < order.items.length - 1 ? '6px' : '0', marginBottom: idx < order.items.length - 1 ? '6px' : '0' }}>
                                                                <div style={{ fontWeight: '600', color: '#2d3436' }}>{item.product_name || item.name || '—'}</div>
                                                                <div style={{ color: '#8e9eab' }}>
                                                                    {[item.variation_name, item.size_label || item.size].filter(Boolean).join(' / ')}
                                                                    {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                                                                    {item.price ? ` — ₹${Number(item.price).toLocaleString()}` : ''}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td style={styles.td}>
                                                <div>₹{Number(order.total_amount).toLocaleString()}</div>
                                                {order.coupon_code && (
                                                    <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                                                        🏷️ {order.coupon_code} −₹{Number(order.discount_amount).toLocaleString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={styles.td}><span className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</span></td>
                                            <td style={{ ...styles.td, fontSize: '13px' }}>{new Date(order.created_at).toLocaleString()}</td>
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons}>
                                                    <button style={styles.viewBtn} onClick={() => navigate(`/orders/${order.id}`)}>View</button>
                                                    <button
                                                        title="Tax Invoice (A4)"
                                                        style={{ padding: '5px 9px', background: '#fff', color: '#006d2f', border: '1.5px solid #006d2f', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                        onClick={() => openA4Invoice(order)}
                                                    >📄 A4</button>
                                                    <button
                                                        title="Thermal Bill (80mm)"
                                                        style={{ padding: '5px 9px', background: '#fff3e0', color: '#e65100', border: '1.5px solid #ffcc80', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                        onClick={() => openThermalBill(order)}
                                                    >🧾 Thermal</button>
                                                    {canEdit && (
                                                        <select
                                                            style={styles.statusSelect}
                                                            value={order.status}
                                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.status)}
                                                        >
                                                            {allStatuses.map(status => (
                                                                <option key={status.value} value={status.value} disabled={!!status.displayOnly}>
                                                                    {status.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── CARD VIEW ── */}
                {viewMode === 'card' && (
                    <>
                        {/* Card view sort controls */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, color: '#556067', fontWeight: 600 }}>Sort:</span>
                            <button
                                style={{ ...styles.sortChip, ...(sortBy === 'customer' ? styles.sortChipActive : {}) }}
                                onClick={() => handleSort('customer')}
                            >
                                Customer {sortBy === 'customer' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                            </button>
                            <button
                                style={{ ...styles.sortChip, ...(sortBy === 'date' ? styles.sortChipActive : {}) }}
                                onClick={() => handleSort('date')}
                            >
                                Date {sortBy === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                            </button>
                            {selectedOrders.size > 0 && (
                                <span style={{ marginLeft: 'auto', fontSize: 13, color: '#006d2f', fontWeight: 600 }}>
                                    {selectedOrders.size} selected
                                </span>
                            )}
                        </div>
                        <div style={cardStyles.grid}>
                            {filteredOrders.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#8e9eab' }}>
                                    No orders found
                                </div>
                            ) : (
                                filteredOrders.map(order => <OrderCard key={order.id} order={order} />)
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

// ── Table styles ──────────────────────────────────────────────────────────────
const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '24px', marginLeft: '240px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' },
    exportBtn: { padding: '10px 18px', background: '#006d2f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
    searchBar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
    searchInput: { flex: 1, minWidth: '180px', padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px' },
    filterSelect: { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', background: '#fff' },
    resultCount: { fontSize: '13px', color: '#8e9eab', whiteSpace: 'nowrap' },
    tableContainer: { background: 'white', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '13px', border: '1px solid #eee' },
    th: { padding: '14px 16px', background: '#f8f9fa', color: '#556067', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: '2px solid #eee', borderRight: '1px solid #eee', whiteSpace: 'nowrap' },
    td: { padding: '16px 16px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', verticalAlign: 'middle', color: '#2d3436', lineHeight: '1.5' },
    actionButtons: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' },
    viewBtn: { padding: '5px 12px', background: '#006d2f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    statusSelect: { padding: '5px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', background: '#fff', cursor: 'pointer', maxWidth: '140px' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
    viewToggle: { display: 'flex', background: '#f0f2f5', borderRadius: '8px', padding: '3px', gap: '2px' },
    toggleBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', background: 'transparent', color: '#556067', transition: 'all 0.15s' },
    toggleActive: { background: '#fff', color: '#006d2f', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', fontWeight: '600' },
    // Sort chip buttons for card view
    sortChip: { padding: '5px 12px', background: '#f0f2f5', border: '1px solid #e0e3e6', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#556067', cursor: 'pointer' },
    sortChipActive: { background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#006d2f' },
};

// ── Card view styles ──────────────────────────────────────────────────────────
const cardStyles = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
    card: { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #f0f0f0', transition: 'border-color 0.15s, box-shadow 0.15s' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' },
    orderId: { fontWeight: '700', fontSize: '14px', color: '#2d3436' },
    branchBadge: { marginLeft: '8px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#e8f5e9', color: '#006d2f', fontWeight: 600 },
    statusBadge: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px' },
    metaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
    customer: { display: 'flex', flexDirection: 'column', gap: '2px' },
    customerName: { fontSize: '13px', fontWeight: '600', color: '#2d3436' },
    customerSub: { fontSize: '12px', color: '#8e9eab' },
    typeBadge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '12px', whiteSpace: 'nowrap' },
    items: { background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' },
    itemRow: { display: 'flex', flexDirection: 'column', gap: '1px' },
    itemName: { fontSize: '13px', fontWeight: '600', color: '#2d3436' },
    itemMeta: { fontSize: '12px', color: '#8e9eab' },
    cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px', borderTop: '1px solid #f0f0f0', paddingTop: '12px', marginTop: '2px' },
    amount: { fontSize: '16px', fontWeight: '700', color: '#006d2f' },
    coupon: { display: 'block', fontSize: '11px', color: '#16a34a', marginTop: '2px' },
    date: { fontSize: '11px', color: '#8e9eab', marginTop: '4px' },
    cardActions: { display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 },
    viewBtn: { padding: '7px 14px', background: '#006d2f', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    statusSelect: { padding: '6px 8px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '12px', background: '#fff', cursor: 'pointer', maxWidth: '130px' },
};

export default Orders;
