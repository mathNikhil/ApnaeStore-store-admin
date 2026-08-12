import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

const STATUS_LABELS = {
    requested: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    parcel_received: 'Parcel Received',
    refund_initiated: 'Refund Initiated',
    refunded: 'Refunded',
};

const NEXT_STEP = {
    approved: { status: 'parcel_received', label: 'Mark Parcel Received' },
    parcel_received: { status: 'refund_initiated', label: 'Mark Refund Initiated' },
    refund_initiated: { status: 'refunded', label: 'Mark Refunded' },
};

const ReturnDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [storeId, setStoreId] = useState(null);
    const [returnRecord, setReturnRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myCouriers, setMyCouriers] = useState([]);

    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [operatorComment, setOperatorComment] = useState('');
    const [courierName, setCourierName] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        const sid = localStorage.getItem('currentStoreId');
        if (!token || !sid) {
            navigate(`/login${window.location.search}`);
            return;
        }
        setStoreId(sid);
        fetchDetail(sid);
        storeAdminAPI.getCouriers(sid).then((result) => {
            if (result.success) setMyCouriers(result.data);
        });
    }, [id]);

    const fetchDetail = async (sid) => {
        try {
            const result = await storeAdminAPI.getReturnById(sid, id);
            if (result.success) setReturnRecord(result.data);
        } catch (error) {
            console.error('Error fetching return:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (returnRecord.return_shipping_method === 'merchant-pays' && (!courierName || !trackingNumber)) {
            alert('Please select a courier and enter a tracking number');
            return;
        }
        setProcessing(true);
        try {
            const result = await storeAdminAPI.approveReturn(storeId, id, {
                operatorComment: operatorComment.trim() || undefined,
                courierName: courierName || undefined,
                trackingNumber: trackingNumber || undefined,
                pickupDate: pickupDate || undefined,
            });
            if (result.success) {
                setReturnRecord(result.data);
            } else {
                alert(result.error || 'Failed to approve return');
            }
        } catch (error) {
            alert(error.message || 'Failed to approve return');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please enter a reason for rejecting this return');
            return;
        }
        setProcessing(true);
        try {
            const result = await storeAdminAPI.rejectReturn(storeId, id, rejectReason.trim());
            if (result.success) {
                setReturnRecord(result.data);
                setShowRejectForm(false);
            } else {
                alert(result.error || 'Failed to reject return');
            }
        } catch (error) {
            alert(error.message || 'Failed to reject return');
        } finally {
            setProcessing(false);
        }
    };

    const handleAdvanceStatus = async (status) => {
        setProcessing(true);
        try {
            const result = await storeAdminAPI.updateReturnStatus(storeId, id, status);
            if (result.success) {
                setReturnRecord(result.data);
            } else {
                alert(result.error || 'Failed to update status');
            }
        } catch (error) {
            alert(error.message || 'Failed to update status');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}><div style={styles.loading}>Loading...</div></div>
            </div>
        );
    }
    if (!returnRecord) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}><div style={styles.loading}>Return not found.</div></div>
            </div>
        );
    }

    const nextStep = NEXT_STEP[returnRecord.status];

    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <button style={styles.backBtn} onClick={() => navigate('/returns')}>← Back to Returns</button>

                <div style={styles.headerRow}>
                    <div>
                        <h1 style={{ marginBottom: '4px' }}>↩️ {returnRecord.return_id}</h1>
                        <p style={{ color: '#8e9eab' }}>
                            For order{' '}
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); navigate(`/orders/${returnRecord.order_id}`); }}
                                style={{ color: '#667eea', fontWeight: '600', textDecoration: 'underline' }}
                            >
                                {returnRecord.order_number}
                            </a>
                        </p>
                    </div>
                    <span style={styles.statusPill}>{STATUS_LABELS[returnRecord.status] || returnRecord.status}</span>
                </div>

                <div style={styles.grid}>
                    {/* Left: order + customer + reason + photos */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Order & Customer</h3>
                        <div style={styles.infoRow}><strong>Customer:</strong> {returnRecord.customer_name || '—'}</div>
                        <div style={styles.infoRow}><strong>Phone:</strong> {returnRecord.customer_phone || '—'}</div>
                        <div style={styles.infoRow}><strong>Order Total:</strong> ₹{Number(returnRecord.total_amount).toLocaleString('en-IN')}</div>
                        <div style={styles.infoRow}><strong>Delivered:</strong> {returnRecord.delivered_at ? new Date(returnRecord.delivered_at).toLocaleDateString('en-IN') : '—'}</div>

                        {returnRecord.delivery_address && (
                            <>
                                <h3 style={{ ...styles.cardTitle, marginTop: '16px' }}>Delivery Address</h3>
                                <div style={styles.infoRow}>{returnRecord.delivery_address.recipientName}</div>
                                <div style={styles.infoRow}>{returnRecord.delivery_address.recipientMobile}</div>
                                <div style={styles.infoRow}>
                                    {[
                                        returnRecord.delivery_address.addressLine1,
                                        returnRecord.delivery_address.addressLine2,
                                        returnRecord.delivery_address.city,
                                        returnRecord.delivery_address.state,
                                        returnRecord.delivery_address.pincode,
                                    ].filter(Boolean).join(', ')}
                                </div>
                            </>
                        )}

                        <h3 style={{ ...styles.cardTitle, marginTop: '20px' }}>Items in This Order</h3>
                        {(returnRecord.items || []).map((item, idx) => (
                            <div key={idx} style={styles.itemRow}>
                                <span>{item.name} ({item.weight}) × {item.quantity}</span>
                                <span>₹{item.total}</span>
                            </div>
                        ))}

                        <h3 style={{ ...styles.cardTitle, marginTop: '20px' }}>Return Reason</h3>
                        <p style={{ textTransform: 'capitalize' }}>{(returnRecord.reason || '').replace(/_/g, ' ')}</p>

                        {returnRecord.photos && returnRecord.photos.length > 0 && (
                            <>
                                <h3 style={{ ...styles.cardTitle, marginTop: '20px' }}>Photos</h3>
                                <div style={styles.photoGrid}>
                                    {returnRecord.photos.map((photo) => (
                                        <img key={photo.id} src={photo.url} alt="Return evidence" style={styles.photo} />
                                    ))}
                                </div>
                            </>
                        )}

                        <h3 style={{ ...styles.cardTitle, marginTop: '20px' }}>Return Shipping</h3>
                        <p>{returnRecord.return_shipping_method === 'merchant-pays' ? 'You arrange pickup' : 'Customer arranges return'}</p>
                        {returnRecord.return_shipping_method === 'customer-pays' && returnRecord.customer_tracking_number && (
                            <p style={{ fontSize: '13px', color: '#556067' }}>
                                Customer shared: {returnRecord.customer_courier_name} ({returnRecord.customer_tracking_number})
                            </p>
                        )}
                        {returnRecord.return_shipping_method === 'merchant-pays' && returnRecord.courier_name && (
                            <p style={{ fontSize: '13px', color: '#556067' }}>
                                {returnRecord.courier_name} — {returnRecord.tracking_number}
                                {returnRecord.pickup_date && ` — pickup ${new Date(returnRecord.pickup_date).toLocaleDateString('en-IN')}`}
                            </p>
                        )}
                    </div>

                    {/* Right: actions */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Actions</h3>

                        {returnRecord.status === 'requested' && !showRejectForm && (
                            <>
                                {returnRecord.return_shipping_method === 'merchant-pays' && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={styles.label}>Courier</label>
                                        {myCouriers.length > 0 ? (
                                            <select value={courierName} onChange={(e) => setCourierName(e.target.value)} style={styles.input}>
                                                <option value="">Select a courier...</option>
                                                {myCouriers.map((c) => (
                                                    <option key={c.id} value={c.courier_name}>{c.courier_name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input type="text" placeholder="Courier name" value={courierName} onChange={(e) => setCourierName(e.target.value)} style={styles.input} />
                                        )}
                                        <label style={styles.label}>Tracking Number</label>
                                        <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} style={styles.input} />
                                        <label style={styles.label}>Pickup Date</label>
                                        <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} style={styles.input} />
                                    </div>
                                )}
                                <label style={styles.label}>Comment (optional)</label>
                                <textarea value={operatorComment} onChange={(e) => setOperatorComment(e.target.value)} style={{ ...styles.input, minHeight: '60px' }} />

                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                    <button style={styles.approveBtn} disabled={processing} onClick={handleApprove}>
                                        {processing ? 'Saving...' : 'Accept'}
                                    </button>
                                    <button style={styles.rejectBtn} onClick={() => setShowRejectForm(true)}>Reject</button>
                                </div>
                            </>
                        )}

                        {showRejectForm && (
                            <>
                                <label style={styles.label}>Reason for Rejection</label>
                                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ ...styles.input, minHeight: '80px' }} placeholder="Let the customer know why..." />
                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                    <button style={styles.rejectBtn} disabled={processing} onClick={handleReject}>
                                        {processing ? 'Saving...' : 'Confirm Reject'}
                                    </button>
                                    <button style={styles.cancelBtn} onClick={() => setShowRejectForm(false)}>Cancel</button>
                                </div>
                            </>
                        )}

                        {returnRecord.status === 'rejected' && (
                            <div style={styles.rejectedBox}>
                                <strong>Rejected:</strong> {returnRecord.reject_reason}
                            </div>
                        )}

                        {nextStep && (
                            <button style={styles.advanceBtn} disabled={processing} onClick={() => handleAdvanceStatus(nextStep.status)}>
                                {processing ? 'Saving...' : nextStep.label}
                            </button>
                        )}

                        {returnRecord.status === 'refunded' && (
                            <div style={styles.doneBox}>✅ This return is complete.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '30px', marginLeft: '260px' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
    backBtn: { background: 'none', border: 'none', color: '#667eea', fontWeight: '600', cursor: 'pointer', marginBottom: '16px', fontSize: '14px' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    statusPill: { padding: '8px 18px', borderRadius: '999px', background: '#fff3e0', color: '#8a4a00', fontWeight: '700', fontSize: '13px' },
    grid: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' },
    card: { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    cardTitle: { fontSize: '15px', marginBottom: '10px' },
    infoRow: { fontSize: '14px', color: '#1a1a2e', marginBottom: '6px' },
    itemRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#556067', padding: '6px 0', borderBottom: '1px solid #f7f9fb' },
    photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
    photo: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0e3e6' },
    label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#556067', marginTop: '10px', marginBottom: '4px' },
    input: { width: '100%', padding: '10px', border: '1px solid #e0e3e6', borderRadius: '8px', fontSize: '14px' },
    approveBtn: { flex: 1, padding: '12px', background: '#1e8e3e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
    rejectBtn: { flex: 1, padding: '12px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
    cancelBtn: { flex: 1, padding: '12px', background: '#f0f2f5', color: '#556067', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
    rejectedBox: { background: '#fdecea', color: '#c0392b', padding: '14px', borderRadius: '8px', fontSize: '13px' },
    advanceBtn: { width: '100%', padding: '12px', marginTop: '16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
    doneBox: { background: '#e6f4ea', color: '#1e8e3e', padding: '14px', borderRadius: '8px', fontWeight: '600', textAlign: 'center' },
};

export default ReturnDetail;
