// api/admin/tenants.js — Tenant operations API
// GET  /api/admin/tenants           → list all teams with engagement counts
// GET  /api/admin/tenants?id=<uuid> → single team detail view
// POST /api/admin/tenants/deactivate { teamId } → soft-deactivate a team
//
// All routes: super_admin only.

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  const supabase = getServiceClient();

  // ── POST /api/admin/tenants/deactivate ──────────────────────────────────────
  if (req.method === 'POST') {
    const { teamId, active } = req.body ?? {};
    if (!teamId) return res.status(400).json({ error: 'teamId required' });

    const { error } = await supabase
      .from('teams')
      .update({ active: active ?? false })
      .eq('id', teamId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ── GET /api/admin/tenants?id=<uuid> — single team detail ──────────────────
  const teamId = req.query?.id;
  if (teamId) return getTeamDetail(req, res, supabase, teamId);

  // ── GET /api/admin/tenants — full list ──────────────────────────────────────
  return getTeamList(req, res, supabase);
}

// ── Team list ─────────────────────────────────────────────────────────────────
async function getTeamList(req, res, supabase) {
  const now      = new Date();
  const ago7d    = new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString();
  const ago14d   = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const ago30d   = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all teams
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, slug, active, plan_tier, created_at')
    .order('created_at', { ascending: false });

  if (teamsErr) return res.status(500).json({ error: teamsErr.message });

  if (!teams?.length) return res.status(200).json({ teams: [] });

  const teamIds = teams.map(t => t.id);

  // Parallel: athlete counts, coach counts, last-login per team
  const [athleteRes, coachRes, profileRes] = await Promise.allSettled([
    supabase
      .from('athletes')
      .select('team_id', { count: 'exact' })
      .in('team_id', teamIds),

    supabase
      .from('coaches')
      .select('team_id', { count: 'exact' })
      .in('team_id', teamIds),

    // Last sign-in per team via profiles joined to auth.users
    // We use profiles.updated_at as a proxy for activity (updated on login)
    supabase
      .from('profiles')
      .select('team_id, updated_at')
      .in('team_id', teamIds)
      .order('updated_at', { ascending: false }),
  ]);

  // Build lookup maps
  const athleteCounts = {};
  const coachCounts   = {};
  const lastActive    = {};

  if (athleteRes.status === 'fulfilled' && athleteRes.value.data) {
    for (const row of athleteRes.value.data) {
      athleteCounts[row.team_id] = (athleteCounts[row.team_id] ?? 0) + 1;
    }
  }

  if (coachRes.status === 'fulfilled' && coachRes.value.data) {
    for (const row of coachRes.value.data) {
      coachCounts[row.team_id] = (coachCounts[row.team_id] ?? 0) + 1;
    }
  }

  if (profileRes.status === 'fulfilled' && profileRes.value.data) {
    for (const row of profileRes.value.data) {
      // Keep only the most recent per team
      if (!lastActive[row.team_id]) lastActive[row.team_id] = row.updated_at;
    }
  }

  const enriched = teams.map(t => {
    const last = lastActive[t.id] ?? null;
    const atRisk = last ? last < ago14d : true; // never logged in = at risk
    return {
      ...t,
      athleteCount: athleteCounts[t.id] ?? 0,
      coachCount:   coachCounts[t.id]   ?? 0,
      lastActive:   last,
      atRisk,
    };
  });

  return res.status(200).json({ teams: enriched });
}

// ── Team detail ───────────────────────────────────────────────────────────────
async function getTeamDetail(req, res, supabase, teamId) {
  const now   = new Date();
  const ago7d = new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString();
  const ago30d= new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    teamRes,
    athleteRes,
    parentRes,
    coachRes,
    eventRes,
    messageRes,
    aiRes,
    availRes,
  ] = await Promise.allSettled([
    // Team + settings
    supabase
      .from('teams')
      .select('*, team_settings(team_name, logo_url, primary_color)')
      .eq('id', teamId)
      .single(),

    // Athlete count
    supabase
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId),

    // Parent count (profiles with role=parent)
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('role', 'parent'),

    // Coach count
    supabase
      .from('coaches')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId),

    // Events in last 30 days
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', ago30d),

    // Messages sent in last 30 days
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', ago30d),

    // AI calls this week + avg token cost
    supabase
      .from('ai_call_log')
      .select('input_tokens, output_tokens, cache_read_tokens')
      .eq('team_id', teamId)
      .gte('created_at', ago7d),

    // Availability RSVP rate across last 5 events
    supabase
      .from('availability')
      .select('status, event_id')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const team         = teamRes.status         === 'fulfilled' ? teamRes.value.data         : null;
  const athleteCount = athleteRes.status      === 'fulfilled' ? (athleteRes.value.count ?? 0)  : 0;
  const parentCount  = parentRes.status       === 'fulfilled' ? (parentRes.value.count  ?? 0)  : 0;
  const coachCount   = coachRes.status        === 'fulfilled' ? (coachRes.value.count   ?? 0)  : 0;
  const eventCount   = eventRes.status        === 'fulfilled' ? (eventRes.value.count   ?? 0)  : 0;
  const messageCount = messageRes.status      === 'fulfilled' ? (messageRes.value.count ?? 0)  : 0;

  // AI usage stats
  const aiRows = aiRes.status === 'fulfilled' ? (aiRes.value.data ?? []) : [];
  const aiCallsThisWeek  = aiRows.length;
  const totalInputTokens = aiRows.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const totalOutputTokens= aiRows.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const avgTokensPerCall = aiCallsThisWeek
    ? Math.round((totalInputTokens + totalOutputTokens) / aiCallsThisWeek)
    : 0;
  // Haiku 4.5 pricing: $1/1M input, $5/1M output
  const estimatedCostUsd = (totalInputTokens / 1_000_000) + (totalOutputTokens * 5 / 1_000_000);

  // RSVP rate
  const availRows    = availRes.status === 'fulfilled' ? (availRes.value.data ?? []) : [];
  const totalRsvps   = availRows.length;
  const confirmed    = availRows.filter(r => r.status === 'confirmed').length;
  const rsvpRate     = totalRsvps ? Math.round((confirmed / totalRsvps) * 100) : null;

  if (!team) return res.status(404).json({ error: 'Team not found' });

  return res.status(200).json({
    team,
    athleteCount,
    parentCount,
    coachCount,
    eventCount30d:    eventCount,
    messageCount30d:  messageCount,
    aiCallsThisWeek,
    avgTokensPerCall,
    estimatedCostUsd: Math.round(estimatedCostUsd * 10000) / 10000,
    rsvpRate,
  });
}
