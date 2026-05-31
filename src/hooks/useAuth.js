import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isDemo } from '../lib/supabase';

const DEMO_USERS = {
  coach: {
    id: 'demo-coach-001',
    email: 'joey.kusky@gmail.com',
    full_name: 'Joey Kusky',
    role: 'coach',
    team_id: 'a1b2c3d4-0000-0000-0000-000000000001',
  },
  parent: {
    id: 'demo-parent-001',
    email: 'djohnson@email.com',
    full_name: 'Darnell Johnson',
    role: 'parent',
    team_id: 'a1b2c3d4-0000-0000-0000-000000000001',
  },
};

export function useAuth() {
  const [user,         setUser]         = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading,      setLoading]      = useState(true);

  // Tracks the user id we've already loaded a profile for. Supabase fires
  // onAuthStateChange on every tab refocus, token refresh, and realtime
  // reconnect — re-fetching the profile each time churns state and (for super
  // admins) re-triggers team switching, which wipes in-memory channel history.
  // We ignore repeat events for an already-loaded user.
  const handledUserId = useRef(null);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.id ?? null;
      handledUserId.current = id;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newId = session?.user?.id ?? null;

        // Skip repeat events for the same already-loaded user. Only act on a
        // genuine change: a different user signing in, or a sign-out (null).
        if (newId && newId === handledUserId.current) return;

        handledUserId.current = newId;
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else {
          setProfile(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    // Fetch profile + super_admins check in parallel
    const [profileResult, superAdminResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('super_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    ]);

    if (profileResult.error) {
      console.error('MatMind: could not load profile — RLS or missing row?', profileResult.error.message);
    }

    setProfile(profileResult.data ?? null);
    setIsSuperAdmin(!!superAdminResult.data);
    setLoading(false);
  }

  // switchTeam — super admins call this when visiting a different subdomain.
  // Updates the profile's team_id in the DB so Supabase RLS scopes queries correctly.
  const [switching, setSwitching] = useState(false);

  const switchTeam = useCallback(async (newTeamId) => {
    if (!user?.id || isDemo || !supabase || !newTeamId) return;
    setSwitching(true);
    const { error } = await supabase
      .from('profiles')
      .update({ team_id: newTeamId })
      .eq('id', user.id);
    if (error) {
      console.error('MatMind: switchTeam failed', error.message);
    } else {
      setProfile(prev => prev ? { ...prev, team_id: newTeamId } : prev);
    }
    setSwitching(false);
  }, [user?.id]);

  const signIn = useCallback(async (email, password, role) => {
    if (isDemo) {
      const demoUser = DEMO_USERS[role] || DEMO_USERS.coach;
      setUser(demoUser);
      setProfile(demoUser);
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signUp = useCallback(async (email, password, fullName, role) => {
    if (isDemo) {
      return signIn(email, password, role);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    return { data, error };
  }, [signIn]);

  const signOut = useCallback(async () => {
    if (isDemo) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  }, []);

  // resetPassword — sends a password-reset email. Works for any email without
  // being signed in as that user, so it's used both on the login screen
  // ("Forgot password?") and by admins to reset a member's password.
  // The recovery link returns to the current subdomain, where App.jsx detects
  // type=recovery in the hash and shows SetPasswordPage.
  const resetPassword = useCallback(async (email) => {
    if (!email?.trim()) return { ok: false, error: 'Email is required' };
    if (isDemo || !supabase) return { ok: true }; // demo: pretend it sent
    // Trailing slash matters: Supabase's "https://*.mat-mind.com/**" allow-list
    // pattern requires a path, so a bare origin can fail to match and fall back
    // to the Site URL. Appending "/" guarantees it matches /**.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/',
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  return {
    user,
    profile,
    loading,
    switching,
    signIn,
    signUp,
    signOut,
    switchTeam,
    resetPassword,
    isDemo,
    isSuperAdmin,
    isCoach: isSuperAdmin || profile?.role === 'coach' || profile?.role === 'admin',
  };
}
