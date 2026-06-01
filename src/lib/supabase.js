import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── User Profile Helpers ──────────────────────────────────────────────────────

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  // PGRST116 = "no rows" (a genuinely missing profile, not a failure).
  // Anything else (e.g. 42P17 infinite recursion in an RLS policy) means the
  // read was BLOCKED — surface it so it isn't mistaken for "not approved".
  if (error && error.code !== 'PGRST116') {
    console.error('[Auth] profile read failed:', error.code, error.message);
  }
  return { data: data || null, error: error || null };
}

export async function upsertUserProfile(profile) {
  const { data } = await supabase
    .from('user_profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
  return data || null;
}

export async function updateUserProfile(userId, updates) {
  const { data } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  return data || null;
}

export async function fetchAllProfiles() {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at');
  return data || [];
}

export async function deleteUserProfile(userId) {
  await supabase.from('user_profiles').delete().eq('id', userId);
}
