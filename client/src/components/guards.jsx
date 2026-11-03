import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleLabels } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-forest text-muted">Loading your workspace...</div>;
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

export function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <div className="mx-auto max-w-xl py-20 text-center"><span className="eyebrow">Access boundary</span><h1 className="mt-5 font-display text-4xl text-white">This area is restricted</h1><p className="mt-3 text-muted">Your {roleLabels[user?.role] ?? 'account'} does not have access to this workspace.</p></div>;
  return children;
}
