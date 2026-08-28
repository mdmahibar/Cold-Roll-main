import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ACTION } from '../../constants/auth';
import AuthLoader from './AuthLoader';

/**
 * AUTHORIZATION guard — does this user hold `action` on `menuKey`?
 * `menuKey` is the MenuURL registered in the Menu master (e.g. '/users')
 * or the numeric MenuId.
 *
 *   <PermissionRoute menuKey="/users"><UsersAndRoles /></PermissionRoute>
 */
const PermissionRoute = ({ menuKey, action = ACTION.VIEW, children }) => {
    const { can, isLoading } = useAuth();

    if (isLoading) return <AuthLoader message="Checking your access..." />;

    if (!can(menuKey, action)) {
        return <Navigate to="/forbidden" replace state={{ menuKey, action }} />;
    }

    return children;
};

export default PermissionRoute;
