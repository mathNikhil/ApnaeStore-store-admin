import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Staff = () => {
    const [staff, setStaff] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) {
            navigate(`/login${window.location.search}`);
            return;
        }
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        // TODO: Connect to real API
        setStaff([
            { id: 'STAFF-001', name: 'Priya Sharma', email: 'priya@store.com', role: 'admin', status: 'active', joined: '2026-01-15' },
            { id: 'STAFF-002', name: 'Rahul Verma', email: 'rahul@store.com', role: 'production', status: 'active', joined: '2026-02-01' },
            { id: 'STAFF-003', name: 'Amit Patel', email: 'amit@store.com', role: 'delivery', status: 'active', joined: '2026-03-15' },
        ]);
        setLoading(false);
    };

    const handleAddStaff = (e) => {
        e.preventDefault();
        alert('Add staff functionality coming soon!');
        setShowAddForm(false);
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <Sidebar />
                <div style={styles.main}>
                    <div style={styles.loading}>Loading staff...</div>
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
                        <h1>👥 Staff</h1>
                        <p style={{color:'#8e9eab',marginTop:'4px'}}>Manage store staff and permissions</p>
                    </div>
                    <button style={styles.addBtn} onClick={() => setShowAddForm(!showAddForm)}>
                        + Add Staff
                    </button>
                </div>

                {showAddForm && (
                    <div style={styles.formCard}>
                        <h3>Add New Staff</h3>
                        <form onSubmit={handleAddStaff} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label>Full Name</label>
                                <input type="text" placeholder="Enter name" required style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label>Email</label>
                                <input type="email" placeholder="Enter email" required style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label>Role</label>
                                <select required style={styles.formInput}>
                                    <option value="">Select role</option>
                                    <option value="admin">Admin</option>
                                    <option value="production">Production</option>
                                    <option value="delivery">Delivery</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label>Password</label>
                                <input type="password" placeholder="Enter password" required style={styles.formInput} />
                            </div>
                            <button type="submit" style={styles.submitBtn}>Add Staff</button>
                        </form>
                    </div>
                )}

                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map(member => (
                                <tr key={member.id}>
                                    <td><strong>{member.name}</strong></td>
                                    <td>{member.email}</td>
                                    <td><span style={styles.roleBadge}>{member.role.toUpperCase()}</span></td>
                                    <td><span style={member.status === 'active' ? styles.activeBadge : styles.inactiveBadge}>{member.status}</span></td>
                                    <td>{member.joined}</td>
                                    <td>
                                        <button style={styles.editBtn}>Edit</button>
                                        <button style={styles.removeBtn}>Remove</button>
                                    </td>
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
    addBtn: { padding: '10px 20px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
    formCard: { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '20px' },
    form: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    formInput: { padding: '10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
    submitBtn: { gridColumn: 'span 2', padding: '12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
    tableContainer: { background: 'white', borderRadius: '16px', overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
    roleBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#e3f2fd', color: '#1976d2' },
    activeBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(46,213,115,0.15)', color: '#2ecc71' },
    inactiveBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(231,76,60,0.15)', color: '#e74c3c' },
    editBtn: { padding: '4px 12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', margin: '0 4px' },
    removeBtn: { padding: '4px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', margin: '0 4px' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
};

export default Staff;
