import { useAuth } from '../../context/AuthContext';
import { ACTION } from '../../constants/auth';

/**
 * Element-level authorization. Hides (or replaces) any child that the
 * current user is not allowed to use.
 *
 *   <Can menuKey="/users" action="add">
 *       <button onClick={openAddModal}>Add User</button>
 *   </Can>
 *
 *   <Can menuKey="/users" action="delete" fallback={<span>—</span>}> ... </Can>
 */
const Can = ({ menuKey, action = ACTION.VIEW, fallback = null, children }) => {
    const { can } = useAuth();
    return can(menuKey, action) ? children : fallback;
};

export default Can;
