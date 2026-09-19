import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const ThermalBill = () => {
    const { id } = useParams();
    const location = useLocation();
    const [order, setOrder] = useState(null);
    const [storeInfo, setStoreInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const urlP = new URLSearchParams(location.search);
                const storeId = urlP.get('storeId') || localStorage.getItem('currentStoreId');
                const token = urlP.get('t') || localStorage.getItem('storeAdminToken');
                const subdomain = urlP.get('subdomain') || urlP.get('store');

                const orderRes = await fetch(`${API}/api/store/${storeId}/admin/orders/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const orderData = await orderRes.json();
                if (orderData.success) setOrder(orderData.data);

                if (subdomain) {
                    const storeRes = await fetch(`${API}/api/public/store/${subdomain}`);
                    const storeData = await storeRes.json();
                    if (storeData?.success) setStoreInfo(storeData.data);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [id]);

    useEffect(() => {
        if (!loading && order) setTimeout(() => window.print(), 600);
    }, [loading, order]);

    if (loading) return <div style={{ textAlign: 'center', padding: 20, fontFamily: 'monospace' }}>Loading...</div>;
    if (!order) return <div style={{ textAlign: 'center', padding: 20, fontFamily: 'monospace' }}>Order not found</div>;

    const items = Array.isArray(order.items) ? order.items : [];
    const addr = order.delivery_address || {};
    const storeName = storeInfo?.config?.brand?.storeName || storeInfo?.store_name || localStorage.getItem('currentStoreName') || 'Store';
    const storePhone = storeInfo?.config?.profile?.officeNumber || '';
    const storeAddress = storeInfo?.config?.profile?.storeAddress || '';
    const storeGST = storeInfo?.config?.cart?.gstNumber || '';
    const dineInLabel = storeInfo?.config?.cart?.dineInLabel || 'Dine In';
    const enableGST = storeInfo?.config?.cart?.enableGST || false;
    const gstRate = storeInfo?.config?.cart?.gstRate || 0;

    const subtotal = items.reduce((s, i) => s + (parseFloat(i.price || 0) * parseInt(i.quantity || 1)), 0);
    const gstAmt = enableGST ? subtotal * (gstRate / 100) : 0;
    const deliveryCharge = parseFloat(order.delivery_charge || 0);
    const discount = parseFloat(order.discount_amount || 0);
    const total = subtotal + gstAmt + deliveryCharge - discount;
    const line = '--------------------------------';

    return (
        <>
            <style>{`
                @page { margin: 0; size: 80mm auto; }
                body { margin: 0; }
                @media print { body { width: 80mm; } .no-print { display: none; } }
            `}</style>
            <div style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px', padding: '4mm', boxSizing: 'border-box', background: '#fff' }}>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: 2 }}>{storeName}</div>
                {storePhone && <div style={{ textAlign: 'center', fontSize: '11px' }}>Tel: {storePhone}</div>}
                {storeAddress && <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: 2 }}>{storeAddress}</div>}
                {storeGST && <div style={{ textAlign: 'center', fontSize: '11px' }}>GSTIN: {storeGST}</div>}
                <div style={{ textAlign: 'center', fontSize: '11px', marginTop: 4 }}>{line}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: 4 }}>
                    <span>Bill#: {(order.order_id || order.id || '').slice(-8)}</span>
                    <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div style={{ fontSize: '11px' }}>Time: {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                {(order.customer_name || order.customer_phone) && <div style={{ fontSize: '11px' }}>Customer: {order.customer_name || order.customer_phone}</div>}
                {order.order_type === 'dine_in' ? (
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: 2 }}>🍽️ {dineInLabel}</div>
                ) : (
                    (addr.recipientMobile || order.customer_phone) && <div style={{ fontSize: '11px' }}>Mobile: {addr.recipientMobile || order.customer_phone}</div>
                )}
                {addr.recipientName && <div style={{ fontSize: '11px' }}>Name: {addr.recipientName}</div>}
                {addr.addressLine1 && <div style={{ fontSize: '11px' }}>Address: {addr.addressLine1}{addr.addressLine2 ? ', ' + addr.addressLine2 : ''}</div>}
                {(addr.city || addr.pincode) && <div style={{ fontSize: '11px' }}>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</div>}
                <div style={{ textAlign: 'center', fontSize: '11px', marginTop: 4 }}>{line}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', marginTop: 4 }}>
                    <span style={{ flex: 1 }}>Item</span>
                    <span style={{ width: 30, textAlign: 'center' }}>Qty</span>
                    <span style={{ width: 55, textAlign: 'right' }}>Amt</span>
                </div>
                <div style={{ fontSize: '11px' }}>{line}</div>
                {items.map((item, i) => (
                    <div key={i} style={{ marginTop: 3 }}>
                        <div style={{ fontSize: '11px' }}>{item.name || 'Product'}{item.weight ? ` (${item.weight}${item.unit || ''})` : ''}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ flex: 1 }}>@ Rs.{parseFloat(item.price || 0).toFixed(2)}</span>
                            <span style={{ width: 30, textAlign: 'center' }}>{item.quantity || 1}</span>
                            <span style={{ width: 55, textAlign: 'right' }}>Rs.{(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                <div style={{ fontSize: '11px', marginTop: 4 }}>{line}</div>
                <div style={{ fontSize: '11px', marginTop: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>Rs.{subtotal.toFixed(2)}</span></div>
                    {enableGST && gstAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST ({gstRate}%)</span><span>Rs.{gstAmt.toFixed(2)}</span></div>}
                    {deliveryCharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery</span><span>Rs.{deliveryCharge.toFixed(2)}</span></div>}
                    {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>-Rs.{discount.toFixed(2)}</span></div>}
                </div>
                <div style={{ fontSize: '11px' }}>{line}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: 2 }}>
                    <span>TOTAL</span><span>Rs.{total.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '11px' }}>{line}</div>
                <div style={{ fontSize: '11px', marginTop: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment</span><span>{order.payment_method || 'COD'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span>{order.payment_status || 'Pending'}</span></div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', marginTop: 6 }}>{line}</div>
                <div style={{ textAlign: 'center', fontSize: '11px', marginTop: 4 }}>Thank you for your purchase!</div>
                <div style={{ textAlign: 'center', fontSize: '10px', marginTop: 2, marginBottom: 8 }}>Powered by AapnaEstore</div>
                <div className="no-print" style={{ textAlign: 'center', marginTop: 16 }}>
                    <button onClick={() => window.print()} style={{ padding: '8px 24px', background: '#006d2f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Print</button>
                </div>
            </div>
        </>
    );
};

export default ThermalBill;
