import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const STATUS_COLORS = {
    requested: { bg: '#fff3e0', text: '#8a4a00' },
    approved: { bg: '#e3f2fd', text: '#1565c0' },
    rejected: { bg: '#fdecea', text: '#c0392b' },
    parcel_received: { bg: '#f3e5f5', text: '#6a1b9a' },
    refund_initiated: { bg: '#e0f2f1', text: '#00695c' },
    refunded: { bg: '#e6f4ea', text: '#1e8e3e' },
};

// ✅ Rebuilt as a real <table>, matching Orders.jsx's exact structure and
// styling — was previously a CSS-grid row layout that only visually
// resembled a table instead of actually being one.
const Returns = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [filteredReturns, setFilteredReturns] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        const sid = localStorage.getItem('currentStoreId');
        if (!token || !sid) {
            navigate(`/login${window.location.search}`);
            return;
        }
        setStoreId(sid);
        fetchReturns(sid);
    }, []);

    const fetchReturns = async (sid) => {
        try {
            const result = await storeAdminAPI.getReturns(sid);
            if (result.success) {
                setReturns(result.data);
                setFilteredReturns(result.data);
            }
        } catch (error) {
            console.error('Error fetching returns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        filterReturns(search, status);
    };

    const handleSearch = (term) => {
        setSearch(term);
        filterReturns(term, statusFilter);
    };

    const filterReturns = (term, status) => {
        let filtered = returns;
        if (term) {
            filtered = filtered.filter((r) =>
                (r.return_id || '').toLowerCase().includes(term.toLowerCase()) ||
                (r.order_number || '').toLowerCase().includes(term.toLowerCase()) ||
                (r.customer_name || '').toLowerCase().includes(term.toLowerCase())
            );
        }
        if (status !== 'all') {
            filtered = filtered.filter((r) => r.status === status);
        }
        setFilteredReturns(filtered);
    };

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'requested', label: 'Pending Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'parcel_received', label: 'Parcel Received' },
        { value: 'refund_initiated', label: 'Refund Initiated' },
        { value: 'refunded', label: 'Refunded' },
    ];

    if (loading) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}>
                    <div style={styles.loading}>Loading returns...</div>
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
                    <p style={{ color: '#8e9eab' }}>Please select a store to manage</p>
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
                        <h1>↩️ Returns</h1>
                        <p style={{ color: '#8e9eab', marginTop: '4px' }}>Review and manage customer return requests</p>
                    </div>
                </div>

                <div style={styles.searchBar}>
                    <input
                        type="text"
                        placeholder="Search by return ID, order ID, customer..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={styles.searchInput}
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => handleStatusFilter(e.target.value)}
                        style={styles.filterSelect}
                    >
                        {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <span style={styles.resultCount}>{filteredReturns.length} returns found</span>
                </div>

                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Return ID</th>
                                <th>Order</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReturns.map((r) => {
                                const colors = STATUS_COLORS[r.status] || { bg: '#f0f2f5', text: '#556067' };
                                return (
                                    <tr key={r.id}>
                                        <td><strong>{r.return_id}</strong></td>
                                        <td>{r.order_number}</td>
                                        <td>
                                            <div>{r.customer_name || 'Customer'}</div>
                                        </td>
                                        <td>₹{Number(r.total_amount).toLocaleString('en-IN')}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{(r.reason || '').replace(/_/g, ' ')}</td>
                                        <td>
                                            <span style={{ ...styles.statusBadge, background: colors.bg, color: colors.text }}>
                                                {STATUS_LABELS[r.status] || r.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '13px' }}>{new Date(r.requested_at).toLocaleString()}</td>
                                        <td>
                                            <button style={styles.viewBtn} onClick={() => navigate(`/returns/${r.id}`)}>View</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredReturns.length === 0 && (
                        <div style={styles.loading}>No returns in this category.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '30px', marginLeft: '260px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    searchBar: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
    searchInput: { flex: 1, minWidth: '200px', padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '14px' },
    filterSelect: { padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '14px', background: '#fff' },
    resultCount: { fontSize: '14px', color: '#8e9eab' },
    tableContainer: { background: 'white', borderRadius: '16px', overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
    statusBadge: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '999px', display: 'inline-block' },
    viewBtn: { padding: '6px 14px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
};

export default Returns;
