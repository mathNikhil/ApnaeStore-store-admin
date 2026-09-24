import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { storeAdminAPI } from '../services/api';

const OrderBill = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [order, setOrder] = useState(null);
    const [storeInfo, setStoreInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) { navigate(`/login${window.location.search}`); return; }
        const storeId = localStorage.getItem('currentStoreId');
        if (storeId) fetchData(storeId);
        else setLoading(false);
    }, [id]);

    const fetchData = async (storeId) => {
        try {
            const result = await storeAdminAPI.getOrder(storeId, id);
            if (result.success) setOrder(result.data);
            // Fetch full store config from public API for bill header
            try {
                const urlParams = new URLSearchParams(location.search);
                // Get subdomain from URL params, query string, or hostname
                const hostname = window.location.hostname;
                const hostnameSubdomain = hostname.includes('.aapnaestore.com') ? hostname.split('.')[0] : null;
                const subdomain = urlParams.get('subdomain') || urlParams.get('store') || hostnameSubdomain;
                console.log('[Bill] subdomain:', subdomain, 'hostname:', hostname);
                if (subdomain) {
                    const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';
                    const res = await fetch(`${API}/api/public/store/${subdomain}`);
                    const storeResult = await res.json();
                    if (storeResult?.success) setStoreInfo(storeResult.data);
                }
            } catch {}
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handlePrint = () => window.print();

    if (loading) return <div style={styles.center}>Loading order...</div>;
    if (!order) return <div style={styles.center}>Order not found.</div>;

    const items = Array.isArray(order.items) ? order.items : [];
    const addr = order.delivery_address || {};
    const orderDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : 'N/A';
    const storeName = storeInfo?.config?.brand?.storeName || storeInfo?.store_name || order.store_name || localStorage.getItem('currentStoreName') || 'Store';
    const storePhone = storeInfo?.config?.profile?.officeNumber || '';
    const storeEmail = storeInfo?.config?.profile?.supportEmail || '';
    const storeAddress = storeInfo?.config?.profile?.storeAddress || '';
    const storeLogo = storeInfo?.config?.brand?.logoUrl || null;
    const storeGST = storeInfo?.config?.cart?.gstNumber || '';
    const hsnCode = storeInfo?.config?.cart?.hsnCode || '';
    const storeState = storeInfo?.config?.cart?.storeState || storeInfo?.config?.profile?.state || '';
    const enableGST = storeInfo?.config?.cart?.enableGST || false;
    const gstRate = parseFloat(storeInfo?.config?.cart?.gstRate || 0);
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const dineInLabel = storeInfo?.config?.cart?.dineInLabel || 'Dine In';
    const storeTagline = storeInfo?.config?.brand?.tagline || '';

    return (
        <>
            {/* Print / action bar — hidden on print */}
            <div style={styles.actionBar} className="no-print">
                <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
                <div style={styles.actionRight}>
                    <button onClick={handlePrint} style={styles.printBtn}>🖨 Print / Save as PDF</button>
                </div>
            </div>

            {/* Bill */}
            <div ref={printRef} style={styles.bill}>

                {/* Header */}
                <div style={styles.header}>
                    {storeLogo && <img src={storeLogo} alt={storeName} style={{height:'60px',objectFit:'contain',marginBottom:'8px'}} />}
                    <div style={styles.storeName}>{storeName}</div>
                    {storeAddress && <div style={styles.storeDetail}>{storeAddress}</div>}
                    {storePhone && <div style={styles.storeDetail}>📞 {storePhone}</div>}
                    {storeEmail && <div style={styles.storeDetail}>✉ {storeEmail}</div>}
                    {storeGST && <div style={styles.storeDetail}>GSTIN: {storeGST}</div>}
                </div>

                <div style={styles.divider} />

                {/* Bill title */}
                <div style={styles.billTitle}>TAX INVOICE</div>
                {!storeGST && <div style={{textAlign:'center', fontSize:11, color:'#e74c3c', marginBottom:8}}>⚠️ GSTIN not configured — add it in Step 3 (Cart Settings)</div>}

                {/* Order info */}
                <div style={styles.infoGrid}>
                    <div>
                        <div style={styles.infoLabel}>Order ID</div>
                        <div style={styles.infoValue}>#{order.order_id || order.id}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <div style={styles.infoLabel}>Order Date</div>
                        <div style={styles.infoValue}>{orderDate}</div>
                    </div>
                    <div>
                        <div style={styles.infoLabel}>Payment Method</div>
                        <div style={styles.infoValue}>
                            {order.payment_method === 'upi' ? 'UPI' :
                             order.payment_method === 'cod' ? 'Cash on Delivery' :
                             order.payment_method === 'cashfree' ? 'Cashfree' :
                             order.payment_method || 'N/A'}
                        </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <div style={styles.infoLabel}>Status</div>
                        <div style={{...styles.infoValue, textTransform:'uppercase', fontWeight:700}}>
                            {(order.status || '').replace(/_/g, ' ')}
                        </div>
                    </div>
                    <div>
                        <div style={styles.infoLabel}>Place of Supply</div>
                        <div style={styles.infoValue}>{storeState || 'N/A'}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <div style={styles.infoLabel}>Reverse Charge</div>
                        <div style={styles.infoValue}>No</div>
                    </div>
                </div>

                <div style={styles.divider} />

                {/* Customer & Delivery */}
                <div style={styles.infoGrid}>
                    <div>
                        <div style={styles.sectionTitle}>Bill To</div>
                        <div style={styles.infoValue}>{order.customer_name || 'Customer'}</div>
                        {order.customer_phone && <div style={styles.infoSmall}>📞 {order.customer_phone}</div>}
                        {order.customer_email && <div style={styles.infoSmall}>✉ {order.customer_email}</div>}
                    </div>
                    {order.order_type === 'dine_in' ? (
                        <div style={{textAlign:'right'}}>
                            <div style={styles.sectionTitle}>Order Type</div>
                            <div style={styles.infoValue}>🍽️ {dineInLabel}</div>
                        </div>
                    ) : addr.addressLine1 && (
                        <div style={{textAlign:'right'}}>
                            <div style={styles.sectionTitle}>Deliver To</div>
                            <div style={styles.infoValue}>{addr.recipientName || order.customer_name}</div>
                            {addr.recipientMobile && <div style={styles.infoSmall}>📞 {addr.recipientMobile}</div>}
                            <div style={styles.infoSmall}>{addr.addressLine1}{addr.addressLine2 ? ', ' + addr.addressLine2 : ''}</div>
                            <div style={styles.infoSmall}>{addr.city}, {addr.state} - {addr.pincode}</div>
                            {addr.landmark && <div style={styles.infoSmall}>Landmark: {addr.landmark}</div>}
                        </div>
                    )}
                </div>

                <div style={styles.divider} />

                {/* Items Table */}
                <div style={styles.sectionTitle}>Order Items</div>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.tableHead}>
                            <th style={{...styles.th, textAlign:'left', width:'40%'}}>Item</th>
                            <th style={{...styles.th, textAlign:'center'}}>HSN/SAC</th>
                            <th style={{...styles.th, textAlign:'center'}}>Variant</th>
                            <th style={{...styles.th, textAlign:'right'}}>Taxable Value</th>
                            <th style={{...styles.th, textAlign:'center'}}>Qty</th>
                            <th style={{...styles.th, textAlign:'right'}}>Price</th>
                            <th style={{...styles.th, textAlign:'right'}}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item, idx) => (
                            <tr key={idx} style={{borderBottom:'1px solid #f0f0f0'}}>
                                <td style={styles.td}>
                                <div style={{display:'flex', alignItems:'center', gap:10}}>
                                    {item.image || item.product_image ? (
                                        <img src={item.image || item.product_image} alt={item.name} style={{width:40, height:40, objectFit:'cover', borderRadius:6, flexShrink:0}} />
                                    ) : (
                                        <div style={{width:40, height:40, background:'#f2f4f7', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0}}>📦</div>
                                    )}
                                    <span>{item.name || item.product_name || 'Item'}</span>
                                </div>
                            </td>
                                <td style={{...styles.td, textAlign:'center', fontSize:12, color:'#666'}}>{hsnCode || '—'}</td>
                                <td style={{...styles.td, textAlign:'center', fontSize:12, color:'#666'}}>
                                    {item.variant || item.size || item.color || '—'}
                                </td>
                                <td style={{...styles.td, textAlign:'right', fontSize:12}}>
                                    ₹{enableGST && gstRate > 0
                                        ? (Number((item.price || 0) * (item.quantity || 1)) / (1 + gstRate/100)).toFixed(2)
                                        : Number((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                </td>
                                <td style={{...styles.td, textAlign:'center'}}>{item.quantity || item.qty || 1}</td>
                                <td style={{...styles.td, textAlign:'right'}}>₹{Number(item.price || item.unit_price || 0).toLocaleString('en-IN')}</td>
                                <td style={{...styles.td, textAlign:'right', fontWeight:600}}>
                                    ₹{Number((item.price || item.unit_price || 0) * (item.quantity || item.qty || 1)).toLocaleString('en-IN')}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} style={{...styles.td, textAlign:'center', color:'#999'}}>No items</td></tr>
                        )}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={styles.totalsWrap}>
                    {enableGST && order.tax_amount > 0 && (
                        <>
                            <div style={styles.totalRow}>
                                <span>Taxable Amount</span>
                                <span>₹{(Number(order.total_amount) / (1 + gstRate/100)).toFixed(2)}</span>
                            </div>
                            <div style={styles.totalRow}>
                                <span>CGST @ {cgstRate}%</span>
                                <span>₹{(Number(order.tax_amount) / 2).toFixed(2)}</span>
                            </div>
                            <div style={styles.totalRow}>
                                <span>SGST @ {sgstRate}%</span>
                                <span>₹{(Number(order.tax_amount) / 2).toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    {order.delivery_charge > 0 && (
                        <div style={styles.totalRow}>
                            <span>Delivery Charge</span>
                            <span>₹{Number(order.delivery_charge).toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    {order.discount_amount > 0 && (
                        <div style={{...styles.totalRow, color:'#e74c3c'}}>
                            <span>Discount</span>
                            <span>-₹{Number(order.discount_amount).toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    <div style={styles.divider} />
                    <div style={styles.grandTotal}>
                        <span>TOTAL AMOUNT</span>
                        <span>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {order.payment_method === 'cod' && (
                        <div style={{...styles.totalRow, color:'#e67e22', fontWeight:600, marginTop:6}}>
                            <span>Amount to Collect (COD)</span>
                            <span>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                    )}
                </div>

                {/* UPI info */}
                {order.payment_method === 'upi' && order.customer_upi_id && (
                    <div style={styles.upiBox}>
                        <strong>UPI Payment Details</strong>
                        <div>UPI ID: {order.customer_upi_id}</div>
                        <div style={{fontSize:11, color:'#666', marginTop:4}}>
                            Please verify ₹{Number(order.total_amount).toLocaleString('en-IN')} received from this UPI ID before dispatching.
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={styles.divider} />
                <div style={styles.footer}>
                    <div>Thank you for your order! 🎉</div>
                    <div style={{fontSize:10, color:'#999', marginTop:4}}>
                        This is a computer generated invoice. For queries contact {storeName}.
                    </div>
                    <div style={{fontSize:10, color:'#999', marginTop:2}}>
                        Powered by AapnaEstore · aapnaestore.com
                    </div>
                </div>

            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 0; }
                    @page { size: A4; margin: 10mm; }
                }
            `}</style>
        </>
    );
};

const styles = {
    center: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:16, color:'#666' },
    actionBar: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 24px', background:'#fff', borderBottom:'1px solid #e0e3e6', position:'sticky', top:0, zIndex:100 },
    backBtn: { padding:'8px 16px', background:'#f0f2f5', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:13 },
    actionRight: { display:'flex', gap:10 },
    printBtn: { padding:'8px 20px', background:'#006d2f', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:13 },
    bill: { maxWidth:700, margin:'24px auto', padding:'32px', background:'#fff', boxShadow:'0 2px 20px rgba(0,0,0,0.08)', borderRadius:12, fontFamily:'Arial, sans-serif' },
    header: { textAlign:'center', marginBottom:12 },
    storeName: { fontSize:24, fontWeight:800, color:'#191c1e', marginBottom:4 },
    storeDetail: { fontSize:12, color:'#666', marginBottom:2 },
    divider: { borderTop:'1px solid #e0e3e6', margin:'16px 0' },
    billTitle: { textAlign:'center', fontSize:14, fontWeight:700, letterSpacing:3, color:'#556067', marginBottom:16 },
    infoGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:8 },
    infoLabel: { fontSize:10, color:'#8e9eab', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 },
    infoValue: { fontSize:14, color:'#191c1e', fontWeight:600 },
    infoSmall: { fontSize:12, color:'#556067', marginTop:2 },
    sectionTitle: { fontSize:11, fontWeight:700, color:'#8e9eab', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 },
    table: { width:'100%', borderCollapse:'collapse', marginBottom:4 },
    tableHead: { background:'#f8f9fb', borderBottom:'2px solid #e0e3e6' },
    th: { padding:'10px 8px', fontSize:11, fontWeight:700, color:'#556067', textTransform:'uppercase', letterSpacing:0.5 },
    td: { padding:'10px 8px', fontSize:13, color:'#191c1e', verticalAlign:'middle' },
    totalsWrap: { marginLeft:'auto', width:280, marginTop:8 },
    totalRow: { display:'flex', justifyContent:'space-between', fontSize:13, color:'#556067', marginBottom:4 },
    grandTotal: { display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:800, color:'#006d2f', marginTop:4 },
    upiBox: { background:'#fff8e1', border:'1px solid #ffc107', borderRadius:8, padding:'10px 14px', fontSize:12, marginTop:12 },
    footer: { textAlign:'center', fontSize:12, color:'#556067', marginTop:8 },
};

export default OrderBill;
