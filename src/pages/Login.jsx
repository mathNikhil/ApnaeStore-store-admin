import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeAdminAuthAPI } from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
    const [mode, setMode] = useState('owner');   // 'owner' | 'staff'
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [subdomain, setSubdomain] = useState(null);
    const [lockedOut, setLockedOut] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [cooldownEnds, setCooldownEnds] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSubdomain(params.get('store'));
        setTimeout(() => { setPassword(''); }, 100);
    }, []);

    // Handle Google OAuth redirect callback (token in URL hash from redirect flow)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const storeParam = params.get('store');
        if (storeParam) setSubdomain(storeParam);

        // Check for google_credential in URL (posted back after redirect)
        const credential = params.get('google_credential');
        const storeForCred = params.get('store_for_cred');
        if (credential && storeForCred) {
            // Clean URL
            window.history.replaceState({}, '', `/login?store=${storeForCred}`);
            handleGoogleCredential(credential, storeForCred);
        }
    }, []);

    // Launch Google OAuth — redirect mode (works on all browsers including mobile)
    const handleGoogleSignIn = () => {
        if (!GOOGLE_CLIENT_ID || !subdomain) return;
        setGoogleLoading(true);
        setError('');

        // redirect_uri must be registered in Google Cloud Console
        const redirectUri = `${window.location.origin}/login`;
        const state = encodeURIComponent(subdomain);
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'token id_token',
            scope: 'openid email profile',
            nonce: Math.random().toString(36).slice(2),
            state,
            prompt: 'select_account',
        });
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    };

    // Handle id_token from URL fragment after redirect
    useEffect(() => {
        const hash = window.location.hash;
        if (!hash) return;
        const hashParams = new URLSearchParams(hash.slice(1));
        const idToken = hashParams.get('id_token');
        const state = hashParams.get('state');
        if (idToken && state) {
            const store = decodeURIComponent(state);
            // Clean the URL fragment
            window.history.replaceState({}, '', `/login?store=${store}`);
            setSubdomain(store);
            handleGoogleCredential(idToken, store);
        }
    }, []);

    const handleGoogleCredential = async (credential, store) => {
        const storeToUse = store || subdomain;
        setGoogleLoading(true);
        setError('');
        try {
            const result = await storeAdminAuthAPI.staffGoogleLogin(storeToUse, credential);
            if (result.success) {
                localStorage.setItem('storeAdminToken', result.data.token);
                localStorage.setItem('currentStoreId', result.data.storeId);
                localStorage.setItem('currentStoreName', result.data.storeName || '');
                localStorage.setItem('currentStoreSubdomain', storeToUse);
                localStorage.setItem('storeAdminRole', 'staff');
                localStorage.setItem('storeAdminStaffId', result.data.staffId);
                localStorage.setItem('storeAdminStaffName', result.data.staffName || '');
                localStorage.setItem('storeAdminStaffEmail', result.data.staffEmail || '');
                localStorage.setItem('storeAdminPermissions', JSON.stringify(result.data.permissions || []));
                const perms = result.data.permissions || [];
                navigate('/' + (perms[0]?.page || 'dashboard'));
            } else {
                setError(result.error || 'Google login failed. Your account may not have access to this store.');
            }
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setGoogleLoading(false);
        }
    };

    useEffect(() => {
        if (!cooldownEnds) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, new Date(cooldownEnds) - Date.now());
            setCountdown(remaining);
            if (remaining <= 0) { setLockedOut(false); setCooldownEnds(null); clearInterval(interval); }
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownEnds]);

    const formatCountdown = (ms) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOwnerLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!password) { setError('Please enter the store admin password'); return; }
        if (lockedOut) return;
        setLoading(true);
        try {
            const result = await storeAdminAuthAPI.login(subdomain, password);
            if (result.success) {
                localStorage.setItem('storeAdminToken', result.data.token);
                localStorage.setItem('currentStoreId', result.data.storeId);
                localStorage.setItem('currentStoreName', result.data.storeName || '');
                localStorage.setItem('currentStoreSubdomain', subdomain);
                localStorage.setItem('storeAdminRole', 'owner');
                localStorage.removeItem('storeAdminPermissions');
                localStorage.removeItem('storeAdminStaffName');
                localStorage.removeItem('storeAdminStaffEmail');
                localStorage.removeItem('storeAdminStaffId');
                navigate('/dashboard');
            } else if (result.lockedOut) {
                setLockedOut(true); setCooldownEnds(result.cooldownEnds); setCountdown(result.remainingMs);
                setError(result.error);
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
            <div style={s.container}>
                <div style={s.card}>
                    <div style={s.logo}>⚠️</div>
                    <h1 style={s.title}>Store Admin</h1>
                    <div style={s.errorBox}>
                        This link is missing a store reference. Please use the admin link for your specific store.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={s.container}>
            <div style={s.card}>
                <div style={s.logo}>📊</div>
                <h1 style={s.title}>Store Admin</h1>
                <p style={s.subtitle}>Managing: <strong>{subdomain}</strong></p>

                {/* Mode tabs */}
                <div style={s.tabs}>
                    <button style={{ ...s.tab, ...(mode === 'owner' ? s.tabActive : {}) }}
                        onClick={() => { setMode('owner'); setError(''); }} type="button">
                        👑 Owner
                    </button>
                    <button style={{ ...s.tab, ...(mode === 'staff' ? s.tabActive : {}) }}
                        onClick={() => { setMode('staff'); setError(''); }} type="button">
                        👤 Staff
                    </button>
                </div>

                {error && <div style={s.errorBox}>{error}</div>}

                {lockedOut && countdown > 0 && (
                    <div style={s.lockout}>
                        <div style={{ fontSize: '13px', color: '#856404', fontWeight: '600' }}>🔒 Account temporarily locked</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc3545', marginTop: '4px', fontFamily: 'monospace' }}>
                            {formatCountdown(countdown)}
                        </div>
                    </div>
                )}

                {mode === 'owner' ? (
                    <form onSubmit={handleOwnerLogin}>
                        <div style={s.inputGroup}>
                            <label style={s.label}>Password</label>
                            <input
                                type="password"
                                value={password}
                                autoComplete="new-password"
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter store admin password"
                                required autoFocus
                                style={s.input}
                            />
                        </div>
                        <button type="submit" disabled={loading || lockedOut} style={s.button}>
                            {loading ? 'Logging in...' : 'Login as Owner'}
                        </button>
                        <div style={s.footer}>
                            <small>Get this password from your Aapna Estore dashboard → Staff Admin.</small>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div style={s.googleSection}>
                            <p style={s.googleHint}>
                                Sign in with the Google account your store owner linked to your staff profile.
                            </p>
                            {googleLoading ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Signing in...</div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleGoogleSignIn}
                                    disabled={!GOOGLE_CLIENT_ID || !subdomain}
                                    style={s.googleBtn}
                                >
                                    <img
                                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                        alt="Google"
                                        style={{ width: '20px', height: '20px', flexShrink: 0 }}
                                    />
                                    Sign in with Google
                                </button>
                            )}
                            {!GOOGLE_CLIENT_ID && (
                                <div style={{ ...s.errorBox, marginTop: '12px' }}>
                                    Google Sign-In is not configured for this app yet.
                                </div>
                            )}
                        </div>
                        <div style={s.footer}>
                            <small>Your Gmail must be linked to your staff profile by the store owner.</small>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const s = {
    container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #006d2f 0%, #004d22 100%)' },
    card: { background: 'white', padding: '40px', borderRadius: '16px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    logo: { fontSize: '48px', textAlign: 'center' },
    title: { textAlign: 'center', color: '#1a1a2e', marginTop: '8px', marginBottom: '4px' },
    subtitle: { textAlign: 'center', color: '#666', marginBottom: '16px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px', background: '#f5f5f5', borderRadius: '10px', padding: '4px' },
    tab: { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', background: 'transparent', color: '#666', transition: 'all 0.2s' },
    tabActive: { background: '#006d2f', color: '#fff', boxShadow: '0 2px 8px rgba(0,109,47,0.3)' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', fontWeight: '600', color: '#333', marginBottom: '4px', fontSize: '14px' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    button: { width: '100%', padding: '14px', background: '#006d2f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' },
    errorBox: { background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontSize: '13px' },
    lockout: { background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '16px' },
    footer: { textAlign: 'center', marginTop: '16px', color: '#999', fontSize: '12px' },
    googleSection: { padding: '16px 0' },
    googleHint: { textAlign: 'center', color: '#555', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' },
    googleBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '12px 16px', background: '#fff', color: '#3c4043', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
};

export default Login;
