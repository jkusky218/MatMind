// MatMind Push Notifications — Vercel Serverless Function
// Sends push notifications to subscribers of a specific channel,
// excluding the sender so you don't ping yourself.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'https://mat-mind.com',
  process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

function makeAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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

  const {
    title,
    body,
    url = '/',
    teamId,
    channelSlug,   // which channel triggered the notification
    senderUserId,  // exclude this user (don't ping yourself)
    targetUserId,  // when set, send ONLY to this user (used by the "test" button)
  } = req.body ?? {};

  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  if (!teamId)         return res.status(400).json({ error: 'teamId is required' });

  let admin;
  try { admin = makeAdminClient(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Build the subscriptions query
  // - Scoped to this team
  // - channelSlug must be in the subscriber's channel_prefs array
  // - Exclude the sender (don't notify yourself)
  let query = admin
    .from('push_subscriptions')
    .select('subscription, user_id');

  if (targetUserId) {
    // Test mode: deliver to ALL of this user's devices regardless of which team
    // they subscribed under (a super admin's row may carry a stale team_id),
    // ignoring channel prefs and sender exclusion so they can verify delivery.
    query = query.eq('user_id', targetUserId);
  } else {
    query = query.eq('team_id', teamId);
    if (channelSlug) {
      // contains() checks that channel_prefs array includes the slug
      query = query.contains('channel_prefs', [channelSlug]);
    }
    if (senderUserId) {
      query = query.neq('user_id', senderUserId);
    }
  }

  const { data: subs, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  if (!subs?.length) return res.status(200).json({ sent: 0, failed: 0, message: 'No subscribers' });

  // Unique tag per send so iOS reliably alerts on every message instead of
  // silently collapsing repeats to the same channel into one notification.
  const tag = `matmind-${channelSlug || 'alert'}-${Date.now()}`;
  const payload = JSON.stringify({ title, body, url, tag });

  let sent = 0, failed = 0;
  const staleEndpoints = [];

  await Promise.allSettled(
    subs.map(async ({ subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 410) staleEndpoints.push(subscription.endpoint);
        console.error('Push send failed:', err.statusCode, err.message);
      }
    })
  );

  // Clean up expired subscriptions
  if (staleEndpoints.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
  }

  return res.status(200).json({ sent, failed, total: subs.length });
}
