import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        total_orders: 0,
        confirmed: 0,
        processing: 0,
        ready_to_deliver: 0,
        delivered: 0,
        total_revenue: 0,
    });
    const [pendingReturns, setPendingReturns] = useState(0);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        // ✅ A session reaching this page is always already locked to one
        // store — resolved and ownership-verified at login (see Login.jsx).
        // There's nothing to "select" here anymore; if either piece is
        // missing, this isn't a valid session, back to login.
        const storedStoreId = localStorage.getItem('currentStoreId');
        if (!token || !storedStoreId) {
            navigate(`/login${window.location.search}`);
            return;
        }
        setStoreId(storedStoreId);
        fetchDashboardData(storedStoreId);
    }, []);

    const fetchDashboardData = async (sid) => {
        try {
            // Fetch stats
            const statsResult = await storeAdminAPI.getOrderStats(sid);
            if (statsResult.success) {
                setStats(statsResult.data);
            }

            // Fetch recent orders (first 5)
            const ordersResult = await storeAdminAPI.getOrders(sid, { limit: 5 });
            if (ordersResult.success) {
                setRecentOrders(ordersResult.data);
            }

            // ✅ Return requests needing operator attention
            const returnStatsResult = await storeAdminAPI.getReturnStats(sid);
            if (returnStatsResult.success) {
                setPendingReturns(returnStatsResult.data.pending);
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status) => `status-badge status-${status}`;

    const getStatusLabel = (status) => {
        if (status === 'accepted') return 'Accept for Production';
        return status.replace('_', ' ').toUpperCase();
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}>
                    <div style={styles.loading}>Loading dashboard...</div>
                </div>
            </div>
        );
    }

    if (!storeId) {
        return null; // redirecting to login
    }

    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <div style={styles.header}>
                    <div>
                        <h1>📊 Dashboard</h1>
                        <p style={{color: '#8e9eab', marginTop: '4px'}}>Overview of your store performance</p>
                    </div>
                    <div style={styles.headerRight}>
                        <span style={styles.dateRange}>📅 Last 30 days</span>
                    </div>
                </div>

                {/* ✅ Return requests — always visible like the other stat
                    cards, not hidden when zero, so it's consistently where
                    an operator expects to find it. */}
                <div style={{ ...styles.statCard, ...styles.returnCard }} onClick={() => navigate('/returns')}>
                    <div style={{ ...styles.iconBox, background: 'rgba(255,152,0,0.15)' }}>↩️</div>
                    <div>
                        <div style={styles.statValue}>{pendingReturns}</div>
                        <div style={styles.statLabel}>Returns Awaiting Review</div>
                    </div>
                </div>

                <div style={styles.statsGrid}>
                    <div style={styles.statCard} onClick={() => navigate('/orders')}>
                        <div style={{...styles.iconBox, background: 'rgba(102,126,234,0.12)'}}>📋</div>
                        <div>
                            <div style={styles.statValue}>{stats.total_orders}</div>
                            <div style={styles.statLabel}>Total Orders</div>
                            <div style={styles.statChange}>↑ 12% this month</div>
                        </div>
                    </div>
                    <div style={styles.statCard} onClick={() => navigate('/orders?status=confirmed')}>
                        <div style={{...styles.iconBox, background: 'rgba(52,152,219,0.12)'}}>✅</div>
                        <div>
                            <div style={styles.statValue}>{stats.confirmed}</div>
                            <div style={styles.statLabel}>Confirmed</div>
                            <div style={styles.statChange}>↑ 5% this month</div>
                        </div>
                    </div>
                    <div style={styles.statCard} onClick={() => navigate('/orders?status=processing')}>
                        <div style={{...styles.iconBox, background: 'rgba(156,39,176,0.12)'}}>⚙️</div>
                        <div>
                            <div style={styles.statValue}>{stats.processing}</div>
                            <div style={styles.statLabel}>Processing</div>
                            <div style={styles.statChange}>↑ 8% this month</div>
                        </div>
                    </div>
                    <div style={styles.statCard} onClick={() => navigate('/orders?status=delivered')}>
                        <div style={{...styles.iconBox, background: 'rgba(46,213,115,0.12)'}}>✅</div>
                        <div>
                            <div style={styles.statValue}>{stats.delivered}</div>
                            <div style={styles.statLabel}>Delivered</div>
                            <div style={styles.statChange}>↑ 15% this month</div>
                        </div>
                    </div>
                </div>

                <div style={styles.quickActions}>
                    <h3>⚡ Quick Actions</h3>
                    <div style={styles.actionsGrid}>
                        <button style={styles.actionBtn} onClick={() => navigate('/orders')}>
                            <span style={{fontSize:'24px',display:'block'}}>📋</span>
                            View All Orders
                            <span style={{fontSize:'12px',color:'#8e9eab',display:'block',marginTop:'4px'}}>Manage order lifecycle</span>
                        </button>
                        <button style={styles.actionBtn} onClick={() => navigate('/customers')}>
                            <span style={{fontSize:'24px',display:'block'}}>👤</span>
                            View Customers
                            <span style={{fontSize:'12px',color:'#8e9eab',display:'block',marginTop:'4px'}}>Customer list & export</span>
                        </button>
                        <button style={styles.actionBtn} onClick={() => navigate('/reports')}>
                            <span style={{fontSize:'24px',display:'block'}}>📈</span>
                            Download Reports
                            <span style={{fontSize:'12px',color:'#8e9eab',display:'block',marginTop:'4px'}}>Orders & Sales CSV</span>
                        </button>
                        <button style={styles.actionBtn} onClick={() => navigate('/staff')}>
                            <span style={{fontSize:'24px',display:'block'}}>👥</span>
                            Manage Staff
                            <span style={{fontSize:'12px',color:'#8e9eab',display:'block',marginTop:'4px'}}>Add/remove staff</span>
                        </button>
                    </div>
                </div>

                <div style={styles.recentOrders}>
                    <div style={styles.recentHeader}>
                        <h3>🔄 Recent Orders</h3>
                        <button style={styles.viewAllBtn} onClick={() => navigate('/orders')}>View All →</button>
                    </div>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td><strong>{order.order_id || order.id}</strong></td>
                                        <td>{order.customer_name}</td>
                                        <td>₹{Number(order.total_amount).toLocaleString()}</td>
                                        <td><span className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</span></td>
                                        <td>{new Date(order.created_at).toLocaleString()}</td>
                                        <td>
                                            <button style={styles.viewBtn} onClick={() => navigate(`/orders/${order.id}`)}>View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '30px', marginLeft: '260px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    headerRight: { display: 'flex', gap: '12px', alignItems: 'center' },
    dateRange: { padding: '8px 16px', background: 'white', borderRadius: '8px', fontSize: '14px', color: '#666' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' },
    returnCard: { border: '2px solid #ffb74d', marginBottom: '20px', maxWidth: '340px' },
    statCard: { background: 'white', padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'transform 0.2s' },
    iconBox: { width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' },
    statValue: { fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e' },
    statLabel: { fontSize: '14px', color: '#8e9eab' },
    statChange: { fontSize: '12px', color: '#2ecc71', marginTop: '4px' },
    quickActions: { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '30px' },
    actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' },
    actionBtn: { padding: '20px', border: '2px solid #f0f2f5', borderRadius: '12px', background: '#fafafa', cursor: 'pointer', fontSize: '14px', fontWeight: '600', textAlign: 'center', transition: 'all 0.3s' },
    recentOrders: { background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' },
    recentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f0f2f5' },
    viewAllBtn: { padding: '8px 16px', background: 'transparent', color: '#667eea', border: '1px solid #667eea', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    tableContainer: { overflow: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    viewBtn: { padding: '6px 14px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
};

export default Dashboard;