import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ACTION } from '../constants/auth';

/**
 * Page-level permission helper.
 *
 *   const { canView, canAdd, canEdit, canDelete } = usePermission('/users');
 *
 * When no key is passed, the current route path is used — so a page normally
 * just calls usePermission() with no arguments.
 */
export function usePermission(menuKey) {
    const { getPermission, can } = useAuth();
    const location = useLocation();
    const key = menuKey ?? location.pathname;

    return useMemo(() => {
        const perm = getPermission(key);
        return {
            key,
            permission: perm,
            canView: perm[ACTION.VIEW],
            canAdd: perm[ACTION.ADD],
            canEdit: perm[ACTION.EDIT],
            canDelete: perm[ACTION.DELETE],
            can: (action) => can(key, action),
        };
    }, [key, getPermission, can]);
}

export default usePermission;
