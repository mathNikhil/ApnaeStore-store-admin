import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('storeAdminToken');
            localStorage.removeItem('storeAdminUser');
            navigate('/login');
        }
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div style={styles.sidebar}>
            <div style={styles.logo}>
                <h2>📊 Store<span style={{color:'#667eea'}}>Admin</span></h2>
                <div style={styles.subtitle}>Order Management</div>
            </div>
            <nav style={styles.nav}>
                <Link to="/dashboard" style={{...styles.navLink, ...styles[isActive('/dashboard')]}}>
                    <span style={styles.icon}>📊</span><span>Dashboard</span>
                </Link>
                <Link to="/orders" style={{...styles.navLink, ...styles[isActive('/orders')]}}>
                    <span style={styles.icon}>📋</span><span>Orders</span>
                    <span style={styles.badge}>12</span>
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
            </nav>
            <button onClick={handleLogout} style={styles.logoutBtn}>🚪 <span>Logout</span></button>
        </div>
    );
};

const styles = {
    sidebar: { width: '260px', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '20px 0', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column' },
    logo: { padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
    subtitle: { fontSize: '11px', color: '#8e9eab', marginTop: '4px', letterSpacing: '1.5px', textTransform: 'uppercase' },
    nav: { flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px' },
    navLink: { color: '#bdc3c7', textDecoration: 'none', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '500', transition: 'all 0.3s' },
    active: { background: 'rgba(102,126,234,0.2)', color: '#667eea' },
    icon: { fontSize: '20px', width: '28px', textAlign: 'center' },
    badge: { marginLeft: 'auto', background: 'rgba(231,76,60,0.2)', color: '#e74c3c', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
    logoutBtn: { margin: '20px 16px', padding: '12px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s', width: 'calc(100% - 32px)' },
};

export default Sidebar;
