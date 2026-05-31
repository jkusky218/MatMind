import { useState, useEffect, useCallback } from 'react';
import { supabase, isDemo } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * usePushNotifications
 *
 * @param {object} auth        — auth context (user + profile)
 * @param {string[]} defaultChannels — slugs to subscribe by default (passed from parent)
 *
 * Returns:
 *   supported      — browser supports push
 *   permission     — 'default' | 'granted' | 'denied'
 *   subscribed     — device is currently subscribed
 *   channelPrefs   — string[] of channel slugs the user wants notifs for
 *   loading        — subscribe/unsubscribe in progress
 *   subscribe      — async fn: request permission + subscribe
 *   unsubscribe    — async fn: remove subscription
 *   updateChannelPref(slug, enabled) — toggle one channel on/off, persists to DB
 */
export function usePushNotifications(auth, defaultChannels = ['announcements']) {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager'   in window &&
    'Notification'  in window &&
    !!VAPID_PUBLIC_KEY;

  const [permission,    setPermission]    = useState(() => supported ? Notification.permission : 'denied');
  const [subscribed,    setSubscribed]    = useState(false);
  const [channelPrefs,  setChannelPrefs]  = useState(defaultChannels);
  const [loading,       setLoading]       = useState(false);

  const userId = auth?.user?.id;
  const teamId = auth?.profile?.team_id;

  // On mount: check browser subscription + load channel prefs from DB
  useEffect(() => {
    if (!supported || !userId) return;

    // 1. Check browser push subscription
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    }).catch(() => {});

    // 2. Load channel prefs from Supabase
    if (!isDemo && supabase) {
      supabase
        .from('push_subscriptions')
        .select('channel_prefs')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.channel_prefs?.length) {
            setChannelPrefs(data.channel_prefs);
          }
        });
    }
  }, [supported, userId]);

  const subscribe = async () => {
    if (!supported) return { ok: false, error: 'Push not supported in this browser' };
    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return { ok: false, error: 'Permission not granted' };
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      if (!isDemo && supabase && userId && teamId) {
        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id:       userId,
          team_id:       teamId,
          endpoint:      sub.endpoint,
          subscription:  sub.toJSON(),
          user_agent:    navigator.userAgent.slice(0, 255),
          channel_prefs: defaultChannels,
        }, { onConflict: 'user_id,endpoint' });

        if (error) console.error('MatMind: failed to save push subscription', error.message);
        else setChannelPrefs(defaultChannels);
      }

      setSubscribed(true);
      setLoading(false);
      return { ok: true };
    } catch (err) {
      console.error('MatMind: push subscription failed', err);
      setLoading(false);
      return { ok: false, error: err.message };
    }
  };

  const unsubscribe = async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        if (!isDemo && supabase && userId) {
          await supabase.from('push_subscriptions').delete()
            .eq('user_id', userId).eq('endpoint', sub.endpoint);
        }
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('MatMind: unsubscribe failed', err);
    }
    setLoading(false);
  };

  // Toggle one channel on/off — updates local state + DB immediately
  const updateChannelPref = useCallback(async (slug, enabled) => {
    const next = enabled
      ? [...new Set([...channelPrefs, slug])]
      : channelPrefs.filter(c => c !== slug);

    setChannelPrefs(next);

    if (!isDemo && supabase && userId) {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ channel_prefs: next })
        .eq('user_id', userId);

      if (error) console.error('MatMind: channel pref update failed', error.message);
    }
  }, [channelPrefs, userId]);

  return { supported, permission, subscribed, channelPrefs, loading, subscribe, unsubscribe, updateChannelPref };
}
