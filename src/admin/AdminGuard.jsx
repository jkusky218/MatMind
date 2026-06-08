// AdminGuard.jsx — client-side route guard for /admin
// Wraps the entire admin bundle. Non-super-admins are redirected before
// any admin UI renders — no flash of protected content.

import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Renders children only when the authenticated user is a super_admin.
 * - Still loading  → blank screen (no flash)
 * - Not authed     → redirect to /login (handled by parent App.jsx, but guard
 *                    also handles it in case AdminGuard is reached directly)
 * - Authed, not SA → redirect to /
 * - Super admin    → render children
 */
export default function AdminGuard({ children }) {
  const { user, loading, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.replace('/');
      return;
    }
    if (!isSuperAdmin) {
      window.location.replace('/');
    }
  }, [loading, user, isSuperAdmin]);

  // Show nothing while auth is resolving — prevents any flash.
  if (loading) return null;

  // Not super_admin — render nothing while the redirect fires.
  if (!user || !isSuperAdmin) return null;

  return children;
}
