import { supabaseAdmin } from '../config/supabase.js';
import { createActivityLog } from './activityService.js';
import { createNotification } from './communicationService.js';
import type { app_role, task_priority, task_status } from '../types/database.js';

type CreateProjectInput = {
  requestId?: string;
  name: string;
  clientName: string;
  clientEmail?: string;
  clientWhatsapp?: string;
  description: string;
  deadline?: string;
  priority: task_priority;
  technologies: string[];
  notes?: string;
  actorId: string;
};

type AddProjectMemberInput = {
  projectId: string;
  workerId: string;
  projectRole: string;
  canView: boolean;
  canEdit: boolean;
  actorId: string;
};

type CreateTaskInput = {
  projectId: string;
  title: string;
  description?: string;
  assignedWorkerId?: string;
  priority: task_priority;
  status: task_status;
  deadline?: string;
  relatedFileIds: string[];
  actorId: string;
};

type Viewer = {
  userId: string;
  role: app_role;
};

type SaveFileInput = {
  fileId: string;
  content: string;
  lockVersion: number;
  changeSummary?: string;
  viewer: Viewer;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function textOrNull(value?: string) {
  return value?.trim() ? value.trim() : null;
}

async function generateUniqueProjectSlug(name: string) {
  const base = slugify(name) || `project-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function assertProjectAccess(projectId: string, viewer: Viewer) {
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

async function assertProjectEditAccess(projectId: string, viewer: Viewer) {
  if (viewer.role === 'ADMIN') {
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select('permissions')
    .eq('project_id', projectId)
    .eq('user_id', viewer.userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.permissions?.edit !== true) {
    throw new Error('You do not have permission to edit files in this project.');
  }
}

async function ensureDefaultProjectFiles(projectId: string, actorId: string) {
  const defaults = [
    {
      name: 'index.html',
      path: 'index.html',
      extension: 'html',
      mime_type: 'text/html',
      content: '<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Nexaris Project</title>\n    <link rel="stylesheet" href="./style.css" />\n  </head>\n  <body>\n    <main>\n      <h1>Nexaris Project Workspace</h1>\n      <p>Start building from this shared project file.</p>\n    </main>\n    <script src="./script.js"></script>\n  </body>\n</html>\n'
    },
    {
      name: 'style.css',
      path: 'style.css',
      extension: 'css',
      mime_type: 'text/css',
      content: ':root {\n  font-family: Arial, sans-serif;\n  color: #111827;\n  background: #f4f7ff;\n}\n\nbody {\n  margin: 0;\n  padding: 2rem;\n}\n'
    },
    {
      name: 'script.js',
      path: 'script.js',
      extension: 'js',
      mime_type: 'text/javascript',
      content: "console.log('Nexaris project workspace ready.');\n"
    }
  ];

  const { data: assetsFolder, error: assetsError } = await supabaseAdmin
    .from('project_files')
    .upsert(
      {
        project_id: projectId,
        created_by: actorId,
        last_updated_by: actorId,
        name: 'assets',
        path: 'assets',
        kind: 'ASSET',
        is_directory: true,
        permissions: { view: ['*'], edit: ['ADMIN'] }
      },
      { onConflict: 'project_id,path' }
    )
    .select('id')
    .single();

  if (assetsError) {
    throw assetsError;
  }

  for (const file of defaults) {
    const { data, error } = await supabaseAdmin
      .from('project_files')
      .upsert(
        {
          project_id: projectId,
          created_by: actorId,
          last_updated_by: actorId,
          name: file.name,
          path: file.path,
          extension: file.extension,
          mime_type: file.mime_type,
          kind: 'SOURCE',
          is_directory: false,
          content: file.content,
          size_bytes: Buffer.byteLength(file.content, 'utf8'),
          permissions: { view: ['*'], edit: ['ADMIN'] },
          last_saved_at: new Date().toISOString()
        },
        { onConflict: 'project_id,path' }
      )
      .select('id, content')
      .single();

    if (error) {
      throw error;
    }

    const { error: versionError } = await supabaseAdmin.from('file_versions').insert({
      file_id: data.id,
      project_id: projectId,
      version_number: 1,
      changed_by: actorId,
      change_summary: 'Initial project file',
      content: data.content ?? ''
    });

    if (versionError && versionError.code !== '23505') {
      throw versionError;
    }
  }

  return assetsFolder;
}

export async function createProject(input: CreateProjectInput) {
  if (input.requestId) {
    const { data: request, error: requestError } = await supabaseAdmin
      .from('project_requests')
      .select('id, status, project_title')
      .eq('id', input.requestId)
      .single();

    if (requestError) {
      throw requestError;
    }

    if (!['ACCEPTED', 'REVIEWING'].includes(request.status)) {
      throw new Error('Project requests must be accepted or under review before project creation.');
    }
  }

  const slug = await generateUniqueProjectSlug(input.name);
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      request_id: input.requestId ?? null,
      name: input.name,
      slug,
      description: [input.description, textOrNull(input.notes)].filter(Boolean).join('\n\nNotes:\n') || null,
      client_name: input.clientName,
      client_email: textOrNull(input.clientEmail),
      client_whatsapp: textOrNull(input.clientWhatsapp),
      priority: input.priority,
      status: 'PLANNING',
      deadline: input.deadline ?? null,
      technologies: input.technologies,
      notes: textOrNull(input.notes),
      created_by: input.actorId
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await ensureDefaultProjectFiles(project.id, input.actorId);

  if (input.requestId) {
    const { error: requestUpdateError } = await supabaseAdmin
      .from('project_requests')
      .update({
        status: 'ACCEPTED',
        reviewed_by: input.actorId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', input.requestId);

    if (requestUpdateError) {
      throw requestUpdateError;
    }
  }

  await createActivityLog({
    actorId: input.actorId,
    action: 'project_created',
    subjectType: 'project',
    subjectId: project.id,
    projectId: project.id,
    metadata: {
      name: project.name,
      slug: project.slug,
      requestId: input.requestId ?? null
    }
  });

  return project;
}

export async function listAdminProjects() {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data;
}

export async function listAdminTasks() {
  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select('*, projects(id, name, status)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const workerIds = [
    ...new Set((tasks ?? []).map((task) => task.assigned_worker_id).filter((id): id is string => Boolean(id)))
  ];

  if (!workerIds.length) {
    return (tasks ?? []).map((task) => ({ ...task, profiles: null }));
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, username')
    .in('id', workerIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (tasks ?? []).map((task) => ({
    ...task,
    profiles: task.assigned_worker_id ? profilesById.get(task.assigned_worker_id) ?? null : null
  }));
}

export async function listWorkerProjects(workerId: string) {
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select('project_id, project_role, permissions, status, projects(*)')
    .eq('user_id', workerId)
    .eq('status', 'ACTIVE')
    .order('joined_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getProjectWorkspace(projectId: string, viewer: Viewer) {
  await assertProjectAccess(projectId, viewer);

  const [projectResult, filesResult, membersResult, tasksResult] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('id', projectId).single(),
    supabaseAdmin
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .neq('status', 'DELETED')
      .order('path', { ascending: true }),
    supabaseAdmin
      .from('project_members')
      .select('id, user_id, project_role, permissions, status, joined_at, profiles(id, email, username, full_name, status)')
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true }),
    supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
  ]);

  for (const result of [projectResult, filesResult, membersResult, tasksResult]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    project: projectResult.data,
    files: filesResult.data,
    members: membersResult.data,
    tasks: tasksResult.data
  };
}

export async function addProjectMember(input: AddProjectMemberInput) {
  const { data: worker, error: workerError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, status')
    .eq('id', input.workerId)
    .eq('role', 'WORKER')
    .single();

  if (workerError) {
    throw workerError;
  }

  if (worker.status !== 'ACTIVE') {
    throw new Error('Only active workers can be assigned to projects.');
  }

  const { data, error } = await supabaseAdmin
    .from('project_members')
    .upsert(
      {
        project_id: input.projectId,
        user_id: input.workerId,
        project_role: input.projectRole,
        permissions: {
          view: input.canView,
          edit: input.canEdit
        },
        status: 'ACTIVE'
      },
      {
        onConflict: 'project_id,user_id'
      }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: 'project_member_assigned',
    subjectType: 'project_member',
    subjectId: data.id,
    projectId: input.projectId,
    metadata: {
      workerId: input.workerId,
      workerName: worker.full_name,
      projectRole: input.projectRole
    }
  });

  return data;
}

export async function createTask(input: CreateTaskInput) {
  if (input.assignedWorkerId) {
    const { data: member, error: memberError } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', input.projectId)
      .eq('user_id', input.assignedWorkerId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (memberError) {
      throw memberError;
    }

    if (!member) {
      throw new Error('Assigned worker must be an active member of this project.');
    }
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: textOrNull(input.description),
      assigned_worker_id: input.assignedWorkerId ?? null,
      created_by: input.actorId,
      priority: input.priority,
      status: input.status,
      deadline: input.deadline ?? null,
      related_file_ids: input.relatedFileIds
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createActivityLog({
    actorId: input.actorId,
    action: 'task_created',
    subjectType: 'task',
    subjectId: data.id,
    projectId: input.projectId,
    metadata: {
      title: input.title,
      assignedWorkerId: input.assignedWorkerId ?? null
    }
  });

  if (input.assignedWorkerId) {
    await createNotification({
      recipientId: input.assignedWorkerId,
      actorId: input.actorId,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      body: input.title,
      data: {
        projectId: input.projectId,
        taskId: data.id
      }
    });
  }

  return data;
}

export async function listWorkerTasks(workerId: string) {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*, projects(id, name, status)')
    .eq('assigned_worker_id', workerId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTaskAsWorker(taskId: string, workerId: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IN_REVIEW') {
  const updates: Record<string, string | null> = { status };

  if (status === 'IN_REVIEW') {
    updates.submitted_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('assigned_worker_id', workerId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createActivityLog({
    actorId: workerId,
    action: `task_${status.toLowerCase()}`,
    subjectType: 'task',
    subjectId: data.id,
    projectId: data.project_id,
    metadata: {
      title: data.title
    }
  });

  if (status === 'IN_REVIEW') {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('created_by')
      .eq('id', data.project_id)
      .single();

    if (project?.created_by) {
      await createNotification({
        recipientId: project.created_by,
        actorId: workerId,
        type: 'TASK_ASSIGNED',
        title: 'Task submitted for review',
        body: data.title,
        data: {
          projectId: data.project_id,
          taskId: data.id
        }
      });
    }
  }

  return data;
}

export async function updateTaskAsAdmin(input: {
  taskId: string;
  actorId: string;
  status?: task_status;
  priority?: task_priority;
  assignedWorkerId?: string | null;
  reviewFeedback?: string;
}) {
  const updates: Record<string, string | null> = {};

  if (input.status) {
    updates.status = input.status;
    if (['COMPLETED', 'REJECTED'].includes(input.status)) {
      updates.reviewed_by = input.actorId;
      updates.reviewed_at = new Date().toISOString();
    }
  }

  if (input.priority) updates.priority = input.priority;
  if (input.assignedWorkerId !== undefined) updates.assigned_worker_id = input.assignedWorkerId;

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', input.taskId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  if (input.reviewFeedback?.trim()) {
    const { error: commentError } = await supabaseAdmin.from('task_comments').insert({
      task_id: data.id,
      author_id: input.actorId,
      body: input.reviewFeedback.trim()
    });

    if (commentError) {
      throw commentError;
    }
  }

  await createActivityLog({
    actorId: input.actorId,
    action: `task_admin_updated`,
    subjectType: 'task',
    subjectId: data.id,
    projectId: data.project_id,
    metadata: {
      title: data.title,
      status: data.status
    }
  });

  if (data.assigned_worker_id && input.status && ['COMPLETED', 'REJECTED'].includes(input.status)) {
    await createNotification({
      recipientId: data.assigned_worker_id,
      actorId: input.actorId,
      type: input.status === 'COMPLETED' ? 'TASK_APPROVED' : 'TASK_REJECTED',
      title: input.status === 'COMPLETED' ? 'Task approved' : 'Task needs revision',
      body: data.title,
      data: {
        projectId: data.project_id,
        taskId: data.id
      }
    });
  }

  return data;
}

async function nextVersionNumber(fileId: string) {
  const { data, error } = await supabaseAdmin
    .from('file_versions')
    .select('version_number')
    .eq('file_id', fileId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.version_number ?? 0) + 1;
}

export async function saveProjectFile(input: SaveFileInput) {
  const { data: file, error: fileError } = await supabaseAdmin
    .from('project_files')
    .select('*')
    .eq('id', input.fileId)
    .single();

  if (fileError) {
    throw fileError;
  }

  if (file.is_directory) {
    throw new Error('Directories cannot be edited as source files.');
  }

  if (!['html', 'css', 'js'].includes(file.extension ?? '')) {
    throw new Error('Only HTML, CSS, and JavaScript source files can be edited here.');
  }

  await assertProjectEditAccess(file.project_id, input.viewer);

  if (file.lock_version !== input.lockVersion) {
    const error = new Error('This file was changed by another user. Reload before saving.');
    error.name = 'STALE_FILE_VERSION';
    throw error;
  }

  const nextLockVersion = file.lock_version + 1;
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('project_files')
    .update({
      content: input.content,
      size_bytes: Buffer.byteLength(input.content, 'utf8'),
      lock_version: nextLockVersion,
      last_updated_by: input.viewer.userId,
      last_saved_at: now
    })
    .eq('id', input.fileId)
    .eq('lock_version', input.lockVersion)
    .select('*')
    .single();

  if (updateError) {
    throw updateError;
  }

  const versionNumber = await nextVersionNumber(input.fileId);
  const { error: versionError } = await supabaseAdmin.from('file_versions').insert({
    file_id: input.fileId,
    project_id: updated.project_id,
    version_number: versionNumber,
    changed_by: input.viewer.userId,
    change_summary: textOrNull(input.changeSummary) ?? 'Saved file',
    content: input.content
  });

  if (versionError) {
    throw versionError;
  }

  await createActivityLog({
    actorId: input.viewer.userId,
    action: 'file_saved',
    subjectType: 'project_file',
    subjectId: input.fileId,
    projectId: updated.project_id,
    metadata: {
      path: updated.path,
      versionNumber
    }
  });

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('created_by')
    .eq('id', updated.project_id)
    .single();

  if (project?.created_by && project.created_by !== input.viewer.userId) {
    await createNotification({
      recipientId: project.created_by,
      actorId: input.viewer.userId,
      type: 'FILE_UPDATED',
      title: 'Project file updated',
      body: updated.path,
      data: {
        projectId: updated.project_id,
        fileId: input.fileId
      }
    });
  }

  return updated;
}

export async function listFileVersions(fileId: string, viewer: Viewer) {
  const { data: file, error: fileError } = await supabaseAdmin
    .from('project_files')
    .select('id, project_id')
    .eq('id', fileId)
    .single();

  if (fileError) {
    throw fileError;
  }

  await assertProjectAccess(file.project_id, viewer);

  const { data, error } = await supabaseAdmin
    .from('file_versions')
    .select('id, version_number, change_summary, changed_by, created_at')
    .eq('file_id', fileId)
    .order('version_number', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function restoreProjectFileVersion(input: {
  fileId: string;
  versionId: string;
  changeSummary?: string;
  viewer: Viewer;
}) {
  const { data: version, error: versionError } = await supabaseAdmin
    .from('file_versions')
    .select('*')
    .eq('id', input.versionId)
    .eq('file_id', input.fileId)
    .single();

  if (versionError) {
    throw versionError;
  }

  const { data: file, error: fileError } = await supabaseAdmin
    .from('project_files')
    .select('*')
    .eq('id', input.fileId)
    .single();

  if (fileError) {
    throw fileError;
  }

  await assertProjectEditAccess(file.project_id, input.viewer);

  const nextLockVersion = file.lock_version + 1;
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('project_files')
    .update({
      content: version.content,
      size_bytes: Buffer.byteLength(version.content, 'utf8'),
      lock_version: nextLockVersion,
      last_updated_by: input.viewer.userId,
      last_saved_at: new Date().toISOString()
    })
    .eq('id', input.fileId)
    .select('*')
    .single();

  if (updateError) {
    throw updateError;
  }

  const versionNumber = await nextVersionNumber(input.fileId);
  const { error: newVersionError } = await supabaseAdmin.from('file_versions').insert({
    file_id: input.fileId,
    project_id: updated.project_id,
    version_number: versionNumber,
    changed_by: input.viewer.userId,
    change_summary: textOrNull(input.changeSummary) ?? `Restored version ${version.version_number}`,
    content: version.content
  });

  if (newVersionError) {
    throw newVersionError;
  }

  await createActivityLog({
    actorId: input.viewer.userId,
    action: 'file_version_restored',
    subjectType: 'project_file',
    subjectId: input.fileId,
    projectId: updated.project_id,
    metadata: {
      restoredVersion: version.version_number,
      newVersion: versionNumber
    }
  });

  return updated;
}
