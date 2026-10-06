import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

const Orders = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [addressFilter, setAddressFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState(null);

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

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        filterOrders(search, status, addressFilter);
    };

    const handleSearch = (term) => {
        setSearch(term);
        filterOrders(term, statusFilter, addressFilter);
    };

    const filterOrders = (term, status, address) => {
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
        
        setFilteredOrders(filtered);
    };

    const handleAddressFilter = (addr) => {
        setAddressFilter(addr);
        filterOrders(search, statusFilter, addr);
    };

    // Get unique store addresses from orders
    const storeAddresses = ['all', ...new Set(orders.map(o => o.branch_name || 'Main Store'))];

    const handleStatusUpdate = async (orderId, newStatus) => {
        if (!window.confirm(`Change order ${orderId} status to ${newStatus.replace('_', ' ').toUpperCase()}?`)) return;
        
        try {
            const result = await storeAdminAPI.updateOrderStatus(storeId, orderId, newStatus);
            if (result.success) {
                // Refresh orders
                fetchOrders(storeId);
                alert(`✅ Order ${orderId} updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
            } else {
                alert('❌ Failed to update order status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('❌ Error updating order status');
        }
    };

    const getStatusClass = (status) => `status-badge status-${status}`;

    const getStatusLabel = (status) => {
        if (status === 'accepted') return 'Accept for Production';
        return status.replace('_', ' ').toUpperCase();
    };

    // Status options for filter
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

    // All statuses for dropdown
    const allStatuses = [
        { value: 'pending', label: '⏳ Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'processing', label: 'Processing' },
        { value: 'accepted', label: 'Accept for Production' },
        { value: 'ready_to_deliver', label: 'Ready to Deliver' },
        { value: 'out_for_delivery', label: 'Out for Delivery' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: '❌ Cancelled' },
    ];

    if (loading) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div className="main-content" style={{...styles.main}}>
                    <div style={styles.loading}>Loading orders...</div>
                </div>
            </div>
        );
    }

    if (!storeId) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div className="main-content" style={{...styles.main}}>
                    <h1>Select a Store</h1>
                    <p style={{color:'#8e9eab'}}>Please select a store to manage</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <Sidebar />
            <div className="main-content" style={{...styles.main}}>
                <div style={styles.header}>
                    <div>
                        <h1>📋 Orders</h1>
                        <p style={{color:'#8e9eab',marginTop:'4px'}}>Manage and track all orders</p>
                    </div>
                    <button style={styles.exportBtn} onClick={() => {
                        const rows = [
                            ['Order ID', 'Date', 'Customer', 'Phone', 'Order Type', 'Items Detail', 'Amount', 'Items Count', 'Status', 'Payment Method', 'Payment Status'],
                            ...orders.map(o => [
                                o.order_id,
                                new Date(o.created_at).toLocaleString(),
                                o.customer_name || '',
                                o.customer_phone || '',
                                o.order_type || '',
                                o.items && Array.isArray(o.items) ? o.items.map(i => [i.product_name || i.name, i.variation_name, i.size_label || i.size, i.quantity > 1 ? 'x'+i.quantity : '', i.price ? '₹'+i.price : ''].filter(Boolean).join(' ')).join(' | ') : '',
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
                </div>

                <div style={styles.searchBar}>
                    <input 
                        type="text" 
                        placeholder="Search by order ID, customer, email..." 
                        value={search} 
                        onChange={(e) => handleSearch(e.target.value)} 
                        style={styles.searchInput} 
                    />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => handleStatusFilter(e.target.value)} 
                        style={styles.filterSelect}
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={addressFilter}
                        onChange={(e) => handleAddressFilter(e.target.value)}
                        style={styles.filterSelect}
                    >
                        {storeAddresses.map(addr => (
                            <option key={addr} value={addr}>{addr === 'all' ? 'All Locations' : addr}</option>
                        ))}
                    </select>
                    <span style={styles.resultCount}>{filteredOrders.length} orders found</span>
                </div>

                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Order ID</th>
                                <th style={styles.th}>Store Address</th>
                                <th style={styles.th}>Customer</th>
                                <th style={styles.th}>Order Type</th>
                                <th style={styles.th}>Items Detail</th>
                                <th style={styles.th}>Amount</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td style={styles.td}><strong style={{fontSize:'12px'}}>{order.order_id || order.id}</strong></td>
                                    <td style={styles.td}>
                                        {order.branch_name ? (
                                            <span style={{fontSize:'12px',padding:'2px 8px',borderRadius:'10px',background:'#e8f5e9',color:'#006d2f',fontWeight:600}}>
                                                {order.branch_name}
                                            </span>
                                        ) : <span style={{color:'#8e9eab',fontSize:'12px'}}>Main Store</span>}
                                    </td>
                                    <td style={styles.td}>
                                        <div>{order.customer_name || order.customer_phone || '—'}</div>
                                        <div style={{fontSize:'12px',color:'#8e9eab'}}>{order.customer_email || order.customer_phone}</div>
                                    </td>
                                    <td style={styles.td}>
                                        {order.order_type ? (
                                            <span style={{
                                                padding:'3px 8px',
                                                borderRadius:'12px',
                                                fontSize:'11px',
                                                fontWeight:'600',
                                                background: order.order_type === 'dine_in' ? '#fff3e0' : order.order_type === 'takeaway' ? '#e8f5e9' : '#e3f2fd',
                                                color: order.order_type === 'dine_in' ? '#e65100' : order.order_type === 'takeaway' ? '#2e7d32' : '#1565c0'
                                            }}>
                                                {order.order_type === 'dine_in' ? '🍽️ Dine In' : order.order_type === 'takeaway' ? '🥡 Takeaway' : '🚚 Delivery'}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{maxWidth:'220px'}}>
                                        {order.items && Array.isArray(order.items) ? (
                                            <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} style={{fontSize:'12px',paddingBottom: idx < order.items.length-1 ? '6px':'0', marginBottom: idx < order.items.length-1 ? '6px':'0'}}>
                                                        <div style={{fontWeight:'600',color:'#2d3436'}}>{item.product_name || item.name || '—'}</div>
                                                        <div style={{color:'#8e9eab'}}>
                                                            {[item.variation_name, item.size_label || item.size].filter(Boolean).join(' / ')}
                                                            {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                                                            {item.price ? ` — ₹${Number(item.price).toLocaleString()}` : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td style={styles.td}>₹{Number(order.total_amount).toLocaleString()}</td>
                                    <td style={styles.td}><span className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</span></td>
                                    <td style={{...styles.td, fontSize:'13px'}}>{new Date(order.created_at).toLocaleString()}</td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button style={styles.viewBtn} onClick={() => navigate(`/orders/${order.id}`)}>View</button>
                                            <select 
                                                style={styles.statusSelect}
                                                onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Update</option>
                                                {allStatuses.map(status => (
                                                    <option key={status.value} value={status.value}>
                                                        → {status.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

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
};

export default Orders;