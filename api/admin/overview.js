// api/admin/overview.js — CEO Dashboard overview data
// GET /api/admin/overview
// Returns a single JSON object with summary metrics for all dashboard sections.
// Protected: super_admin only via requireSuperAdmin().

import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '../../src/lib/adminAuth.js';

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth check ──────────────────────────────────────────────────────────────
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return; // requireSuperAdmin already sent the error response

  const supabase = getServiceClient();

  // ── Parallel queries — each wrapped so one failure doesn't kill the page ───
  const [
    tenantResult,
    ticketResult,
    healthResult,
    aiCallResult,
  ] = await Promise.allSettled([
    // Total team count
    supabase.from('teams').select('*', { count: 'exact', head: true }),

    // Open support tickets
    supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),

    // Latest system health row
    supabase
      .from('system_health_log')
      .select('status, latency_ms, checked_at')
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // AI calls in last 24 hours
    supabase
      .from('ai_call_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // ── Safely extract values, defaulting gracefully on any error ──────────────
  const tenantCount = tenantResult.status === 'fulfilled' && !tenantResult.value.error
    ? (tenantResult.value.count ?? 0)
    : 0;

  const openTickets = ticketResult.status === 'fulfilled' && !ticketResult.value.error
    ? (ticketResult.value.count ?? 0)
    : 0;

  const lastHealth = healthResult.status === 'fulfilled' && !healthResult.value.error
    ? (healthResult.value.data ?? { status: 'unknown' })
    : { status: 'unknown' };

  const aiCallsToday = aiCallResult.status === 'fulfilled' && !aiCallResult.value.error
    ? (aiCallResult.value.count ?? 0)
    : 0;

  return res.status(200).json({
    tenantCount,
    openTickets,
    lastHealth,
    aiCallsToday,
  });
}
