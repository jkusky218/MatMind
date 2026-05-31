// useTeamSettings — fetches configurable team branding + group settings
// from the team_settings table. Falls back to demo values when running in
// demo mode or before the row loads.
// updateSettings(updates) lets admins write changes back to the DB.

import { useState, useEffect, useCallback } from 'react';
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
  const firstWord = (row.team_name || '').split(' ')[0];
  return {
    teamName:            row.team_name            || 'My Team',
    school:              firstWord                || 'School',
    gymName:             firstWord ? `${firstWord} Gym` : 'Team Gym',
    primaryColor:        row.primary_color        || '#1B3A5C',
    secondaryColor:      row.secondary_color      || '#6BADE4',
    mascot:              row.mascot               || '',
    mascotEmoji:         row.mascot_emoji         || '🏆',
    groups:              Array.isArray(row.groups) ? row.groups : DEMO_SETTINGS.groups,
    notificationSettings: row.notification_settings || {},
  };
}

export function useTeamSettings(auth) {
  const [settings, setSettings] = useState(DEMO_SETTINGS);
  const [rawRow,   setRawRow]   = useState({});
  const [loading,  setLoading]  = useState(false);

  const teamId = auth?.profile?.team_id;

  useEffect(() => {
    if (isDemo || !supabase || !teamId) return;

    setLoading(true);
    supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', teamId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setRawRow(data);
          setSettings(normalizeSettings(data));
        }
        setLoading(false);
      });
  }, [teamId]);

  // updateSettings — partial update, optimistic, persisted to Supabase.
  // Accepts friendly keys (teamName, primaryColor, secondaryColor, groups).
  const updateSettings = useCallback(async (updates) => {
    // Map friendly keys → DB column names
    const dbUpdates = {};
    if (updates.teamName      !== undefined) dbUpdates.team_name      = updates.teamName;
    if (updates.primaryColor   !== undefined) dbUpdates.primary_color   = updates.primaryColor;
    if (updates.secondaryColor !== undefined) dbUpdates.secondary_color = updates.secondaryColor;
    if (updates.groups         !== undefined) dbUpdates.groups          = updates.groups;

    // Optimistic update — apply immediately to local state
    const newRaw = { ...rawRow, ...dbUpdates };
    setRawRow(newRaw);
    setSettings(normalizeSettings(newRaw));

    if (isDemo || !supabase || !teamId) return { ok: true }; // demo mode: local only

    const { error } = await supabase
      .from('team_settings')
      .update(dbUpdates)
      .eq('team_id', teamId);

    if (error) {
      console.error('MatMind: settings update failed', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [rawRow, teamId]);

  return { settings, loading, updateSettings };
}
