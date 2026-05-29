import { useState, useEffect, useCallback } from 'react';
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
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('MatMind: could not load profile — RLS or missing row?', error.message);
    }
    setProfile(data ?? null);
    setLoading(false);
  }

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

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isDemo,
    isCoach: profile?.role === 'coach' || profile?.role === 'admin',
  };
}
