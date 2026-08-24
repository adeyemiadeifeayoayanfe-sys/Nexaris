import { useLocation } from 'react-router-dom';

export function FuturePortalPage() {
  const location = useLocation();
  const area = location.pathname.startsWith('/admin') ? 'Admin portal' : 'Worker portal';

  return (
    <main className="page">
      <section className="section">
        <div className="empty-card">
          <p className="section-kicker">Phase 3+</p>
          <h1>{area} is not built yet.</h1>
          <p>
            Authentication is live, but the actual portal interface follows in later implementation
            phases.
          </p>
        </div>
      </section>
    </main>
  );
}
