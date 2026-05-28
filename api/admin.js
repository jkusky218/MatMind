// MatMind Admin API — Vercel Serverless Function
// Uses Supabase service-role key to manage users outside RLS.
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the client.

import { createClient } from '@supabase/supabase-js';

const TEAM_ID = 'a1b2c3d4-0000-0000-0000-000000000001'; // Lovett Wrestling

function makeAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Admin credentials not configured (SUPABASE_SERVICE_ROLE_KEY missing)');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let admin;
  try {
    admin = makeAdminClient();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { action, data } = req.body ?? {};
  if (!action) return res.status(400).json({ error: 'action is required' });

  try {
    switch (action) {
      case 'add_coach':   return res.status(200).json(await addCoach(admin, data));
      case 'add_athlete': return res.status(200).json(await addAthlete(admin, data));
      default:            return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`Admin ${action} error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Find an existing auth user by email, or invite them (sends an email). */
async function resolveAuthUser(admin, email, fullName, role) {
  // List users and search (Supabase doesn't have getUserByEmail in admin API)
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);

  const existing = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) return { userId: existing.id, isNew: false };

  // Not found — send invite
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  });
  if (invErr) throw new Error(`Invite failed for ${email}: ${invErr.message}`);
  return { userId: invited.user.id, isNew: true };
}

/** Upsert a profile row (requires auth user to already exist). */
async function upsertProfile(admin, { userId, name, email, phone, role }) {
  const { error } = await admin.from('profiles').upsert({
    id: userId,
    team_id: TEAM_ID,
    full_name: name,
    email: email.toLowerCase(),
    phone: phone || null,
    role,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw new Error(`Profile upsert: ${error.message}`);
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function addCoach(admin, { name, email, phone, title, group } = {}) {
  if (!name?.trim()) throw new Error('Name is required');
  if (!email?.trim()) throw new Error('Email is required');

  const { userId, isNew } = await resolveAuthUser(admin, email.trim(), name.trim(), 'coach');
  await upsertProfile(admin, { userId, name: name.trim(), email: email.trim(), phone, role: 'coach' });

  const { data: coach, error: coachErr } = await admin
    .from('coaches')
    .upsert({
      team_id: TEAM_ID,
      profile_id: userId,
      title: title?.trim() || 'Coach',
      roster_group: group || null,
      active: true,
    }, { onConflict: 'team_id,profile_id' })
    .select('id, title, roster_group')
    .single();
  if (coachErr) throw new Error(`Coach record: ${coachErr.message}`);

  return {
    success: true,
    coach,
    message: isNew
      ? `Invitation sent to ${email}. They'll receive an email to set their password.`
      : `${name.trim()} has been added to the coaching staff.`,
  };
}

async function addAthlete(admin, { firstName, lastName, weight, grade, school, group, parent1, parent2 } = {}) {
  if (!firstName?.trim()) throw new Error('First name is required');
  if (!lastName?.trim())  throw new Error('Last name is required');
  if (!group)             throw new Error('Roster group is required');

  const { data: athlete, error: athErr } = await admin
    .from('athletes')
    .insert({
      team_id: TEAM_ID,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      weight: weight ? parseFloat(weight) : null,
      grade: grade?.trim() || null,
      school: school?.trim() || 'Lovett',
      roster_group: group,
      active: true,
    })
    .select('id, first_name, last_name, roster_group')
    .single();
  if (athErr) throw new Error(`Athlete insert: ${athErr.message}`);

  // Link parents (best-effort — log warnings, don't fail the whole request)
  const warnings = [];
  for (const [pData, isPrimary] of [[parent1, true], [parent2, false]]) {
    if (!pData?.email?.trim()) continue;
    try {
      const { userId } = await resolveAuthUser(admin, pData.email.trim(), pData.name?.trim() || pData.email, 'parent');
      await upsertProfile(admin, {
        userId,
        name: pData.name?.trim() || pData.email,
        email: pData.email.trim(),
        phone: pData.phone || null,
        role: 'parent',
      });
      const { error: linkErr } = await admin.from('athlete_parents').upsert({
        athlete_id: athlete.id,
        parent_id: userId,
        is_primary: isPrimary,
        relationship: 'Parent/Guardian',
      }, { onConflict: 'athlete_id,parent_id' });
      if (linkErr) warnings.push(`Parent link (${pData.email}): ${linkErr.message}`);
    } catch (err) {
      warnings.push(`Parent (${pData.email}): ${err.message}`);
    }
  }

  return {
    success: true,
    athlete,
    warnings: warnings.length ? warnings : undefined,
    message: `${firstName.trim()} ${lastName.trim()} added to ${group}.${warnings.length ? ' Some parent invites failed — check warnings.' : ''}`,
  };
}
