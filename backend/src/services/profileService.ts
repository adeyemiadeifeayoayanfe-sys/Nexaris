import { supabaseAdmin } from '../config/supabase.js';
import type { ProfileRecord } from '../types/database.js';

export async function getProfileById(userId: string): Promise<ProfileRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, username, full_name, role, status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
