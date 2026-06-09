// MatMind Team Branding — Public Vercel Serverless Function
// GET /api/team?slug=lovett
//
// Returns public team branding info (name, colors, mascot) so the login
// screen can display team-specific UI before the user has authenticated.
// No auth required — only non-sensitive presentation data is returned.

import { createClient } from '@supabase/supabase-js';

function makeAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 60s — team branding rarely changes
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug?.trim()) return res.status(400).json({ error: 'slug is required' });

  let admin;
  try { admin = makeAdminClient(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Join teams + team_settings to get all branding in one query
  const { data: team, error } = await admin
    .from('teams')
    .select(`
      id,
      name,
      school,
      mascot,
      primary_color,
      secondary_color,
      accent_color,
      team_settings ( team_name, logo_url, primary_color, secondary_color )
    `)
    .eq('slug', slug.trim().toLowerCase())
    .single();

  if (error || !team) {
    return res.status(404).json({ error: `No team found for slug "${slug}"` });
  }

  // team_settings overrides the base teams columns if present
  const settings = Array.isArray(team.team_settings)
    ? team.team_settings[0]
    : team.team_settings;

  return res.status(200).json({
    teamId:         team.id,
    teamName:       settings?.team_name       || team.name,
    school:         team.school               || '',
    mascot:         team.mascot               || '',
    primaryColor:   settings?.primary_color   || team.primary_color   || '#1B3A5C',
    secondaryColor: settings?.secondary_color || team.secondary_color || '#6BADE4',
    accentColor:    team.accent_color         || '#C4A44A',
    logoUrl:        settings?.logo_url        || null,
    slug,
  });
}
