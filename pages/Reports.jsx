import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Reports = () => {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState('month');

    const exportOrdersCSV = () => {
        alert('Orders CSV export coming soon!');
    };

    const exportSalesCSV = () => {
        alert('Sales report CSV export coming soon!');
    };

    const exportCustomersCSV = () => {
        alert('Customers CSV export coming soon!');
    };

    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <div style={styles.header}>
                    <div>
                        <h1>📈 Reports</h1>
                        <p style={{color:'#8e9eab',marginTop:'4px'}}>Download reports and analytics</p>
                    </div>
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)} 
                        style={styles.dateSelect}
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>
                </div>

                <div style={styles.grid}>
                    <div style={styles.card}>
                        <div style={styles.cardIcon}>📋</div>
                        <h3 style={styles.cardTitle}>Orders Report</h3>
                        <p style={styles.cardDesc}>Download complete order history with status, amounts, and customer details.</p>
                        <button style={styles.downloadBtn} onClick={exportOrdersCSV}>
                            📥 Download CSV
                        </button>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardIcon}>💰</div>
                        <h3 style={styles.cardTitle}>Sales Report</h3>
                        <p style={styles.cardDesc}>Revenue breakdown, top products, and sales trends.</p>
                        <button style={styles.downloadBtn} onClick={exportSalesCSV}>
                            📥 Download CSV
                        </button>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardIcon}>👤</div>
                        <h3 style={styles.cardTitle}>Customers Report</h3>
                        <p style={styles.cardDesc}>Complete customer list with orders, spending, and contact details.</p>
                        <button style={styles.downloadBtn} onClick={exportCustomersCSV}>
                            📥 Download CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '30px', marginLeft: '260px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    dateSelect: { padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', background: '#fff' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
    card: { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' },
    cardIcon: { fontSize: '40px', marginBottom: '12px' },
    cardTitle: { fontSize: '18px', color: '#1a1a2e', marginBottom: '8px' },
    cardDesc: { fontSize: '14px', color: '#8e9eab', marginBottom: '16px', lineHeight: '1.5' },
    downloadBtn: { padding: '10px 24px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
};

export default Reports;
