import { supabaseAdmin } from '../config/supabase.js';

export async function createActivityLog(input: {
  actorId: string | null;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from('activity_logs').insert({
    actor_id: input.actorId,
    action: input.action,
    subject_type: input.subjectType,
    subject_id: input.subjectId ?? null,
    project_id: input.projectId ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) {
    throw error;
  }
}
