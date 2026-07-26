const API_BASE_URL = 'http://localhost:5000';

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
        if (!response.ok) {
            throw new Error(result.error || 'Something went wrong');
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
    
    // Customers
    getCustomers: (storeId, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/api/store/${storeId}/admin/customers?${query}`);
    },
};

// Tenant Auth (for store admin login)
export const authAPI = {
    login: (email, password) => 
        apiRequest('/api/auth/login', 'POST', { identifier: email, password }),
};
