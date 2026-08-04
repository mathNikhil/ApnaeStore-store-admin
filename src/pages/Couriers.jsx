import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

// ✅ Tenant's own short courier list — self-service, no Super Admin
// involvement. A tenant realistically uses 1-3 couriers, so this is set up
// once and then just picked from when marking orders Out for Delivery.
const Couriers = () => {
    const navigate = useNavigate();
    const [storeId, setStoreId] = useState(null);
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courierName, setCourierName] = useState('');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) {
            navigate(`/login${window.location.search}`);
            return;
        }
        const sid = localStorage.getItem('currentStoreId');
        if (sid) {
            setStoreId(sid);
            fetchCouriers(sid);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchCouriers = async (sid) => {
        try {
            const result = await storeAdminAPI.getCouriers(sid);
            if (result.success) setCouriers(result.data);
        } catch (error) {
            console.error('Error fetching couriers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!courierName.trim()) {
            alert('Please enter a courier name');
            return;
        }
        setSaving(true);
        try {
            const result = await storeAdminAPI.addCourier(storeId, courierName.trim(), trackingUrl.trim() || null);
            if (result.success) {
                setCourierName('');
                setTrackingUrl('');
                fetchCouriers(storeId);
            } else {
                alert(result.error || 'Failed to save courier');
            }
        } catch (error) {
            console.error('Error adding courier:', error);
            alert('Failed to save courier');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (courierId) => {
        if (!window.confirm('Remove this courier from your list?')) return;
        try {
            await storeAdminAPI.deleteCourier(storeId, courierId);
            fetchCouriers(storeId);
        } catch (error) {
            console.error('Error deleting courier:', error);
        }
    };

    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <h1>🚚 My Couriers</h1>
                <p style={{ color: '#8e9eab', marginBottom: '20px' }}>
                    Add the courier or logistics partners you actually use. You'll pick from this list when marking an order Out for Delivery.
                </p>

                <div style={styles.addCard}>
                    <input
                        type="text"
                        placeholder="Courier name (e.g. Delhivery, your local courier)"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        style={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="Tracking page link (optional — e.g. https://example.com/track)"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        style={styles.input}
                    />
                    <button onClick={handleAdd} disabled={saving} style={styles.addBtn}>
                        {saving ? 'Saving...' : '+ Add Courier'}
                    </button>
                </div>

                {loading ? (
                    <div style={styles.loading}>Loading...</div>
                ) : couriers.length === 0 ? (
                    <div style={styles.empty}>No couriers added yet. Add your first one above.</div>
                ) : (
                    <div style={styles.list}>
                        {couriers.map((c) => (
                            <div key={c.id} style={styles.row}>
                                <div>
                                    <div style={styles.courierName}>{c.courier_name}</div>
                                    {c.tracking_url_template && (
                                        <div style={styles.trackingUrl}>{c.tracking_url_template}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {c.auto_track_key ? (
                                        <span style={styles.badgeAuto}>✓ Auto-tracked</span>
                                    ) : (
                                        <span style={styles.badgeManual}>Manual check</span>
                                    )}
                                    <button onClick={() => handleDelete(c.id)} style={styles.deleteBtn}>Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={styles.note}>
                    <strong>Note:</strong> "Auto-tracked" couriers get their delivery status checked automatically. For others, the tracking link is saved so you or your customer can check status directly on the courier's site.
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f5f6fa' },
    main: { flex: 1, marginLeft: '260px', padding: '32px', maxWidth: '700px' },
    addCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
    input: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' },
    addBtn: { padding: '10px', background: '#1e8e3e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
    loading: { textAlign: 'center', padding: '30px', color: '#666' },
    empty: { textAlign: 'center', padding: '30px', color: '#8e9eab', background: '#fff', borderRadius: '12px' },
    list: { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f2f5' },
    courierName: { fontWeight: '600', color: '#1a1a2e' },
    trackingUrl: { fontSize: '12px', color: '#8e9eab', marginTop: '2px' },
    badgeAuto: { fontSize: '11px', fontWeight: '700', color: '#1e8e3e', background: '#e6f4ea', padding: '3px 10px', borderRadius: '999px' },
    badgeManual: { fontSize: '11px', fontWeight: '600', color: '#8e9eab', background: '#f0f2f5', padding: '3px 10px', borderRadius: '999px' },
    deleteBtn: { padding: '6px 12px', background: '#fdecea', color: '#c0392b', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    note: { marginTop: '16px', fontSize: '13px', color: '#8e9eab', background: '#f0f2f5', padding: '12px 16px', borderRadius: '10px' },
};

export default Couriers;
