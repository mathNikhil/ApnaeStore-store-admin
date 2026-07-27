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
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) {
            navigate('/login');
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
        filterOrders(search, status);
    };

    const handleSearch = (term) => {
        setSearch(term);
        filterOrders(term, statusFilter);
    };

    const filterOrders = (term, status) => {
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
        
        setFilteredOrders(filtered);
    };

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
                <div style={styles.main}>
                    <div style={styles.loading}>Loading orders...</div>
                </div>
            </div>
        );
    }

    if (!storeId) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}>
                    <h1>Select a Store</h1>
                    <p style={{color:'#8e9eab'}}>Please select a store to manage</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <div style={styles.header}>
                    <div>
                        <h1>📋 Orders</h1>
                        <p style={{color:'#8e9eab',marginTop:'4px'}}>Manage and track all orders</p>
                    </div>
                    <button style={styles.exportBtn} onClick={() => alert('CSV Export coming soon!')}>
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
                    <span style={styles.resultCount}>{filteredOrders.length} orders found</span>
                </div>

                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td><strong>{order.order_id || order.id}</strong></td>
                                    <td>
                                        <div>{order.customer_name}</div>
                                        <div style={{fontSize:'12px',color:'#8e9eab'}}>{order.customer_email}</div>
                                    </td>
                                    <td>₹{Number(order.total_amount).toLocaleString()}</td>
                                    <td>{order.items ? (Array.isArray(order.items) ? order.items.length : 1) : 1}</td>
                                    <td><span className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</span></td>
                                    <td style={{fontSize:'13px'}}>{new Date(order.created_at).toLocaleString()}</td>
                                    <td>
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
    main: { flex: 1, padding: '30px', marginLeft: '260px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    exportBtn: { padding: '10px 20px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
    searchBar: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
    searchInput: { flex: 1, minWidth: '200px', padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '14px' },
    filterSelect: { padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '14px', background: '#fff' },
    resultCount: { fontSize: '14px', color: '#8e9eab' },
    tableContainer: { background: 'white', borderRadius: '16px', overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '800px' },
    actionButtons: { display: 'flex', gap: '8px', alignItems: 'center' },
    viewBtn: { padding: '6px 14px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    statusSelect: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', background: '#fff', cursor: 'pointer', maxWidth: '150px' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
};

export default Orders;