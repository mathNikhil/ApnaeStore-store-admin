import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [storeId, setStoreId] = useState(null);
    const [tracking, setTracking] = useState(null);
    const [showCourierForm, setShowCourierForm] = useState(false);
    const [courierName, setCourierName] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierNotes, setCourierNotes] = useState('');
    const [savingTracking, setSavingTracking] = useState(false);
    const [refreshingTracking, setRefreshingTracking] = useState(false);
    const [myCouriers, setMyCouriers] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) {
            navigate(`/login${window.location.search}`);
            return;
        }
        const storedStoreId = localStorage.getItem('currentStoreId');
        if (storedStoreId) {
            setStoreId(storedStoreId);
            fetchOrderDetail(storedStoreId);
        } else {
            setLoading(false);
        }
    }, [id]);

    const fetchOrderDetail = async (sid) => {
        try {
            const result = await storeAdminAPI.getOrder(sid, id);
            if (result.success) {
                setOrder(result.data);
                setSelectedStatus(result.data.status);
            }
            const trackingResult = await storeAdminAPI.getTracking(sid, id);
            if (trackingResult.success && trackingResult.data && trackingResult.data.tracking_number) {
                setTracking(trackingResult.data);
            }
            const couriersResult = await storeAdminAPI.getCouriers(sid);
            if (couriersResult.success) {
                setMyCouriers(couriersResult.data);
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedStatus || selectedStatus === order.status) {
            alert('Please select a different status');
            return;
        }

        // ✅ Out for Delivery needs courier + tracking details — instead of
        // a plain status change, this opens the courier form, which saves
        // both the tracking info AND the status together.
        if (selectedStatus === 'out_for_delivery') {
            setShowCourierForm(true);
            return;
        }

        if (!window.confirm(`Change order status to ${selectedStatus.replace('_', ' ').toUpperCase()}?`)) return;

        try {
            const result = await storeAdminAPI.updateOrderStatus(storeId, order.id, selectedStatus);
            if (result.success) {
                alert(`✅ Order status updated to ${selectedStatus.replace('_', ' ').toUpperCase()}`);
                fetchOrderDetail(storeId);
            } else {
                alert('❌ Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('❌ Error updating order status');
        }
    };

    const handleSaveCourierInfo = async () => {
        if (!courierName.trim() || !trackingNumber.trim()) {
            alert('Please enter both courier name and tracking number');
            return;
        }
        setSavingTracking(true);
        try {
            const result = await storeAdminAPI.addTracking(storeId, order.id, courierName.trim(), trackingNumber.trim(), courierNotes.trim());
            if (result.success) {
                alert('✅ Order marked Out for Delivery with tracking details');
                setShowCourierForm(false);
                setCourierName('');
                setTrackingNumber('');
                setCourierNotes('');
                fetchOrderDetail(storeId);
            } else {
                alert(result.error || '❌ Failed to save tracking details');
            }
        } catch (error) {
            console.error('Error saving tracking:', error);
            alert('❌ Error saving tracking details');
        } finally {
            setSavingTracking(false);
        }
    };

    const handleRefreshTracking = async () => {
        setRefreshingTracking(true);
        try {
            const result = await storeAdminAPI.refreshTracking(storeId, order.id);
            if (result.success) {
                setTracking(result.data);
                if (result.data.last_status === 'delivered') {
                    fetchOrderDetail(storeId);
                }
            } else {
                alert(result.error || 'Failed to refresh tracking');
            }
        } catch (error) {
            console.error('Error refreshing tracking:', error);
            alert('Failed to refresh tracking');
        } finally {
            setRefreshingTracking(false);
        }
    };

    const getStatusClass = (status) => `status-badge status-${status}`;

    const getStatusLabel = (status) => {
        if (status === 'accepted') return 'Accept for Production';
        return status.replace('_', ' ').toUpperCase();
    };

    // All statuses
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
                    <div style={styles.loading}>Loading order details...</div>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}>
                    <div style={styles.loading}>Order not found</div>
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
                        <button style={styles.backBtn} onClick={() => navigate('/orders')}>← Back to Orders</button>
                        <h1 style={{marginTop:'8px'}}>Order #{order.order_id || order.id}</h1>
                    </div>
                    <span className={getStatusClass(order.status)} style={{fontSize:'14px',padding:'8px 16px'}}>
                        {getStatusLabel(order.status)}
                    </span>
                </div>

                <div style={styles.statusUpdateCard}>
                    <h3 style={styles.cardTitle}>🔧 Update Order Status</h3>
                    <div style={styles.statusUpdateRow}>
                        <select 
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            style={styles.statusSelect}
                        >
                            {allStatuses.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                        <button 
                            style={styles.updateBtn}
                            onClick={handleStatusUpdate}
                            disabled={selectedStatus === order.status}
                        >
                            Update Status
                        </button>
                    </div>
                    <div style={styles.currentStatus}>
                        Current: <span className={getStatusClass(order.status)}>
                            {getStatusLabel(order.status)}
                        </span>
                    </div>
                </div>

                {showCourierForm && (
                    <div style={{...styles.statusUpdateCard, border: '2px solid #2ecc71'}}>
                        <h3 style={styles.cardTitle}>🚚 Courier &amp; Tracking Details</h3>
                        <p style={{fontSize: '13px', color: '#666', marginBottom: '12px'}}>
                            Enter the courier and tracking number to mark this order Out for Delivery. We'll automatically check delivery status from the courier's site going forward.
                        </p>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px'}}>
                            {myCouriers.length > 0 ? (
                                <>
                                    <select
                                        value={courierName}
                                        onChange={(e) => setCourierName(e.target.value)}
                                        style={styles.statusSelect}
                                    >
                                        <option value="">Select a courier...</option>
                                        {myCouriers.map((c) => (
                                            <option key={c.id} value={c.courier_name}>{c.courier_name}</option>
                                        ))}
                                    </select>
                                    <a href="/couriers" target="_blank" rel="noreferrer" style={{fontSize: '12px', color: '#667eea'}}>
                                        + Manage my couriers
                                    </a>
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Courier name (e.g. Delhivery, Blue Dart)"
                                        value={courierName}
                                        onChange={(e) => setCourierName(e.target.value)}
                                        style={styles.statusSelect}
                                    />
                                    <a href="/couriers" target="_blank" rel="noreferrer" style={{fontSize: '12px', color: '#667eea'}}>
                                        Set up your courier list for next time →
                                    </a>
                                </>
                            )}
                            <input
                                type="text"
                                placeholder="Tracking number"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                style={styles.statusSelect}
                            />
                            <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={courierNotes}
                                onChange={(e) => setCourierNotes(e.target.value)}
                                style={styles.statusSelect}
                            />
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button style={styles.updateBtn} onClick={handleSaveCourierInfo} disabled={savingTracking}>
                                    {savingTracking ? 'Saving...' : 'Save & Mark Out for Delivery'}
                                </button>
                                <button
                                    style={{...styles.updateBtn, background: '#f0f2f5', color: '#666'}}
                                    onClick={() => { setShowCourierForm(false); setSelectedStatus(order.status); }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {tracking && (
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>🚚 Delivery Tracking</h3>
                        <div style={styles.infoRow}><strong>Courier:</strong> {tracking.courier_name}</div>
                        <div style={styles.infoRow}><strong>Tracking #:</strong> {tracking.tracking_number}</div>
                        <div style={styles.infoRow}><strong>Status:</strong> {tracking.last_status_message || tracking.last_status || 'Pending'}</div>
                        {tracking.last_checked && (
                            <div style={styles.infoRow}>
                                <strong>Last checked:</strong> {new Date(tracking.last_checked).toLocaleString()}
                            </div>
                        )}
                        <button
                            style={{...styles.updateBtn, marginTop: '10px'}}
                            onClick={handleRefreshTracking}
                            disabled={refreshingTracking}
                        >
                            {refreshingTracking ? 'Checking...' : '🔄 Refresh Tracking Now'}
                        </button>
                        <p style={{fontSize: '12px', color: '#8e9eab', marginTop: '8px'}}>
                            Also checks automatically every 60 minutes.
                        </p>
                    </div>
                )}

                <div style={styles.grid}>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>👤 Customer</h3>
                        <div style={styles.infoRow}><strong>Name:</strong> {order.customer_name}</div>
                        <div style={styles.infoRow}><strong>Email:</strong> {order.customer_email}</div>
                        <div style={styles.infoRow}><strong>Phone:</strong> {order.customer_phone}</div>
                    </div>

                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📋 Order Details</h3>
                        <div style={styles.infoRow}><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</div>
                        <div style={styles.infoRow}><strong>Total:</strong> ₹{Number(order.total_amount).toLocaleString()}</div>
                        <div style={styles.infoRow}><strong>Payment Method:</strong> {order.payment_method === 'upi' ? 'UPI' : (order.payment_method || '—')}</div>
                        <div style={styles.infoRow}><strong>Payment:</strong> {order.payment_status || 'Pending'}</div>
                        <div style={styles.infoRow}><strong>Items:</strong> {order.items ? (Array.isArray(order.items) ? order.items.length : 1) : 1}</div>

                        {/* ✅ Only relevant on the COD+UPI tier (no real gateway
                            yet) — gives the operator the customer's own UPI ID
                            to manually cross-check against their own bank/UPI
                            app for a matching payment before moving the order
                            from pending to confirmed via the status dropdown
                            above. */}
                        {order.payment_method === 'upi' && order.customer_upi_id && (
                            <div style={styles.upiCheckBox}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#8a4a00', marginBottom: '4px' }}>
                                    ⚠️ Verify Before Confirming
                                </div>
                                <div style={{ fontSize: '14px' }}>
                                    Customer's UPI ID: <strong>{order.customer_upi_id}</strong>
                                </div>
                                <div style={{ fontSize: '12px', color: '#8a4a00', marginTop: '4px' }}>
                                    Check your UPI app / bank statement for ₹{Number(order.total_amount).toLocaleString()} from this ID before confirming.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>📍 Shipping Address</h3>
                    <p>{order.shipping_address ? JSON.stringify(order.shipping_address) : 'Not provided'}</p>
                    {order.notes && <p style={{marginTop:'8px',color:'#666'}}><strong>Notes:</strong> {order.notes}</p>}
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>🛒 Items</h3>
                    {order.items ? (
                        <table style={styles.itemTable}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(order.items) && order.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>₹{item.price}</td>
                                        <td>₹{item.total || item.price * item.quantity}</td>
                                    </tr>
                                ))}
                                <tr style={styles.totalRow}>
                                    <td colSpan="3"><strong>Total</strong></td>
                                    <td><strong>₹{Number(order.total_amount).toLocaleString()}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <p>No items</p>
                    )}
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>📊 Status History</h3>
                    {order.status_history && order.status_history.length > 0 ? (
                        order.status_history.map((entry, index) => (
                            <div key={index} style={styles.historyItem}>
                                <div style={styles.historyDot}></div>
                                <div>
                                    <div style={styles.historyStatus}>
                                        <span className={getStatusClass(entry.status)}>
                                            {getStatusLabel(entry.status)}
                                        </span>
                                    </div>
                                    <div style={styles.historyDate}>{new Date(entry.created_at).toLocaleString()}</div>
                                    {entry.notes && <div style={styles.historyNote}>{entry.notes}</div>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No status history</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '30px', marginLeft: '260px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    upiCheckBox: { marginTop: '12px', padding: '10px 12px', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: '8px' },
    backBtn: { color: '#667eea', cursor: 'pointer', fontWeight: '600', fontSize: '14px', border: 'none', background: 'none' },
    
    statusUpdateCard: { 
        background: 'white', 
        padding: '20px 24px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', 
        marginBottom: '20px',
        border: '2px solid #667eea',
    },
    statusUpdateRow: { display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' },
    statusSelect: { 
        padding: '12px 20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        fontSize: '15px',
        minWidth: '220px',
        background: '#fff',
        cursor: 'pointer',
    },
    updateBtn: {
        padding: '12px 28px',
        background: '#2ecc71',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    currentStatus: { marginTop: '10px', fontSize: '14px', color: '#666' },
    cardTitle: { marginBottom: '12px', color: '#1a1a2e' },
    
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    card: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '20px' },
    infoRow: { padding: '6px 0', fontSize: '14px' },
    itemTable: { width: '100%', borderCollapse: 'collapse' },
    totalRow: { borderTop: '2px solid #f0f2f5', fontWeight: 'bold' },
    historyItem: { display: 'flex', gap: '16px', padding: '8px 0', borderBottom: '1px solid #f0f2f5' },
    historyDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#667eea', marginTop: '4px', flexShrink: 0 },
    historyStatus: { fontWeight: '600', fontSize: '14px' },
    historyDate: { fontSize: '12px', color: '#8e9eab' },
    historyNote: { fontSize: '13px', color: '#666', marginTop: '2px' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
};

export default OrderDetail;