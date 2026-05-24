import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── User Profile Helpers ──────────────────────────────────────────────────────

export async function fetchUserProfile(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data || null;
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
