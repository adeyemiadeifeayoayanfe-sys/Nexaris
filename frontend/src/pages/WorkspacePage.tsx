import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type ProjectFile = {
  id: string;
  name: string;
  path: string;
  extension: string | null;
  is_directory: boolean;
  content: string | null;
  lock_version: number;
  last_saved_at: string | null;
};

type WorkspaceData = {
  project: {
    id: string;
    name: string;
    status: string;
  };
  files: ProjectFile[];
  members: unknown[];
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
};

type FileVersion = {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
};

type ProjectMessage = {
  id: string;
  body: string;
  created_at: string;
  sender?: {
    full_name: string;
    email: string | null;
    role: string;
  };
};

async function authedFetch<T>(accessToken: string, path: string, init?: RequestInit) {
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

export function WorkspacePage() {
  const { projectId } = useParams();
  const { session, profile, loading } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [lockVersion, setLockVersion] = useState(1);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving'>('saved');
  const [error, setError] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');


  async function loadWorkspace(accessToken: string) {
    if (!projectId) return;

    const data = await authedFetch<WorkspaceData>(accessToken, `/api/projects/${projectId}/workspace`);
    setWorkspace(data);
    const firstFile = data.files.find((file) => !file.is_directory && ['html', 'css', 'js'].includes(file.extension ?? ''));

    if (!selectedFileId && firstFile) {
      setSelectedFileId(firstFile.id);
      setDraft(firstFile.content ?? '');
      setLockVersion(firstFile.lock_version);
    }
  }

  async function loadMessages(accessToken: string) {
    if (!projectId) return;

    const data = await authedFetch<{ messages: ProjectMessage[] }>(accessToken, `/api/projects/${projectId}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    if (!session?.access_token || !projectId) return;

    void Promise.all([loadWorkspace(session.access_token), loadMessages(session.access_token)]).catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load workspace.');
      });
  }, [projectId, session?.access_token]);

  const selectedFile = workspace?.files.find((file) => file.id === selectedFileId) ?? null;

  useEffect(() => {
    if (!selectedFile || !session?.access_token) {
      setVersions([]);
      return;
    }

    setDraft(selectedFile.content ?? '');
    setLockVersion(selectedFile.lock_version);
    setSaveState('saved');
    void authedFetch<{ versions: FileVersion[] }>(session.access_token, `/api/projects/files/${selectedFile.id}/versions`)
      .then((data) => setVersions(data.versions))
      .catch((versionError) => setError(versionError instanceof Error ? versionError.message : 'Unable to load versions.'));
  }, [selectedFileId]);

  const previewHtml = useMemo(() => {
    const files = workspace?.files ?? [];
    const html = files.find((file) => file.path === 'index.html')?.content ?? '';
    const css = files.find((file) => file.path === 'style.css')?.content ?? '';
    const js = files.find((file) => file.path === 'script.js')?.content ?? '';

    return `${html}\n<style>${css}</style>\n<script>window.onerror = function(message, source, line, column) { parent.postMessage({ type: 'preview-error', message: String(message), line, column }, '*'); };<script>\n<script>${js}<script>`;
  }, [workspace]);

  async function saveFile() {
    if (!session?.access_token || !selectedFile) return;

    setSaveState('saving');
    setError(null);

    try {
      const result = await authedFetch<{ file: ProjectFile }>(session.access_token, `/api/projects/files/${selectedFile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: draft,
          lockVersion,
          changeSummary: `Updated ${selectedFile.path}`
        })
      });
      setLockVersion(result.file.lock_version);
      setSaveState('saved');
      await loadWorkspace(session.access_token);
    } catch (saveError) {
      setSaveState('dirty');
      setError(saveError instanceof Error ? saveError.message : 'Unable to save file.');
    }
  }

  async function restoreVersion(versionId: string) {
    if (!session?.access_token || !selectedFile) return;

    await authedFetch<{ file: ProjectFile }>(session.access_token, `/api/projects/files/${selectedFile.id}/restore`, {
      method: 'POST',
      body: JSON.stringify({
        versionId,
        changeSummary: `Restored ${selectedFile.path}`
      })
    });
    await loadWorkspace(session.access_token);
  }

  async function createWorkspaceItem() {
    if (!session?.access_token || !projectId || !newItemName.trim() || !creatingType) return;

    setError(null);

    try {
      if (creatingType === 'file') {
        const result = await authedFetch<{ file: ProjectFile }>(
          session.access_token,
          '/api/projects/files',
          {
            method: 'POST',
            body: JSON.stringify({
              projectId,
              name: newItemName.trim(),
              parentId: newItemParentId,
              content: ''
            })
          }
        );

        setNewItemName('');
        setCreatingType(null);
        setNewItemParentId(null);
        await loadWorkspace(session.access_token);
        setSelectedFileId(result.file.id);
      } else {
        await authedFetch<{ folder: ProjectFile }>(
          session.access_token,
          '/api/projects/folders',
          {
            method: 'POST',
            body: JSON.stringify({
              projectId,
              name: newItemName.trim(),
              parentId: newItemParentId
            })
          }
        );

        setNewItemName('');
        setCreatingType(null);
        setNewItemParentId(null);
        await loadWorkspace(session.access_token);
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create workspace item.');
    }
  }

  async function renameWorkspaceItem() {
    if (!session?.access_token || !renamingItemId || !renameName.trim()) return;

    setError(null);

    try {
      await authedFetch<{ file: ProjectFile }>(
        session.access_token,
        `/api/projects/files/${renamingItemId}/rename`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: renameName.trim()
          })
        }
      );

      setRenamingItemId(null);
      setRenameName('');
      await loadWorkspace(session.access_token);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Unable to rename workspace item.');
    }
  }

  async function archiveWorkspaceItem(file: ProjectFile) {
    if (!session?.access_token) return;

    setError(null);

    try {
      await authedFetch<{ result: { id: string; path: string; status: string } }>(
        session.access_token,
        `/api/projects/files/${file.id}/archive`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: `Archived ${file.path} from workspace`
          })
        }
      );

      if (selectedFileId === file.id) {
        setSelectedFileId(null);
        setDraft('');
        setVersions([]);
      }

      await loadWorkspace(session.access_token);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive workspace item.');
    }
  }

  async function sendMessage() {
    if (!session?.access_token || !projectId || !messageDraft.trim()) return;

    await authedFetch<{ message: ProjectMessage }>(session.access_token, `/api/projects/${projectId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: messageDraft })
    });
    setMessageDraft('');
    await loadMessages(session.access_token);
  }

  if (loading) {
    return <WorkspaceMessage title="Loading workspace." body="Checking your session." />;
  }

  if (!session || !profile) {
    return <WorkspaceMessage title="Sign-in required." body="You must sign in before opening a project workspace." />;
  }

  return (
    <main className="page workspace-page">
      <section className="workspace-header">
        <div>
          <Link className="inline-link" to={profile.role === 'ADMIN' ? '/admin' : '/worker'}>Back to portal</Link>
          <h1>{workspace?.project.name ?? 'Project Workspace'}</h1>
          <p>{workspace?.project.status ?? 'Loading'} - {saveState === 'dirty' ? 'Unsaved changes' : saveState}</p>
        </div>
        <button className="button button-primary" disabled={!selectedFile || saveState === 'saving'} onClick={() => void saveFile()} type="button">
          {saveState === 'saving' ? 'Saving...' : 'Save'}
        </button>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="workspace-grid">
        <aside className="workspace-panel file-tree">
          <div className="workspace-panel-header">
            <h2>Files</h2>
            <div className="workspace-file-actions">
              <button
                className="button button-secondary"
                onClick={() => {
                  setCreatingType('file');
                  setNewItemName('');
                  setNewItemParentId(null);
                }}
                type="button"
              >
                New File
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setCreatingType('folder');
                  setNewItemName('');
                  setNewItemParentId(null);
                }}
                type="button"
              >
                New Folder
              </button>
            </div>
          </div>

          {creatingType ? (
            <div className="workspace-create-form">
              <strong>{creatingType === 'file' ? 'Create File' : 'Create Folder'}</strong>

              <input
                aria-label="New item name"
                placeholder={creatingType === 'file' ? 'example.js' : 'components'}
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
              />

              <select
                aria-label="Parent folder"
                value={newItemParentId ?? ''}
                onChange={(event) => setNewItemParentId(event.target.value || null)}
              >
                <option value="">Root</option>
                {(workspace?.files ?? [])
                  .filter((file) => file.is_directory)
                  .sort((a, b) => a.path.localeCompare(b.path))
                  .map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.path}
                    </option>
                  ))}
              </select>

              <div className="workspace-create-actions">
                <button
                  className="button button-primary"
                  disabled={!newItemName.trim()}
                  onClick={() => void createWorkspaceItem()}
                  type="button"
                >
                  Create
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setCreatingType(null);
                    setNewItemName('');
                    setNewItemParentId(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {(workspace?.files ?? []).map((file) => (
            <div className="file-node-row" key={file.id}>
              {renamingItemId === file.id ? (
                <div className="workspace-rename-form">
                  <input
                    aria-label={`Rename ${file.path}`}
                    value={renameName}
                    onChange={(event) => setRenameName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void renameWorkspaceItem();
                      }

                      if (event.key === 'Escape') {
                        setRenamingItemId(null);
                        setRenameName('');
                      }
                    }}
                  />
                  <button
                    className="button button-primary"
                    disabled={!renameName.trim()}
                    onClick={() => void renameWorkspaceItem()}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setRenamingItemId(null);
                      setRenameName('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className={`file-node ${selectedFileId === file.id ? 'file-node-active' : ''}`}
                    disabled={file.is_directory}
                    onClick={() => setSelectedFileId(file.id)}
                    type="button"
                  >
                    {file.is_directory ? `${file.path}/` : file.path}
                  </button>

                  <button
                    aria-label={`Rename ${file.path}`}
                    className="file-action-button"
                    onClick={() => {
                      setRenamingItemId(file.id);
                      setRenameName(file.name);
                    }}
                    type="button"
                  >
                    Rename
                  </button>

                  <button
                    aria-label={`Archive ${file.path}`}
                    className="file-action-button"
                    onClick={() => void archiveWorkspaceItem(file)}
                    type="button"
                  >
                    Archive
                  </button>
                </>
              )}
            </div>
          ))}
        </aside>

        <section className="workspace-panel editor-panel">
          <h2>{selectedFile?.path ?? 'Select a file'}</h2>
          <textarea
            className="code-editor"
            disabled={!selectedFile}
            spellCheck={false}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaveState('dirty');
            }}
          />
        </section>

        <section className="workspace-panel preview-panel">
          <h2>Live Preview</h2>
          <iframe sandbox="allow-scripts" srcDoc={previewHtml} title="Project preview" />
        </section>

        <section className="workspace-panel output-panel">
          <h2>Versions</h2>
          {versions.length ? versions.map((version) => (
            <button className="version-row" key={version.id} onClick={() => void restoreVersion(version.id)} type="button">
              Version {version.version_number} - {version.change_summary ?? 'No summary'}
            </button>
          )) : <p className="form-note">No version history yet.</p>}
        </section>

        <section className="workspace-panel output-panel">
          <h2>Tasks</h2>
          {(workspace?.tasks ?? []).map((task) => (
            <p className="detail-line" key={task.id}><strong>{task.status}</strong><span>{task.title}</span></p>
          ))}
        </section>

        <section className="workspace-panel output-panel workspace-chat-panel">
          <h2>Project Chat</h2>
          <div className="message-list">
            {messages.length ? messages.map((message) => (
              <article className="message-card" key={message.id}>
                <strong>{message.sender?.full_name ?? 'Team member'}</strong>
                <span>{new Date(message.created_at).toLocaleString()}</span>
                <p>{message.body}</p>
              </article>
            )) : <p className="form-note">No project messages yet.</p>}
          </div>
          <div className="message-compose">
            <textarea
              placeholder="Send a project update..."
              rows={3}
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
            />
            <button className="button button-primary" disabled={!messageDraft.trim()} onClick={() => void sendMessage()} type="button">
              Send Message
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function WorkspaceMessage({ title, body }: { title: string; body: string }) {
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
