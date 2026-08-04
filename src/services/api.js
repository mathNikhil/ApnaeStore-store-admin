const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const getToken = () => localStorage.getItem('storeAdminToken');

const apiRequest = async (endpoint, method = 'GET', data = null) => {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const token = getToken();
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();

        // ✅ A 401 here means this session has been invalidated server-side
        // (kicked out by a newer login, or expired from being idle too
        // long) — not just "this one request failed." Clear local session
        // state and bounce back to login (preserving ?store= so the login
        // screen still knows which store this is) rather than leaving the
        // app sitting in a half-authenticated state.
        if (response.status === 401 && endpoint !== '/api/store-admin/login') {
            localStorage.removeItem('storeAdminToken');
            localStorage.removeItem('storeAdminUser');
            localStorage.removeItem('currentStoreId');
            localStorage.removeItem('currentStoreName');
            const subdomain = localStorage.getItem('currentStoreSubdomain');
            localStorage.removeItem('currentStoreSubdomain');
            window.location.href = subdomain ? `/login?store=${subdomain}` : '/login';
            throw new Error(result.error || result.message || 'Session expired');
        }

        if (!response.ok) {
            throw new Error(result.error || result.message || 'Something went wrong');
        }
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Store Admin APIs
export const storeAdminAPI = {
    // Orders
    getOrders: (storeId, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/api/store/${storeId}/admin/orders?${query}`);
    },
    getOrder: (storeId, orderId) => 
        apiRequest(`/api/store/${storeId}/admin/orders/${orderId}`),
    updateOrderStatus: (storeId, orderId, status, note) => 
        apiRequest(`/api/store/${storeId}/admin/orders/${orderId}/status`, 'PUT', { status, note }),
    getOrderStats: (storeId) => 
        apiRequest(`/api/store/${storeId}/admin/orders/stats`),

    // Courier tracking
    addTracking: (storeId, orderId, courierName, trackingNumber, courierNotes) =>
        apiRequest(`/api/store/${storeId}/admin/orders/${orderId}/tracking`, 'POST', { courierName, trackingNumber, courierNotes }),
    getTracking: (storeId, orderId) =>
        apiRequest(`/api/store/${storeId}/admin/orders/${orderId}/tracking`),
    refreshTracking: (storeId, orderId) =>
        apiRequest(`/api/store/${storeId}/admin/orders/${orderId}/tracking/refresh`, 'POST'),

    // Courier list (tenant's own, self-service)
    getCouriers: (storeId) =>
        apiRequest(`/api/store/${storeId}/admin/couriers`),
    addCourier: (storeId, courierName, trackingUrlTemplate) =>
        apiRequest(`/api/store/${storeId}/admin/couriers`, 'POST', { courierName, trackingUrlTemplate }),
    deleteCourier: (storeId, courierId) =>
        apiRequest(`/api/store/${storeId}/admin/couriers/${courierId}`, 'DELETE'),
    
    // Customers
    getCustomers: (storeId, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/api/store/${storeId}/admin/customers?${query}`);
    },
};

// ✅ Store Admin auth — password-only, no OTP, no separate username. The
// store itself is already the identity (resolved by subdomain, from the
// URL this app was opened with). Replaces the earlier OTP-based approach:
// sharing OTPs with outsourced staff would have needed a third-party
// SMS/WhatsApp integration and isn't worth the cost for this use case.
export const storeAdminAuthAPI = {
    login: (subdomain, password) =>
        apiRequest('/api/store-admin/login', 'POST', { subdomain, password }),
    logout: (storeId) =>
        apiRequest('/api/store-admin/logout', 'POST', { storeId }),
};
