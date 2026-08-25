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

export async function markWorkerApplicationActivated(userId: string) {
  const { error } = await supabaseAdmin
    .from('job_applications')
    .update({
      account_status: 'ACTIVE',
      activated_at: new Date().toISOString()
    })
    .eq('approved_profile_id', userId)
    .eq('status', 'APPROVED')
    .neq('account_status', 'ACTIVE');

  if (error) {
    throw error;
  }
}
