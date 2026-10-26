import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { storeAdminAPI } from '../services/api';

// Staff color palette — first 10 slots
const STAFF_COLORS = [
    { bg: '#e8f5e9', border: '#43a047', text: '#1b5e20', dot: '#43a047' },
    { bg: '#e3f2fd', border: '#1e88e5', text: '#0d47a1', dot: '#1e88e5' },
    { bg: '#fce4ec', border: '#e91e63', text: '#880e4f', dot: '#e91e63' },
    { bg: '#fff3e0', border: '#fb8c00', text: '#e65100', dot: '#fb8c00' },
    { bg: '#f3e5f5', border: '#8e24aa', text: '#4a148c', dot: '#8e24aa' },
    { bg: '#e0f7fa', border: '#00acc1', text: '#006064', dot: '#00acc1' },
    { bg: '#fafafa', border: '#757575', text: '#212121', dot: '#757575' },
    { bg: '#fff8e1', border: '#fdd835', text: '#f57f17', dot: '#fdd835' },
    { bg: '#e8eaf6', border: '#3949ab', text: '#1a237e', dot: '#3949ab' },
    { bg: '#f9fbe7', border: '#7cb342', text: '#33691e', dot: '#7cb342' },
];

const STATUS_META = {
    pending:    { label: 'Pending',    bg: '#fff3e0', color: '#e65100', icon: '⏳' },
    confirmed:  { label: 'Confirmed',  bg: '#e3f2fd', color: '#1565c0', icon: '✅' },
    in_session: { label: 'In Session', bg: '#e8f5e9', color: '#2e7d32', icon: '🟢' },
    completed:  { label: 'Completed',  bg: '#ede7f6', color: '#4527a0', icon: '🏁' },
    cancelled:  { label: 'Cancelled',  bg: '#fce4ec', color: '#c62828', icon: '❌' },
    no_show:    { label: 'No Show',    bg: '#f5f5f5', color: '#616161', icon: '👻' },
};

// Convert "HH:MM" → minutes from midnight
const toMins = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

// Minutes from midnight → "HH:MM"
const fromMins = (mins) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// "HH:MM" → "9:30 AM"
const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const todayISO = () => new Date().toISOString().split('T')[0];

const fmtDateHeader = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const addDays = (iso, n) => {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
};

const Appointments = () => {
    const navigate = useNavigate();
    const [storeId, setStoreId] = useState(null);
    const [date, setDate] = useState(todayISO());
    const [data, setData] = useState(null); // { bookings, staff, workStart, workEnd }
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedBooking, setSelectedBooking] = useState(null); // detail modal
    const [updating, setUpdating] = useState(false);
    const nowLineRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('storeAdminToken');
        if (!token) { navigate(`/login${window.location.search}`); return; }
        const sid = localStorage.getItem('currentStoreId');
        if (sid) { setStoreId(sid); fetchAppointments(sid, date); }
        else { setLoading(false); }
    }, []);

    useEffect(() => {
        if (storeId) fetchAppointments(storeId, date);
    }, [date]);

    // Scroll now-line into view
    useEffect(() => {
        if (nowLineRef.current) {
            nowLineRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [data]);

    const fetchAppointments = async (sid, d) => {
        setLoading(true);
        try {
            const res = await storeAdminAPI.getAppointments(sid, d);
            if (res.success) setData(res.data);
        } catch (e) {
            console.error('Appointments fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (bookingId, newStatus) => {
        setUpdating(true);
        try {
            const res = await storeAdminAPI.updateAppointmentStatus(storeId, bookingId, newStatus);
            if (res.success) {
                await fetchAppointments(storeId, date);
                if (selectedBooking?.id === bookingId) {
                    setSelectedBooking(b => ({ ...b, booking_status: newStatus }));
                }
            }
        } catch (e) {
            console.error('Status update error:', e);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div style={S.container}>
            <Sidebar />
            <div className="main-content" style={S.main}>
                <div style={S.loading}>⏳ Loading appointments…</div>
            </div>
        </div>
    );

    if (!storeId) return (
        <div style={S.container}>
            <Sidebar />
            <div className="main-content" style={S.main}>
                <h1>Select a Store</h1>
                <p style={{ color: '#8e9eab' }}>Please select a store to manage</p>
            </div>
        </div>
    );

    const bookings = data?.bookings || [];
    const staff = data?.staff || [];
    const workStart = data?.workStart || '09:00';
    const workEnd = data?.workEnd || '20:00';

    // Filtered bookings
    const filteredBookings = statusFilter === 'all'
        ? bookings
        : bookings.filter(b => b.booking_status === statusFilter);

    // Build staff index (id → color index)
    const staffColorMap = {};
    staff.forEach((s, i) => { staffColorMap[s.id] = i % STAFF_COLORS.length; });
    // For bookings without a staff_id assignment, add unique unassigned entry
    const hasUnassigned = filteredBookings.some(b => !b.staff_id);

    // Columns: one per active staff + one "Unassigned" if any
    const cols = [...staff];
    const unassignedCol = { id: null, name: 'Unassigned' };

    // Grid dimensions
    const SLOT_HEIGHT = 60; // px per hour
    const LABEL_WIDTH = 60; // time label column
    const COL_WIDTH = 180;

    const startMins = toMins(workStart);
    const endMins = toMins(workEnd);
    const totalMins = endMins - startMins;
    const gridHeight = (totalMins / 60) * SLOT_HEIGHT;

    // Hours to render
    const hours = [];
    for (let m = startMins; m <= endMins; m += 60) {
        hours.push(fromMins(m));
    }

    // Now-line position (only for today)
    const isToday = date === todayISO();
    const nowMins = (() => {
        const n = new Date();
        return n.getHours() * 60 + n.getMinutes();
    })();
    const nowTop = isToday && nowMins >= startMins && nowMins <= endMins
        ? ((nowMins - startMins) / 60) * SLOT_HEIGHT
        : null;

    // Stats
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.booking_status === 'confirmed').length;
    const completed = bookings.filter(b => b.booking_status === 'completed').length;
    const pending = bookings.filter(b => b.booking_status === 'pending').length;
    const cancelled = bookings.filter(b => b.booking_status === 'cancelled').length;
    const revenue = bookings
        .filter(b => b.booking_status !== 'cancelled')
        .reduce((s, b) => s + Number(b.computed_price || b.total_amount || 0), 0);

    // Build booking → column mapping
    const colBookings = (staffId) =>
        filteredBookings.filter(b => b.staff_id === staffId);

    const renderBookingBlock = (booking, colColor) => {
        const top = ((toMins(booking.booking_time) - startMins) / 60) * SLOT_HEIGHT;
        const height = Math.max(((booking.duration_mins || 30) / 60) * SLOT_HEIGHT, 24);
        const meta = STATUS_META[booking.booking_status] || STATUS_META.pending;
        const color = STAFF_COLORS[colColor] || STAFF_COLORS[0];

        return (
            <div
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                style={{
                    position: 'absolute',
                    top,
                    left: 4,
                    right: 4,
                    height,
                    background: meta.bg,
                    border: `1.5px solid ${color.border}`,
                    borderLeft: `4px solid ${color.border}`,
                    borderRadius: 6,
                    padding: '3px 6px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    zIndex: 2,
                    transition: 'box-shadow .15s',
                    boxSizing: 'border-box',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
                <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta.icon} {booking.customer_name || booking.customer_phone || 'Customer'}
                </div>
                {height > 40 && (
                    <div style={{ fontSize: 10, color: '#555', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {booking.service_name || '—'} · {fmtTime(booking.booking_time)}
                    </div>
                )}
                {height > 56 && booking.computed_price && (
                    <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>₹{Number(booking.computed_price).toLocaleString()}</div>
                )}
            </div>
        );
    };

    const allCols = [...cols, ...(hasUnassigned ? [unassignedCol] : [])];

    return (
        <div style={S.container}>
            <Sidebar />
            <div className="main-content" style={S.main}>

                {/* Header */}
                <div style={S.header}>
                    <div>
                        <h1 style={{ margin: 0 }}>📅 Appointments</h1>
                        <p style={{ color: '#8e9eab', marginTop: 4, marginBottom: 0 }}>Daily scheduler · {fmtDateHeader(date)}</p>
                    </div>
                    {/* Day navigation */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button style={S.navBtn} onClick={() => setDate(d => addDays(d, -1))}>◀ Prev</button>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}
                        />
                        <button style={S.navBtn} onClick={() => setDate(d => addDays(d, 1))}>Next ▶</button>
                        <button
                            style={{ ...S.navBtn, background: date === todayISO() ? '#006d2f' : '#f0f2f5', color: date === todayISO() ? '#fff' : '#2d3436' }}
                            onClick={() => setDate(todayISO())}
                        >Today</button>
                        <button style={S.navBtn} onClick={() => fetchAppointments(storeId, date)}>🔄</button>
                    </div>
                </div>

                {/* Stat cards */}
                <div style={S.statRow}>
                    {[
                        { label: 'Total', value: total, color: '#1565c0', bg: '#e3f2fd' },
                        { label: 'Confirmed', value: confirmed, color: '#1b5e20', bg: '#e8f5e9' },
                        { label: 'Completed', value: completed, color: '#2e7d32', bg: '#c8e6c9' },
                        { label: 'Pending', value: pending, color: '#e65100', bg: '#fff3e0' },
                        { label: 'Cancelled', value: cancelled, color: '#c62828', bg: '#fce4ec' },
                        { label: 'Revenue', value: `₹${revenue.toLocaleString()}`, color: '#4a148c', bg: '#f3e5f5' },
                    ].map(s => (
                        <div key={s.label} style={{ ...S.statCard, background: s.bg }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Status filter chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {['all', 'pending', 'confirmed', 'in_session', 'completed', 'cancelled', 'no_show'].map(s => {
                        const meta = STATUS_META[s] || { label: 'All', bg: '#e0e0e0', color: '#333' };
                        const active = statusFilter === s;
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                style={{
                                    padding: '5px 14px',
                                    borderRadius: 20,
                                    border: active ? '2px solid #006d2f' : '1.5px solid #ddd',
                                    background: active ? '#006d2f' : (s === 'all' ? '#f5f5f5' : meta.bg),
                                    color: active ? '#fff' : (s === 'all' ? '#333' : meta.color),
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {s === 'all' ? `All (${total})` : `${meta.icon || ''} ${meta.label} (${bookings.filter(b => b.booking_status === s).length})`}
                            </button>
                        );
                    })}
                </div>

                {/* Scheduler grid */}
                {bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>No appointments for this day</div>
                        <div style={{ fontSize: 14, marginTop: 6 }}>Bookings placed by customers will appear here.</div>
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

                        {/* Staff header row */}
                        <div style={{ display: 'flex', borderBottom: '2px solid #eee', position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}>
                            {/* Time gutter */}
                            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, borderRight: '1px solid #eee' }} />
                            {allCols.map((s, i) => {
                                const cIdx = s.id ? (staffColorMap[s.id] ?? i) : (STAFF_COLORS.length - 1);
                                const c = STAFF_COLORS[cIdx % STAFF_COLORS.length];
                                return (
                                    <div
                                        key={s.id ?? 'unassigned'}
                                        style={{
                                            width: COL_WIDTH,
                                            minWidth: COL_WIDTH,
                                            padding: '12px 16px',
                                            borderRight: '1px solid #eee',
                                            background: c.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: c.dot, color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: 13, flexShrink: 0,
                                        }}>
                                            {s.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: c.text }}>{s.name}</div>
                                            {s.id && (
                                                <div style={{ fontSize: 11, color: '#888' }}>
                                                    {colBookings(s.id).length} appt{colBookings(s.id).length !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Scrollable grid body */}
                        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '65vh' }}>
                            <div style={{ display: 'flex', position: 'relative' }}>

                                {/* Time labels */}
                                <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, position: 'relative', height: gridHeight, borderRight: '1px solid #eee', flexShrink: 0 }}>
                                    {hours.map(h => (
                                        <div key={h} style={{
                                            position: 'absolute',
                                            top: ((toMins(h) - startMins) / 60) * SLOT_HEIGHT - 8,
                                            left: 0, right: 0,
                                            textAlign: 'right',
                                            paddingRight: 8,
                                            fontSize: 10,
                                            color: '#aaa',
                                            fontWeight: 600,
                                        }}>
                                            {fmtTime(h)}
                                        </div>
                                    ))}
                                </div>

                                {/* Staff columns */}
                                {allCols.map((s, colI) => {
                                    const cIdx = s.id ? (staffColorMap[s.id] ?? colI) : (STAFF_COLORS.length - 1);
                                    const colBkgs = colBookings(s.id);
                                    return (
                                        <div
                                            key={s.id ?? 'unassigned'}
                                            style={{
                                                width: COL_WIDTH,
                                                minWidth: COL_WIDTH,
                                                height: gridHeight,
                                                position: 'relative',
                                                borderRight: '1px solid #f0f0f0',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {/* Hour lines */}
                                            {hours.map(h => (
                                                <div key={h} style={{
                                                    position: 'absolute',
                                                    top: ((toMins(h) - startMins) / 60) * SLOT_HEIGHT,
                                                    left: 0, right: 0,
                                                    borderTop: '1px solid #f0f0f0',
                                                }} />
                                            ))}

                                            {/* Half-hour lines */}
                                            {hours.slice(0, -1).map(h => (
                                                <div key={h + '.5'} style={{
                                                    position: 'absolute',
                                                    top: ((toMins(h) - startMins + 30) / 60) * SLOT_HEIGHT,
                                                    left: 0, right: 0,
                                                    borderTop: '1px dashed #f5f5f5',
                                                }} />
                                            ))}

                                            {/* Now line (first column only) */}
                                            {colI === 0 && nowTop !== null && (
                                                <div
                                                    ref={nowLineRef}
                                                    style={{
                                                        position: 'absolute',
                                                        top: nowTop,
                                                        left: -LABEL_WIDTH,
                                                        right: 0,
                                                        width: `calc(100% + ${LABEL_WIDTH}px)`,
                                                        borderTop: '2px solid #e53935',
                                                        zIndex: 5,
                                                        pointerEvents: 'none',
                                                    }}
                                                >
                                                    <div style={{
                                                        position: 'absolute', left: LABEL_WIDTH,
                                                        top: -8, background: '#e53935',
                                                        borderRadius: 8, padding: '1px 6px',
                                                        fontSize: 10, color: '#fff', fontWeight: 700,
                                                    }}>
                                                        {fmtTime(fromMins(nowMins))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Booking blocks */}
                                            {colBkgs.map(b => renderBookingBlock(b, cIdx))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Booking detail modal */}
                {selectedBooking && (
                    <div
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            zIndex: 1000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onClick={e => { if (e.target === e.currentTarget) setSelectedBooking(null); }}
                    >
                        <div style={{
                            background: '#fff', borderRadius: 16, padding: 28,
                            width: 420, maxWidth: '92vw', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <h2 style={{ margin: 0, fontSize: 18 }}>Appointment Details</h2>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}
                                >×</button>
                            </div>

                            <div style={S.detailGrid}>
                                <DetailRow label="Customer" value={selectedBooking.customer_name || selectedBooking.customer_phone || '—'} />
                                <DetailRow label="Phone" value={selectedBooking.customer_phone || '—'} />
                                <DetailRow label="Service" value={selectedBooking.service_name || '—'} />
                                <DetailRow label="Staff" value={selectedBooking.staff_name || 'Unassigned'} />
                                <DetailRow label="Date" value={selectedBooking.booking_date} />
                                <DetailRow label="Time" value={`${fmtTime(selectedBooking.booking_time)} · ${selectedBooking.duration_mins || 30} min`} />
                                <DetailRow label="Price" value={selectedBooking.computed_price ? `₹${Number(selectedBooking.computed_price).toLocaleString()}` : '—'} />
                                <DetailRow label="Status" value={
                                    <span style={{
                                        padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                                        background: STATUS_META[selectedBooking.booking_status]?.bg || '#eee',
                                        color: STATUS_META[selectedBooking.booking_status]?.color || '#333',
                                    }}>
                                        {STATUS_META[selectedBooking.booking_status]?.icon} {STATUS_META[selectedBooking.booking_status]?.label || selectedBooking.booking_status}
                                    </span>
                                } />
                            </div>

                            <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>UPDATE STATUS</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {Object.entries(STATUS_META).map(([key, m]) => (
                                        <button
                                            key={key}
                                            disabled={updating || selectedBooking.booking_status === key}
                                            onClick={() => handleStatusUpdate(selectedBooking.id, key)}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: 20,
                                                border: 'none',
                                                background: selectedBooking.booking_status === key ? m.bg : '#f5f5f5',
                                                color: selectedBooking.booking_status === key ? m.color : '#555',
                                                fontWeight: 600,
                                                fontSize: 12,
                                                cursor: updating || selectedBooking.booking_status === key ? 'default' : 'pointer',
                                                opacity: updating ? 0.6 : 1,
                                            }}
                                        >
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailRow = ({ label, value }) => (
    <div style={{ display: 'contents' }}>
        <div style={{ fontSize: 12, color: '#888', fontWeight: 600, padding: '5px 0' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#2d3436', padding: '5px 0' }}>{value}</div>
    </div>
);

const S = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
    main: { flex: 1, padding: '24px', marginLeft: '240px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' },
    navBtn: { padding: '8px 14px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', color: '#2d3436', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    statRow: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: 90, padding: '14px 16px', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
    loading: { textAlign: 'center', padding: '60px 20px', fontSize: 16, color: '#888' },
    detailGrid: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: '2px 12px', fontSize: 13 },
};

export default Appointments;
