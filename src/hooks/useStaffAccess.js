/**
 * useStaffAccess — returns { isStaff, canEdit, canView } for a given page key.
 *
 * - Owners (role !== 'staff') always get canEdit = canView = true.
 * - Staff with 'edit' access get canEdit = true, canView = true.
 * - Staff with 'view' access get canEdit = false, canView = true.
 * - Staff with no matching permission get canEdit = canView = false.
 *
 * Usage:
 *   const { canEdit } = useStaffAccess('orders');
 *   {canEdit && <button>Export CSV</button>}
 */
const useStaffAccess = (pageKey) => {
    const role = localStorage.getItem('storeAdminRole');
    const isStaff = role === 'staff';

    if (!isStaff) {
        return { isStaff: false, canEdit: true, canView: true };
    }

    try {
        const raw = localStorage.getItem('storeAdminPermissions');
        const perms = raw ? JSON.parse(raw) : [];
        const perm = perms.find(p => p.page === pageKey);
        if (!perm) return { isStaff: true, canEdit: false, canView: false };
        const canEdit = perm.access === 'edit';
        return { isStaff: true, canEdit, canView: true };
    } catch {
        return { isStaff: true, canEdit: false, canView: false };
    }
};

export default useStaffAccess;
