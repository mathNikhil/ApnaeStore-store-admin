import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storeAdminAPI } from '../services/api';

const CombinedInvoice = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [orders, setOrders] = useState([]);
    const [storeInfo, setStoreInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [printMode, setPrintMode] = useState('a4'); // 'a4' | 'thermal'

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) { navigate(`/login${window.location.search}`); return; }
        const storeId = localStorage.getItem('currentStoreId');
        if (!storeId) { setLoading(false); return; }

        const params = new URLSearchParams(location.search);
        const ids = (params.get('ids') || '').split(',').filter(Boolean);
        if (ids.length === 0) { setLoading(false); return; }

        const fetchAll = async () => {
            try {
                // Fetch all selected orders in parallel
                const results = await Promise.all(ids.map(id => storeAdminAPI.getOrder(storeId, id)));
                const fetched = results.filter(r => r.success).map(r => r.data);
                setOrders(fetched);

                // Fetch full store config via authenticated admin API (has profile, cart, brand)
                const urlParams = new URLSearchParams(location.search);
                const hostname = window.location.hostname;
                const hostnameSubdomain = hostname.includes('.aapnaestore.com') ? hostname.split('.')[0] : null;
                const subdomain = urlParams.get('subdomain') || urlParams.get('store') || hostnameSubdomain;
                const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';
                const adminToken = urlParams.get('t') || localStorage.getItem('storeAdminToken');
                const adminStoreId = urlParams.get('storeId') || storeId;
                if (adminStoreId && adminToken) {
                    const res = await fetch(`${API}/api/stores/${adminStoreId}`, {
                        headers: { Authorization: `Bearer ${adminToken}` }
                    });
                    const storeResult = await res.json();
                    if (storeResult?.success && storeResult.data) {
                        setStoreInfo(storeResult.data);
                    } else if (subdomain) {
                        // Fallback to public API
                        const pubRes = await fetch(`${API}/api/public/store/${subdomain}`);
                        const pubData = await pubRes.json();
                        if (pubData?.success) setStoreInfo(pubData.data);
                    }
                } else if (subdomain) {
                    const res = await fetch(`${API}/api/public/store/${subdomain}`);
                    const storeResult = await res.json();
                    if (storeResult?.success) setStoreInfo(storeResult.data);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchAll();
    }, []);

    // No auto-print — user picks A4 or Thermal before printing

    if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:16, color:'#666' }}>Loading orders...</div>;
    if (orders.length === 0) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:16, color:'#666' }}>No orders found.</div>;

    // Store config — declared here so both thermal and A4 views can use them
    const storeName    = storeInfo?.config?.brand?.storeName || storeInfo?.store_name || localStorage.getItem('currentStoreName') || 'Store';
    const storePhone   = storeInfo?.config?.profile?.officeNumber || '';
    const storeEmail   = storeInfo?.config?.profile?.supportEmail || '';
    const storeAddress = storeInfo?.config?.profile?.storeAddress || '';
    const storeLogo    = storeInfo?.config?.brand?.logoUrl || null;
    const storeGST     = storeInfo?.config?.cart?.gstNumber || '';
    const storeFSSAI   = storeInfo?.config?.cart?.fssaiLicence || storeInfo?.config?.profile?.fssaiLicence || storeInfo?.config?.profile?.fssaiLicense || '';
    const storePAN     = storeInfo?.config?.cart?.panNumber || storeInfo?.config?.profile?.panNumber || '';
    const hsnCode      = storeInfo?.config?.cart?.hsnCode || '';
    const storeState   = storeInfo?.config?.cart?.storeState || storeInfo?.config?.profile?.state || '';
    const enableGST    = storeInfo?.config?.cart?.enableGST || false;
    const gstRate      = parseFloat(storeInfo?.config?.cart?.gstRate || 0);

    // Combined invoice number and date
    const invoiceNo   = `CINV-${Date.now().toString().slice(-8)}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

    // Customer info — use the first order's customer as the primary
    const primaryOrder  = orders[0];
    const customerName  = primaryOrder.customer_name || primaryOrder.customer_phone || 'Customer';
    const customerPhone = primaryOrder.customer_phone || '';
    const customerEmail = primaryOrder.customer_email || '';
    // Collect unique staff names across all orders — check all possible API field names
    // Log order keys to console so we can find the correct field name
    if (orders.length > 0) {
        console.log('[CombinedInvoice] order keys:', Object.keys(orders[0]));
        console.log('[CombinedInvoice] order staff fields:', {
            staff_name: orders[0].staff_name,
            assigned_staff_name: orders[0].assigned_staff_name,
            staffName: orders[0].staffName,
            assignedStaff: orders[0].assignedStaff,
            staff: orders[0].staff,
            assigned_to: orders[0].assigned_to,
            handler: orders[0].handler,
        });
    }
    const staffNames = [...new Set(orders.map(o =>
        o.staff_name || o.assigned_staff_name || o.staffName || o.assignedStaff ||
        o.assigned_to || o.handler ||
        (o.staff && (o.staff.name || o.staff.staff_name || o.staff.full_name)) || ''
    ).filter(Boolean))];
    const staffLabel = staffNames.join(', ');

    // Flatten all items from all orders, tagged with order ID
    const allItems = orders.flatMap(o =>
        (Array.isArray(o.items) ? o.items : []).map(item => ({
            ...item,
            _orderId: (o.order_id || o.id || '').slice(-8).toUpperCase(),
        }))
    );

    // ── Thermal view ─────────────────────────────────────────────────────────
    if (printMode === 'thermal') {
        const thermalGstRate  = parseFloat(storeInfo?.config?.cart?.gstRate || 0);
        const thermalEnableGST = storeInfo?.config?.cart?.enableGST || false;
        const thermalSubtotal = allItems.reduce((s, i) => s + parseFloat(i.price || 0) * parseInt(i.quantity || 1), 0);
        const thermalGstAmt = thermalEnableGST ? allItems.reduce((sum, i) => {
            const rate = i.gstRate != null ? parseFloat(i.gstRate) : thermalGstRate;
            const lineTotal = parseFloat(i.price || 0) * parseInt(i.quantity || 1);
            return sum + (rate > 0 ? lineTotal - lineTotal / (1 + rate / 100) : 0);
        }, 0) : 0;
        const thermalDelivery = orders.reduce((s, o) => s + parseFloat(o.delivery_charge || 0), 0);
        const thermalDiscount = orders.reduce((s, o) => s + parseFloat(o.discount_amount || 0), 0);
        const thermalTotal    = thermalSubtotal + thermalGstAmt + thermalDelivery - thermalDiscount;
        const line = '--------------------------------';
        return (
            <>
                <style>{`@page { margin: 0; size: 80mm auto; } body { margin: 0; } @media print { body { width: 80mm; } .no-print { display: none; } }`}</style>
                <div className="no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', background:'#fff', borderBottom:'1px solid #e0e3e6', position:'sticky', top:0, zIndex:100 }}>
                    <button onClick={() => navigate(-1)} style={{ padding:'7px 16px', background:'#f0f2f5', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>← Back</button>
                    <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => setPrintMode('a4')} style={{ padding:'7px 16px', background:'#f0f2f5', border:'1px solid #ccc', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>📄 A4 Invoice</button>
                        <button onClick={() => window.print()} style={{ padding:'7px 22px', background:'#191c1e', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 }}>🖨️ Print Thermal</button>
                    </div>
                </div>
                <div style={{ width:'80mm', fontFamily:'monospace', fontSize:'12px', padding:'4mm', boxSizing:'border-box', background:'#fff', margin:'0 auto' }}>
                    <div style={{ textAlign:'center', fontWeight:'bold', fontSize:'16px', marginBottom:2 }}>{storeName}</div>
                    {storePhone && <div style={{ textAlign:'center', fontSize:'11px' }}>Tel: {storePhone}</div>}
                    {storeAddress && <div style={{ textAlign:'center', fontSize:'11px', marginBottom:2 }}>{storeAddress}</div>}
                    {storeGST   && <div style={{ textAlign:'center', fontSize:'11px' }}>GSTIN: {storeGST}</div>}
                    {storeFSSAI && <div style={{ textAlign:'center', fontSize:'11px' }}>FSSAI: {storeFSSAI}</div>}
                    <div style={{ textAlign:'center', fontSize:'11px', marginTop:4 }}>{line}</div>
                    <div style={{ fontSize:'11px', fontWeight:'bold', textAlign:'center', marginTop:4 }}>COMBINED BILL — {orders.length} ORDERS</div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginTop:4 }}>
                        <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                        <span>{new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                    <div style={{ fontSize:'11px' }}>Customer: {customerName}</div>
                    {customerPhone && <div style={{ fontSize:'11px' }}>Mobile: {customerPhone}</div>}
                    {staffLabel && <div style={{ fontSize:'11px' }}>Staff: {staffLabel}</div>}
                    <div style={{ fontSize:'11px', marginTop:2 }}>
                        Orders: {orders.map(o => '#' + (o.order_id || o.id || '').slice(-8)).join(', ')}
                    </div>
                    <div style={{ textAlign:'center', fontSize:'11px', marginTop:4 }}>{line}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'11px', marginTop:4 }}>
                        <span style={{ flex:1 }}>Item</span>
                        <span style={{ width:30, textAlign:'center' }}>Qty</span>
                        <span style={{ width:60, textAlign:'right' }}>Amt</span>
                    </div>
                    <div style={{ fontSize:'11px' }}>{line}</div>
                    {allItems.map((item, i) => (
                        <div key={i} style={{ marginTop:3 }}>
                            <div style={{ fontSize:'11px' }}>
                                {item.name || item.product_name || 'Product'}
                                <span style={{ fontSize:'10px', color:'#666' }}> [#{item._orderId}]</span>
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}>
                                <span style={{ flex:1 }}>@ Rs.{parseFloat(item.price || 0).toFixed(2)}</span>
                                <span style={{ width:30, textAlign:'center' }}>{item.quantity || 1}</span>
                                <span style={{ width:60, textAlign:'right' }}>Rs.{(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                    <div style={{ fontSize:'11px', marginTop:4 }}>{line}</div>
                    <div style={{ fontSize:'11px', marginTop:2 }}>
                        <div style={{ display:'flex', justifyContent:'space-between' }}><span>Subtotal</span><span>Rs.{thermalSubtotal.toFixed(2)}</span></div>
                        {thermalEnableGST && thermalGstAmt > 0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span>GST</span><span>Rs.{thermalGstAmt.toFixed(2)}</span></div>}
                        {thermalDelivery > 0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span>Delivery</span><span>Rs.{thermalDelivery.toFixed(2)}</span></div>}
                        {thermalDiscount > 0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span>Discount</span><span>-Rs.{thermalDiscount.toFixed(2)}</span></div>}
                    </div>
                    <div style={{ fontSize:'11px' }}>{line}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'14px', marginTop:2 }}>
                        <span>TOTAL</span><span>Rs.{thermalTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize:'11px' }}>{line}</div>
                    <div style={{ textAlign:'center', fontSize:'11px', marginTop:4 }}>Thank you!</div>
                    <div style={{ textAlign:'center', fontSize:'10px', marginTop:2, marginBottom:8 }}>Powered by AapnaEstore</div>
                </div>
            </>
        );
    }

    // Totals
    const hasPerItemHSN = allItems.some(i => i.hsnCode && String(i.hsnCode).trim() !== '');
    const itemsSubtotal = allItems.reduce((sum, i) => sum + Number(i.price || i.unit_price || 0) * Number(i.quantity || i.qty || 1), 0);
    const itemsTaxTotal = enableGST ? allItems.reduce((sum, i) => {
        const rate = i.gstRate != null ? parseFloat(i.gstRate) : gstRate;
        const lineTotal = Number(i.price || i.unit_price || 0) * Number(i.quantity || i.qty || 1);
        const taxable = rate > 0 ? lineTotal / (1 + rate / 100) : lineTotal;
        return sum + (rate > 0 ? lineTotal - taxable : 0);
    }, 0) : 0;
    const taxableAmt = (itemsSubtotal - itemsTaxTotal).toFixed(2);
    const cgstAmt    = enableGST && itemsTaxTotal > 0 ? (itemsTaxTotal / 2).toFixed(2) : '0.00';
    const sgstAmt    = cgstAmt;

    // Delivery + discount totals across all orders
    const totalDelivery = orders.reduce((sum, o) => sum + parseFloat(o.delivery_charge || 0), 0);
    const totalDiscount = orders.reduce((sum, o) => sum + parseFloat(o.discount_amount || 0), 0);
    const grandTotal = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

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

    return (
        <>
            <style>{`
                @page { size: A4; margin: 10mm 12mm; }
                * { box-sizing: border-box; }
                body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #191c1e; background: #fff; }
                @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                .page { max-width: 780px; margin: 0 auto; padding: 8px 0; }
                .divider { border: none; border-top: 1px solid #e0e3e6; margin: 5px 0; }
                .divider-dark { border: none; border-top: 2px solid #191c1e; margin: 5px 0; }
                .lbl { font-size: 7px; color: #8e9eab; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }
                .val { font-size: 9px; font-weight: 600; color: #191c1e; }
                .sub { font-size: 8px; color: #556067; margin-top: 1px; }
                .th { padding: 6px 8px; background: #f8f9fa; font-size: 7.5px; color: #556067; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #e0e3e6; border-right: 1px solid #f0f0f0; }
                .td { padding: 6px 8px; border-bottom: 1px solid #f2f4f7; border-right: 1px solid #f5f5f5; vertical-align: middle; font-size: 8.5px; }
                .totals-row { display: flex; justify-content: space-between; padding: 3px 8px; font-size: 8.5px; }
                .totals-row-bold { display: flex; justify-content: space-between; padding: 5px 8px; font-size: 10px; font-weight: 700; border-top: 2px solid #191c1e; margin-top: 3px; }
                .order-tag { display: inline-block; padding: 1px 5px; border-radius: 3px; background: #e8f5e9; color: #006d2f; font-size: 7px; font-weight: 700; margin-left: 4px; }
            `}</style>

            {/* Action bar */}
            <div className="no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', background:'#fff', borderBottom:'1px solid #e0e3e6', position:'sticky', top:0, zIndex:100 }}>
                <button onClick={() => navigate(-1)} style={{ padding:'7px 16px', background:'#f0f2f5', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>← Back</button>
                <div style={{ fontSize:13, color:'#556067', fontWeight:600 }}>
                    Combined Invoice — {orders.length} orders merged
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setPrintMode('thermal')} style={{ padding:'7px 16px', background:'#f0f2f5', border:'1px solid #ccc', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>🧾 Thermal Print</button>
                    <button onClick={() => window.print()} style={{ padding:'7px 22px', background:'#191c1e', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:13 }}>🖨️ Print A4 Invoice</button>
                </div>
            </div>

            <div className="page">
                {/* HEADER */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                    {storeLogo && <img src={storeLogo} alt={storeName} style={{ height:40, width:40, objectFit:'contain', flexShrink:0 }} />}
                    <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:800, lineHeight:1.2 }}>{storeName}</div>
                        <div style={{ fontSize:8, color:'#556067', marginTop:2, lineHeight:1.6 }}>
                            {storeAddress && <>{storeAddress}<br/></>}
                            {storePhone && <>📞 {storePhone}&nbsp;&nbsp;</>}{storeEmail && <>✉ {storeEmail}<br/></>}
                            {storeGST    && <>GSTIN: {storeGST}&nbsp;&nbsp;</>}{storePAN && <>PAN: {storePAN}</>}
                            {storeFSSAI  && <><br/>FSSAI Lic. No.: {storeFSSAI}</>}
                        </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:'#191c1e' }}>COMBINED TAX INVOICE</div>
                        <div style={{ fontSize:7.5, color:'#8e9eab', marginTop:2 }}>Original for Recipient</div>
                        <div style={{ fontSize:7.5, color:'#006d2f', marginTop:2, fontWeight:600 }}>
                            {orders.length} Orders Merged
                        </div>
                    </div>
                </div>

                <hr className="divider-dark" />

                {/* META GRID */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px 10px', marginBottom:5 }}>
                    <div>
                        <div className="lbl">Invoice No.</div>
                        <div className="val">{invoiceNo}</div>
                        <div className="sub">Orders: {orders.map(o => '#' + (o.order_id || o.id || '').slice(-8)).join(', ')}</div>
                    </div>
                    <div>
                        <div className="lbl">Invoice Date</div>
                        <div className="val">{invoiceDate}</div>
                    </div>
                    <div>
                        <div className="lbl">Place of Supply</div>
                        <div className="val">{storeState || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="lbl">Payment Methods</div>
                        <div className="val" style={{ fontSize:8 }}>
                            {[...new Set(orders.map(o => o.payment_method === 'cod' ? 'Cash on Delivery' : o.payment_method === 'upi' ? 'UPI' : o.payment_method || 'N/A'))].join(', ')}
                        </div>
                    </div>
                    <div>
                        <div className="lbl">Order Statuses</div>
                        <div className="val" style={{ fontSize:8, textTransform:'uppercase' }}>
                            {[...new Set(orders.map(o => (o.status || '').replace(/_/g, ' ')))].join(', ')}
                        </div>
                    </div>
                    <div>
                        <div className="lbl">Reverse Charge</div>
                        <div className="val">No</div>
                    </div>
                </div>

                <hr className="divider" />

                {/* BILL TO */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, margin:'5px 0' }}>
                    <div>
                        <div className="lbl">Bill To</div>
                        <div className="val">{customerName}</div>
                        {customerPhone && <div className="sub">📞 {customerPhone}</div>}
                        {customerEmail && <div className="sub">✉ {customerEmail}</div>}
                        {staffLabel && (
                            <div style={{ marginTop:4, fontSize:8, fontWeight:700, color:'#006d2f' }}>👤 Staff: {staffLabel}</div>
                        )}
                    </div>
                    <div>
                        <div className="lbl">Order References</div>
                        {orders.map((o, i) => (
                            <div key={i} className="sub" style={{ marginTop: i === 0 ? 0 : 2 }}>
                                #{(o.order_id || o.id || '').slice(-8)} — {new Date(o.created_at).toLocaleDateString('en-IN')}
                                {o.order_type && <span style={{ marginLeft:4, padding:'1px 4px', borderRadius:3, background:'#f0f2f5', color:'#556067', fontSize:7 }}>
                                    {o.order_type === 'dine_in' ? '🍽️ Dine In' : o.order_type === 'takeaway' ? '🥡 Takeaway' : '🚚 Delivery'}
                                </span>}
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="divider" />

                {/* ITEMS TABLE — Item | Qty | Price (excl tax) | CGST | SGST | Total (incl tax) */}
                <table style={{ width:'100%', borderCollapse:'collapse', marginTop:4 }}>
                    <thead>
                        <tr>
                            <th className="th" style={{ textAlign:'left' }}>Item</th>
                            <th className="th" style={{ textAlign:'center' }}>Qty</th>
                            <th className="th" style={{ textAlign:'right' }}>Price</th>
                            {enableGST && <th className="th" style={{ textAlign:'right' }}>CGST</th>}
                            {enableGST && <th className="th" style={{ textAlign:'right' }}>SGST</th>}
                            <th className="th" style={{ textAlign:'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allItems.length > 0 ? allItems.map((item, idx) => {
                            // price from API is GST-inclusive; extract tax from it
                            const itemGstRate  = item.gstRate != null ? parseFloat(item.gstRate) : gstRate;
                            const qty          = Number(item.quantity || item.qty || 1);
                            const inclusiveTotal = Number(item.price || item.unit_price || 0) * qty;
                            // taxable base = inclusive / (1 + rate/100)
                            const taxableBase  = enableGST && itemGstRate > 0 ? inclusiveTotal / (1 + itemGstRate / 100) : inclusiveTotal;
                            const totalTax     = inclusiveTotal - taxableBase;
                            const itemCgst     = (totalTax / 2).toFixed(2);
                            const itemSgst     = itemCgst;
                            const unitExcl     = taxableBase / qty; // per-unit excl price for display
                            return (
                                <tr key={idx} style={{ borderBottom:'1px solid #f2f4f7' }}>
                                    <td className="td">
                                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                            {(item.image || item.product_image) &&
                                                <img src={item.image || item.product_image} alt={item.name} style={{ width:22, height:22, objectFit:'cover', borderRadius:3, flexShrink:0 }} />
                                            }
                                            <span style={{ fontSize:8.5 }}>{item.name || item.product_name || 'Item'}</span>
                                        </div>
                                    </td>
                                    <td className="td" style={{ textAlign:'center', fontSize:8.5 }}>{qty}</td>
                                    <td className="td" style={{ textAlign:'right', fontSize:8.5 }}>₹{unitExcl.toFixed(2)}</td>
                                    {enableGST && <td className="td" style={{ textAlign:'right', fontSize:'7.5px', color:'#556067' }}>{itemGstRate/2}%<br/>₹{itemCgst}</td>}
                                    {enableGST && <td className="td" style={{ textAlign:'right', fontSize:'7.5px', color:'#556067' }}>{itemGstRate/2}%<br/>₹{itemSgst}</td>}
                                    <td className="td" style={{ textAlign:'right', fontSize:8.5, fontWeight:700 }}>₹{inclusiveTotal.toFixed(2)}</td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={6} style={{ padding:'8px', textAlign:'center', color:'#999', fontSize:12 }}>No items</td></tr>
                        )}
                    </tbody>
                </table>

                {/* TOTALS — Before Tax → CGST → SGST → Delivery → Grand Total */}
                <div style={{ marginTop:6, maxWidth:260, marginLeft:'auto' }}>
                    <div className="totals-row"><span>Before Tax Total</span><span>₹{(itemsSubtotal - itemsTaxTotal).toFixed(2)}</span></div>
                    {enableGST && itemsTaxTotal > 0 && (
                        <>
                            <div className="totals-row">
                                <span>CGST{gstRate > 0 ? ` @ ${gstRate/2}%` : ''}</span>
                                <span>₹{cgstAmt}</span>
                            </div>
                            <div className="totals-row">
                                <span>SGST{gstRate > 0 ? ` @ ${gstRate/2}%` : ''}</span>
                                <span>₹{sgstAmt}</span>
                            </div>
                        </>
                    )}
                    {totalDelivery > 0 && <div className="totals-row"><span>Delivery Charges</span><span>₹{totalDelivery.toFixed(2)}</span></div>}
                    {totalDiscount > 0 && <div className="totals-row" style={{ color:'#16a34a' }}><span>Discount</span><span>−₹{totalDiscount.toFixed(2)}</span></div>}
                    <div className="totals-row-bold"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                </div>

                {/* Amount in words */}
                <div style={{ marginTop:6, padding:'5px 8px', background:'#f8f9fa', borderRadius:4, fontSize:8, color:'#556067' }}>
                    <strong>Amount in Words:</strong> {amountInWords(grandTotal)}
                </div>

                {/* Per-order breakdown */}
                <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:8, fontWeight:700, color:'#556067', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Order-wise Breakdown</div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:8 }}>
                        <thead>
                            <tr>
                                <th className="th" style={{ textAlign:'left' }}>Order ID</th>
                                <th className="th" style={{ textAlign:'left' }}>Date</th>
                                <th className="th" style={{ textAlign:'left' }}>Type</th>
                                <th className="th" style={{ textAlign:'left' }}>Payment</th>
                                <th className="th" style={{ textAlign:'left' }}>Status</th>
                                <th className="th" style={{ textAlign:'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o, i) => (
                                <tr key={i}>
                                    <td className="td" style={{ fontWeight:700 }}>#{(o.order_id || o.id || '').slice(-8)}</td>
                                    <td className="td">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                                    <td className="td" style={{ textTransform:'capitalize' }}>{(o.order_type || '').replace('_',' ') || '—'}</td>
                                    <td className="td" style={{ textTransform:'uppercase' }}>{o.payment_method || '—'}</td>
                                    <td className="td" style={{ textTransform:'uppercase' }}>{(o.status || '').replace(/_/g,' ')}</td>
                                    <td className="td" style={{ textAlign:'right', fontWeight:700 }}>₹{Number(o.total_amount || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'flex-end', fontSize:8, color:'#8e9eab', borderTop:'1px solid #e0e3e6', paddingTop:8 }}>
                    <div>This is a computer-generated combined invoice. No signature required.</div>
                    <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:600, color:'#191c1e', fontSize:9, marginBottom:2 }}>Authorised Signatory</div>
                        <div>{storeName}</div>
                    </div>
                </div>
                <div style={{ textAlign:'center', fontSize:7, color:'#c0c8cc', marginTop:8 }}>Powered by AapnaEstore</div>
            </div>
        </>
    );
};

export default CombinedInvoice;
