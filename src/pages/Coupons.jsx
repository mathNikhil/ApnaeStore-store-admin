// v3
import React, { useState, useEffect, useCallback } from 'react';
import { storeAdminAPI } from '../services/api';
import Sidebar from '../components/Sidebar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';
const getToken = () => localStorage.getItem('storeAdminToken');

/* ─── helpers ─────────────────────────────────────────────── */
function statusBadge(status) {
    const map = {
        scheduled: { bg: '#eff6ff', color: '#1d4ed8', label: 'Scheduled' },
        active:    { bg: '#f0fdf4', color: '#15803d', label: 'Active' },
        expired:   { bg: '#fef2f2', color: '#b91c1c', label: 'Expired' },
        disabled:  { bg: '#f8fafc', color: '#64748b', label: 'Disabled' },
    };
    const s = map[status] || map.disabled;
    return (
        <span style={{
            background: s.bg, color: s.color,
            padding: '2px 10px', borderRadius: '12px',
            fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap'
        }}>{s.label}</span>
    );
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
}

function fmtDiscount(row) {
    if (row.unit === 'percent')       return `${row.value}% off`;
    if (row.unit === 'flat')          return `₹${row.value} off`;
    if (row.unit === 'free_shipping') return 'Free Shipping';
    if (row.unit === 'buy_x_get_y') {
        const bxgy = row.buy_x_get_y;
        if (bxgy) return `Buy ${bxgy.buy_qty} Get ${bxgy.get_qty}`;
        return 'Buy X Get Y';
    }
    return row.unit;
}

function autoCode(len = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const EMPTY_FORM = {
    name: '', type: 'coupon', code: '', codeMode: 'auto',
    unit: 'percent', value: '', buy_qty: '2', get_qty: '1',
    min_order_value: '', max_uses: '',
    scope: 'full_store', scope_items: [], get_items: [],
    start_at: '', end_at: '',
    applicable_to: 'both',
};

/* ─── main component ──────────────────────────────────────── */
const Coupons = () => {
    const [storeId, setStoreId] = useState(null);
    const [rows, setRows]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter]   = useState('all');
    const [search, setSearch]   = useState('');

    // Drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editId, setEditId]         = useState(null);
    const [form, setForm]             = useState(EMPTY_FORM);
    const [saving, setSaving]         = useState(false);
    const [formErr, setFormErr]       = useState('');

    // Product/category catalog for scope selector
    const [catalogProducts, setCatalogProducts] = useState([]);
    const [catalogCategories, setCatalogCategories] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [expandedProduct, setExpandedProduct] = useState(null);
    const [catalogSearchGet, setCatalogSearchGet] = useState('');
    const [expandedProductGet, setExpandedProductGet] = useState(null);

    // Confirm delete
    const [deleteId, setDeleteId] = useState(null);

    /* load storeId */
    useEffect(() => {
        const id = localStorage.getItem('currentStoreId');
        if (id) setStoreId(id);
    }, []);

    /* fetch coupons */
    const fetchCoupons = useCallback(async (sid) => {
        setLoading(true);
        try {
            const res = await storeAdminAPI.getCoupons(sid, search ? { search } : {});
            if (res.success) setRows(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => {
        if (storeId) fetchCoupons(storeId);
    }, [storeId, fetchCoupons]);

    /* filtered rows */
    const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter);

    /* open drawer */
    const openCreate = () => {
        setEditId(null);
        setForm({ ...EMPTY_FORM, code: autoCode() });
        setFormErr('');
        setCatalogSearch('');
        setCatalogSearchGet('');
        setExpandedProduct(null);
        setExpandedProductGet(null);
        setDrawerOpen(true);
    };

    const openEdit = (row) => {
        setEditId(row.id);
        setForm({
            name: row.name,
            type: row.type,
            code: row.code,
            codeMode: 'manual',
            unit: row.unit,
            value: row.value ?? '',
            buy_qty: row.buy_x_get_y?.buy_qty ?? '2',
            get_qty: row.buy_x_get_y?.get_qty ?? '1',
            min_order_value: row.min_order_value ?? '',
            max_uses: row.max_uses ?? '',
            scope: row.unit === 'buy_x_get_y' ? 'product' : row.scope,
            scope_items: row.scope_items ?? [],
            get_items: row.get_items ?? [],
            start_at: row.start_at ? row.start_at.slice(0, 16) : '',
            end_at:   row.end_at   ? row.end_at.slice(0, 16)   : '',
            applicable_to: row.applicable_to ?? 'both',
        });
        setFormErr('');
        setCatalogSearch('');
        setCatalogSearchGet('');
        setExpandedProduct(null);
        setExpandedProductGet(null);
        setDrawerOpen(true);
    };

    /* fetch product catalog from inventory (store-admin-authenticated) */
    const fetchCatalog = useCallback(async (sid) => {
        if (!sid) return;
        setCatalogLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/store/${sid}/inventory`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();
            const rows = data.inventory || data.data || [];
            if (Array.isArray(rows) && rows.length > 0) {
                // Group into: { id, name, category, image, variations:[{ variationId, variationName, image, sizes:[{sizeId,sizeLabel,inventoryId}] }] }
                const productMap = {};
                for (const row of rows) {
                    const pid = row.product_id;
                    if (!productMap[pid]) {
                        productMap[pid] = {
                            id: pid,
                            name: row.product_name,
                            category: row.category_name,
                            image: row.image_url || null,
                            variations: {},
                        };
                    }
                    // Use first image found for the product
                    if (!productMap[pid].image && row.image_url) productMap[pid].image = row.image_url;
                    const vid = row.variation_id;
                    if (!productMap[pid].variations[vid]) {
                        productMap[pid].variations[vid] = {
                            variationId: vid,
                            variationName: row.variation_name,
                            image: row.image_url || null,
                            sizes: [],
                        };
                    }
                    productMap[pid].variations[vid].sizes.push({
                        sizeId: row.size_id,
                        sizeLabel: row.size_label || 'Default',
                        inventoryId: row.id,
                        price: row.price,
                    });
                }
                const products = Object.values(productMap).map(p => ({
                    ...p,
                    variations: Object.values(p.variations),
                }));
                setCatalogProducts(products);
                const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
                setCatalogCategories(cats);
            }
        } catch (e) { console.error('catalog fetch failed', e); }
        finally { setCatalogLoading(false); }
    }, []);

    useEffect(() => {
        if (storeId) fetchCatalog(storeId);
    }, [storeId, fetchCatalog]);

    /* form field helper */
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    /* toggle a scope_item (any string key: pid, category, or pid:vid:sid) */
    const toggleScopeItem = (item) => {
        setForm(f => {
            const existing = f.scope_items || [];
            return {
                ...f,
                scope_items: existing.includes(item)
                    ? existing.filter(i => i !== item)
                    : [...existing, item],
            };
        });
    };

    /* check if ALL sizes of a variation are selected */
    const isVariationFullySelected = (pid, variation) => {
        const items = form.scope_items || [];
        return variation.sizes.every(s => items.includes(`${pid}:${variation.variationId}:${s.sizeId}`));
    };

    /* toggle all sizes of a variation at once */
    const toggleVariation = (pid, variation) => {
        const allKeys = variation.sizes.map(s => `${pid}:${variation.variationId}:${s.sizeId}`);
        const allSelected = isVariationFullySelected(pid, variation);
        setForm(f => {
            const existing = f.scope_items || [];
            return {
                ...f,
                scope_items: allSelected
                    ? existing.filter(i => !allKeys.includes(i))
                    : [...new Set([...existing, ...allKeys])],
            };
        });
    };

    /* check if ALL variants+sizes of a product are selected */
    const isProductFullySelected = (product) => {
        const items = form.scope_items || [];
        return product.variations.every(v =>
            v.sizes.every(s => items.includes(`${product.id}:${v.variationId}:${s.sizeId}`))
        );
    };

    /* toggle entire product */
    const toggleProduct = (product) => {
        const allKeys = product.variations.flatMap(v =>
            v.sizes.map(s => `${product.id}:${v.variationId}:${s.sizeId}`)
        );
        const allSelected = isProductFullySelected(product);
        setForm(f => {
            const existing = f.scope_items || [];
            return {
                ...f,
                scope_items: allSelected
                    ? existing.filter(i => !allKeys.includes(i))
                    : [...new Set([...existing, ...allKeys])],
            };
        });
    };

    /* ── get_items toggle helpers (for "get free" product picker) ── */
    const toggleGetItem = (item) => {
        setForm(f => {
            const existing = f.get_items || [];
            return {
                ...f,
                get_items: existing.includes(item)
                    ? existing.filter(i => i !== item)
                    : [...existing, item],
            };
        });
    };

    const isGetVariationFullySelected = (pid, variation) => {
        const items = form.get_items || [];
        return variation.sizes.every(s => items.includes(`${pid}:${variation.variationId}:${s.sizeId}`));
    };

    const toggleGetVariation = (pid, variation) => {
        const allKeys = variation.sizes.map(s => `${pid}:${variation.variationId}:${s.sizeId}`);
        const allSelected = isGetVariationFullySelected(pid, variation);
        setForm(f => {
            const existing = f.get_items || [];
            return {
                ...f,
                get_items: allSelected
                    ? existing.filter(i => !allKeys.includes(i))
                    : [...new Set([...existing, ...allKeys])],
            };
        });
    };

    const isGetProductFullySelected = (product) => {
        const items = form.get_items || [];
        return product.variations.every(v =>
            v.sizes.every(s => items.includes(`${product.id}:${v.variationId}:${s.sizeId}`))
        );
    };

    const toggleGetProduct = (product) => {
        const allKeys = product.variations.flatMap(v =>
            v.sizes.map(s => `${product.id}:${v.variationId}:${s.sizeId}`)
        );
        const allSelected = isGetProductFullySelected(product);
        setForm(f => {
            const existing = f.get_items || [];
            return {
                ...f,
                get_items: allSelected
                    ? existing.filter(i => !allKeys.includes(i))
                    : [...new Set([...existing, ...allKeys])],
            };
        });
    };

    /* save */
    const handleSave = async () => {
        setFormErr('');
        if (!form.name.trim())  return setFormErr('Name is required');
        if (form.codeMode === 'manual' && !form.code.trim()) return setFormErr('Code is required');
        if (!form.start_at)     return setFormErr('Start date is required');
        if (!form.end_at)       return setFormErr('End date is required');
        if (new Date(form.end_at) <= new Date(form.start_at))
            return setFormErr('End date must be after start date');

        const code = form.codeMode === 'auto' ? autoCode() : form.code.trim().toUpperCase();

        const isBXGY = form.unit === 'buy_x_get_y';
        const payload = {
            name:            form.name.trim(),
            type:            form.type,
            code,
            unit:            form.unit,
            value:           !isBXGY && form.unit !== 'free_shipping'
                               ? parseFloat(form.value) || 0 : 0,
            buy_x_get_y:     isBXGY
                               ? { buy_qty: parseInt(form.buy_qty), get_qty: parseInt(form.get_qty) }
                               : null,
            min_order_value: parseFloat(form.min_order_value) || 0,
            max_uses:        form.max_uses !== '' ? parseInt(form.max_uses) : null,
            // For Buy X Get Y, scope is always 'product'
            scope:           isBXGY ? 'product' : form.scope,
            scope_items:     form.scope_items,
            // get_items: which products are given free; empty = same as scope_items
            get_items:       isBXGY ? (form.get_items || []) : [],
            start_at:        new Date(form.start_at).toISOString(),
            end_at:          new Date(form.end_at).toISOString(),
            applicable_to:   form.applicable_to || 'both',
        };

        setSaving(true);
        try {
            let res;
            if (editId) {
                res = await storeAdminAPI.updateCoupon(storeId, editId, payload);
            } else {
                res = await storeAdminAPI.createCoupon(storeId, payload);
            }
            if (res.success) {
                setDrawerOpen(false);
                fetchCoupons(storeId);
            } else {
                setFormErr(res.error || 'Save failed');
            }
        } catch (e) {
            setFormErr(e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    /* disable */
    const handleDisable = async (id) => {
        await storeAdminAPI.disableCoupon(storeId, id);
        fetchCoupons(storeId);
    };

    /* delete */
    const handleDelete = async (id) => {
        await storeAdminAPI.deleteCoupon(storeId, id);
        setDeleteId(null);
        fetchCoupons(storeId);
    };

    /* ─── render ─────────────────────────────────────────── */
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            <Sidebar />
            <div style={{ flex: 1, marginLeft: '260px', padding: '32px', minWidth: 0 }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Coupons & Promos</h1>
                        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
                            Create discount codes and promotional offers for your customers
                        </p>
                    </div>
                    <button onClick={openCreate} style={btnPrimary}>+ Create New</button>
                </div>

                {/* Filter tabs + search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['all','active','scheduled','expired','disabled'].map(s => (
                            <button key={s} onClick={() => setFilter(s)}
                                style={{
                                    padding: '6px 14px', borderRadius: '20px', border: '1px solid',
                                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                    borderColor: filter === s ? '#006d2f' : '#e2e8f0',
                                    background:  filter === s ? '#006d2f' : '#fff',
                                    color:       filter === s ? '#fff'    : '#64748b',
                                }}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or code…"
                        style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '220px', outline: 'none' }}
                    />
                </div>

                {/* Table */}
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎟️</div>
                            <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>No coupons yet</div>
                            <div style={{ fontSize: '13px' }}>Create your first coupon or promo to start driving sales</div>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    {['Name','Type','Code','Discount','Min Order','Usage','Scope','Start','Expiry','Status',''].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(row => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={td}>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{row.name}</div>
                                        </td>
                                        <td style={td}>
                                            <span style={{
                                                fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                                                background: row.type === 'coupon' ? '#f0f9ff' : '#fdf4ff',
                                                color:      row.type === 'coupon' ? '#0369a1' : '#7c3aed',
                                            }}>{row.type === 'coupon' ? 'Coupon' : 'Promo'}</span>
                                        </td>
                                        <td style={td}>
                                            <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#1e293b', letterSpacing: '1px' }}>{row.code}</code>
                                        </td>
                                        <td style={td}>{fmtDiscount(row)}</td>
                                        <td style={td}>{row.min_order_value > 0 ? `₹${row.min_order_value}` : '—'}</td>
                                        <td style={td}>
                                            {row.max_uses
                                                ? <span>{row.current_uses}/{row.max_uses}</span>
                                                : <span style={{ color: '#94a3b8' }}>{row.current_uses} / ∞</span>}
                                        </td>
                                        <td style={td} title={row.scope === 'full_store' ? '' : (row.scope_items || []).join(', ')}>
                                            {row.scope === 'full_store' ? 'All Products' : row.scope === 'product' ? 'Products' : 'Categories'}
                                        </td>
                                        <td style={td}><span style={{ color: '#64748b' }}>{fmtDate(row.start_at)}</span></td>
                                        <td style={td}><span style={{ color: '#64748b' }}>{fmtDate(row.end_at)}</span></td>
                                        <td style={td}>{statusBadge(row.status)}</td>
                                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                            <button onClick={() => openEdit(row)} style={btnSm}>Edit</button>
                                            {row.status !== 'disabled' && row.status !== 'expired' && (
                                                <button onClick={() => handleDisable(row.id)} style={{ ...btnSm, color: '#92400e', borderColor: '#fde68a', background: '#fffbeb' }}>Disable</button>
                                            )}
                                            <button onClick={() => setDeleteId(row.id)} style={{ ...btnSm, color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Create/Edit Drawer ───────────────────────────────── */}
            {drawerOpen && (
                <>
                    <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
                    <div style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
                        background: '#fff', zIndex: 50, display: 'flex', flexDirection: 'column',
                        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
                    }}>
                        {/* Drawer header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>
                                {editId ? 'Edit Coupon / Promo' : 'Create Coupon / Promo'}
                            </h2>
                            <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
                        </div>

                        {/* Drawer body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {/* Name */}
                            <Label>Name *</Label>
                            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Diwali Offer 2026"
                                style={input} />

                            {/* Type */}
                            <Label>Type *</Label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                {['coupon','promo'].map(t => (
                                    <button key={t} onClick={() => set('type', t)}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                                            border: `2px solid ${form.type === t ? '#006d2f' : '#e2e8f0'}`,
                                            background: form.type === t ? '#f0fdf4' : '#fff',
                                            color: form.type === t ? '#006d2f' : '#64748b',
                                        }}>
                                        {t === 'coupon' ? '🎟️ Coupon' : '📢 Promo'}
                                        <div style={{ fontSize: '10px', fontWeight: '400', marginTop: '2px', color: '#94a3b8' }}>
                                            {t === 'coupon' ? 'Customer enters a code' : 'Auto-applies to all'}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Code — coupons only; promos auto-apply so no code needed */}
                            {form.type === 'coupon' ? (
                                <>
                                    <Label>Coupon Code</Label>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                        {['auto','manual'].map(m => (
                                            <button key={m} onClick={() => set('codeMode', m)}
                                                style={{
                                                    padding: '5px 14px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontSize: '12px',
                                                    borderColor: form.codeMode === m ? '#006d2f' : '#e2e8f0',
                                                    background:  form.codeMode === m ? '#f0fdf4' : '#fff',
                                                    color:       form.codeMode === m ? '#006d2f' : '#64748b',
                                                }}>
                                                {m === 'auto' ? 'Auto-generate' : 'Set manually'}
                                            </button>
                                        ))}
                                    </div>
                                    {form.codeMode === 'manual' ? (
                                        <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                                            placeholder="e.g. DIWALI20"
                                            style={{ ...input, fontFamily: 'monospace', letterSpacing: '1px' }} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                            <code style={{ flex: 1, background: '#f1f5f9', padding: '10px 12px', borderRadius: '8px', fontFamily: 'monospace', letterSpacing: '2px', fontSize: '14px', color: '#1e293b' }}>
                                                {form.code || '—'}
                                            </code>
                                            <button onClick={() => set('code', autoCode())} style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
                                                Regenerate
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#16a34a' }}>
                                    📢 Promos auto-apply at checkout — no code needed. Customers will see this discount applied automatically.
                                </div>
                            )}

                            {/* Unit */}
                            <Label>Discount Type *</Label>
                            <select value={form.unit} onChange={e => {
                                const newUnit = e.target.value;
                                setForm(f => ({
                                    ...f,
                                    unit: newUnit,
                                    // Force product scope for Buy X Get Y
                                    scope: newUnit === 'buy_x_get_y' ? 'product' : f.scope,
                                    // Reset get_items when switching away
                                    get_items: newUnit === 'buy_x_get_y' ? f.get_items : [],
                                }));
                            }} style={{ ...input, cursor: 'pointer' }}>
                                <option value="percent">% Percentage off</option>
                                <option value="flat">₹ Flat amount off</option>
                                <option value="free_shipping">🚚 Free Shipping</option>
                                <option value="buy_x_get_y">🎁 Buy X Get Y</option>
                            </select>

                            {/* Value */}
                            {(form.unit === 'percent' || form.unit === 'flat') && (
                                <>
                                    <Label>{form.unit === 'percent' ? 'Discount %' : 'Discount Amount (₹)'} *</Label>
                                    <input type="number" min="0" value={form.value} onChange={e => set('value', e.target.value)}
                                        placeholder={form.unit === 'percent' ? '20' : '100'}
                                        style={input} />
                                </>
                            )}

                            {form.unit === 'buy_x_get_y' && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <Label>Product X — Buy Qty</Label>
                                        <input type="number" min="1" value={form.buy_qty} onChange={e => set('buy_qty', e.target.value)} style={input} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Label>Product Y — Get Qty Free</Label>
                                        <input type="number" min="1" value={form.get_qty} onChange={e => set('get_qty', e.target.value)} style={input} />
                                    </div>
                                </div>
                            )}

                            {/* Min order */}
                            <Label>Minimum Order Value (₹)</Label>
                            <input type="number" min="0" value={form.min_order_value} onChange={e => set('min_order_value', e.target.value)}
                                placeholder="0 = no minimum" style={input} />

                            {/* Max uses */}
                            <Label>Usage Limit (total redemptions)</Label>
                            <input type="number" min="1" value={form.max_uses} onChange={e => set('max_uses', e.target.value)}
                                placeholder="Leave empty for unlimited" style={input} />

                            {/* Scope — hidden for Buy X Get Y (always product) */}
                            {form.unit !== 'buy_x_get_y' && (
                                <>
                                    <Label>Applies To</Label>
                                    <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value, scope_items: [] }))} style={{ ...input, cursor: 'pointer' }}>
                                        <option value="full_store">Full Store (all products)</option>
                                        <option value="product">Specific Products</option>
                                        <option value="category">Specific Categories</option>
                                    </select>
                                    {(form.scope === 'product' || form.scope === 'category') && (
                                        <ProductPicker
                                            label={`Select ${form.scope === 'product' ? 'Products / Variants / Sizes' : 'Categories'} *`}
                                            scope={form.scope}
                                            selectedItems={form.scope_items || []}
                                            catalogProducts={catalogProducts}
                                            catalogCategories={catalogCategories}
                                            catalogLoading={catalogLoading}
                                            search={catalogSearch}
                                            onSearchChange={setCatalogSearch}
                                            expandedProduct={expandedProduct}
                                            onExpandProduct={setExpandedProduct}
                                            onToggleItem={toggleScopeItem}
                                            onToggleVariation={toggleVariation}
                                            onToggleProduct={toggleProduct}
                                            onClearAll={() => setForm(f => ({ ...f, scope_items: [] }))}
                                            accentColor="#006d2f"
                                            accentBg="#f0fdf4"
                                        />
                                    )}
                                </>
                            )}

                            {/* Buy X Get Y: two product pickers */}
                            {form.unit === 'buy_x_get_y' && (
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{
                                        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                                        padding: '10px 14px', fontSize: '12px', color: '#1d4ed8', marginBottom: '16px',
                                        lineHeight: '1.5',
                                    }}>
                                        🎁 <strong>Buy X Get Y</strong> — <strong>Product X</strong> is what the customer must buy, <strong>Product Y</strong> is what they get free. Both can be the same product.
                                    </div>

                                    {/* "Buy" products = scope_items */}
                                    <ProductPicker
                                        label="🛒 Product X — Customer must buy these"
                                        scope="product"
                                        selectedItems={form.scope_items || []}
                                        catalogProducts={catalogProducts}
                                        catalogCategories={[]}
                                        catalogLoading={catalogLoading}
                                        search={catalogSearch}
                                        onSearchChange={setCatalogSearch}
                                        expandedProduct={expandedProduct}
                                        onExpandProduct={setExpandedProduct}
                                        onToggleItem={toggleScopeItem}
                                        onToggleVariation={toggleVariation}
                                        onToggleProduct={toggleProduct}
                                        onClearAll={() => setForm(f => ({ ...f, scope_items: [] }))}
                                        accentColor="#1d4ed8"
                                        accentBg="#eff6ff"
                                    />

                                    <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0 16px' }} />

                                    {/* "Get free" products = get_items */}
                                    <ProductPicker
                                        label="🎁 Product Y — Customer gets these for free"
                                        scope="product"
                                        selectedItems={form.get_items || []}
                                        catalogProducts={catalogProducts}
                                        catalogCategories={[]}
                                        catalogLoading={catalogLoading}
                                        search={catalogSearchGet}
                                        onSearchChange={setCatalogSearchGet}
                                        expandedProduct={expandedProductGet}
                                        onExpandProduct={setExpandedProductGet}
                                        onToggleItem={toggleGetItem}
                                        onToggleVariation={toggleGetVariation}
                                        onToggleProduct={toggleGetProduct}
                                        onClearAll={() => setForm(f => ({ ...f, get_items: [] }))}
                                        accentColor="#15803d"
                                        accentBg="#f0fdf4"
                                    />
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                        Leave "Gets Free" empty to allow any product as the free item.
                                    </div>
                                </div>
                            )}

                            {/* Applicable To */}
                            <div style={{ marginBottom: '16px' }}>
                                <Label>Applicable On</Label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[
                                        { value: 'both', label: '🛍️ Both (Dine-in & Delivery)' },
                                        { value: 'delivery', label: '🚚 Delivery Only' },
                                        { value: 'dine_in', label: '🍽️ Dine-in Only' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => set('applicable_to', opt.value)}
                                            style={{
                                                flex: 1, padding: '8px 6px', borderRadius: '8px', cursor: 'pointer',
                                                border: `2px solid ${form.applicable_to === opt.value ? '#6366f1' : '#e2e8f0'}`,
                                                background: form.applicable_to === opt.value ? '#eef2ff' : '#fff',
                                                color: form.applicable_to === opt.value ? '#4338ca' : '#64748b',
                                                fontSize: '12px', fontWeight: '600', textAlign: 'center',
                                            }}
                                        >{opt.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Dates */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <Label>Start Date & Time *</Label>
                                    <input type="datetime-local" value={form.start_at} onChange={e => set('start_at', e.target.value)} style={input} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Label>End Date & Time *</Label>
                                    <input type="datetime-local" value={form.end_at} onChange={e => set('end_at', e.target.value)} style={input} />
                                </div>
                            </div>

                            {formErr && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
                                    {formErr}
                                </div>
                            )}
                        </div>

                        {/* Drawer footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                            <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, flex: 2, justifyContent: 'center' }}>
                                {saving ? 'Saving…' : (editId ? 'Save Changes' : 'Create')}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ── Delete confirm ───────────────────────────────────── */}
            {deleteId && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        background: '#fff', borderRadius: '12px', padding: '28px', width: '360px',
                        zIndex: 70, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ fontSize: '28px', marginBottom: '12px' }}>🗑️</div>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px', marginBottom: '8px' }}>Delete this coupon?</div>
                        <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
                            This action cannot be undone. Any customers who have this code will no longer be able to use it.
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: '600' }}>
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/* ─── ProductPicker ───────────────────────────────────────── */
function ProductPicker({
    label, scope, selectedItems, catalogProducts, catalogCategories,
    catalogLoading, search, onSearchChange, expandedProduct, onExpandProduct,
    onToggleItem, onToggleVariation, onToggleProduct,
    onClearAll, accentColor = '#006d2f', accentBg = '#f0fdf4', compact = false,
}) {
    /* Compute selection state internally from selectedItems prop — no stale closures */
    const isVariationFullySelected = (pid, variation) =>
        variation.sizes.every(s => selectedItems.includes(`${pid}:${variation.variationId}:${s.sizeId}`));

    const isProductFullySelected = (product) =>
        product.variations.every(v =>
            v.sizes.every(s => selectedItems.includes(`${product.id}:${v.variationId}:${s.sizeId}`))
        );

    const maxHeight = compact ? '240px' : '320px';
    return (
        <div style={{ marginBottom: compact ? '0' : '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                {label}
            </div>
            {selectedItems.length > 0 && (
                <div style={{ marginBottom: '8px', padding: '6px 10px', background: accentBg, border: `1px solid ${accentColor}44`, borderRadius: '6px', fontSize: '11px', color: accentColor, fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>✓ {selectedItems.length} selected</span>
                    <button onClick={onClearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '11px', fontWeight: '600', padding: 0 }}>Clear</button>
                </div>
            )}
            <input
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={`Search ${scope === 'product' ? 'products…' : 'categories…'}`}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}
            />
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight, overflowY: 'auto', background: '#fff' }}>
                {catalogLoading ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading…</div>
                ) : scope === 'product' ? (() => {
                    const q = search.toLowerCase();
                    const filtered = catalogProducts.filter(p =>
                        !q || p.name?.toLowerCase().includes(q) ||
                        p.category?.toLowerCase().includes(q) ||
                        p.variations?.some(v => v.variationName?.toLowerCase().includes(q))
                    );
                    return filtered.length === 0 ? (
                        <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No products found</div>
                    ) : filtered.map(p => {
                        const fullySelected = isProductFullySelected(p);
                        const partiallySelected = !fullySelected && p.variations.some(v =>
                            v.sizes.some(s => selectedItems.includes(`${p.id}:${v.variationId}:${s.sizeId}`))
                        );
                        const isExpanded = expandedProduct === p.id;
                        return (
                            <div key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px' }}>
                                    <div style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '5px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                                        {p.image
                                            ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📦</div>
                                        }
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                        {p.category && <div style={{ fontSize: '10px', color: '#94a3b8' }}>{p.category}</div>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '10px', color: '#64748b', userSelect: 'none' }}>
                                            <input type="checkbox"
                                                checked={fullySelected}
                                                ref={el => { if (el) el.indeterminate = partiallySelected; }}
                                                onChange={() => onToggleProduct(p)}
                                                style={{ accentColor, width: '13px', height: '13px' }}
                                            />
                                            All
                                        </label>
                                        <button onClick={() => onExpandProduct(isExpanded ? null : p.id)}
                                            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', color: '#64748b' }}>
                                            {isExpanded ? '▲' : '▼'}
                                        </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                                        {p.variations.map(v => {
                                            const varFull = isVariationFullySelected(p.id, v);
                                            const varPartial = !varFull && v.sizes.some(s => selectedItems.includes(`${p.id}:${v.variationId}:${s.sizeId}`));
                                            return (
                                                <div key={v.variationId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px 6px 16px' }}>
                                                        {v.image
                                                            ? <img src={v.image} alt={v.variationName} style={{ width: '22px', height: '22px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                                                            : <div style={{ width: '22px', height: '22px', borderRadius: '3px', background: '#e2e8f0', flexShrink: 0 }} />
                                                        }
                                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151', flex: 1 }}>{v.variationName}</span>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '10px', color: '#64748b', userSelect: 'none' }}>
                                                            <input type="checkbox"
                                                                checked={varFull}
                                                                ref={el => { if (el) el.indeterminate = varPartial; }}
                                                                onChange={() => onToggleVariation(p.id, v)}
                                                                style={{ accentColor, width: '12px', height: '12px' }}
                                                            />
                                                            All sizes
                                                        </label>
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '0 10px 8px 44px' }}>
                                                        {v.sizes.map(s => {
                                                            const key = `${p.id}:${v.variationId}:${s.sizeId}`;
                                                            const checked = selectedItems.includes(key);
                                                            return (
                                                                <label key={s.sizeId} style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                    padding: '2px 8px', borderRadius: '16px', cursor: 'pointer',
                                                                    border: `1px solid ${checked ? accentColor : '#e2e8f0'}`,
                                                                    background: checked ? accentBg : '#fff',
                                                                    fontSize: '11px', fontWeight: checked ? '700' : '500',
                                                                    color: checked ? accentColor : '#374151', userSelect: 'none',
                                                                }}>
                                                                    <input type="checkbox" checked={checked} onChange={() => onToggleItem(key)} style={{ display: 'none' }} />
                                                                    {s.sizeLabel}
                                                                    {s.price && <span style={{ fontSize: '9px', color: checked ? accentColor : '#94a3b8', marginLeft: '1px', opacity: 0.8 }}>₹{Number(s.price).toLocaleString()}</span>}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    });
                })() : (() => {
                    const filtered = catalogCategories.filter(c =>
                        !search || c.toLowerCase().includes(search.toLowerCase())
                    );
                    return filtered.length === 0 ? (
                        <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No categories found</div>
                    ) : filtered.map(cat => {
                        const selected = selectedItems.includes(cat);
                        const count = catalogProducts.filter(p => p.category === cat).length;
                        return (
                            <div key={cat} onClick={() => onToggleItem(cat)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                                    borderBottom: '1px solid #f8fafc',
                                    background: selected ? accentBg : '#fff',
                                    color: selected ? accentColor : '#374151',
                                }}
                                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = selected ? accentBg : '#fff'; }}>
                                <span>{selected ? '☑' : '☐'}</span>
                                <div style={{ fontWeight: selected ? '700' : '500' }}>{cat}</div>
                                <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>{count} product{count !== 1 ? 's' : ''}</span>
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
}

/* ─── tiny style helpers ──────────────────────────────────── */
const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {children}
    </label>
);

const input = {
    width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
    fontSize: '13px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box',
    color: '#1e293b', background: '#fff',
};

const td = { padding: '12px 16px', color: '#374151', verticalAlign: 'middle' };

const btnPrimary = {
    background: '#006d2f', color: '#fff', border: 'none', padding: '10px 20px',
    borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
};

const btnSm = {
    padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0',
    background: '#f8fafc', color: '#374151', fontSize: '11px', fontWeight: '600',
    cursor: 'pointer', marginRight: '4px', whiteSpace: 'nowrap',
};

export default Coupons;

