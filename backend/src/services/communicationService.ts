import { supabaseAdmin } from '../config/supabase.js';
import type { notification_type, app_role } from '../types/database.js';
import { createActivityLog } from './activityService.js';

type Viewer = {
  userId: string;
  role: app_role;
};

async function assertProjectAccess(projectId: string, viewer: Viewer) {
  if (viewer.role === 'ADMIN') {
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', viewer.userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('You do not have permission to access this project.');
  }
}

export async function createNotification(input: {
  recipientId: string;
  actorId?: string | null;
  type: notification_type;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  if (input.recipientId === input.actorId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      recipient_id: input.recipientId,
      actor_id: input.actorId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {}
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listNotifications(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(id, full_name, email, username)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    throw error;
  }

  return data;
}

export async function markNotificationsRead(userId: string, notificationIds?: string[]) {
  let query = supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);

  if (notificationIds?.length) {
    query = query.in('id', notificationIds);
  }

  const { data, error } = await query.select('*');

  if (error) {
    throw error;
  }

  return data;
}

export async function listProjectMessages(projectId: string, viewer: Viewer) {
  await assertProjectAccess(projectId, viewer);

  const { data, error } = await supabaseAdmin
    .from('project_messages')
    .select('*, sender:profiles!project_messages_sender_id_fkey(id, full_name, email, username, role)')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    throw error;
  }

  return data;
}

async function listProjectNotificationRecipients(projectId: string, senderId: string) {
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('created_by')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw projectError;
  }

  const { data: members, error: membersError } = await supabaseAdmin
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('status', 'ACTIVE');

  if (membersError) {
    throw membersError;
  }

  return [
    ...new Set([project.created_by, ...(members ?? []).map((member) => member.user_id)].filter((id) => id && id !== senderId))
  ];
}

export async function sendProjectMessage(input: {
  projectId: string;
  body: string;
  parentMessageId?: string;
  mentions: string[];
  viewer: Viewer;
}) {
  await assertProjectAccess(input.projectId, input.viewer);

  const { data: message, error } = await supabaseAdmin
    .from('project_messages')
    .insert({
      project_id: input.projectId,
      sender_id: input.viewer.userId,
      parent_message_id: input.parentMessageId ?? null,
      body: input.body,
      mentions: input.mentions
    })
    .select('*, sender:profiles!project_messages_sender_id_fkey(id, full_name, email, username, role)')
    .single();

  if (error) {
    throw error;
  }

  const recipients = await listProjectNotificationRecipients(input.projectId, input.viewer.userId);

  await Promise.all(
    recipients.map((recipientId) =>
      createNotification({
        recipientId,
        actorId: input.viewer.userId,
        type: input.mentions.includes(recipientId) ? 'MENTION' : 'PROJECT_MESSAGE',
        title: input.mentions.includes(recipientId) ? 'You were mentioned' : 'New project message',
        body: input.body.slice(0, 220),
        data: {
          projectId: input.projectId,
          messageId: message.id
        }
      })
    )
  );

  await createActivityLog({
    actorId: input.viewer.userId,
    action: 'project_message_sent',
    subjectType: 'project_message',
    subjectId: message.id,
    projectId: input.projectId
  });

  return message;
}
