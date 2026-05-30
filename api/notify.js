// MatMind Push Notifications — Vercel Serverless Function
// Sends a push notification to all subscribed devices for a team.
// Uses VAPID keys for authentication; private key is server-side only.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'https://mat-mind-bay.vercel.app',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

function makeAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, url = '/', teamId, targetRole } = req.body ?? {};
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  if (!teamId)         return res.status(400).json({ error: 'teamId is required' });

  let admin;
  try { admin = makeAdminClient(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Fetch all subscriptions for this team
  let query = admin
    .from('push_subscriptions')
    .select('subscription, user_id')
    .eq('team_id', teamId);

  if (targetRole && targetRole !== 'all') {
    // Filter by role — join to profiles
    const { data: profileIds } = await admin
      .from('profiles')
      .select('id')
      .eq('team_id', teamId)
      .eq('role', targetRole);
    const ids = (profileIds ?? []).map(p => p.id);
    if (ids.length === 0) return res.status(200).json({ sent: 0, failed: 0 });
    query = query.in('user_id', ids);
  }

  const { data: subs, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  if (!subs?.length) return res.status(200).json({ sent: 0, failed: 0, message: 'No subscribers found' });

  const payload = JSON.stringify({ title, body, url, tag: 'matmind-alert' });

  let sent = 0, failed = 0;
  const staleEndpoints = [];

  await Promise.allSettled(
    subs.map(async ({ subscription, user_id }) => {
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        // 410 Gone = subscription expired/unsubscribed — clean it up
        if (err.statusCode === 410) {
          staleEndpoints.push(subscription.endpoint);
        }
        console.error('Push send failed:', err.statusCode, err.message);
      }
    })
  );

  // Clean up stale subscriptions
  if (staleEndpoints.length > 0) {
    await admin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  return res.status(200).json({ sent, failed, total: subs.length });
}
