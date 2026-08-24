import { supabaseAdmin } from '../config/supabase.js';
import { createActivityLog } from './activityService.js';
import type {
  application_status,
  ProfileRecord,
  request_status
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
  const username = await generateUniqueUsername(input.fullName);
  let authUserId: string | null = null;

  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listError) {
    throw listError;
  }

  const matchedUser = usersData.users.find((user) => user.email?.toLowerCase() === normalizedEmail);

  if (matchedUser) {
    authUserId = matchedUser.id;
  } else if (input.sendInvite) {
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          full_name: input.fullName,
          role: 'ADMIN'
        },
        redirectTo: '/auth'
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    authUserId = inviteData.user?.id ?? null;
  } else {
    throw new Error('No existing auth user found for this email. Enable sendInvite to invite them.');
  }

  if (!authUserId) {
    throw new Error('Unable to resolve an auth user for this admin.');
  }

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
      inviteSent: input.sendInvite && !matchedUser
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

  const username = await generateUniqueUsername(application.full_name);

  let authUserId: string | null = null;

  if (input.sendInvite) {
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: {
          full_name: application.full_name
        },
        redirectTo: `${new URL('../auth', 'http://localhost').pathname}`
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    authUserId = inviteData.user?.id ?? null;
  } else {
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200
    });

    if (listError) {
      throw listError;
    }

    const matchedUser = usersData.users.find((user) => user.email?.toLowerCase() === application.email.toLowerCase());
    authUserId = matchedUser?.id ?? null;
  }

  if (!authUserId) {
    throw new Error('Unable to resolve an auth user for this application approval.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: authUserId,
        email: application.email,
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

  const { error: updateApplicationError } = await supabaseAdmin
    .from('job_applications')
    .update({
      status: 'APPROVED',
      reviewed_by: input.actorId,
      reviewed_at: new Date().toISOString(),
      approved_profile_id: authUserId
    })
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
      username
    }
  });

  return {
    profile: profile as ProfileRecord,
    onboarding: {
      email: application.email,
      inviteSent: input.sendInvite
    }
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
