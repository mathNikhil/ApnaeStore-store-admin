import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Staff from './pages/Staff';

const App = () => {
    const isAuthenticated = !!localStorage.getItem('storeAdminToken');

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/orders" element={isAuthenticated ? <Orders /> : <Navigate to="/login" />} />
                <Route path="/orders/:id" element={isAuthenticated ? <OrderDetail /> : <Navigate to="/login" />} />
                <Route path="/customers" element={isAuthenticated ? <Customers /> : <Navigate to="/login" />} />
                <Route path="/reports" element={isAuthenticated ? <Reports /> : <Navigate to="/login" />} />
                <Route path="/staff" element={isAuthenticated ? <Staff /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
