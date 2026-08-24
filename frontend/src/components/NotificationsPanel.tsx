import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

async function notificationFetch<T>(accessToken: string, path: string, init?: RequestInit) {
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

export function NotificationsPanel() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications(accessToken: string) {
    const data = await notificationFetch<{ notifications: NotificationRow[] }>(
      accessToken,
      '/api/communication/notifications'
    );
    setNotifications(data.notifications);
    setError(null);
  }

  useEffect(() => {
    if (!session?.access_token) return;

    void loadNotifications(session.access_token).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
    });
  }, [session?.access_token]);

  async function markAllRead() {
    if (!session?.access_token) return;

    await notificationFetch(session.access_token, '/api/communication/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({})
    });
    await loadNotifications(session.access_token);
  }

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <section className="admin-panel notification-panel">
      <div className="record-heading">
        <div>
          <h2>Notifications</h2>
          <p>{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</p>
        </div>
        <button className="button button-secondary" disabled={!unreadCount} onClick={() => void markAllRead()} type="button">
          Mark Read
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="notification-list">
        {notifications.length ? notifications.slice(0, 8).map((notification) => (
          <article className={`notification-item ${notification.read_at ? '' : 'notification-unread'}`} key={notification.id}>
            <span className="tag">{notification.type}</span>
            <strong>{notification.title}</strong>
            <p>{notification.body}</p>
            <small>{new Date(notification.created_at).toLocaleString()}</small>
          </article>
        )) : <p className="form-note">No notifications yet.</p>}
      </div>
    </section>
  );
}
