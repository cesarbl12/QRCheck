import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type Role } from './AuthContext';

export function ProtectedRoute({ allow }: { allow: Role }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allow) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/employees' : '/scanner'} replace />;
  }

  return <Outlet />;
}
