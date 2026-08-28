import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLoader from './AuthLoader';

/**
 * Inverse of ProtectedRoute — keeps an already authenticated user off the
 * login screen (and off the browser back button into it).
 */
const PublicRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return <AuthLoader message="Loading..." />;
    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    return children;
};

export default PublicRoute;
