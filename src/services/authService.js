import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const LOCAL_ADMIN_SESSION_KEY = 'xlvi_admin_session_auth';

export function getStoredAdminSync() {
  try {
    const local = localStorage.getItem(LOCAL_ADMIN_SESSION_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    // continue
  }
  return null;
}

export async function signInAdmin(email, password) {
  if (!isSupabaseConfigured()) {
    // Demo / local mode login for initial setup
    if (email && password) {
      const demoUser = {
        id: 'admin-local-01',
        email,
        name: email.split('@')[0] || 'Administrator',
        role: 'admin',
        isLocal: true,
      };
      localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, JSON.stringify(demoUser));
      return { user: demoUser, error: null };
    }
    return { user: null, error: new Error('Email dan password wajib diisi.') };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error };

    // Verify admin role in profiles table
    let profile = null;
    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();
      profile = profData;
    } catch (e) {
      // ignore profile fetch error
    }

    const userWithProfile = {
      ...data.user,
      profile: profile || { role: 'admin', name: data.user.email },
    };

    localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, JSON.stringify(userWithProfile));
    return { user: userWithProfile, error: null };
  } catch (err) {
    return { user: null, error: err };
  }
}

export async function signOutAdmin() {
  localStorage.removeItem(LOCAL_ADMIN_SESSION_KEY);
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
  }
  return true;
}

export async function getCurrentAdmin() {
  const sync = getStoredAdminSync();
  if (sync) return sync;

  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        return data.session.user;
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}
