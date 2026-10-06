import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { storeAdminAuthAPI, storeAdminAPI } from '../services/api';

if (!document.getElementById('store-admin-responsive')) {
    const style = document.createElement('style');
    style.id = 'store-admin-responsive';
    style.textContent = `
        @media (max-width: 768px) {
            .main-content { margin-left: 0 !important; padding: 60px 16px 16px !important; }
        }
    `;
    document.head.appendChild(style);
}

const Sidebar = ({ onToggle }) => {
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 900);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 900);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleMobile = () => setIsMobileOpen(p => !p);
    const navigate = useNavigate();
    const location = useLocation();
    const storeName = localStorage.getItem('currentStoreName');
    const [pendingCount, setPendingCount] = useState(null);

    useEffect(() => {
        const storeId = localStorage.getItem('currentStoreId');
        if (!storeId) return;
        storeAdminAPI.getOrderStats(storeId)
            .then((result) => {
                if (result.success) setPendingCount(parseInt(result.data.total_orders, 10) || 0);
            })
            .catch((err) => console.error('Failed to load order count:', err));
    }, []);

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to logout?')) return;
        const storeId = localStorage.getItem('currentStoreId');
        const subdomain = localStorage.getItem('currentStoreSubdomain');
        try {
            if (storeId) await storeAdminAuthAPI.logout(storeId);
        } catch (e) {
            console.error('Logout request failed:', e);
        }
        localStorage.removeItem('storeAdminToken');
        localStorage.removeItem('storeAdminUser');
        localStorage.removeItem('currentStoreId');
        localStorage.removeItem('currentStoreName');
        localStorage.removeItem('currentStoreSubdomain');
        navigate(subdomain ? `/login?store=${subdomain}` : '/login');
    };

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
        { path: '/orders', icon: '📋', label: 'Orders', badge: pendingCount > 0 ? pendingCount : null },
        { path: '/customers', icon: '👤', label: 'Customers' },
        { path: '/inventory', icon: '📦', label: 'Inventory' },
        { path: '/couriers', icon: '🚚', label: 'Couriers' },
        { path: '/reports', icon: '📈', label: 'Reports' },
        { path: '/staff', icon: '👥', label: 'Staff' },
    ];

    React.useEffect(() => {
        if (!isMobile) return;
        let btn = document.getElementById('mobile-hamburger');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'mobile-hamburger';
            btn.style.cssText = 'position:fixed;top:12px;left:12px;z-index:1100;border:none;border-radius:8px;width:40px;height:40px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            document.body.appendChild(btn);
        }
        btn.style.background = isMobileOpen ? '#dc2626' : '#006d2f';
        btn.style.color = '#fff';
        btn.textContent = isMobileOpen ? '✕' : '☰';
        btn.onclick = toggleMobile;
        return () => {};
    }, [isMobile, isMobileOpen]);

    React.useEffect(() => {
        return () => {
            const btn = document.getElementById('mobile-hamburger');
            if (btn) btn.remove();
        };
    }, []);

    return (
        <>
        {isMobile && isMobileOpen && (
            <div onClick={toggleMobile} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />
        )}
        <div style={{ ...styles.sidebar, transform: isMobile ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)', transition: 'transform 0.25s ease', zIndex: 1000 }}>

            {/* Logo */}
            <div style={styles.logoArea}>
                <div style={styles.logoBox}>
                    <div style={styles.logoIcon}>S</div>
                    <div>
                        <div style={styles.logoText}>Store<span style={{color:'#4ade80'}}>Admin</span></div>
                        <div style={styles.logoSub}>ORDER MANAGEMENT</div>
                    </div>
                </div>
            </div>

            {/* Store banner */}
            {storeName && (
                <div style={styles.storeBanner}>
                    <div style={styles.storeLabel}>MANAGING</div>
                    <div style={styles.storeName} title={storeName}>{storeName}</div>
                </div>
            )}

            {/* Nav */}
            <nav style={styles.nav}>
                {navItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => isMobile && setIsMobileOpen(false)}
                        style={{
                            ...styles.navLink,
                            ...(isActive(item.path) ? styles.navLinkActive : {}),
                        }}
                    >
                        <span style={styles.navIcon}>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.badge && <span style={styles.badge}>{item.badge}</span>}
                    </Link>
                ))}
            </nav>

            {/* Bottom */}
            <div style={styles.bottom}>
                <div style={styles.clusterStatus}>
                    <span style={styles.greenDot} />
                    <span style={styles.clusterLabel}>Store Online</span>
                    <span style={styles.stableTag}>Active</span>
                </div>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                    <span>↪</span>
                    <span>Logout</span>
                </button>
            </div>
        </div>
        </>
    );
};

const styles = {
    sidebar: { width: '240px', background: '#0f1117', color: '#fff', padding: '0', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)' },
    logoArea: { padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    logoBox: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoIcon: { width: '36px', height: '36px', background: '#006d2f', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: '#fff' },
    logoText: { fontSize: '16px', fontWeight: '700', color: '#fff', lineHeight: 1.2 },
    logoSub: { fontSize: '9px', color: '#6b7280', letterSpacing: '1.5px', marginTop: '2px' },
    storeBanner: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,109,47,0.15)' },
    storeLabel: { fontSize: '10px', color: '#6b7280', letterSpacing: '1.5px', marginBottom: '4px' },
    storeName: { fontSize: '14px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' },
    navLink: { color: '#9ca3af', textDecoration: 'none', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: '500', transition: 'all 0.2s' },
    navLinkActive: { background: '#006d2f', color: '#fff' },
    navIcon: { fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 },
    badge: { marginLeft: 'auto', background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '10px' },
    bottom: { padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' },
    clusterStatus: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' },
    greenDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 },
    clusterLabel: { fontSize: '12px', color: '#9ca3af', flex: 1 },
    stableTag: { fontSize: '11px', color: '#4ade80', fontWeight: '600' },
    logoutBtn: { padding: '10px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', transition: 'all 0.2s' },
};

export default Sidebar;
