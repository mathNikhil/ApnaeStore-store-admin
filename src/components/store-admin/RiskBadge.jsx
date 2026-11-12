import React from 'react';

// Helpers + small UI for the backend's order risk tags (orders.risk_status / risk_flags).
// A flag means "check this", never "this customer is fake".

export const riskFlagsOf = (order) => {
    let f = order && order.risk_flags;
    if (typeof f === 'string') { try { f = JSON.parse(f); } catch (e) { f = []; } }
    return Array.isArray(f) ? f : [];
};

export const flaggedFields = (order) => new Set(riskFlagsOf(order).map((f) => f.field));

// style to highlight a flagged field value in the address block
export const hl = (order, field) =>
    flaggedFields(order).has(field) ? { background: '#ffdad6', color: '#ba1a1a', borderRadius: 3, padding: '0 4px' } : {};

// Operator must acknowledge flags before moving a flagged PENDING order forward (cancel needs no ack).
export const riskNeedsAck = (order, newStatus) =>
    !!order && order.risk_status === 'flagged' && order.status === 'pending' && newStatus !== 'cancelled';

export const riskConfirmText = (order, statusLabel) => {
    const lines = riskFlagsOf(order).map((f) => `• ${f.message}`).join('\n');
    return `⚠ This order has risk flags:\n\n${lines}\n\nA flag means "check", not "fake". Calling the customer first is the safest option.\n\nChange status to ${statusLabel} anyway?`;
};

const hasHigh = (order) => riskFlagsOf(order).some((f) => f.severity === 'High');

export const RiskBadge = ({ order, showPassed = false }) => {
    if (!order) return null;
    if (order.risk_status === 'flagged') {
        const flags = riskFlagsOf(order);
        const high = hasHigh(order);
        return (
            <span
                title={flags.map((f) => `${f.severity}: ${f.message}`).join('\n')}
                style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    background: high ? '#ffdad6' : '#fff3e0', color: high ? '#ba1a1a' : '#e65100',
                    border: `1px solid ${high ? '#f5b5ae' : '#ffcc80'}`,
                }}
            >⚠ Needs review{flags.length ? ` · ${flags.length}` : ''}</span>
        );
    }
    if (order.risk_status === 'passed' && showPassed) {
        return <span style={{ fontSize: 11, color: '#6b7a70' }}>✓ No issues found</span>;
    }
    return null;
};

export const RiskPanel = ({ order, cardStyle, titleStyle }) => {
    if (!order || order.risk_status !== 'flagged') return null;
    const flags = riskFlagsOf(order);
    return (
        <div style={{ ...cardStyle, borderLeft: '4px solid #ba1a1a' }}>
            <h3 style={titleStyle}>⚠ Needs review</h3>
            <div style={{ fontSize: 13, color: '#556067', marginBottom: 10 }}>
                Checked automatically when the order was placed. A flag means check, not fake. Call the customer if unsure.
            </div>
            {flags.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderTop: i ? '1px solid #eee' : 'none', fontSize: 14 }}>
                    <span style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: f.severity === 'High' ? '#ffdad6' : '#fff3e0', color: f.severity === 'High' ? '#ba1a1a' : '#e65100',
                    }}>{f.severity}</span>
                    <span>{f.message}</span>
                </div>
            ))}
        </div>
    );
};

export default RiskBadge;
