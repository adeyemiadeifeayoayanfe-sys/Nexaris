import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { createActivityLog } from './activityService.js';
import type {
  application_status,
  ProfileRecord,
  request_status,
  worker_account_status
} from '../types/database.js';

function mapSearchTerm(search?: string) {
  return search?.trim() ? `%${search.trim()}%` : null;
}

function slugifyPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

async function generateUniqueUsername(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const base =
    [parts[0], parts[parts.length - 1]]
      .filter(Boolean)
      .map(slugifyPart)
      .join('.') || `worker.${Date.now()}`;

  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate = `${base}${suffix}`;
    suffix += 1;
  }
}

async function findAuthUserByEmail(email: string) {
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      throw error;
    }

    const matchedUser = data.users.find((user) => user.email?.toLowerCase() === email);

    if (matchedUser) {
      return matchedUser;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }
}

function authRedirectTo() {
  return new URL('/auth', env.FRONTEND_URL).toString();
}

function isAuthUserActive(user: { email_confirmed_at?: string | null; last_sign_in_at?: string | null }) {
  return Boolean(user.email_confirmed_at || user.last_sign_in_at);
}

async function usernameForWorker(fullName: string, existingProfileId?: string | null) {
  if (existingProfileId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', existingProfileId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.username) {
      return data.username;
    }
  }

  return generateUniqueUsername(fullName);
}

export async function getAdminDashboard() {
  const [requests, projects, applications, workers, completedProjects, openTasks] = await Promise.all([
    supabaseAdmin.from('project_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabaseAdmin.from('job_applications').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'WORKER').eq('status', 'ACTIVE'),
    supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'REJECTED'])
  ]);

  for (const result of [requests, projects, applications, workers, completedProjects, openTasks]) {
    if (result.error) {
      throw result.error;
    }
  }

  const { data: activity, error: activityError } = await supabaseAdmin
    .from('activity_logs')
    .select('id, action, subject_type, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(10);

  if (activityError) {
    throw activityError;
  }

  return {
    cards: {
      pendingRequests: requests.count ?? 0,
      activeProjects: projects.count ?? 0,
      pendingApplications: applications.count ?? 0,
      activeWorkers: workers.count ?? 0,
      completedProjects: completedProjects.count ?? 0,
      openTasks: openTasks.count ?? 0
    },
    recentActivity: activity
  };
}

export async function listAdmins() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, username, full_name, role, status, country, whatsapp_number, created_at')
    .eq('role', 'ADMIN')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAdminAccount(input: {
  email: string;
  fullName: string;
  actorId: string;
  sendInvite: boolean;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existingUser = await findAuthUserByEmail(normalizedEmail);
  let authUserId = existingUser?.id ?? null;

  if (!authUserId && input.sendInvite) {
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          full_name: input.fullName,
          role: 'ADMIN'
        },
        redirectTo: authRedirectTo()
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    authUserId = inviteData.user?.id ?? null;
  }

  if (!authUserId) {
    throw new Error('No existing auth user found for this email. Enable sendInvite to invite them.');
  }

  const username = await usernameForWorker(input.fullName, authUserId);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: authUserId,
        email: normalizedEmail,
        full_name: input.fullName,
        role: 'ADMIN',
        status: 'ACTIVE',
        username
      },
      {
        onConflict: 'id'
      }
    )
    .select('id, email, username, full_name, role, status')
    .single();

  if (profileError) {
    throw profileError;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: 'admin_created',
    subjectType: 'profile',
    subjectId: profile.id,
    metadata: {
      email: normalizedEmail,
      username
    }
  });

  return {
    profile,
    onboarding: {
      email: normalizedEmail,
      inviteSent: input.sendInvite && !existingUser
    }
  };
}

export async function listProjectRequests(filters: { status?: request_status; search?: string }) {
  let query = supabaseAdmin
    .from('project_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const search = mapSearchTerm(filters.search);

  if (search) {
    query = query.or(
      `full_name.ilike.${search},email.ilike.${search},project_title.ilike.${search},company_name.ilike.${search}`
    );
  }

  const { data, error } = await query.limit(50);

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProjectRequestStatus(input: {
  requestId: string;
  status: request_status;
  actorId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('project_requests')
    .update({
      status: input.status,
      reviewed_by: input.actorId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', input.requestId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: `project_request_${input.status.toLowerCase()}`,
    subjectType: 'project_request',
    subjectId: data.id,
    metadata: {
      requestCode: data.request_code,
      projectTitle: data.project_title
    }
  });

  return data;
}

export async function listJobApplications(filters: { status?: application_status; search?: string }) {
  let query = supabaseAdmin
    .from('job_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const search = mapSearchTerm(filters.search);

  if (search) {
    query = query.or(`full_name.ilike.${search},email.ilike.${search},position.ilike.${search}`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    throw error;
  }

  return data;
}

export async function updateApplicationStatus(input: {
  applicationId: string;
  status: application_status;
  actorId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('job_applications')
    .update({
      status: input.status,
      reviewed_by: input.actorId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', input.applicationId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: `job_application_${input.status.toLowerCase()}`,
    subjectType: 'job_application',
    subjectId: data.id,
    metadata: {
      applicationCode: data.application_code,
      position: data.position
    }
  });

  return data;
}

export async function approveApplication(input: {
  applicationId: string;
  actorId: string;
  sendInvite: boolean;
}) {
  const { data: application, error: applicationError } = await supabaseAdmin
    .from('job_applications')
    .select('*')
    .eq('id', input.applicationId)
    .single();

  if (applicationError) {
    throw applicationError;
  }

  if (application.status === 'APPROVED' && application.approved_profile_id) {
    throw new Error('This application has already been approved.');
  }

  const normalizedEmail = String(application.email ?? '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('This application does not have a valid email address.');
  }

  const matchedUser = await findAuthUserByEmail(normalizedEmail);
  let authUserId = matchedUser?.id ?? null;
  let inviteSent = false;
  let accountStatus: worker_account_status = 'NONE';

  if (matchedUser) {
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', matchedUser.id)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile?.role === 'ADMIN') {
      throw new Error('This email already belongs to an admin account and cannot be approved as a worker.');
    }

    if (isAuthUserActive(matchedUser)) {
      accountStatus = 'ACTIVE';
    } else if (input.sendInvite) {
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: authRedirectTo()
      });

      if (resetError) {
        throw resetError;
      }

      inviteSent = true;
      accountStatus = 'INVITATION_SENT';
    } else {
      accountStatus = 'EXISTING_ACCOUNT';
    }
  } else if (input.sendInvite) {
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          full_name: application.full_name,
          role: 'WORKER',
          application_id: application.id
        },
        redirectTo: authRedirectTo()
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    authUserId = inviteData.user?.id ?? null;
    inviteSent = true;
    accountStatus = 'INVITATION_SENT';
  }

  if (!authUserId) {
    throw new Error('Unable to resolve an auth user. Enable invitation sending for new applicants.');
  }

  const username = await usernameForWorker(application.full_name, authUserId);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: authUserId,
        email: normalizedEmail,
        full_name: application.full_name,
        whatsapp_number: application.whatsapp_number,
        country: application.country,
        role: 'WORKER',
        status: 'ACTIVE',
        username
      },
      {
        onConflict: 'id'
      }
    )
    .select('id, email, username, full_name, role, status')
    .single();

  if (profileError) {
    throw profileError;
  }

  const updatePayload: Record<string, string | null> = {
    status: 'APPROVED',
    reviewed_by: input.actorId,
    reviewed_at: new Date().toISOString(),
    approved_profile_id: authUserId,
    account_status: accountStatus
  };

  if (inviteSent) {
    updatePayload.invitation_sent_at = new Date().toISOString();
  }

  if (accountStatus === 'ACTIVE') {
    updatePayload.activated_at = new Date().toISOString();
  }

  const { error: updateApplicationError } = await supabaseAdmin
    .from('job_applications')
    .update(updatePayload)
    .eq('id', input.applicationId);

  if (updateApplicationError) {
    throw updateApplicationError;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: 'job_application_approved',
    subjectType: 'job_application',
    subjectId: application.id,
    metadata: {
      applicationCode: application.application_code,
      approvedProfileId: authUserId,
      username,
      inviteSent,
      accountStatus
    }
  });

  return {
    profile: profile as ProfileRecord,
    onboarding: {
      email: normalizedEmail,
      inviteSent,
      accountStatus
    }
  };
}

export async function resendApplicationInvitation(input: { applicationId: string; actorId: string }) {
  const { data: application, error: applicationError } = await supabaseAdmin
    .from('job_applications')
    .select('*')
    .eq('id', input.applicationId)
    .single();

  if (applicationError) {
    throw applicationError;
  }

  if (application.status !== 'APPROVED') {
    throw new Error('Only approved applications can receive worker activation emails.');
  }

  const normalizedEmail = String(application.email ?? '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('This application does not have a valid email address.');
  }

  const matchedUser = await findAuthUserByEmail(normalizedEmail);

  if (!matchedUser || matchedUser.id !== application.approved_profile_id) {
    throw new Error('This approved application is not linked to the expected worker auth account.');
  }

  if (isAuthUserActive(matchedUser)) {
    const { error: updateError } = await supabaseAdmin
      .from('job_applications')
      .update({
        account_status: 'ACTIVE',
        activated_at: new Date().toISOString()
      })
      .eq('id', input.applicationId);

    if (updateError) {
      throw updateError;
    }

    return {
      email: normalizedEmail,
      inviteSent: false,
      accountStatus: 'ACTIVE' as worker_account_status,
      message: 'This worker account is already active.'
    };
  }

  const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: authRedirectTo()
  });

  if (resetError) {
    throw resetError;
  }

  const { error: updateError } = await supabaseAdmin
    .from('job_applications')
    .update({
      account_status: 'INVITATION_SENT',
      invitation_sent_at: new Date().toISOString()
    })
    .eq('id', input.applicationId);

  if (updateError) {
    throw updateError;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: 'job_application_invitation_resent',
    subjectType: 'job_application',
    subjectId: application.id,
    metadata: {
      applicationCode: application.application_code,
      approvedProfileId: application.approved_profile_id
    }
  });

  return {
    email: normalizedEmail,
    inviteSent: true,
    accountStatus: 'INVITATION_SENT' as worker_account_status,
    message: 'Invitation email resent.'
  };
}

export async function listWorkers(filters: { status?: ProfileRecord['status']; search?: string }) {
  let query = supabaseAdmin
    .from('profiles')
    .select('id, email, username, full_name, role, status, country, whatsapp_number, created_at')
    .eq('role', 'WORKER')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const search = mapSearchTerm(filters.search);

  if (search) {
    query = query.or(`full_name.ilike.${search},email.ilike.${search},username.ilike.${search}`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    throw error;
  }

  return data;
}

export async function updateWorkerStatus(input: {
  workerId: string;
  status: ProfileRecord['status'];
  actorId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      status: input.status
    })
    .eq('id', input.workerId)
    .eq('role', 'WORKER')
    .select('id, email, username, full_name, role, status')
    .single();

  if (error) {
    throw error;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: `worker_${input.status.toLowerCase()}`,
    subjectType: 'profile',
    subjectId: data.id,
    metadata: {
      username: data.username,
      email: data.email
    }
  });

  return data;
}
