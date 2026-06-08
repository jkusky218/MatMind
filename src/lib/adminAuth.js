// adminAuth.js — server-side super_admin verification
// Used by every api/admin/* Vercel serverless function.
// Call requireSuperAdmin(req, res) as the first thing in every admin handler.
// Returns { userId } on success, or sends a 403 response and returns null.

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Verify the request carries a valid super_admin JWT.
 *
 * Steps:
 *  1. Extract Bearer token from Authorization header.
 *  2. Verify it with Supabase auth.getUser() (validates signature + expiry).
 *  3. Check the super_admins table for that user_id (using service role).
 *
 * @returns {{ userId: string }} on success
 * @returns {null} after sending a 401 or 403 response on failure
 */
export async function requireSuperAdmin(req, res) {
  // ── 1. Extract token ────────────────────────────────────────────────────────
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return null;
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[adminAuth] service client error:', err.message);
    res.status(500).json({ error: 'Server configuration error' });
    return null;
  }

  // ── 2. Verify JWT ───────────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  // ── 3. Check super_admins table ─────────────────────────────────────────────
  const { data: adminRow, error: adminError } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    console.error('[adminAuth] super_admins lookup error:', adminError.message);
    res.status(500).json({ error: 'Authorization check failed' });
    return null;
  }

  if (!adminRow) {
    res.status(403).json({ error: 'Forbidden — super_admin access required' });
    return null;
  }

  return { userId: user.id };
}
