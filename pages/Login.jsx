import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('admin@yourstore.com');
    const [password, setPassword] = useState('Admin@123');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Simple demo login - accepts any credentials for now
        // TODO: Connect to real API
        if (email && password) {
            localStorage.setItem('storeAdminToken', 'demo-token-' + Date.now());
            localStorage.setItem('storeAdminUser', JSON.stringify({
                name: 'Store Admin',
                email: email,
                role: 'admin'
            }));
            setLoading(false);
            navigate('/dashboard');
        } else {
            setError('Please enter email and password');
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logo}>📊</div>
                <h1 style={styles.title}>Store Admin</h1>
                <p style={styles.subtitle}>Manage your store orders & customers</p>
                {error && <div style={styles.error}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@yourstore.com"
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            style={styles.input}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div style={styles.footer}>
                    <small>Demo: Use any email/password</small>
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
