import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Couriers from './pages/Couriers';
import Returns from './pages/Returns';
import ReturnDetail from './pages/ReturnDetail';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const App = () => {
    // Runs on every render (cheap, idempotent) so this is resolved
    // synchronously before isAuthenticated is computed below — avoids ever
    // flashing into a stale/wrong-store session before an effect could
    // clear it.
    const params = new URLSearchParams(window.location.search);
    const urlSubdomain = params.get('store');
    const storedSubdomain = localStorage.getItem('currentStoreSubdomain');
    if (urlSubdomain && urlSubdomain !== storedSubdomain) {
        localStorage.removeItem('storeAdminToken');
        localStorage.removeItem('storeAdminUser');
        localStorage.removeItem('currentStoreId');
        localStorage.removeItem('currentStoreName');
        localStorage.removeItem('currentStoreSubdomain');
    }

    const isAuthenticated = !!localStorage.getItem('storeAdminToken') && !!localStorage.getItem('currentStoreId');

    // ✅ Free up the session as soon as the tab/browser actually closes,
    // instead of leaving it "active" until the idle timeout expires. Uses
    // navigator.sendBeacon, which is specifically designed to reliably fire
    // during page teardown — a normal fetch/axios call is often cancelled
    // mid-flight when the tab closes before it completes. This only covers
    // an actual close/navigate-away; it can't catch a browser crash or a
    // force-quit, which is exactly what the idle timeout still exists for
    // as a fallback.
    useEffect(() => {
        const handlePageHide = () => {
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
                <Route path="/customers" element={isAuthenticated ? <Customers /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/reports" element={isAuthenticated ? <Reports /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/staff" element={isAuthenticated ? <Staff /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/couriers" element={isAuthenticated ? <Couriers /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/returns" element={isAuthenticated ? <Returns /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/returns/:id" element={isAuthenticated ? <ReturnDetail /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
