import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) {
            navigate('/login');
            return;
        }
        const storedStoreId = localStorage.getItem('currentStoreId');
        if (storedStoreId) {
            setStoreId(storedStoreId);
            fetchCustomers(storedStoreId);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchCustomers = async (sid) => {
        try {
            const result = await storeAdminAPI.getCustomers(sid);
            if (result.success) {
                setCustomers(result.data);
                setFilteredCustomers(result.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (term) => {
        setSearch(term);
        const filtered = customers.filter(c => 
            c.name.toLowerCase().includes(term.toLowerCase()) ||
            c.email.toLowerCase().includes(term.toLowerCase()) ||
            c.phone.includes(term)
        );
        setFilteredCustomers(filtered);
    };

    const exportCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Joined'];
        const rows = filteredCustomers.map(c => [
            c.name, c.email, c.phone, c.total_orders || 0, `₹${c.total_spent || 0}`, new Date(c.created_at).toLocaleDateString()
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'customers.csv';
        a.click();
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}>
                    <div style={styles.loading}>Loading customers...</div>
                </div>
            </div>
        );
    }

    if (!storeId) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}>
                    <h1>Select a Store</h1>
                    <p style={{color:'#8e9eab'}}>Please select a store to manage</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <div style={styles.header}>
                    <div>
                        <h1>👤 Customers</h1>
                        <p style={{color:'#8e9eab',marginTop:'4px'}}>Manage your customer database</p>
                    </div>
                    <button style={styles.exportBtn} onClick={exportCSV}>
                        📥 Export CSV
                    </button>
                </div>

                <div style={styles.searchBar}>
                    <input 
                        type="text" 
                        placeholder="Search by name, email, phone..." 
                        value={search} 
                        onChange={(e) => handleSearch(e.target.value)} 
                        style={styles.searchInput} 
                    />
                    <span style={styles.resultCount}>{filteredCustomers.length} customers</span>
                </div>

                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(customer => (
                                <tr key={customer.id}>
                                    <td><strong>{customer.name}</strong></td>
                                    <td>{customer.email}</td>
                                    <td>{customer.phone}</td>
                                    <td>{customer.total_orders || 0}</td>
                                    <td>₹{Number(customer.total_spent || 0).toLocaleString()}</td>
                                    <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '30px', marginLeft: '260px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    exportBtn: { padding: '10px 20px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
    searchBar: { display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' },
    searchInput: { flex: 1, maxWidth: '400px', padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '14px' },
    resultCount: { fontSize: '14px', color: '#8e9eab' },
    tableContainer: { background: 'white', borderRadius: '16px', overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
};

export default Customers;