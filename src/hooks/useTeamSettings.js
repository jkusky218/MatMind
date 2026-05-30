// useTeamSettings — fetches configurable team branding + group settings
// from the team_settings table. Falls back to Lovett demo values when
// running in demo mode or before the row loads.

import { useState, useEffect } from 'react';
import { supabase, isDemo } from '../lib/supabase';

export const DEMO_SETTINGS = {
  teamName:       'Lovett Wrestling',
  school:         'Lovett',
  gymName:        'Lovett Gym',
  primaryColor:   '#1B3A5C',
  secondaryColor: '#6BADE4',
  mascot:         'Lions',
  mascotEmoji:    '🦁',
  groups: [
    { id: 'coaches',  label: 'Coaches',  color: '#C4A44A' },
    { id: 'tots',     label: 'Tots',     color: '#7B5EA7' },
    { id: 'beginner', label: 'Beginner', color: '#6BADE4' },
    { id: 'advanced', label: 'Advanced', color: '#1B3A5C' },
  ],
  notificationSettings: {},
};

function normalizeSettings(row) {
  // Derive school from first word of team name (e.g. "Lovett Wrestling" → "Lovett")
  const firstWord = (row.team_name || '').split(' ')[0];
  return {
    teamName:       row.team_name       || 'My Team',
    school:         firstWord           || 'School',
    gymName:        firstWord ? `${firstWord} Gym` : 'Team Gym',
    primaryColor:   row.primary_color   || '#1B3A5C',
    secondaryColor: row.secondary_color || '#6BADE4',
    mascot:         row.mascot          || '',
    mascotEmoji:    row.mascot_emoji    || '🏆',
    groups:         Array.isArray(row.groups) ? row.groups : DEMO_SETTINGS.groups,
    notificationSettings: row.notification_settings || {},
  };
}

export function useTeamSettings(auth) {
  const [settings, setSettings] = useState(DEMO_SETTINGS);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (isDemo || !supabase || !auth?.profile?.team_id) return;

    setLoading(true);
    supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', auth.profile.team_id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setSettings(normalizeSettings(data));
        setLoading(false);
      });
  }, [auth?.profile?.team_id]);

  return { settings, loading };
}
