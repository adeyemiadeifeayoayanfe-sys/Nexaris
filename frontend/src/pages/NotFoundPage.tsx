import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page">
      <section className="section">
        <div className="empty-card">
          <h1>Page not found.</h1>
          <Link className="button button-primary" to="/">
            Return Home
          </Link>
        </div>
      </section>
    </main>
  );
}
