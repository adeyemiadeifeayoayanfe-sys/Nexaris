import { supabaseAdmin } from '../config/supabase.js';
import { createActivityLog } from './activityService.js';
import { createNotification } from './communicationService.js';
import type { app_role, project_type, task_priority, task_status } from '../types/database.js';

type CreateProjectInput = {
  requestId?: string;
  name: string;
  projectType: project_type;
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



type TemplateFile = {
  path: string;
  content: string;
};

function normalizeTechnology(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasTechnology(technologies: string[], ...names: string[]) {
  const normalized = technologies.map(normalizeTechnology);

  return names.some((name) => {
    const target = normalizeTechnology(name);
    return normalized.some((technology) =>
      technology === target ||
      technology.includes(target) ||
      target.includes(technology)
    );
  });
}

function getTemplateFiles(projectType: project_type, technologies: string[]): TemplateFile[] {
  const hasReact = hasTechnology(technologies, 'react');
  const hasTypeScript = hasTechnology(technologies, 'typescript', 'ts');
  const hasNode = hasTechnology(technologies, 'node.js', 'node', 'express');
  const hasNext = hasTechnology(technologies, 'next.js', 'nextjs');

  const files: TemplateFile[] = [];

  if (projectType === 'Website' || projectType === 'Landing Page') {
    files.push(
      {
        path: 'index.html',
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectType}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main id="app">
      <h1>${projectType}</h1>
      <p>Project workspace ready.</p>
    </main>

    <script src="script.js"></script>
  </body>
</html>
`
      },
      {
        path: 'style.css',
        content: `* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: Arial, sans-serif;
  background: #ffffff;
  color: #111827;
}

main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px;
}
`
      },
      {
        path: 'script.js',
        content: `document.addEventListener('DOMContentLoaded', () => {
  console.log('Project workspace ready.');
});
`
      },
      {
        path: 'assets/.gitkeep',
        content: ''
      }
    );

    return files;
  }

  if (projectType === 'JavaScript Application') {
    files.push(
      {
        path: 'src/index.js',
        content: `function main() {
  console.log('JavaScript application ready.');
}

main();
`
      },
      {
        path: 'README.md',
        content: `# JavaScript Application

Project workspace generated by Nexaris.
`
      },
      {
        path: 'package.json',
        content: `{
  "name": "nexaris-javascript-application",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "start": "node src/index.js"
  }
}
`
      }
    );

    return files;
  }

  if (
    projectType === 'Web Application' ||
    projectType === 'Dashboard' ||
    projectType === 'E-commerce Website' ||
    projectType === 'School Management System'
  ) {
    if (hasNext) {
      files.push(
        {
          path: 'app/page.tsx',
          content: `export default function Page() {
  return (
    <main>
      <h1>${projectType}</h1>
      <p>Project workspace ready.</p>
    </main>
  );
}
`
        },
        {
          path: 'app/layout.tsx',
          content: `import type { ReactNode } from 'react';

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
        }
      );
    } else if (hasReact || hasTypeScript || projectType === 'Web Application' || projectType === 'Dashboard' || projectType === 'E-commerce Website' || projectType === 'School Management System') {
      const extension = hasTypeScript ? 'tsx' : 'jsx';

      files.push(
        {
          path: `src/App.${extension}`,
          content: `export default function App() {
  return (
    <main>
      <h1>${projectType}</h1>
      <p>Project workspace ready.</p>
    </main>
  );
}
`
        },
        {
          path: `src/main.${extension}`,
          content: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`
        },
        {
          path: 'index.html',
          content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectType}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`
        }
      );
    } else {
      files.push(
        {
          path: 'src/index.js',
          content: `document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');

  if (root) {
    root.innerHTML = '<h1>${projectType}</h1>';
  }
});
`
        },
        {
          path: 'index.html',
          content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectType}</title>
  </head>
  <body>
    <main id="app"></main>
    <script src="src/index.js"></script>
  </body>
</html>
`
        }
      );
    }

    files.push({
      path: 'src/components/.gitkeep',
      content: ''
    });

    files.push({
      path: 'README.md',
      content: `# ${projectType}

Project workspace generated by Nexaris.
`
    });

    if (hasNode) {
      files.push(
        {
          path: 'backend/src/index.ts',
          content: `import express from 'express';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(\`Backend running on port \${port}\`);
});
`
        },
        {
          path: 'backend/src/routes/.gitkeep',
          content: ''
        }
      );
    }

    return files;
  }

  if (projectType === 'Business Software') {
    files.push(
      {
        path: 'frontend/src/App.tsx',
        content: `export default function App() {
  return (
    <main>
      <h1>Business Software</h1>
      <p>Project workspace ready.</p>
    </main>
  );
}
`
      },
      {
        path: 'frontend/src/main.tsx',
        content: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`
      },
      {
        path: 'frontend/index.html',
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Business Software</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`
      },
      {
        path: 'backend/src/index.ts',
        content: `import express from 'express';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(\`Backend running on port \${port}\`);
});
`
      },
      {
        path: 'backend/src/routes/.gitkeep',
        content: ''
      },
      {
        path: 'README.md',
        content: `# Business Software

Full-stack project workspace generated by Nexaris.
`
      }
    );

    return files;
  }

  files.push(
    {
      path: 'README.md',
      content: `# Custom Project

This workspace was generated as a custom Nexaris project.

Project type: ${projectType}
`
    },
    {
      path: 'src/.gitkeep',
      content: ''
    }
  );

  return files;
}

async function ensureDefaultProjectFiles(
  projectId: string,
  actorId: string,
  projectType: project_type,
  technologies: string[]
) {
  const templateFiles = getTemplateFiles(projectType, technologies);

  const folderPaths = new Set<string>();

  for (const file of templateFiles) {
    const parts = file.path.split('/');

    if (parts.length > 1) {
      for (let index = 1; index < parts.length; index += 1) {
        folderPaths.add(parts.slice(0, index).join('/'));
      }
    }
  }

  const parentIds = new Map<string, string>();

  const sortedFolders = [...folderPaths].sort(
    (a, b) => a.split('/').length - b.split('/').length
  );

  for (const folderPath of sortedFolders) {
    const parts = folderPath.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/') || null;
    const parentId = parentPath ? parentIds.get(parentPath) ?? null : null;

    const { data, error } = await supabaseAdmin
      .from('project_files')
      .insert({
        project_id: projectId,
        parent_id: parentId,
        created_by: actorId,
        last_updated_by: actorId,
        name,
        path: folderPath,
        extension: null,
        mime_type: null,
        kind: 'ASSET',
        is_directory: true,
        content: null,
        size_bytes: 0,
        permissions: { view: ['*'], edit: ['ADMIN'] }
      })
      .select('id, path')
      .single();

    if (error) {
      throw error;
    }

    parentIds.set(folderPath, data.id);
  }

  const fileRows = templateFiles.map((file) => {
    const extension = getProjectFileExtension(file.path);
    const parts = file.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/') || null;
    const parentId = parentPath ? parentIds.get(parentPath) ?? null : null;
    const content = file.content;

    return {
      project_id: projectId,
      parent_id: parentId,
      created_by: actorId,
      last_updated_by: actorId,
      name,
      path: file.path,
      extension,
      mime_type: getProjectFileMimeType(extension),
      kind: extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)
        ? 'ASSET'
        : 'SOURCE',
      is_directory: false,
      content,
      size_bytes: Buffer.byteLength(content, 'utf8'),
      permissions: { view: ['*'], edit: ['ADMIN'] },
      last_saved_at: new Date().toISOString()
    };
  });

  if (!fileRows.length) {
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('project_files')
    .insert(fileRows)
    .select('id, path, content');

  if (error) {
    throw error;
  }

  const versions = (data ?? []).map((file) => ({
    file_id: file.id,
    project_id: projectId,
    version_number: 1,
    changed_by: actorId,
    change_summary: 'Initial project template',
    content: file.content ?? ''
  }));

  if (versions.length) {
    const { error: versionError } = await supabaseAdmin
      .from('file_versions')
      .insert(versions);

    if (versionError) {
      throw versionError;
    }
  }

  await createActivityLog({
    actorId,
    action: 'project_template_created',
    subjectType: 'project',
    subjectId: projectId,
    projectId,
    metadata: {
      projectType,
      technologies,
      fileCount: fileRows.length,
      folderCount: sortedFolders.length
    }
  });
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
      project_type: input.projectType,
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

  await ensureDefaultProjectFiles(project.id, input.actorId, input.projectType, input.technologies);

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


function getProjectFileExtension(name: string) {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : null;
}

function getProjectFileMimeType(extension: string | null) {
  const mimeTypes: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    jsx: 'text/javascript',
    tsx: 'text/typescript',
    json: 'application/json',
    md: 'text/markdown',
    txt: 'text/plain',
    svg: 'image/svg+xml'
  };

  return extension ? mimeTypes[extension] ?? 'text/plain' : 'text/plain';
}

function normalizeProjectPath(parentPath: string | null, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

async function getProjectFile(fileId: string) {
  const { data, error } = await supabaseAdmin
    .from('project_files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createProjectFile(input: {
  projectId: string;
  name: string;
  parentId?: string | null;
  content?: string;
  viewer: Viewer;
}) {
  await assertProjectEditAccess(input.projectId, input.viewer);

  let parentPath: string | null = null;

  if (input.parentId) {
    const parent = await getProjectFile(input.parentId);

    if (parent.project_id !== input.projectId) {
      throw new Error('Parent folder does not belong to this project.');
    }

    if (!parent.is_directory) {
      throw new Error('Files can only be created inside folders.');
    }

    parentPath = parent.path;
  }

  const path = normalizeProjectPath(parentPath, input.name);
  const extension = getProjectFileExtension(input.name);
  const content = input.content ?? '';

  const { data, error } = await supabaseAdmin
    .from('project_files')
    .insert({
      project_id: input.projectId,
      parent_id: input.parentId ?? null,
      created_by: input.viewer.userId,
      last_updated_by: input.viewer.userId,
      name: input.name,
      path,
      extension,
      mime_type: getProjectFileMimeType(extension),
      kind: extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension) ? 'ASSET' : 'SOURCE',
      is_directory: false,
      content,
      size_bytes: Buffer.byteLength(content, 'utf8'),
      permissions: { view: ['*'], edit: ['ADMIN'] },
      last_saved_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A file or folder with that name already exists here.');
    }

    throw error;
  }

  const { error: versionError } = await supabaseAdmin.from('file_versions').insert({
    file_id: data.id,
    project_id: input.projectId,
    version_number: 1,
    changed_by: input.viewer.userId,
    change_summary: 'Created file',
    content
  });

  if (versionError) {
    throw versionError;
  }

  await createActivityLog({
    actorId: input.viewer.userId,
    action: 'file_created',
    subjectType: 'project_file',
    subjectId: data.id,
    projectId: input.projectId,
    metadata: { path }
  });

  return data;
}

export async function createProjectFolder(input: {
  projectId: string;
  name: string;
  parentId?: string | null;
  viewer: Viewer;
}) {
  await assertProjectEditAccess(input.projectId, input.viewer);

  let parentPath: string | null = null;

  if (input.parentId) {
    const parent = await getProjectFile(input.parentId);

    if (parent.project_id !== input.projectId) {
      throw new Error('Parent folder does not belong to this project.');
    }

    if (!parent.is_directory) {
      throw new Error('Folders can only be created inside folders.');
    }

    parentPath = parent.path;
  }

  const path = normalizeProjectPath(parentPath, input.name);

  const { data, error } = await supabaseAdmin
    .from('project_files')
    .insert({
      project_id: input.projectId,
      parent_id: input.parentId ?? null,
      created_by: input.viewer.userId,
      last_updated_by: input.viewer.userId,
      name: input.name,
      path,
      kind: 'ASSET',
      is_directory: true,
      permissions: { view: ['*'], edit: ['ADMIN'] }
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A file or folder with that name already exists here.');
    }

    throw error;
  }

  await createActivityLog({
    actorId: input.viewer.userId,
    action: 'folder_created',
    subjectType: 'project_file',
    subjectId: data.id,
    projectId: input.projectId,
    metadata: { path }
  });

  return data;
}

export async function renameProjectFile(input: {
  fileId: string;
  name: string;
  viewer: Viewer;
}) {
  const file = await getProjectFile(input.fileId);

  await assertProjectEditAccess(file.project_id, input.viewer);

  const parent = file.parent_id ? await getProjectFile(file.parent_id) : null;
  const newPath = normalizeProjectPath(parent?.path ?? null, input.name);

  if (newPath === file.path && input.name === file.name) {
    return file;
  }

  const { data: collision } = await supabaseAdmin
    .from('project_files')
    .select('id')
    .eq('project_id', file.project_id)
    .eq('path', newPath)
    .neq('id', file.id)
    .maybeSingle();

  if (collision) {
    throw new Error('A file or folder with that name already exists here.');
  }

  const oldPath = file.path;

  const { data: updated, error } = await supabaseAdmin
    .from('project_files')
    .update({
      name: input.name,
      path: newPath,
      extension: file.is_directory ? null : getProjectFileExtension(input.name),
      mime_type: file.is_directory ? null : getProjectFileMimeType(getProjectFileExtension(input.name)),
      last_updated_by: input.viewer.userId
    })
    .eq('id', file.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  if (file.is_directory) {
    const { data: children, error: childrenError } = await supabaseAdmin
      .from('project_files')
      .select('id, path')
      .eq('project_id', file.project_id)
      .like('path', `${oldPath}/%`);

    if (childrenError) {
      throw childrenError;
    }

    for (const child of children ?? []) {
      const childPath = `${newPath}${child.path.slice(oldPath.length)}`;

      const { error: childError } = await supabaseAdmin
        .from('project_files')
        .update({ path: childPath })
        .eq('id', child.id);

      if (childError) {
        throw childError;
      }
    }
  }

  await createActivityLog({
    actorId: input.viewer.userId,
    action: 'file_renamed',
    subjectType: 'project_file',
    subjectId: file.id,
    projectId: file.project_id,
    metadata: {
      oldPath,
      newPath
    }
  });

  return updated;
}

export async function archiveProjectFile(input: {
  fileId: string;
  reason?: string;
  viewer: Viewer;
}) {
  const file = await getProjectFile(input.fileId);

  await assertProjectEditAccess(file.project_id, input.viewer);

  const { data: descendants, error: descendantsError } = await supabaseAdmin
    .from('project_files')
    .select('id')
    .eq('project_id', file.project_id)
    .like('path', `${file.path}/%`);

  if (descendantsError) {
    throw descendantsError;
  }

  const ids = [file.id, ...(descendants ?? []).map((item) => item.id)];

  const { error } = await supabaseAdmin
    .from('project_files')
    .update({
      status: 'DELETED',
      last_updated_by: input.viewer.userId
    })
    .in('id', ids);

  if (error) {
    throw error;
  }

  await createActivityLog({
    actorId: input.viewer.userId,
    action: file.is_directory ? 'folder_archived' : 'file_archived',
    subjectType: 'project_file',
    subjectId: file.id,
    projectId: file.project_id,
    metadata: {
      path: file.path,
      reason: textOrNull(input.reason)
    }
  });

  return {
    id: file.id,
    path: file.path,
    status: 'DELETED'
  };
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
