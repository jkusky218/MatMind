// api/admin/health.js — System health check endpoint
// GET /api/admin/health
//
// Two callers:
//   1. External uptime monitor (UptimeRobot, BetterUptime, etc.) — no auth required,
//      returns a minimal { status, latency_ms, timestamp } payload.
//   2. CEO Dashboard health page — passes Bearer token, gets the full payload
//      including recent log history.
//
// The endpoint also writes a row to system_health_log on every call so the
// dashboard has a running history without a separate cron job.

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
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  const start = Date.now();

  // ── Ping Supabase ─────────────────────────────────────────────────────────
  let supabaseOk  = false;
  let supabaseErr = null;

  try {
    const supabase = getServiceClient();
    // Lightweight query — just checks connectivity and auth
    const { error } = await supabase.from('teams').select('id').limit(1);
    supabaseOk  = !error;
    supabaseErr = error?.message ?? null;
  } catch (e) {
    supabaseErr = e.message;
  }

  const latency_ms = Date.now() - start;
  const status     = supabaseOk ? 'ok' : 'down';
  const timestamp  = new Date().toISOString();

  // ── Write to system_health_log ────────────────────────────────────────────
  // Fire-and-forget — don't let a log write failure affect the response.
  try {
    const supabase = getServiceClient();
    await supabase.from('system_health_log').insert({
      status,
      latency_ms,
      error_msg: supabaseErr,
    });
  } catch (_) { /* silent — log writes are best-effort */ }

  // ── Minimal public payload (for uptime monitors) ──────────────────────────
  const publicPayload = { status, latency_ms, timestamp };

  // ── Extended payload (for authenticated dashboard calls) ──────────────────
  const hasAuth = !!(req.headers?.authorization);
  if (!hasAuth) {
    // Uptime monitor path — no auth needed, minimal response
    return res.status(supabaseOk ? 200 : 503).json(publicPayload);
  }

  // Verify super_admin for the full dashboard response
  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  // Pull last 48 hours of history for the chart
  let history = [];
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('system_health_log')
      .select('checked_at, status, latency_ms')
      .gte('checked_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: true });
    history = data ?? [];
  } catch (_) { /* best-effort */ }

  // Compute uptime % from history
  const total   = history.length;
  const okCount = history.filter(r => r.status === 'ok').length;
  const uptimePct = total > 0 ? Math.round((okCount / total) * 1000) / 10 : null;

  // p50 / p95 latency from history
  const latencies = history.map(r => r.latency_ms).filter(Boolean).sort((a, b) => a - b);
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : null;
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : null;

  return res.status(200).json({
    ...publicPayload,
    supabaseError: supabaseErr,
    uptimePct,
    p50_ms: p50,
    p95_ms: p95,
    history,
  });
}
