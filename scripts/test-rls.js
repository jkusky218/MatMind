/**
 * RLS isolation smoke test — F01 acceptance criteria #2 & #7.
 *
 * Run with real Supabase credentials:
 *   SUPABASE_URL=... SERVICE_KEY=... TEAM_A_EMAIL=... TEAM_A_PASSWORD=... \
 *   TEAM_B_ID=... node scripts/test-rls.js
 *
 * What it verifies:
 *   - A user authenticated to Team A cannot read athletes belonging to Team B.
 *   - A forged team_id filter in the query still returns 0 rows (RLS ignores it).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SERVICE_KEY       = process.env.SERVICE_KEY;
const TEAM_A_EMAIL      = process.env.TEAM_A_EMAIL;
const TEAM_A_PASSWORD   = process.env.TEAM_A_PASSWORD;
const TEAM_B_ID         = process.env.TEAM_B_ID; // UUID of the OTHER team

if (!SUPABASE_URL || !SERVICE_KEY || !TEAM_A_EMAIL || !TEAM_A_PASSWORD || !TEAM_B_ID) {
  console.error('Missing required env vars. See usage comment at top of file.');
  process.exit(1);
}

// Admin client (bypasses RLS — used only to seed/inspect)
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// User client (subject to RLS)
const userClient = createClient(SUPABASE_URL, process.env.ANON_KEY ?? SERVICE_KEY);

async function run() {
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  ✅  ${label}`);
      passed++;
    } else {
      console.error(`  ❌  ${label}`);
      failed++;
    }
  }

  // ── Sign in as Team A user ────────────────────────────────────────────────
  console.log('\n1. Authenticating as Team A user…');
  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: TEAM_A_EMAIL,
    password: TEAM_A_PASSWORD,
  });
  if (authError) {
    console.error('Auth failed:', authError.message);
    process.exit(1);
  }
  console.log(`   Logged in as ${authData.user.email}`);

  // ── Test 1: natural query returns only own team's athletes ────────────────
  console.log('\n2. Querying athletes (no filter)…');
  const { data: ownAthletes } = await userClient.from('athletes').select('id, team_id');
  const leakA = (ownAthletes ?? []).filter(a => a.team_id === TEAM_B_ID);
  assert('No Team B athletes visible in unfiltered query', leakA.length === 0);

  // ── Test 2: forged team_id filter still returns 0 Team B rows ────────────
  console.log('\n3. Querying athletes with forged team_id filter…');
  const { data: forgedRows } = await userClient
    .from('athletes')
    .select('id, team_id')
    .eq('team_id', TEAM_B_ID);
  assert('Forged team_id filter returns 0 rows', (forgedRows ?? []).length === 0);

  // ── Test 3: channels isolation ────────────────────────────────────────────
  console.log('\n4. Querying channels for Team B…');
  const { data: channels } = await userClient
    .from('channels')
    .select('id, team_id')
    .eq('team_id', TEAM_B_ID);
  assert('No Team B channels visible', (channels ?? []).length === 0);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  await userClient.auth.signOut();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
