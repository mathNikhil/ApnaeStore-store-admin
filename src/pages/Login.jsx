import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeAdminAuthAPI } from '../services/api';

// ✅ Password-only login — no OTP. The store itself is the identity
// (resolved from ?store=<subdomain> in the URL, same as the Storefront),
// so there's no separate username either: one password per store, shown
// on the tenant's dashboard, shared with whoever needs to manage it.
const Login = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [subdomain, setSubdomain] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSubdomain(params.get('store'));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!password) {
            setError('Please enter the store admin password');
            return;
        }
        setLoading(true);
        try {
            const result = await storeAdminAuthAPI.login(subdomain, password);
            if (result.success) {
                localStorage.setItem('storeAdminToken', result.data.token);
                localStorage.setItem('currentStoreId', result.data.storeId);
                localStorage.setItem('currentStoreName', result.data.storeName || '');
                localStorage.setItem('currentStoreSubdomain', subdomain);
                navigate('/dashboard');
            } else {
                setError(result.error || result.message || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    if (!subdomain) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.logo}>⚠️</div>
                    <h1 style={styles.title}>Store Admin</h1>
                    <div style={styles.error}>
                        This link is missing a store reference. Please use the admin link for your specific store
                        (e.g. yourstore.com/admin), not a generic Store Admin URL.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logo}>📊</div>
                <h1 style={styles.title}>Store Admin</h1>
                <p style={styles.subtitle}>Managing: <strong>{subdomain}</strong></p>
                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter store admin password"
                            required
                            autoFocus
                            style={styles.input}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div style={styles.footer}>
                    <small>Ask the store owner for this store's admin password if you don't have it.</small>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    logo: { fontSize: '48px', textAlign: 'center' },
    title: { textAlign: 'center', color: '#1a1a2e', marginTop: '8px' },
    subtitle: { textAlign: 'center', color: '#666', marginBottom: '24px' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', fontWeight: '600', color: '#333', marginBottom: '4px' },
    input: {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    error: {
        background: '#ffebee',
        color: '#c62828',
        padding: '10px',
        borderRadius: '8px',
        marginBottom: '16px',
        textAlign: 'center',
    },
    footer: {
        textAlign: 'center',
        marginTop: '16px',
        color: '#999',
        fontSize: '12px',
    },
};

export default Login;
