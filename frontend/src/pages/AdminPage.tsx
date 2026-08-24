import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { useAuth } from '../hooks/useAuth';
import type { AuthProfile } from '../types';

type AdminSection = 'dashboard' | 'requests' | 'applications' | 'projects' | 'workers' | 'admins' | 'activity';

type DashboardData = {
  cards: {
    pendingRequests: number;
    activeProjects: number;
    pendingApplications: number;
    activeWorkers: number;
    completedProjects: number;
    openTasks: number;
  };
  recentActivity: ActivityRow[];
  capabilities: {
    canManageAdmins: boolean;
  };
};

type ActivityRow = {
  id: string;
  action: string;
  subject_type: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

type ProjectRequestRow = {
  id: string;
  request_code: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  company_name: string | null;
  country: string | null;
  project_title: string;
  project_type: string;
  project_description: string;
  required_features: string | null;
  estimated_budget: string | null;
  expected_timeline: string | null;
  existing_design: boolean | null;
  reference_website: string | null;
  additional_information: string | null;
  status: string;
  created_at: string;
};

type ApplicationRow = {
  id: string;
  application_code: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  country: string;
  age: number;
  position: string;
  experience_level: string;
  programming_languages: string | null;
  frameworks: string | null;
  technologies: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  about_yourself: string | null;
  motivation: string;
  contribution: string;
  status: string;
  created_at: string;
};

type WorkerRow = AuthProfile & {
  full_name?: string;
  country?: string | null;
  whatsapp_number?: string | null;
  created_at?: string;
};

type ProjectRow = {
  id: string;
  request_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  client_name: string | null;
  priority: string;
  status: string;
  deadline: string | null;
  technologies: string[];
  created_at: string;
};

type AdminTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  projects?: {
    id: string;
    name: string;
    status: string;
  };
  profiles?: {
    id: string;
    full_name: string;
    email: string | null;
    username: string | null;
  } | null;
};

type AdminRow = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string;
  role: string;
  status: string;
  created_at?: string;
};

type AdminWorkerResponse = Omit<WorkerRow, 'fullName'> & {
  full_name?: string;
};

type AdminActionResult = {
  profile?: {
    username?: string | null;
    email?: string | null;
    full_name?: string;
  };
  onboarding?: {
    email: string;
    inviteSent: boolean;
  };
};

const baseSections: Array<{ id: AdminSection; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'requests', label: 'Requests' },
  { id: 'applications', label: 'Applications' },
  { id: 'projects', label: 'Projects' },
  { id: 'workers', label: 'Workers' },
  { id: 'activity', label: 'Activity' }
];

async function adminFetch<T>(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {})
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const fields = Array.isArray(data?.fields)
      ? ` ${data.fields.map((field: { path: string; message: string }) => `${field.path}: ${field.message}`).join('; ')}`
      : '';

    throw new Error(
      typeof data?.error === 'string'
        ? `${data.error}${fields}`
        : `Admin request failed with ${response.status}`
    );
  }

  return data as T;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

function DetailLine({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <p className="detail-line">
      <strong>{label}</strong>
      <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</span>
    </p>
  );
}

export function AdminPage() {
  const { session, profile, loading } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<ProjectRequestRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTaskRow[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [projectForm, setProjectForm] = useState({
    requestId: '',
    name: '',
    clientName: '',
    clientEmail: '',
    clientWhatsapp: '',
    description: '',
    deadline: '',
    priority: 'MEDIUM',
    technologies: '',
    notes: ''
  });
  const [memberForm, setMemberForm] = useState({
    projectId: '',
    workerId: '',
    projectRole: 'FRONTEND DEVELOPER',
    canEdit: false
  });
  const [taskForm, setTaskForm] = useState({
    projectId: '',
    title: '',
    description: '',
    assignedWorkerId: '',
    priority: 'MEDIUM',
    deadline: ''
  });
  const [requestFilter, setRequestFilter] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [workerSearch, setWorkerSearch] = useState('');
  const visibleSections = [
    ...baseSections.slice(0, 5),
    ...(dashboard?.capabilities.canManageAdmins ? [{ id: 'admins' as const, label: 'Admins' }] : []),
    baseSections[5]
  ];

  async function loadAdminData(accessToken: string) {
    const requestQuery = new URLSearchParams();
    const applicationQuery = new URLSearchParams();
    const workerQuery = new URLSearchParams();

    if (requestFilter) requestQuery.set('status', requestFilter);
    if (requestSearch.trim()) requestQuery.set('search', requestSearch.trim());
    if (applicationFilter) applicationQuery.set('status', applicationFilter);
    if (applicationSearch.trim()) applicationQuery.set('search', applicationSearch.trim());
    if (workerFilter) workerQuery.set('status', workerFilter);
    if (workerSearch.trim()) workerQuery.set('search', workerSearch.trim());

    const [dashboardData, requestData, applicationData, workerData, projectData, taskData] = await Promise.all([
      adminFetch<DashboardData>(accessToken, '/api/admin/dashboard'),
      adminFetch<{ requests: ProjectRequestRow[] }>(
        accessToken,
        `/api/admin/project-requests${requestQuery.size ? `?${requestQuery.toString()}` : ''}`
      ),
      adminFetch<{ applications: ApplicationRow[] }>(
        accessToken,
        `/api/admin/applications${applicationQuery.size ? `?${applicationQuery.toString()}` : ''}`
      ),
      adminFetch<{ workers: AdminWorkerResponse[] }>(
        accessToken,
        `/api/admin/workers${workerQuery.size ? `?${workerQuery.toString()}` : ''}`
      ),
      adminFetch<{ projects: ProjectRow[] }>(accessToken, '/api/projects'),
      adminFetch<{ tasks: AdminTaskRow[] }>(accessToken, '/api/projects/tasks')
    ]);

    setDashboard(dashboardData);
    setRequests(requestData.requests);
    setApplications(applicationData.applications);
    setProjects(projectData.projects);
    setAdminTasks(taskData.tasks);
    setWorkers(
      workerData.workers.map((worker) => ({
        ...worker,
        fullName: worker.full_name ?? 'Unnamed worker'
      }))
    );

    if (dashboardData.capabilities.canManageAdmins) {
      const adminData = await adminFetch<{ admins: AdminRow[] }>(accessToken, '/api/admin/admins');
      setAdmins(adminData.admins);
    } else {
      setAdmins([]);

      if (activeSection === 'admins') {
        setActiveSection('dashboard');
      }
    }

    setError(null);
  }

  useEffect(() => {
    if (!session?.access_token || profile?.role !== 'ADMIN') {
      return;
    }

    void loadAdminData(session.access_token).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load admin data.');
    });
  }, [
    applicationFilter,
    applicationSearch,
    profile?.role,
    requestFilter,
    requestSearch,
    session?.access_token,
    workerFilter,
    workerSearch
  ]);

  async function runAction(key: string, action: () => Promise<void>, success: string) {
    setBusyAction(key);
    setError(null);
    setNotice(null);

    try {
      await action();
      setNotice(success);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Admin action failed.');
    } finally {
      setBusyAction(null);
    }
  }

  async function updateRequestStatus(id: string, status: string) {
    if (!session?.access_token) return;

    await runAction(
      `request-${id}-${status}`,
      async () => {
        await adminFetch(session.access_token, `/api/admin/project-requests/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
        await loadAdminData(session.access_token);
      },
      `Project request marked ${formatLabel(status)}.`
    );
  }

  async function updateApplicationStatus(id: string, status: string) {
    if (!session?.access_token) return;

    await runAction(
      `application-${id}-${status}`,
      async () => {
        await adminFetch(session.access_token, `/api/admin/applications/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
        await loadAdminData(session.access_token);
      },
      `Application marked ${formatLabel(status)}.`
    );
  }

  async function approveApplication(id: string) {
    if (!session?.access_token) return;

    await runAction(
      `application-${id}-approve`,
      async () => {
        const result = await adminFetch<AdminActionResult>(
          session.access_token,
          `/api/admin/applications/${id}/approve`,
          {
            method: 'POST',
            body: JSON.stringify({ sendInvite: true })
          }
        );

        await loadAdminData(session.access_token);
        setNotice(
          `Worker approved${result.profile?.username ? ` as ${result.profile.username}` : ''}. ${
            result.onboarding?.inviteSent ? 'Supabase onboarding invite requested.' : ''
          }`
        );
      },
      'Worker approved.'
    );
  }

  async function updateWorkerStatus(id: string, status: string) {
    if (!session?.access_token) return;

    await runAction(
      `worker-${id}-${status}`,
      async () => {
        await adminFetch(session.access_token, `/api/admin/workers/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
        await loadAdminData(session.access_token);
      },
      `Worker marked ${formatLabel(status)}.`
    );
  }

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) return;

    await runAction(
      'admin-create',
      async () => {
        await adminFetch(session.access_token, '/api/admin/admins', {
          method: 'POST',
          body: JSON.stringify({
            email: newAdminEmail,
            fullName: newAdminName,
            sendInvite: true
          })
        });
        setNewAdminEmail('');
        setNewAdminName('');
        await loadAdminData(session.access_token);
      },
      'Admin invite created.'
    );
  }

  async function createProjectFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) return;

    await runAction(
      'project-create',
      async () => {
        await adminFetch(session.access_token, '/api/projects', {
          method: 'POST',
          body: JSON.stringify({
            ...projectForm,
            requestId: projectForm.requestId || undefined,
            deadline: projectForm.deadline || undefined,
            technologies: projectForm.technologies
          })
        });
        setProjectForm({
          requestId: '',
          name: '',
          clientName: '',
          clientEmail: '',
          clientWhatsapp: '',
          description: '',
          deadline: '',
          priority: 'MEDIUM',
          technologies: '',
          notes: ''
        });
        await loadAdminData(session.access_token);
      },
      'Project created with default workspace files.'
    );
  }

  async function assignWorkerToProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) return;

    await runAction(
      'member-assign',
      async () => {
        await adminFetch(session.access_token, `/api/projects/${memberForm.projectId}/members`, {
          method: 'POST',
          body: JSON.stringify({
            workerId: memberForm.workerId,
            projectRole: memberForm.projectRole,
            canView: true,
            canEdit: memberForm.canEdit
          })
        });
        await loadAdminData(session.access_token);
      },
      'Worker assigned to project.'
    );
  }

  async function createProjectTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) return;

    await runAction(
      'task-create',
      async () => {
        await adminFetch(session.access_token, `/api/projects/${taskForm.projectId}/tasks`, {
          method: 'POST',
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description || undefined,
            assignedWorkerId: taskForm.assignedWorkerId || undefined,
            priority: taskForm.priority,
            deadline: taskForm.deadline || undefined
          })
        });
        setTaskForm({
          projectId: taskForm.projectId,
          title: '',
          description: '',
          assignedWorkerId: taskForm.assignedWorkerId,
          priority: 'MEDIUM',
          deadline: ''
        });
        await loadAdminData(session.access_token);
      },
      'Task created.'
    );
  }

  async function reviewTask(taskId: string, status: 'COMPLETED' | 'REJECTED') {
    if (!session?.access_token) return;

    const reviewFeedback =
      status === 'REJECTED'
        ? window.prompt('Feedback for the worker') || 'Work rejected. Please revise and resubmit.'
        : undefined;

    await runAction(
      `task-review-${taskId}-${status}`,
      async () => {
        await adminFetch(session.access_token, `/api/projects/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            reviewFeedback
          })
        });
        await loadAdminData(session.access_token);
      },
      status === 'COMPLETED' ? 'Task approved.' : 'Task rejected with feedback.'
    );
  }

  function prepareProjectFromRequest(request: ProjectRequestRow) {
    setProjectForm({
      requestId: request.id,
      name: request.project_title,
      clientName: request.full_name,
      clientEmail: request.email,
      clientWhatsapp: request.whatsapp_number,
      description: request.project_description,
      deadline: '',
      priority: 'MEDIUM',
      technologies: '',
      notes: request.additional_information ?? ''
    });
    setActiveSection('projects');
  }

  function submitFilter(event: FormEvent) {
    event.preventDefault();
  }

  if (loading) {
    return (
      <main className="page">
        <section className="section">
          <div className="empty-card">
            <p>Loading admin session...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!session || !profile) {
    return (
      <main className="page">
        <section className="section">
          <div className="empty-card">
            <h1>Admin sign-in required.</h1>
            <p>Use the authentication screen first, then return with an ADMIN account.</p>
          </div>
        </section>
      </main>
    );
  }

  if (profile.role !== 'ADMIN') {
    return (
      <main className="page">
        <section className="section">
          <div className="empty-card">
            <h1>Forbidden.</h1>
            <p>This route is available only to authenticated Nexaris admins.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page admin-portal">
      <section className="section admin-hero">
        <div>
          <p className="section-kicker">Admin Portal</p>
          <h1>Operations control for Nexaris intake and worker onboarding.</h1>
          <p className="summary">
            Review client requests, approve applications, manage workers, and audit recent admin
            activity from one protected dashboard.
          </p>
        </div>
        <div className="admin-profile-panel">
          <strong>{profile.fullName}</strong>
          <span>{profile.email}</span>
          <span>{profile.role} - {profile.status}</span>
        </div>
      </section>

      <section className="section admin-shell">
        <aside className="admin-sidebar" aria-label="Admin sections">
          {visibleSections.map((section) => (
            <button
              className={`admin-nav-button ${activeSection === section.id ? 'admin-nav-active' : ''}`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </aside>

        <div className="admin-main">
          {error ? <p className="form-error">{error}</p> : null}
          {notice ? <p className="success-message">{notice}</p> : null}

          {activeSection === 'dashboard' ? (
            <>
              {dashboard ? (
                <div className="stats-grid">
                  {Object.entries(dashboard.cards).map(([key, value]) => (
                    <article className="feature-card" key={key}>
                      <strong className="stat-value">{value}</strong>
                      <p className="stat-label">{key}</p>
                    </article>
                  ))}
                </div>
              ) : null}
              <NotificationsPanel />
              <div className="admin-panel">
                <h2>Recent Activity</h2>
                <ActivityTable activity={dashboard?.recentActivity ?? []} />
              </div>
            </>
          ) : null}

          {activeSection === 'requests' ? (
            <section className="admin-panel">
              <div className="admin-section-header">
                <div>
                  <h2>Project Requests</h2>
                  <p>Review, accept, decline, or archive incoming client project requests.</p>
                </div>
                <form className="filter-bar" onSubmit={submitFilter}>
                  <input
                    onChange={(event) => setRequestSearch(event.target.value)}
                    placeholder="Search client, email, project"
                    value={requestSearch}
                  />
                  <select value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="REVIEWING">Reviewing</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="DECLINED">Declined</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </form>
              </div>

              <div className="record-list">
                {requests.length ? (
                  requests.map((item) => (
                    <article className="admin-record" key={item.id}>
                      <div className="record-heading">
                        <div>
                          <span className="tag">{item.request_code}</span>
                          <h3>{item.project_title}</h3>
                          <p>{item.full_name} - {item.email}</p>
                        </div>
                        <strong className="status-badge">{formatLabel(item.status)}</strong>
                      </div>
                      <div className="detail-grid">
                        <DetailLine label="WhatsApp" value={item.whatsapp_number} />
                        <DetailLine label="Company" value={item.company_name} />
                        <DetailLine label="Country" value={item.country} />
                        <DetailLine label="Project Type" value={item.project_type} />
                        <DetailLine label="Budget" value={item.estimated_budget} />
                        <DetailLine label="Timeline" value={item.expected_timeline} />
                        <DetailLine label="Existing Design" value={item.existing_design} />
                        <DetailLine label="Reference" value={item.reference_website} />
                        <DetailLine label="Submitted" value={formatDate(item.created_at)} />
                      </div>
                      <p className="record-body">{item.project_description}</p>
                      <DetailLine label="Required Features" value={item.required_features} />
                      <DetailLine label="Additional Information" value={item.additional_information} />
                      <div className="action-row">
                        <ActionButton busyAction={busyAction} id={`request-${item.id}-REVIEWING`} onClick={() => void updateRequestStatus(item.id, 'REVIEWING')}>
                          Review
                        </ActionButton>
                        <ActionButton busyAction={busyAction} id={`request-${item.id}-ACCEPTED`} kind="primary" onClick={() => void updateRequestStatus(item.id, 'ACCEPTED')}>
                          Accept
                        </ActionButton>
                        <button className="button button-primary" onClick={() => prepareProjectFromRequest(item)} type="button">
                          Create Project
                        </button>
                        <ActionButton busyAction={busyAction} id={`request-${item.id}-DECLINED`} onClick={() => void updateRequestStatus(item.id, 'DECLINED')}>
                          Decline
                        </ActionButton>
                        <ActionButton busyAction={busyAction} id={`request-${item.id}-ARCHIVED`} onClick={() => void updateRequestStatus(item.id, 'ARCHIVED')}>
                          Archive
                        </ActionButton>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyAdminState message="No project requests match the current filters." />
                )}
              </div>
            </section>
          ) : null}

          {activeSection === 'applications' ? (
            <section className="admin-panel">
              <div className="admin-section-header">
                <div>
                  <h2>Job Applications</h2>
                  <p>Review candidates and approve worker profiles through Supabase onboarding.</p>
                </div>
                <form className="filter-bar" onSubmit={submitFilter}>
                  <input
                    onChange={(event) => setApplicationSearch(event.target.value)}
                    placeholder="Search candidate, email, position"
                    value={applicationSearch}
                  />
                  <select value={applicationFilter} onChange={(event) => setApplicationFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="REVIEWING">Reviewing</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </form>
              </div>

              <div className="record-list">
                {applications.length ? (
                  applications.map((item) => (
                    <article className="admin-record" key={item.id}>
                      <div className="record-heading">
                        <div>
                          <span className="tag">{item.application_code}</span>
                          <h3>{item.full_name}</h3>
                          <p>{item.position} - {item.email}</p>
                        </div>
                        <strong className="status-badge">{formatLabel(item.status)}</strong>
                      </div>
                      <div className="detail-grid">
                        <DetailLine label="WhatsApp" value={item.whatsapp_number} />
                        <DetailLine label="Country" value={item.country} />
                        <DetailLine label="Age" value={item.age} />
                        <DetailLine label="Experience" value={formatLabel(item.experience_level)} />
                        <DetailLine label="Languages" value={item.programming_languages} />
                        <DetailLine label="Frameworks" value={item.frameworks} />
                        <DetailLine label="Technologies" value={item.technologies} />
                        <DetailLine label="Portfolio" value={item.portfolio_url} />
                        <DetailLine label="GitHub" value={item.github_url} />
                        <DetailLine label="Submitted" value={formatDate(item.created_at)} />
                      </div>
                      <DetailLine label="About" value={item.about_yourself} />
                      <DetailLine label="Why Join" value={item.motivation} />
                      <DetailLine label="Contribution" value={item.contribution} />
                      <div className="action-row">
                        <ActionButton busyAction={busyAction} id={`application-${item.id}-REVIEWING`} onClick={() => void updateApplicationStatus(item.id, 'REVIEWING')}>
                          Review
                        </ActionButton>
                        <ActionButton busyAction={busyAction} id={`application-${item.id}-approve`} kind="primary" onClick={() => void approveApplication(item.id)}>
                          Approve
                        </ActionButton>
                        <ActionButton busyAction={busyAction} id={`application-${item.id}-REJECTED`} onClick={() => void updateApplicationStatus(item.id, 'REJECTED')}>
                          Reject
                        </ActionButton>
                        <ActionButton busyAction={busyAction} id={`application-${item.id}-ARCHIVED`} onClick={() => void updateApplicationStatus(item.id, 'ARCHIVED')}>
                          Archive
                        </ActionButton>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyAdminState message="No job applications match the current filters." />
                )}
              </div>
            </section>
          ) : null}

          {activeSection === 'projects' ? (
            <section className="admin-panel">
              <div className="admin-section-header">
                <div>
                  <h2>Projects</h2>
                  <p>Create real project records and initialize the shared development workspace.</p>
                </div>
              </div>

              <form className="project-create-form" onSubmit={createProjectFromForm}>
                <label>
                  <span>Project Name</span>
                  <input required minLength={3} value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} />
                </label>
                <label>
                  <span>Client Name</span>
                  <input required minLength={2} value={projectForm.clientName} onChange={(event) => setProjectForm({ ...projectForm, clientName: event.target.value })} />
                </label>
                <label>
                  <span>Client Email</span>
                  <input type="email" value={projectForm.clientEmail} onChange={(event) => setProjectForm({ ...projectForm, clientEmail: event.target.value })} />
                </label>
                <label>
                  <span>Client WhatsApp</span>
                  <input value={projectForm.clientWhatsapp} onChange={(event) => setProjectForm({ ...projectForm, clientWhatsapp: event.target.value })} />
                </label>
                <label>
                  <span>Deadline</span>
                  <input type="date" value={projectForm.deadline} onChange={(event) => setProjectForm({ ...projectForm, deadline: event.target.value })} />
                </label>
                <label>
                  <span>Priority</span>
                  <select value={projectForm.priority} onChange={(event) => setProjectForm({ ...projectForm, priority: event.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </label>
                <label className="field-full">
                  <span>Technologies</span>
                  <input placeholder="HTML, CSS, JavaScript" value={projectForm.technologies} onChange={(event) => setProjectForm({ ...projectForm, technologies: event.target.value })} />
                </label>
                <label className="field-full">
                  <span>Description</span>
                  <textarea required minLength={10} rows={4} value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} />
                </label>
                <label className="field-full">
                  <span>Notes</span>
                  <textarea rows={3} value={projectForm.notes} onChange={(event) => setProjectForm({ ...projectForm, notes: event.target.value })} />
                </label>
                {projectForm.requestId ? <p className="form-note field-full">Linked request: {projectForm.requestId}</p> : null}
                <button className="button button-primary" disabled={Boolean(busyAction)} type="submit">
                  {busyAction === 'project-create' ? 'Creating...' : 'Create Project'}
                </button>
              </form>

              <div className="phase4-management-grid">
                <form className="admin-record" onSubmit={assignWorkerToProject}>
                  <h3>Assign Worker</h3>
                  <label>
                    <span>Project</span>
                    <select required value={memberForm.projectId} onChange={(event) => setMemberForm({ ...memberForm, projectId: event.target.value })}>
                      <option value="">Select project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Worker</span>
                    <select required value={memberForm.workerId} onChange={(event) => setMemberForm({ ...memberForm, workerId: event.target.value })}>
                      <option value="">Select worker</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>{worker.fullName}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Project Role</span>
                    <select value={memberForm.projectRole} onChange={(event) => setMemberForm({ ...memberForm, projectRole: event.target.value })}>
                      <option>HTML DEVELOPER</option>
                      <option>CSS STYLIST</option>
                      <option>JAVASCRIPT DEVELOPER</option>
                      <option>FRONTEND DEVELOPER</option>
                      <option>BACKEND SUPPORT</option>
                      <option>FULL-STACK DEVELOPER</option>
                      <option>TESTER</option>
                    </select>
                  </label>
                  <label className="checkbox-field">
                    <input checked={memberForm.canEdit} type="checkbox" onChange={(event) => setMemberForm({ ...memberForm, canEdit: event.target.checked })} />
                    <span>Can edit project files</span>
                  </label>
                  <button className="button button-primary" disabled={Boolean(busyAction)} type="submit">
                    {busyAction === 'member-assign' ? 'Assigning...' : 'Assign Worker'}
                  </button>
                </form>

                <form className="admin-record" onSubmit={createProjectTask}>
                  <h3>Create Task</h3>
                  <label>
                    <span>Project</span>
                    <select required value={taskForm.projectId} onChange={(event) => setTaskForm({ ...taskForm, projectId: event.target.value })}>
                      <option value="">Select project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Assigned Worker</span>
                    <select value={taskForm.assignedWorkerId} onChange={(event) => setTaskForm({ ...taskForm, assignedWorkerId: event.target.value })}>
                      <option value="">Unassigned</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>{worker.fullName}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Title</span>
                    <input required minLength={3} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} />
                  </label>
                  <label>
                    <span>Priority</span>
                    <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </label>
                  <label>
                    <span>Deadline</span>
                    <input type="date" value={taskForm.deadline} onChange={(event) => setTaskForm({ ...taskForm, deadline: event.target.value })} />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea rows={3} value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} />
                  </label>
                  <button className="button button-primary" disabled={Boolean(busyAction)} type="submit">
                    {busyAction === 'task-create' ? 'Creating...' : 'Create Task'}
                  </button>
                </form>
              </div>

              <div className="record-list">
                {projects.length ? (
                  projects.map((project) => (
                    <article className="admin-record" key={project.id}>
                      <div className="record-heading">
                        <div>
                          <span className="tag">{project.status}</span>
                          <h3>{project.name}</h3>
                          <p>{project.client_name ?? 'No client'} - {project.priority}</p>
                        </div>
                        <Link className="button button-secondary" to={`/projects/${project.id}/workspace`}>
                          Open Workspace
                        </Link>
                      </div>
                      <div className="detail-grid">
                        <DetailLine label="Deadline" value={project.deadline} />
                        <DetailLine label="Technologies" value={project.technologies?.join(', ')} />
                        <DetailLine label="Created" value={formatDate(project.created_at)} />
                      </div>
                      <p className="record-body">{project.description ?? 'No project description yet.'}</p>
                    </article>
                  ))
                ) : (
                  <EmptyAdminState message="No projects have been created yet." />
                )}
              </div>

              <div className="admin-subsection">
                <h3>Task Review Queue</h3>
                <div className="record-list">
                  {adminTasks.length ? (
                    adminTasks.map((task) => (
                      <article className="admin-record task-record" key={task.id}>
                        <div className="record-heading">
                          <div>
                            <span className="tag">{task.status}</span>
                            <h3>{task.title}</h3>
                            <p>
                              {task.projects?.name ?? 'No project'} - {task.profiles?.full_name ?? 'Unassigned'} - {task.priority}
                            </p>
                          </div>
                          {task.status === 'IN_REVIEW' ? (
                            <div className="action-row">
                              <button className="button button-primary" disabled={Boolean(busyAction)} onClick={() => void reviewTask(task.id, 'COMPLETED')} type="button">
                                Approve
                              </button>
                              <button className="button button-secondary" disabled={Boolean(busyAction)} onClick={() => void reviewTask(task.id, 'REJECTED')} type="button">
                                Reject
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <p className="record-body">{task.description ?? 'No task description.'}</p>
                        <div className="detail-grid">
                          <DetailLine label="Deadline" value={task.deadline ? formatDate(task.deadline) : null} />
                          <DetailLine label="Worker Email" value={task.profiles?.email} />
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyAdminState message="No tasks have been created yet." />
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'workers' ? (
            <section className="admin-panel">
              <div className="admin-section-header">
                <div>
                  <h2>Workers</h2>
                  <p>Activate, suspend, or deactivate approved worker profiles.</p>
                </div>
                <form className="filter-bar" onSubmit={submitFilter}>
                  <input
                    onChange={(event) => setWorkerSearch(event.target.value)}
                    placeholder="Search worker, email, username"
                    value={workerSearch}
                  />
                  <select value={workerFilter} onChange={(event) => setWorkerFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </form>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>WhatsApp</th>
                      <th>Country</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.length ? (
                      workers.map((item) => (
                        <tr key={item.id}>
                          <td>{item.fullName}</td>
                          <td>{item.username ?? 'Pending username'}</td>
                          <td>{item.email ?? 'No email'}</td>
                          <td>{item.whatsapp_number ?? 'Not set'}</td>
                          <td>{item.country ?? 'Not set'}</td>
                          <td>{item.status}</td>
                          <td className="action-row">
                            <ActionButton busyAction={busyAction} id={`worker-${item.id}-ACTIVE`} kind="primary" onClick={() => void updateWorkerStatus(item.id, 'ACTIVE')}>
                              Activate
                            </ActionButton>
                            <ActionButton busyAction={busyAction} id={`worker-${item.id}-SUSPENDED`} onClick={() => void updateWorkerStatus(item.id, 'SUSPENDED')}>
                              Suspend
                            </ActionButton>
                            <ActionButton busyAction={busyAction} id={`worker-${item.id}-INACTIVE`} onClick={() => void updateWorkerStatus(item.id, 'INACTIVE')}>
                              Deactivate
                            </ActionButton>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7}>No workers match the current filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeSection === 'admins' && dashboard?.capabilities.canManageAdmins ? (
            <section className="admin-panel">
              <div className="admin-section-header">
                <div>
                  <h2>Admin Accounts</h2>
                  <p>Only the configured owner admin can invite or promote another admin.</p>
                </div>
              </div>

              <form className="admin-create-form" onSubmit={createAdmin}>
                <label>
                  <span>Full Name</span>
                  <input
                    minLength={2}
                    required
                    value={newAdminName}
                    onChange={(event) => setNewAdminName(event.target.value)}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    required
                    type="email"
                    value={newAdminEmail}
                    onChange={(event) => setNewAdminEmail(event.target.value)}
                  />
                </label>
                <button className="button button-primary" disabled={Boolean(busyAction)} type="submit">
                  {busyAction === 'admin-create' ? 'Creating...' : 'Invite Admin'}
                </button>
              </form>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.length ? (
                      admins.map((item) => (
                        <tr key={item.id}>
                          <td>{item.full_name}</td>
                          <td>{item.email ?? 'No email'}</td>
                          <td>{item.username ?? 'Pending username'}</td>
                          <td>{item.status}</td>
                          <td>{formatDate(item.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>No admin profiles found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeSection === 'activity' ? (
            <section className="admin-panel">
              <div className="admin-section-header">
                <div>
                  <h2>Activity</h2>
                  <p>Chronological audit entries for Phase 3 admin actions.</p>
                </div>
              </div>
              <ActivityTable activity={dashboard?.recentActivity ?? []} />
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ActionButton({
  busyAction,
  children,
  id,
  kind = 'secondary',
  onClick
}: {
  busyAction: string | null;
  children: string;
  id: string;
  kind?: 'primary' | 'secondary';
  onClick: () => void;
}) {
  return (
    <button
      className={`button ${kind === 'primary' ? 'button-primary' : 'button-secondary'}`}
      disabled={Boolean(busyAction)}
      onClick={onClick}
      type="button"
    >
      {busyAction === id ? 'Working...' : children}
    </button>
  );
}

function ActivityTable({ activity }: { activity: ActivityRow[] }) {
  return (
    <div className="admin-table-card">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Subject</th>
            <th>Metadata</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {activity.length ? (
            activity.map((item) => (
              <tr key={item.id}>
                <td>{formatLabel(item.action)}</td>
                <td>{formatLabel(item.subject_type)}</td>
                <td>{Object.entries(item.metadata ?? {}).map(([key, value]) => `${key}: ${String(value)}`).join(', ') || 'No metadata'}</td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No activity has been recorded yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmptyAdminState({ message }: { message: string }) {
  return (
    <div className="empty-card">
      <p>{message}</p>
    </div>
  );
}
