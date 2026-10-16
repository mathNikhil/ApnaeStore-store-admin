import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { storeAdminAPI } from '../services/api';

const OrderBill = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [order, setOrder] = useState(null);
    const [storeInfo, setStoreInfo] = useState(null);
    const [loading, setLoading] = useState(true);

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
            try {
                const urlParams = new URLSearchParams(location.search);
                const hostname = window.location.hostname;
                const hostnameSubdomain = hostname.includes('.aapnaestore.com') ? hostname.split('.')[0] : null;
                const subdomain = urlParams.get('subdomain') || urlParams.get('store') || hostnameSubdomain;
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

    if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:16, color:'#666' }}>Loading order...</div>;
    if (!order) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:16, color:'#666' }}>Order not found.</div>;

    // Store config
    const storeName    = storeInfo?.config?.brand?.storeName || storeInfo?.store_name || order.store_name || localStorage.getItem('currentStoreName') || 'Store';
    const storePhone   = storeInfo?.config?.profile?.officeNumber || '';
    const storeEmail   = storeInfo?.config?.profile?.supportEmail || '';
    const storeAddress = storeInfo?.config?.profile?.storeAddress || '';
    const storeLogo    = storeInfo?.config?.brand?.logoUrl || null;
    const storeGST     = storeInfo?.config?.cart?.gstNumber || '';
    const storePAN     = storeInfo?.config?.cart?.panNumber || storeInfo?.config?.profile?.panNumber || '';
    const hsnCode      = storeInfo?.config?.cart?.hsnCode || '';
    const storeState   = storeInfo?.config?.cart?.storeState || storeInfo?.config?.profile?.state || '';
    const enableGST    = storeInfo?.config?.cart?.enableGST || false;
    const gstRate      = parseFloat(storeInfo?.config?.cart?.gstRate || 0);
    const cgstRate     = gstRate / 2;
    const sgstRate     = gstRate / 2;
    const dineInLabel  = storeInfo?.config?.cart?.dineInLabel || 'Dine In';

    // Order data
    const items = Array.isArray(order.items) ? order.items : [];
    const addr  = order.delivery_address || {};
    const orderDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })
        : 'N/A';
    const invoiceNo  = `INV-${(order.order_id || order.id || '').slice(-10).toUpperCase()}`;
    const totalAmt   = Number(order.total_amount || 0);
    const taxAmt     = Number(order.tax_amount || 0);
    const taxableAmt = enableGST && gstRate > 0 ? (totalAmt / (1 + gstRate / 100)).toFixed(2) : totalAmt.toFixed(2);
    const cgstAmt    = enableGST && taxAmt > 0 ? (taxAmt / 2).toFixed(2) : '0.00';
    const sgstAmt    = cgstAmt;
    const paymentLabel = order.payment_method === 'cod' ? 'Cash on Delivery'
        : order.payment_method === 'upi' ? 'UPI'
        : order.payment_method === 'cashfree' ? 'Cashfree'
        : order.payment_method || 'N/A';

    // Variant label from store config
    const getSizeLabel = (sizeId, variationId) => {
        const cats = storeInfo?.config?.products?.categories || [];
        for (const cat of cats) {
            for (const prod of cat.products || []) {
                for (const v of prod.variations || []) {
                    if (String(v.id) === String(variationId)) {
                        const sz = (v.sizes || []).find(s => String(s.id) === String(sizeId));
                        if (sz) return `${v.name}${sz.size ? ' / ' + sz.size + (sz.unit || '') : ''}`;
                    }
                }
            }
        }
        return item => item.variant || item.size || '—';
    };

    // Amount in words
    const amountInWords = (num) => {
        const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        const convert = (n) => {
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
            if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + convert(n%100) : '');
            if (n < 100000) return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + convert(n%1000) : '');
            if (n < 10000000) return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + convert(n%100000) : '');
            return convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + convert(n%10000000) : '');
        };
        const rupees = Math.floor(num);
        const paise  = Math.round((num - rupees) * 100);
        return convert(rupees) + ' Rupees' + (paise ? ' and ' + convert(paise) + ' Paise' : '') + ' Only';
    };

    const getSizeLabelForItem = (item) => {
        const cats = storeInfo?.config?.products?.categories || [];
        for (const cat of cats) {
            for (const prod of cat.products || []) {
                for (const v of prod.variations || []) {
                    if (String(v.id) === String(item.variationId)) {
                        const sz = (v.sizes || []).find(s => String(s.id) === String(item.sizeId));
                        if (sz) return `${v.name}${sz.size ? ' / ' + sz.size + (sz.unit || '') : ''}`;
                    }
                }
            }
        }
        return item.variant || item.size || '—';
    };

    return (
        <>
            {/* Action bar — hidden on print */}
            <div className="no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', background:'#fff', borderBottom:'1px solid #e0e3e6', position:'sticky', top:0, zIndex:100 }}>
                <button onClick={() => navigate(-1)} style={{ padding:'7px 16px', background:'#f0f2f5', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>← Back</button>
                <button onClick={() => window.print()} style={{ padding:'7px 22px', background:'#191c1e', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 }}>🖨️ Print Invoice</button>
            </div>

            {/* Invoice page */}
            <div className="page">

                {/* STORE HEADER: logo | name+address | TAX INVOICE */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                    {storeLogo && <img src={storeLogo} alt={storeName} style={{ height:40, width:40, objectFit:'contain', flexShrink:0 }} />}
                    <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:800, lineHeight:1.2 }}>{storeName}</div>
                        <div style={{ fontSize:8, color:'#556067', marginTop:2, lineHeight:1.6 }}>
                            {storeAddress && <>{storeAddress}<br/></>}
                            {storePhone && <>📞 {storePhone}&nbsp;&nbsp;</>}{storeEmail && <>✉ {storeEmail}<br/></>}
                            {storeGST && <>GSTIN: {storeGST}&nbsp;&nbsp;</>}{storePAN && <>PAN: {storePAN}</>}
                        </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:'#191c1e' }}>TAX INVOICE</div>
                        <div style={{ fontSize:7.5, color:'#8e9eab', marginTop:2 }}>Original for Recipient</div>
                        {!storeGST && <div style={{ fontSize:7, color:'#e74c3c', marginTop:3 }}>⚠️ GSTIN not set</div>}
                    </div>
                </div>

                <div className="divider" />

                {/* META GRID: 3-column */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px 10px', marginBottom:5 }}>
                    <div>
                        <div className="lbl">Invoice No.</div>
                        <div className="val">{invoiceNo}</div>
                        <div className="sub">Order: #{(order.order_id || order.id || '').slice(-8)}</div>
                    </div>
                    <div>
                        <div className="lbl">Payment</div>
                        <div className="val">{paymentLabel}</div>
                    </div>
                    <div>
                        <div className="lbl">Place of Supply</div>
                        <div className="val">{storeState || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="lbl">Date</div>
                        <div className="val">{orderDate}</div>
                    </div>
                    <div>
                        <div className="lbl">Status</div>
                        <div className="val" style={{ textTransform:'uppercase' }}>{(order.status || '').replace(/_/g, ' ')}</div>
                    </div>
                    <div>
                        <div className="lbl">Reverse Charge</div>
                        <div className="val">No</div>
                    </div>
                </div>

                <div className="divider" />

                {/* BILL TO + SHIP TO */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, margin:'5px 0' }}>
                    <div>
                        <div className="lbl">Bill To</div>
                        <div className="val">
                            {order.order_type === 'dine_in' && order.dine_in_customer_name
                                ? order.dine_in_customer_name
                                : order.customer_name || 'Customer'}
                        </div>
                        {order.order_type === 'dine_in' && order.dine_in_customer_mobile
                            ? <div className="sub">📞 {order.dine_in_customer_mobile}</div>
                            : order.customer_phone && <div className="sub">📞 {order.customer_phone}</div>}
                        {order.customer_email && <div className="sub">✉ {order.customer_email}</div>}
                    </div>
                    <div>
                        {order.order_type === 'dine_in' ? (
                            <>
                                <div className="lbl">Order Type</div>
                                <div className="val">🍽️ {dineInLabel}</div>
                            </>
                        ) : addr.addressLine1 ? (
                            <>
                                <div className="lbl">Ship To</div>
                                <div className="val">{addr.recipientName || order.customer_name}</div>
                                {addr.recipientMobile && <div className="sub">📞 {addr.recipientMobile}</div>}
                                <div className="sub">{addr.addressLine1}{addr.addressLine2 ? ', ' + addr.addressLine2 : ''}</div>
                                <div className="sub">{addr.city}, {addr.state} {addr.pincode}</div>
                                {addr.landmark && <div className="sub">Landmark: {addr.landmark}</div>}
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="divider" />

                {/* ITEMS TABLE */}
                <table style={{ width:'100%', borderCollapse:'collapse', marginTop:4 }}>
                    <thead>
                        <tr>
                            <th className="th" style={{ textAlign:'left' }}>Item</th>
                            <th className="th" style={{ textAlign:'center' }}>HSN/SAC</th>
                            <th className="th" style={{ textAlign:'center' }}>Variant</th>
                            <th className="th" style={{ textAlign:'right' }}>Taxable Value</th>
                            <th className="th" style={{ textAlign:'center' }}>Qty</th>
                            <th className="th" style={{ textAlign:'right' }}>Price</th>
                            <th className="th" style={{ textAlign:'right' }}>CGST</th>
                            <th className="th" style={{ textAlign:'right' }}>SGST</th>
                            <th className="th" style={{ textAlign:'right' }}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item, idx) => {
                            const itemTotal    = Number(item.price || item.unit_price || 0) * Number(item.quantity || item.qty || 1);
                            const itemTaxable  = enableGST && gstRate > 0 ? (itemTotal / (1 + gstRate / 100)).toFixed(2) : itemTotal.toFixed(2);
                            const itemCgst     = enableGST && gstRate > 0 ? ((itemTotal - parseFloat(itemTaxable)) / 2).toFixed(2) : '0.00';
                            const itemSgst     = itemCgst;
                            const variantLabel = storeInfo ? getSizeLabelForItem(item) : (item.variant || item.size || '—');
                            return (
                                <tr key={idx} style={{ borderBottom:'1px solid #f2f4f7' }}>
                                    <td className="td">
                                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                            {item.image || item.product_image
                                                ? <img src={item.image || item.product_image} alt={item.name} style={{ width:26, height:26, objectFit:'cover', borderRadius:3, flexShrink:0 }} />
                                                : <div style={{ width:26, height:26, background:'#f2f4f7', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>📦</div>
                                            }
                                            <span style={{ fontSize:8 }}>{item.name || item.product_name || 'Item'}</span>
                                        </div>
                                    </td>
                                    <td className="td" style={{ textAlign:'center', fontSize:'7.5px', color:'#8e9eab' }}>{hsnCode || '—'}</td>
                                    <td className="td" style={{ textAlign:'center', fontSize:'7.5px', color:'#8e9eab' }}>{variantLabel}</td>
                                    <td className="td" style={{ textAlign:'right', fontSize:8 }}>₹{itemTaxable}</td>
                                    <td className="td" style={{ textAlign:'center', fontSize:8 }}>{item.quantity || item.qty || 1}</td>
                                    <td className="td" style={{ textAlign:'right', fontSize:8 }}>₹{Number(item.price || item.unit_price || 0).toFixed(2)}</td>
                                    <td className="td" style={{ textAlign:'right', fontSize:'7.5px', color:'#556067' }}>{cgstRate}%<br/>₹{itemCgst}</td>
                                    <td className="td" style={{ textAlign:'right', fontSize:'7.5px', color:'#556067' }}>{sgstRate}%<br/>₹{itemSgst}</td>
                                    <td className="td" style={{ textAlign:'right', fontSize:8, fontWeight:700 }}>₹{itemTotal.toFixed(2)}</td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={9} style={{ padding:'8px', textAlign:'center', color:'#999', fontSize:12 }}>No items</td></tr>
                        )}
                    </tbody>
                </table>

                {/* TOTALS */}
                <div style={{ marginTop:4 }}>
                    {enableGST && taxAmt > 0 && (
                        <>
                            <div className="totals-row"><span>Taxable Amount</span><span>₹{taxableAmt}</span></div>
                            <div className="totals-row"><span>CGST @ {cgstRate}%</span><span>₹{cgstAmt}</span></div>
                            <div className="totals-row"><span>SGST @ {sgstRate}%</span><span>₹{sgstAmt}</span></div>
                        </>
                    )}
                    {Number(order.delivery_charge) > 0
                        ? <div className="totals-row"><span>Delivery</span><span>₹{Number(order.delivery_charge).toFixed(2)}</span></div>
                        : <div className="totals-row"><span>Delivery</span><span style={{ color:'#16a34a' }}>FREE</span></div>
                    }
                    {Number(order.discount_amount) > 0 && (
                        <div className="totals-row" style={{ color:'#e74c3c' }}><span>Discount</span><span>-₹{Number(order.discount_amount).toFixed(2)}</span></div>
                    )}
                    <div className="grand"><span>TOTAL</span><span>₹{totalAmt.toFixed(2)}</span></div>
                </div>

                <div style={{ fontSize:'7.5px', color:'#556067', fontStyle:'italic', borderTop:'1px dashed #d1d5db', paddingTop:4, marginTop:5 }}>
                    <strong>Amount in Words:</strong> {amountInWords(totalAmt)}
                </div>

                {/* UPI note */}
                {order.payment_method === 'upi' && order.customer_upi_id && (
                    <div style={{ background:'#fff8e1', border:'1px solid #ffc107', borderRadius:6, padding:'6px 10px', fontSize:'7.5px', marginTop:8 }}>
                        <strong>UPI Payment:</strong> {order.customer_upi_id} — verify ₹{totalAmt.toFixed(2)} received before dispatching.
                    </div>
                )}

                {/* Footer + Signatory */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:8 }}>
                    <div style={{ fontSize:7, color:'#8e9eab' }}>
                        Thank you for your order!<br/>
                        This is a computer generated invoice. Powered by AapnaEstore · aapnaestore.com
                    </div>
                    <div style={{ textAlign:'center', borderTop:'1px solid #556067', paddingTop:3, fontSize:'7.5px', color:'#556067', width:90 }}>
                        Authorized Signatory<br/>{storeName}
                    </div>
                </div>

            </div>

            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: Arial, sans-serif; color: #191c1e; background: #f5f6fa; }
                .page { width: 148mm; min-height: 210mm; padding: 8mm; background: #fff; margin: 16px auto; box-shadow: 0 2px 20px rgba(0,0,0,0.10); border-radius: 4px; }
                .divider { border-top: 1px solid #e5e7eb; margin: 5px 0; }
                .lbl { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #8e9eab; letter-spacing: .4px; margin-bottom: 1px; }
                .val { font-size: 8.5px; font-weight: 600; color: #191c1e; }
                .sub { font-size: 7.5px; color: #556067; margin-top: 1px; line-height: 1.4; }
                .th { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #556067; padding: 3px 4px; border-bottom: 1.5px solid #d1d5db; white-space: nowrap; }
                .td { border-bottom: 1px solid #f2f4f7; vertical-align: middle; padding: 3px 4px; }
                .totals-row { display: flex; justify-content: flex-end; gap: 40px; font-size: 8px; color: #556067; padding: 1.5px 0; }
                .grand { display: flex; justify-content: flex-end; gap: 40px; font-size: 10px; font-weight: 800; color: #006d2f; padding-top: 4px; border-top: 1.5px solid #006d2f; margin-top: 3px; }
                @media print {
                    @page { size: A5 portrait; margin: 6mm; }
                    body { background: #fff; }
                    .no-print { display: none !important; }
                    .page { width: 100%; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
                }
            `}</style>
        </>
    );
};

export default OrderBill;
