import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLoader from './AuthLoader';

/**
 * AUTHENTICATION guard — is there a valid session at all?
 * Wraps the entire private area of the router.
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <AuthLoader message="Restoring your session..." />;

    if (!isAuthenticated) {
        //! Remember where the user was headed so login can bounce them back.
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }

    return children;
};

export default ProtectedRoute;
