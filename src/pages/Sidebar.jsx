import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { storeAdminAuthAPI, storeAdminAPI } from '../services/api';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const storeName = localStorage.getItem('currentStoreName');
    const [pendingCount, setPendingCount] = useState(null);

    useEffect(() => {
        const storeId = localStorage.getItem('currentStoreId');
        if (!storeId) return;
        storeAdminAPI.getOrderStats(storeId)
            .then((result) => {
                if (result.success) {
                    setPendingCount(parseInt(result.data.total_orders, 10) || 0);
                }
            })
            .catch((err) => console.error('Failed to load order count:', err));
    }, []);

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to logout?')) return;

        // ✅ FIX: must tell the backend, not just clear local state —
        // otherwise this session stays "active" server-side for up to the
        // full 3-hour idle timeout, blocking anyone else (staff or tenant)
        // from logging in until it expires on its own.
        const storeId = localStorage.getItem('currentStoreId');
        const subdomain = localStorage.getItem('currentStoreSubdomain');
        try {
            if (storeId) await storeAdminAuthAPI.logout(storeId);
        } catch (e) {
            console.error('Logout request failed (continuing to clear local session anyway):', e);
        }

        localStorage.removeItem('storeAdminToken');
        localStorage.removeItem('storeAdminUser');
        localStorage.removeItem('currentStoreId');
        localStorage.removeItem('currentStoreName');
        localStorage.removeItem('currentStoreSubdomain');
        navigate(subdomain ? `/login?store=${subdomain}` : '/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div style={styles.sidebar}>
            <div style={styles.logo}>
                <h2>📊 Store<span style={{color:'#667eea'}}>Admin</span></h2>
                <div style={styles.subtitle}>Order Management</div>
            </div>
            {storeName && (
                <div style={styles.storeBanner}>
                    <div style={styles.storeLabel}>MANAGING</div>
                    <div style={styles.storeName} title={storeName}>{storeName}</div>
                </div>
            )}
            <nav style={styles.nav}>
                <Link to="/dashboard" style={{...styles.navLink, ...styles[isActive('/dashboard')]}}>
                    <span style={styles.icon}>📊</span><span>Dashboard</span>
                </Link>
                <Link to="/orders" style={{...styles.navLink, ...styles[isActive('/orders')]}}>
                    <span style={styles.icon}>📋</span><span>Orders</span>
                    {pendingCount > 0 && <span style={styles.badge}>{pendingCount}</span>}
                </Link>
                <Link to="/customers" style={{...styles.navLink, ...styles[isActive('/customers')]}}>
                    <span style={styles.icon}>👤</span><span>Customers</span>
                </Link>
                <Link to="/reports" style={{...styles.navLink, ...styles[isActive('/reports')]}}>
                    <span style={styles.icon}>📈</span><span>Reports</span>
                </Link>
                <Link to="/staff" style={{...styles.navLink, ...styles[isActive('/staff')]}}>
                    <span style={styles.icon}>👥</span><span>Staff</span>
                </Link>
                <Link to="/couriers" style={{...styles.navLink, ...styles[isActive('/couriers')]}}>
                    <span style={styles.icon}>🚚</span><span>Couriers</span>
                </Link>
                <Link to="/returns" style={{...styles.navLink, ...styles[isActive('/returns')]}}>
                    <span style={styles.icon}>↩️</span><span>Returns</span>
                </Link>
            </nav>
            <button onClick={handleLogout} style={styles.logoutBtn}>🚪 <span>Logout</span></button>
        </div>
    );
};

const styles = {
    sidebar: { width: '260px', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '20px 0', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column' },
    logo: { padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
    subtitle: { fontSize: '11px', color: '#8e9eab', marginTop: '4px', letterSpacing: '1.5px', textTransform: 'uppercase' },
    storeBanner: { padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(102,126,234,0.08)' },
    storeLabel: { fontSize: '10px', color: '#8e9eab', letterSpacing: '1.5px', marginBottom: '4px' },
    storeName: { fontSize: '15px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    nav: { flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px' },
    navLink: { color: '#bdc3c7', textDecoration: 'none', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '500', transition: 'all 0.3s' },
    active: { background: 'rgba(102,126,234,0.2)', color: '#667eea' },
    icon: { fontSize: '20px', width: '28px', textAlign: 'center' },
    badge: { marginLeft: 'auto', background: 'rgba(231,76,60,0.2)', color: '#e74c3c', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
    logoutBtn: { margin: '20px 16px', padding: '12px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s', width: 'calc(100% - 32px)' },
};

export default Sidebar;
