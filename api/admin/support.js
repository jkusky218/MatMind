// api/admin/support.js — Support queue API for the CEO dashboard
//
// GET  /api/admin/support              → queue metrics + ticket list
// GET  /api/admin/support?id=<uuid>    → single ticket with full thread
// POST /api/admin/support/reply        → { ticketId, message } — agent reply
// POST /api/admin/support/close        → { ticketId } — mark resolved
// POST /api/admin/support/escalate     → { ticketId } — escalate to T3
// POST /api/admin/support/promote-kb   → { ticketId, answer } — add to KB
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

// Infer T1/T2/T3 from status + severity
function inferTier(ticket) {
  if (ticket.status === 'escalated') return 'T3';
  if (ticket.status === 'in_progress') return 'T2';
  return 'T1';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  const supabase = getServiceClient();

  // ── POST actions ─────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, ticketId, message, answer } = req.body ?? {};
    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });

    if (action === 'reply') {
      if (!message?.trim()) return res.status(400).json({ error: 'message required' });

      // Append agent reply to conversation JSONB
      const { data: ticket, error: fetchErr } = await supabase
        .from('support_tickets')
        .select('conversation')
        .eq('id', ticketId)
        .single();
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });

      const conversation = ticket.conversation ?? [];
      conversation.push({
        role: 'agent',
        content: message.trim(),
        ts: new Date().toISOString(),
        agent_id: admin.userId,
      });

      const { error: updateErr } = await supabase
        .from('support_tickets')
        .update({
          conversation,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (updateErr) return res.status(500).json({ error: updateErr.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'close') {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: admin.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'escalate') {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'escalated', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'promote-kb') {
      if (!answer?.trim()) return res.status(400).json({ error: 'answer required' });

      // Get ticket subject for the KB question field
      const { data: ticket, error: fetchErr } = await supabase
        .from('support_tickets')
        .select('subject, category')
        .eq('id', ticketId)
        .single();
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });

      const { error: kbErr } = await supabase
        .from('knowledge_base')
        .insert({
          title:            ticket.subject ?? 'Support resolution',
          content:          answer.trim(),
          category:         ticket.category ?? 'support',
          source_ticket_id: ticketId,
        });
      if (kbErr) return res.status(500).json({ error: kbErr.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ── GET single ticket ───────────────────────────────────────────────────────
  const ticketId = req.query?.id;
  if (ticketId) {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*, profiles(full_name, email, role), teams(name, slug)')
      .eq('id', ticketId)
      .single();

    if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
    return res.status(200).json({ ticket: { ...ticket, tier: inferTier(ticket) } });
  }

  // ── GET queue + metrics ─────────────────────────────────────────────────────
  const ago7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [ticketsRes, resolvedRes] = await Promise.allSettled([
    supabase
      .from('support_tickets')
      .select('*, profiles(full_name, email), teams(name, slug)')
      .in('status', ['open', 'in_progress', 'escalated'])
      .order('created_at', { ascending: true }), // oldest first

    // For AI resolution rate: resolved T1 tickets in last 7d
    supabase
      .from('support_tickets')
      .select('status, created_at')
      .gte('created_at', ago7d),
  ]);

  const tickets  = ticketsRes.status  === 'fulfilled' ? (ticketsRes.value.data  ?? []) : [];
  const allRecent= resolvedRes.status === 'fulfilled' ? (resolvedRes.value.data ?? []) : [];

  // Annotate tier
  const annotated = tickets.map(t => ({ ...t, tier: inferTier(t) }));

  // Metrics
  const byTier = { T1: 0, T2: 0, T3: 0 };
  for (const t of annotated) byTier[t.tier] = (byTier[t.tier] ?? 0) + 1;

  // AI resolution rate: tickets that stayed 'open' (T1) and got resolved / total opened
  const recentT1Opened   = allRecent.filter(t => t.status !== 'escalated' && t.status !== 'in_progress').length;
  const recentT1Resolved = allRecent.filter(t => t.status === 'resolved').length;
  const aiResolutionRate = recentT1Opened > 0
    ? Math.round((recentT1Resolved / allRecent.length) * 100)
    : null;

  // Median first-response time (proxy: updated_at - created_at for in_progress/resolved tickets)
  const responseTimes = tickets
    .filter(t => t.updated_at && t.updated_at !== t.created_at)
    .map(t => new Date(t.updated_at) - new Date(t.created_at))
    .sort((a, b) => a - b);
  const medianResponseMs = responseTimes.length
    ? responseTimes[Math.floor(responseTimes.length / 2)]
    : null;
  const medianResponseMin = medianResponseMs
    ? Math.round(medianResponseMs / 60000)
    : null;

  // Oldest open ticket age
  const oldestTicket = annotated[0];
  const oldestAgeHours = oldestTicket
    ? Math.round((Date.now() - new Date(oldestTicket.created_at)) / 3600000)
    : null;

  return res.status(200).json({
    tickets: annotated,
    metrics: {
      openTotal: annotated.length,
      byTier,
      aiResolutionRate,
      medianResponseMin,
      oldestAgeHours,
    },
  });
}
