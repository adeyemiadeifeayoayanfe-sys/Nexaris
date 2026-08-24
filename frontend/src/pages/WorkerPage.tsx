import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { useAuth } from '../hooks/useAuth';

type WorkerProject = {
  project_id: string;
  project_role: string;
  permissions: { view?: boolean; edit?: boolean };
  projects: {
    id: string;
    name: string;
    status: string;
    priority: string;
    deadline: string | null;
  };
};

type WorkerTask = {
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
};

async function workerFetch<T>(accessToken: string, path: string, init?: RequestInit) {
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
    throw new Error(typeof data?.error === 'string' ? data.error : `Request failed with ${response.status}`);
  }

  return data as T;
}

export function WorkerPage() {
  const { session, profile, loading } = useAuth();
  const [projects, setProjects] = useState<WorkerProject[]>([]);
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);

  async function loadWorkerData(accessToken: string) {
    const [projectData, taskData] = await Promise.all([
      workerFetch<{ projects: WorkerProject[] }>(accessToken, '/api/worker/projects'),
      workerFetch<{ tasks: WorkerTask[] }>(accessToken, '/api/worker/tasks')
    ]);
    setProjects(projectData.projects);
    setTasks(taskData.tasks);
    setError(null);
  }

  useEffect(() => {
    if (!session?.access_token || profile?.role !== 'WORKER') {
      return;
    }

    void loadWorkerData(session.access_token).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load worker data.');
    });
  }, [profile?.role, session?.access_token]);

  async function updateTask(taskId: string, status: string) {
    if (!session?.access_token) return;

    setBusyTask(taskId);
    try {
      await workerFetch(session.access_token, `/api/worker/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await loadWorkerData(session.access_token);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update task.');
    } finally {
      setBusyTask(null);
    }
  }

  if (loading) {
    return <PortalMessage title="Loading worker session." body="Checking your Nexaris account." />;
  }

  if (!session || !profile) {
    return <PortalMessage title="Worker sign-in required." body="Sign in before opening the worker portal." />;
  }

  if (profile.role !== 'WORKER') {
    return <PortalMessage title="Forbidden." body="This route is available only to active workers." />;
  }

  const activeTasks = tasks.filter((task) => ['NOT_STARTED', 'IN_PROGRESS', 'REJECTED'].includes(task.status)).length;
  const reviewTasks = tasks.filter((task) => task.status === 'IN_REVIEW').length;
  const completedTasks = tasks.filter((task) => task.status === 'COMPLETED').length;

  return (
    <main className="page admin-portal">
      <section className="section admin-hero">
        <div>
          <p className="section-kicker">Worker Portal</p>
          <h1>Welcome, {profile.fullName}.</h1>
          <p className="summary">View assigned projects, update tasks, and open authorized workspaces.</p>
        </div>
        <div className="admin-profile-panel">
          <strong>{profile.username ?? profile.email}</strong>
          <span>{profile.role} - {profile.status}</span>
        </div>
      </section>

      <section className="section admin-main">
        {error ? <p className="form-error">{error}</p> : null}
        <div className="stats-grid">
          <article className="feature-card"><strong className="stat-value">{projects.length}</strong><p className="stat-label">Assigned Projects</p></article>
          <article className="feature-card"><strong className="stat-value">{activeTasks}</strong><p className="stat-label">Active Tasks</p></article>
          <article className="feature-card"><strong className="stat-value">{reviewTasks}</strong><p className="stat-label">Tasks In Review</p></article>
          <article className="feature-card"><strong className="stat-value">{completedTasks}</strong><p className="stat-label">Completed Tasks</p></article>
        </div>

        <NotificationsPanel />

        <section className="admin-panel">
          <h2>My Projects</h2>
          <div className="record-list">
            {projects.length ? projects.map((item) => (
              <article className="admin-record" key={item.project_id}>
                <div className="record-heading">
                  <div>
                    <span className="tag">{item.project_role}</span>
                    <h3>{item.projects.name}</h3>
                    <p>{item.projects.status} - {item.projects.priority}</p>
                  </div>
                  <Link className="button button-primary" to={`/projects/${item.project_id}/workspace`}>
                    Open Workspace
                  </Link>
                </div>
              </article>
            )) : <EmptyWorkerState message="No projects assigned yet." />}
          </div>
        </section>

        <section className="admin-panel">
          <h2>My Tasks</h2>
          <div className="record-list">
            {tasks.length ? tasks.map((task) => (
              <article className="admin-record" key={task.id}>
                <div className="record-heading">
                  <div>
                    <span className="tag">{task.status}</span>
                    <h3>{task.title}</h3>
                    <p>{task.projects?.name ?? 'Project'} - {task.priority}</p>
                  </div>
                </div>
                <p className="record-body">{task.description ?? 'No task description.'}</p>
                <div className="action-row">
                  <button className="button button-secondary" disabled={busyTask === task.id} onClick={() => void updateTask(task.id, 'IN_PROGRESS')} type="button">Start</button>
                  <button className="button button-primary" disabled={busyTask === task.id} onClick={() => void updateTask(task.id, 'IN_REVIEW')} type="button">Submit Review</button>
                </div>
              </article>
            )) : <EmptyWorkerState message="No tasks assigned yet." />}
          </div>
        </section>
      </section>
    </main>
  );
}

function PortalMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="page">
      <section className="section">
        <div className="empty-card">
          <h1>{title}</h1>
          <p>{body}</p>
        </div>
      </section>
    </main>
  );
}

function EmptyWorkerState({ message }: { message: string }) {
  return (
    <div className="empty-card">
      <p>{message}</p>
    </div>
  );
}
