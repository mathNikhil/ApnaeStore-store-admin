import React, { useEffect } from 'react';
import { storeAdminAPI } from './services/api';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderBill from './pages/OrderBill';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Couriers from './pages/Couriers';
import Returns from './pages/Returns';
import Inventory from './pages/Inventory';
import ReturnDetail from './pages/ReturnDetail';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

// Rising chime alert — plays when new order arrives
const playRisingChime = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ac = new AudioCtx();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.connect(g);
            g.connect(ac.destination);
            o.frequency.value = freq;
            const t = ac.currentTime + i * 0.18;
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            o.start(t);
            o.stop(t + 0.4);
        });
    } catch (e) {}
};

const App = () => {
    // Runs on every render (cheap, idempotent) so this is resolved
    // synchronously before isAuthenticated is computed below — avoids ever
    // flashing into a stale/wrong-store session before an effect could
    // clear it.
    const params = new URLSearchParams(window.location.search);
    const urlSubdomain = params.get('store');
    const storedSubdomain = localStorage.getItem('currentStoreSubdomain');
    if (urlSubdomain && storedSubdomain && urlSubdomain !== storedSubdomain) {
        localStorage.removeItem('storeAdminToken');
        localStorage.removeItem('storeAdminUser');
        localStorage.removeItem('currentStoreId');
        localStorage.removeItem('currentStoreName');
        localStorage.removeItem('currentStoreSubdomain');
    }

    const isAuthenticated = !!localStorage.getItem('storeAdminToken') && !!localStorage.getItem('currentStoreId');

    // ── New order sound alert — polls every 30s when logged in ──────────
    useEffect(() => {
        const storeId = localStorage.getItem('currentStoreId');
        if (!storeId) return;
        console.log('[OrderAlert] Starting polling for store:', storeId);

        let lastOrderId = null;
        window._orderAlertUnlocked = false;

        // Unlock audio on first user interaction (browser autoplay policy)
        const unlockAudio = () => { 
            window._orderAlertUnlocked = true;
            console.log('[OrderAlert] Audio unlocked');
        };
        document.addEventListener('click', unlockAudio, { once: true });

        const checkNewOrders = async () => {
            try {
                const token = localStorage.getItem('storeAdminToken');
                if (!token) return;
                const res = await fetch(
                    `https://api.aapnaestore.com/api/store/${storeId}/admin/orders?status=all&limit=100`,
                    { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
                );
                if (!res.ok) return;
                const data = await res.json();
                if (!data.success) return;
                const orders = Array.isArray(data.data) ? data.data : [];
                const latestId = orders.length > 0 ? orders[0].order_id || orders[0].id : null;
                console.log('[OrderAlert] latest:', latestId, 'prev:', lastOrderId, 'unlocked:', window._orderAlertUnlocked);
                if (lastOrderId !== null && latestId !== lastOrderId && window._orderAlertUnlocked) {
                    console.log('[OrderAlert] NEW ORDER DETECTED');
                    playRisingChime();
                }
                lastOrderId = latestId;
            } catch (e) { console.error('[OrderAlert] fetch error:', e); }
        };

        checkNewOrders(); // initial fetch
        const interval = setInterval(checkNewOrders, 10000);
        return () => {
            clearInterval(interval);
            document.removeEventListener('click', unlockAudio);
        };
    }, []);

    // ✅ Free up the session as soon as the tab/browser actually closes,
    // instead of leaving it "active" until the idle timeout expires. Uses
    // navigator.sendBeacon, which is specifically designed to reliably fire
    // during page teardown — a normal fetch/axios call is often cancelled
    // mid-flight when the tab closes before it completes. This only covers
    // an actual close/navigate-away; it can't catch a browser crash or a
    // force-quit, which is exactly what the idle timeout still exists for
    // as a fallback.
    useEffect(() => {
        const handlePageHide = (e) => {
            // Only logout if page is truly being unloaded (not just refreshed)
            // e.persisted = true means page is going into bfcache (navigation)
            // visibilitychange to hidden + persisted = false = actual close
            if (e.persisted) return; // page is being cached, not closed
            const token = localStorage.getItem('storeAdminToken');
            const storeId = localStorage.getItem('currentStoreId');
            if (!token || !storeId) return;
            // ✅ FIX: 'application/json' is NOT a CORS-safelisted content
            // type, and this is a cross-origin request (Store Admin on
            // :3006, backend on :5002 — different ports = different
            // origins). sendBeacon cannot perform the preflight negotiation
            // a normal JSON POST would trigger here, so the request was
            // likely being silently dropped. 'text/plain' IS CORS-simple,
            // so sendBeacon can actually deliver it — the backend parses
            // this specific content type as JSON too (see server.js).
            const blob = new Blob(
                [JSON.stringify({ storeId, token })],
                { type: 'text/plain' }
            );
            navigator.sendBeacon(`${API_BASE_URL}/api/store-admin/logout`, blob);
        };
        window.addEventListener('pagehide', handlePageHide);
        return () => window.removeEventListener('pagehide', handlePageHide);
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/orders" element={isAuthenticated ? <Orders /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/orders/:id" element={isAuthenticated ? <OrderDetail /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/orders/:id/bill" element={isAuthenticated ? <OrderBill /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/customers" element={isAuthenticated ? <Customers /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/reports" element={isAuthenticated ? <Reports /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/staff" element={isAuthenticated ? <Staff /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/couriers" element={isAuthenticated ? <Couriers /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/returns" element={isAuthenticated ? <Returns /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/returns/:id" element={isAuthenticated ? <ReturnDetail /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/inventory" element={isAuthenticated ? <Inventory /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
