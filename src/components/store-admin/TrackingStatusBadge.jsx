import React from 'react';

const TrackingStatusBadge = ({ status }) => {
    const statusConfig = {
        pending: {
            label: 'Pending',
            className: 'bg-gray-100 text-gray-600',
            icon: 'pending'
        },
        in_transit: {
            label: 'In Transit',
            className: 'bg-blue-100 text-blue-700',
            icon: 'local_shipping'
        },
        out_for_delivery: {
            label: 'Out for Delivery',
            className: 'bg-orange-100 text-orange-700',
            icon: 'delivery_truck'
        },
        delivered: {
            label: 'Delivered ✅',
            className: 'bg-green-100 text-green-700',
            icon: 'check_circle'
        },
        failed: {
            label: 'Failed ❌',
            className: 'bg-red-100 text-red-700',
            icon: 'error'
        },
        cancelled: {
            label: 'Cancelled',
            className: 'bg-red-100 text-red-700',
            icon: 'cancel'
        }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}>
            <span className="material-symbols-outlined text-sm">{config.icon}</span>
            {config.label}
        </span>
    );
};

export default TrackingStatusBadge;