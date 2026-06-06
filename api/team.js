// Public endpoint — no auth required.
// Returns { team_id, name, branding } for a given subdomain slug.
// Used pre-login so the login page can display team branding.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: 'Server not configured' });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name, school, mascot, primary_color, secondary_color, accent_color')
    .eq('slug', slug)
    .single();

  if (error || !team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  return res.status(200).json({
    team_id:   team.id,
    name:      team.name,
    branding: {
      primaryColor:   team.primary_color   ?? '#1B3A5C',
      secondaryColor: team.secondary_color ?? '#6BADE4',
      accentColor:    team.accent_color    ?? '#C4A44A',
      school:         team.school,
      mascot:         team.mascot,
    },
  });
}
