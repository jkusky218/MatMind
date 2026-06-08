// api/admin/analytics.js — Usage analytics for the CEO dashboard
// GET /api/admin/analytics
// Returns DAU/MAU, AI call history (30d), token costs, cache hit rate,
// tool usage breakdown, and feature event counts.
// super_admin only.

import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '../../src/lib/adminAuth.js';

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Haiku 4.5 pricing
const PRICE_INPUT_PER_M  = 1.00;
const PRICE_OUTPUT_PER_M = 5.00;

function tokenCost(inputTokens, outputTokens) {
  return (inputTokens  / 1_000_000) * PRICE_INPUT_PER_M
       + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  const supabase  = getServiceClient();
  const now       = new Date();
  const ago30d    = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ago7d     = new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString();
  const ago1d     = new Date(now - 1  * 24 * 60 * 60 * 1000).toISOString();

  const [aiLogRes, featureRes, profileRes] = await Promise.allSettled([
    // All AI calls in last 30 days
    supabase
      .from('ai_call_log')
      .select('created_at, input_tokens, output_tokens, cache_read_tokens, tool_calls, team_id')
      .gte('created_at', ago30d)
      .order('created_at', { ascending: true }),

    // Feature events last 30 days
    supabase
      .from('feature_events')
      .select('feature, action, created_at, team_id')
      .gte('created_at', ago30d),

    // Active user proxy: distinct profiles updated in window
    supabase
      .from('profiles')
      .select('id, updated_at, team_id'),
  ]);

  const aiRows      = aiLogRes.status      === 'fulfilled' ? (aiLogRes.value.data      ?? []) : [];
  const featureRows = featureRes.status    === 'fulfilled' ? (featureRes.value.data    ?? []) : [];
  const profiles    = profileRes.status    === 'fulfilled' ? (profileRes.value.data    ?? []) : [];

  // ── DAU / MAU (from profiles.updated_at as activity proxy) ──────────────────
  const dauSet = new Set(profiles.filter(p => p.updated_at >= ago1d).map(p => p.id));
  const mauSet = new Set(profiles.filter(p => p.updated_at >= ago30d).map(p => p.id));
  const dau    = dauSet.size;
  const mau    = mauSet.size;
  const dauMauRatio = mau > 0 ? Math.round((dau / mau) * 100) : 0;

  // ── AI calls: daily bucketed for sparkline ──────────────────────────────────
  const dailyAI = {}; // { 'YYYY-MM-DD': { calls, inputTokens, outputTokens, cacheReadTokens } }
  let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCalls = 0;

  for (const row of aiRows) {
    const day = row.created_at.slice(0, 10);
    if (!dailyAI[day]) dailyAI[day] = { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
    dailyAI[day].calls++;
    dailyAI[day].inputTokens      += row.input_tokens      ?? 0;
    dailyAI[day].outputTokens     += row.output_tokens     ?? 0;
    dailyAI[day].cacheReadTokens  += row.cache_read_tokens ?? 0;
    totalInput     += row.input_tokens      ?? 0;
    totalOutput    += row.output_tokens     ?? 0;
    totalCacheRead += row.cache_read_tokens ?? 0;
    totalCalls++;
  }

  // Fill in missing days with zeros for a complete 30-day series
  const aiSparkline = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const bucket = dailyAI[key] ?? { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
    aiSparkline.push({
      date: key,
      calls: bucket.calls,
      costUsd: tokenCost(bucket.inputTokens, bucket.outputTokens),
    });
  }

  // ── Cache hit rate ──────────────────────────────────────────────────────────
  const cacheHitRate = totalInput > 0
    ? Math.round((totalCacheRead / totalInput) * 100)
    : null;

  // ── Tool usage breakdown ────────────────────────────────────────────────────
  const toolCounts = {};
  for (const row of aiRows) {
    if (Array.isArray(row.tool_calls)) {
      for (const tool of row.tool_calls) {
        toolCounts[tool] = (toolCounts[tool] ?? 0) + 1;
      }
    }
  }
  const toolBreakdown = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tool, count]) => ({ tool, count }));

  // ── Feature event breakdown ─────────────────────────────────────────────────
  const featureCounts = {};
  for (const row of featureRows) {
    const key = row.feature;
    featureCounts[key] = (featureCounts[key] ?? 0) + 1;
  }
  const featureBreakdown = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([feature, count]) => ({ feature, count }));

  // ── 7-day and all-time totals ───────────────────────────────────────────────
  const aiRows7d    = aiRows.filter(r => r.created_at >= ago7d);
  const calls7d     = aiRows7d.length;
  const input7d     = aiRows7d.reduce((s, r) => s + (r.input_tokens  ?? 0), 0);
  const output7d    = aiRows7d.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const cost7dUsd   = tokenCost(input7d, output7d);
  const cost30dUsd  = tokenCost(totalInput, totalOutput);

  return res.status(200).json({
    dau,
    mau,
    dauMauRatio,
    totalCalls30d:  totalCalls,
    calls7d,
    cost7dUsd:      Math.round(cost7dUsd  * 10000) / 10000,
    cost30dUsd:     Math.round(cost30dUsd * 10000) / 10000,
    cacheHitRate,
    aiSparkline,      // 30-day daily series for chart
    toolBreakdown,    // [{ tool, count }] sorted desc
    featureBreakdown, // [{ feature, count }] sorted desc
  });
}
