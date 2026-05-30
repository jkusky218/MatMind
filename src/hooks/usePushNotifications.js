import { useState, useEffect } from 'react';
import { supabase, isDemo } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** Convert a URL-safe base64 VAPID key to a Uint8Array for the browser API. */
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
 * Returns:
 *   supported  — true if the browser supports push notifications
 *   permission — 'default' | 'granted' | 'denied'
 *   subscribed — true if the current device is subscribed
 *   subscribe  — async fn to request permission + subscribe
 *   unsubscribe — async fn to remove the subscription
 */
export function usePushNotifications(auth) {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager'   in window &&
    'Notification'  in window &&
    !!VAPID_PUBLIC_KEY;

  const [permission,  setPermission]  = useState(() =>
    supported ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed]  = useState(false);
  const [loading,    setLoading]     = useState(false);

  // On mount, check if already subscribed
  useEffect(() => {
    if (!supported || !auth?.user) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    }).catch(() => {});
  }, [supported, auth?.user]);

  const subscribe = async () => {
    if (!supported) return { ok: false, error: 'Push not supported in this browser' };
    setLoading(true);

    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return { ok: false, error: 'Permission not granted' };
      }

      // 2. Subscribe via the service worker
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 3. Save subscription to Supabase
      if (!isDemo && supabase && auth?.user?.id && auth?.profile?.team_id) {
        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id:      auth.user.id,
          team_id:      auth.profile.team_id,
          endpoint:     sub.endpoint,
          subscription: sub.toJSON(),
          user_agent:   navigator.userAgent.slice(0, 255),
        }, { onConflict: 'user_id,endpoint' });

        if (error) console.error('MatMind: failed to save push subscription', error.message);
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
        // Remove from Supabase first
        if (!isDemo && supabase && auth?.user?.id) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', auth.user.id)
            .eq('endpoint', sub.endpoint);
        }
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('MatMind: unsubscribe failed', err);
    }
    setLoading(false);
  };

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
