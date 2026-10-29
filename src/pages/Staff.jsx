import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const ALL_PAGES = [
    { key: 'dashboard',    label: 'Dashboard',       icon: '⊞' },
    { key: 'orders',       label: 'Orders',           icon: '📋' },
    { key: 'customers',    label: 'Customers',        icon: '👤' },
    { key: 'inventory',    label: 'Inventory',        icon: '📦' },
    { key: 'couriers',     label: 'Couriers',         icon: '🚚' },
    { key: 'reports',      label: 'Reports',          icon: '📈' },
    { key: 'staff',        label: 'Staff',            icon: '👥' },
    { key: 'returns',      label: 'Returns',          icon: '↩️' },
    { key: 'coupons',      label: 'Coupons & Promos', icon: '🏷️' },
    { key: 'appointments', label: 'Appointments',     icon: '📅' },
];

const Staff = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', phone: '', premium_percent: '' });
    const photoInputRef = useRef(null);
    const navigate = useNavigate();

    // Portal access modal state
    const [accessModal, setAccessModal] = useState(null); // { member } or null
    const [accessEmail, setAccessEmail] = useState('');
    const [accessPerms, setAccessPerms] = useState({}); // { pageKey: 'view'|'edit'|null }
    const [accessSaving, setAccessSaving] = useState(false);
    const [accessError, setAccessError] = useState('');

    const token = () => localStorage.getItem('storeAdminToken');
    const storeId = () => localStorage.getItem('currentStoreId');

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
    });

    useEffect(() => {
        if (!token()) { navigate(`/login${window.location.search}`); return; }
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE}/api/store/${storeId()}/admin/staff`, {
                headers: authHeaders(),
            });
            const d = await r.json();
            if (d.success) setStaff(d.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setForm({ name: '', phone: '', premium_percent: '' });
        setEditingId(null);
        setError('');
        setShowForm(true);
    };

    const openEdit = (member) => {
        setForm({
            name: member.name,
            phone: member.phone || '',
            premium_percent: member.premium_percent != null ? String(member.premium_percent) : '',
        });
        setEditingId(member.id);
        setError('');
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Name is required'); return; }
        setSaving(true);
        setError('');
        try {
            const body = {
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                premium_percent: parseFloat(form.premium_percent) || 0,
            };
            const url = editingId
                ? `${API_BASE}/api/store/${storeId()}/admin/staff/${editingId}`
                : `${API_BASE}/api/store/${storeId()}/admin/staff`;
            const method = editingId ? 'PATCH' : 'POST';
            const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
            const d = await r.json();
            if (!d.success) { setError(d.error || 'Failed to save'); return; }
            setShowForm(false);
            fetchStaff();
        } catch (e) {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (member) => {
        try {
            await fetch(`${API_BASE}/api/store/${storeId()}/admin/staff/${member.id}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ is_active: !member.is_active }),
            });
            fetchStaff();
        } catch (e) { console.error(e); }
    };

    const handlePhotoClick = (id) => {
        setUploadingId(id);
        photoInputRef.current.click();
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file || !uploadingId) return;
        const fd = new FormData();
        fd.append('photo', file);
        try {
            const r = await fetch(`${API_BASE}/api/store/${storeId()}/admin/staff/${uploadingId}/photo`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: fd,
            });
            const d = await r.json();
            if (d.success) {
                setStaff(prev => prev.map(m => m.id === uploadingId ? { ...m, avatar_url: d.data.avatar_url } : m));
            } else {
                alert(d.error || 'Upload failed');
            }
        } catch (e) {
            alert('Upload error');
        } finally {
            setUploadingId(null);
        }
    };

    // ── Portal access modal ────────────────────────────────────────────────
    const openAccessModal = (member) => {
        // Parse existing permissions into {pageKey: 'view'|'edit'}
        const existing = {};
        if (Array.isArray(member.permissions)) {
            member.permissions.forEach(p => { existing[p.page] = p.access; });
        }
        setAccessPerms(existing);
        setAccessEmail(member.google_email || '');
        setAccessError('');
        setAccessModal({ member });
    };

    const closeAccessModal = () => {
        setAccessModal(null);
        setAccessError('');
    };

    const togglePageAccess = (pageKey) => {
        setAccessPerms(prev => {
            if (prev[pageKey]) {
                // Already enabled — remove it
                const next = { ...prev };
                delete next[pageKey];
                return next;
            }
            return { ...prev, [pageKey]: 'view' };
        });
    };

    const setPageLevel = (pageKey, level) => {
        setAccessPerms(prev => ({ ...prev, [pageKey]: level }));
    };

    const handleAccessSave = async () => {
        setAccessError('');
        const permissions = Object.entries(accessPerms).map(([page, access]) => ({ page, access }));
        if (permissions.length > 0 && !accessEmail.trim()) {
            setAccessError('Gmail address is required when granting page access.');
            return;
        }
        if (accessEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accessEmail.trim())) {
            setAccessError('Enter a valid email address.');
            return;
        }
        setAccessSaving(true);
        try {
            const r = await fetch(
                `${API_BASE}/api/store/${storeId()}/admin/staff/${accessModal.member.id}/permissions`,
                {
                    method: 'PATCH',
                    headers: authHeaders(),
                    body: JSON.stringify({
                        permissions,
                        google_email: accessEmail.trim() || null,
                    }),
                }
            );
            const d = await r.json();
            if (!d.success) { setAccessError(d.error || 'Failed to save permissions'); return; }
            // Update local state
            setStaff(prev => prev.map(m =>
                m.id === accessModal.member.id
                    ? { ...m, permissions: d.data.permissions, google_email: d.data.google_email }
                    : m
            ));
            closeAccessModal();
        } catch (e) {
            setAccessError('Network error');
        } finally {
            setAccessSaving(false);
        }
    };

    const enabledCount = Object.keys(accessPerms).length;

    if (loading) {
        return (
            <div style={s.container}>
                <Sidebar />
                <div className="main-content" style={s.main}>
                    <div style={s.loading}>Loading staff...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={s.container}>
            <Sidebar />
            <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />

            <div className="main-content" style={s.main}>
                {/* Header */}
                <div style={s.header}>
                    <div>
                        <h1 style={{ margin: 0 }}>👥 Staff</h1>
                        <p style={{ color: '#8e9eab', margin: '4px 0 0' }}>Manage service staff and their photos</p>
                    </div>
                    <button style={s.addBtn} onClick={openAdd}>+ Add Staff</button>
                </div>

                {/* Add / Edit form */}
                {showForm && (
                    <div style={s.formCard}>
                        <h3 style={{ margin: '0 0 16px' }}>{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
                        {error && <p style={s.errTxt}>{error}</p>}
                        <form onSubmit={handleSave} style={s.formGrid}>
                            <div style={s.fg}>
                                <label style={s.label}>Full Name *</label>
                                <input style={s.input} value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Priya Sharma" required />
                            </div>
                            <div style={s.fg}>
                                <label style={s.label}>Phone (optional)</label>
                                <input style={s.input} value={form.phone}
                                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="+91 98765 43210" />
                            </div>
                            <div style={s.fg}>
                                <label style={s.label}>Premium % (add-on over base price)</label>
                                <input style={s.input} type="number" min="0" max="500" step="1"
                                    value={form.premium_percent}
                                    onChange={e => setForm(p => ({ ...p, premium_percent: e.target.value }))}
                                    placeholder="0" />
                            </div>
                            <div style={{ gridColumn: 'span 3', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" style={s.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" style={s.saveBtn} disabled={saving}>
                                    {saving ? 'Saving…' : (editingId ? 'Update' : 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Staff cards */}
                {staff.length === 0 ? (
                    <div style={s.emptyBox}>
                        <span style={{ fontSize: 40 }}>👤</span>
                        <p style={{ margin: '12px 0 0', color: '#8e9eab' }}>No staff yet. Add your first team member.</p>
                    </div>
                ) : (
                    <div style={s.grid}>
                        {staff.map(m => {
                            const permCount = Array.isArray(m.permissions) ? m.permissions.length : 0;
                            return (
                                <div key={m.id} style={{ ...s.card, opacity: m.is_active ? 1 : 0.55 }}>
                                    {/* Photo */}
                                    <div style={s.photoWrap} onClick={() => m.is_active && handlePhotoClick(m.id)}
                                        title={m.is_active ? 'Click to upload photo' : ''}>
                                        {m.avatar_url ? (
                                            <img src={m.avatar_url} alt={m.name} style={s.photo} />
                                        ) : (
                                            <div style={s.photoPlaceholder}>
                                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="8" r="5" fill="#c8d6da" />
                                                    <path d="M3 21c0-5 4-8.5 9-8.5s9 3.5 9 8.5" stroke="#c8d6da" strokeWidth="2" fill="none" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                        )}
                                        {m.is_active && (
                                            <div style={s.cameraOverlay}>
                                                <span style={{ fontSize: 18 }}>📷</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div style={s.cardBody}>
                                        <p style={s.staffName}>{m.name}</p>
                                        {m.phone && <p style={s.staffSub}>{m.phone}</p>}
                                        {m.premium_percent > 0 && (
                                            <span style={s.premiumBadge}>+{m.premium_percent}% premium</span>
                                        )}
                                        {/* Portal access indicator */}
                                        {permCount > 0 ? (
                                            <div style={s.accessBadge}>
                                                <span style={{ fontSize: 10 }}>🔑</span>
                                                <span>{permCount} page{permCount !== 1 ? 's' : ''} · {m.google_email}</span>
                                            </div>
                                        ) : (
                                            <div style={s.noAccessBadge}>No portal access</div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={s.cardActions}>
                                        <button style={s.editBtn} onClick={() => openEdit(m)}>Edit</button>
                                        <button style={s.accessBtn} onClick={() => openAccessModal(m)} title="Set portal access">🔑</button>
                                        <button
                                            style={m.is_active ? s.deactivateBtn : s.activateBtn}
                                            onClick={() => toggleActive(m)}>
                                            {m.is_active ? 'Deactivate' : 'Reactivate'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <p style={s.hint}>
                    💡 Photos appear on the booking screen so customers can choose their preferred staff.
                    Accepted: JPG/PNG/WebP, max 2 MB. Images are cropped to 400×400 px.
                </p>
            </div>

            {/* ── Portal Access Modal ──────────────────────────────────── */}
            {accessModal && (
                <div style={s.modalOverlay} onClick={closeAccessModal}>
                    <div style={s.modalBox} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17 }}>🔑 Portal Access</h3>
                                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#8e9eab' }}>
                                    {accessModal.member.name}
                                </p>
                            </div>
                            <button style={s.modalClose} onClick={closeAccessModal}>✕</button>
                        </div>

                        <div style={s.modalBody}>
                            {/* Gmail */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={s.label}>Staff Gmail Address</label>
                                <input
                                    style={{ ...s.input, marginTop: 6, width: '100%', boxSizing: 'border-box' }}
                                    type="email"
                                    placeholder="staffname@gmail.com"
                                    value={accessEmail}
                                    onChange={e => setAccessEmail(e.target.value)}
                                />
                                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#8e9eab' }}>
                                    Staff will sign in to the portal using Google with this email.
                                </p>
                            </div>

                            {/* Page permissions */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <label style={s.label}>Page Access ({enabledCount} of {ALL_PAGES.length} enabled)</label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            style={s.toggleAllBtn}
                                            onClick={() => {
                                                if (enabledCount === ALL_PAGES.length) {
                                                    setAccessPerms({});
                                                } else {
                                                    const all = {};
                                                    ALL_PAGES.forEach(p => { all[p.key] = accessPerms[p.key] || 'view'; });
                                                    setAccessPerms(all);
                                                }
                                            }}
                                        >
                                            {enabledCount === ALL_PAGES.length ? 'Remove all' : 'Select all'}
                                        </button>
                                    </div>
                                </div>

                                <div style={s.pageGrid}>
                                    {ALL_PAGES.map(page => {
                                        const isEnabled = !!accessPerms[page.key];
                                        const level = accessPerms[page.key];
                                        return (
                                            <div
                                                key={page.key}
                                                style={{
                                                    ...s.pageRow,
                                                    background: isEnabled ? '#f0faf4' : '#f8f9fa',
                                                    border: isEnabled ? '1px solid #b2dfcc' : '1px solid #e8eaed',
                                                }}
                                            >
                                                {/* Checkbox + label */}
                                                <label style={s.pageCheckLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isEnabled}
                                                        onChange={() => togglePageAccess(page.key)}
                                                        style={{ accentColor: '#006d2f', width: 15, height: 15, flexShrink: 0 }}
                                                    />
                                                    <span style={{ fontSize: 15 }}>{page.icon}</span>
                                                    <span style={{
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        color: isEnabled ? '#1a3a26' : '#8e9eab',
                                                    }}>
                                                        {page.label}
                                                    </span>
                                                </label>

                                                {/* View / Edit toggle — only visible when page is enabled */}
                                                {isEnabled && (
                                                    <div style={s.levelToggle}>
                                                        <button
                                                            style={{
                                                                ...s.levelBtn,
                                                                background: level === 'view' ? '#006d2f' : '#e8f5ee',
                                                                color: level === 'view' ? '#fff' : '#006d2f',
                                                            }}
                                                            onClick={() => setPageLevel(page.key, 'view')}
                                                        >
                                                            👁 View
                                                        </button>
                                                        <button
                                                            style={{
                                                                ...s.levelBtn,
                                                                background: level === 'edit' ? '#006d2f' : '#e8f5ee',
                                                                color: level === 'edit' ? '#fff' : '#006d2f',
                                                            }}
                                                            onClick={() => setPageLevel(page.key, 'edit')}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {accessError && <p style={s.errTxt}>{accessError}</p>}
                        </div>

                        <div style={s.modalFooter}>
                            {enabledCount === 0 && (
                                <p style={{ fontSize: 12, color: '#e07b00', margin: 0, flex: 1 }}>
                                    ⚠️ No pages selected — saving will revoke all portal access.
                                </p>
                            )}
                            <button style={s.cancelBtn} onClick={closeAccessModal}>Cancel</button>
                            <button
                                style={{ ...s.saveBtn, minWidth: 120 }}
                                onClick={handleAccessSave}
                                disabled={accessSaving}
                            >
                                {accessSaving ? 'Saving…' : '💾 Save Access'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const s = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: {
        flex: 1,
        padding: window.innerWidth <= 900 ? '60px 16px 16px' : '30px',
        marginLeft: window.innerWidth <= 900 ? 0 : 260,
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    addBtn: { padding: '10px 20px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
    formCard: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
    fg: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#556067', textTransform: 'uppercase', letterSpacing: '0.4px' },
    input: { padding: '10px 12px', border: '1px solid #e0e3e6', borderRadius: 8, fontSize: 14 },
    saveBtn: { padding: '10px 24px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
    cancelBtn: { padding: '10px 20px', background: '#f0f2f5', color: '#556067', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
    errTxt: { color: '#e74c3c', fontSize: 13, margin: '0 0 12px', background: '#fdf0ef', borderRadius: 6, padding: '8px 12px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 },
    card: {
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    photoWrap: {
        position: 'relative',
        cursor: 'pointer',
        background: '#f7f9fb',
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photo: { width: '100%', height: '100%', objectFit: 'cover' },
    photoPlaceholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
    cameraOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6px 0',
        opacity: 0,
        transition: 'opacity 0.18s',
    },
    cardBody: { padding: '12px 14px 8px', flex: 1 },
    staffName: { margin: 0, fontWeight: 700, fontSize: 15, color: '#191c1e' },
    staffSub: { margin: '2px 0 0', fontSize: 12, color: '#8e9eab' },
    premiumBadge: { display: 'inline-block', marginTop: 6, padding: '2px 10px', background: '#fff3cd', color: '#856404', borderRadius: 20, fontSize: 11, fontWeight: 600 },
    accessBadge: {
        display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
        padding: '4px 8px', background: '#e8f5ee', borderRadius: 20,
        fontSize: 11, fontWeight: 600, color: '#006d2f',
        overflow: 'hidden',
    },
    noAccessBadge: {
        display: 'inline-block', marginTop: 8,
        padding: '3px 8px', background: '#f0f2f5', borderRadius: 20,
        fontSize: 11, color: '#8e9eab', fontWeight: 600,
    },
    cardActions: { padding: '10px 14px', display: 'flex', gap: 6, borderTop: '1px solid #f0f2f5' },
    editBtn: { flex: 1, padding: '6px 0', background: '#f0f2f5', color: '#556067', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    accessBtn: { padding: '6px 10px', background: '#e8f5ee', color: '#006d2f', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', flexShrink: 0 },
    deactivateBtn: { flex: 1, padding: '6px 0', background: '#fdf0ef', color: '#e74c3c', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    activateBtn: { flex: 1, padding: '6px 0', background: '#eaffed', color: '#2ecc71', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    emptyBox: { textAlign: 'center', padding: '60px 20px', color: '#556067' },
    loading: { textAlign: 'center', padding: '60px', color: '#666' },
    hint: { marginTop: 24, fontSize: 12, color: '#8e9eab', lineHeight: 1.5 },

    // Modal
    modalOverlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
    },
    modalBox: {
        background: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 540,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden',
    },
    modalHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: '1px solid #f0f2f5',
    },
    modalClose: {
        background: '#f0f2f5', border: 'none', borderRadius: 8,
        width: 32, height: 32, cursor: 'pointer',
        fontSize: 14, fontWeight: 700, color: '#556067',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modalBody: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
    },
    modalFooter: {
        padding: '14px 24px',
        borderTop: '1px solid #f0f2f5',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
    },
    pageGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    pageRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 12px',
        borderRadius: 10,
        gap: 10,
        transition: 'all 0.15s',
    },
    pageCheckLabel: {
        display: 'flex', alignItems: 'center', gap: 8,
        cursor: 'pointer', flex: 1, userSelect: 'none',
    },
    levelToggle: {
        display: 'flex', gap: 4, flexShrink: 0,
    },
    levelBtn: {
        padding: '4px 10px',
        border: 'none',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.12s',
    },
    toggleAllBtn: {
        padding: '4px 10px',
        background: '#f0f2f5',
        border: 'none',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        color: '#556067',
        cursor: 'pointer',
    },
};

// Camera overlay hover via JS (React inline styles can't :hover)
const StyleTag = () => (
    <style>{`
        .staff-card-photo:hover .camera-overlay { opacity: 1 !important; }
    `}</style>
);

export default Staff;
