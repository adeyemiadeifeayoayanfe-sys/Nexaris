import { useEffect, useState } from 'react';
import { fetchProjects } from '../lib/api';

export function ProjectsPage() {
  const [message, setMessage] = useState('Loading project showcase status...');

  useEffect(() => {
    void fetchProjects().then((data) => setMessage(data.message));
  }, []);

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">Projects</p>
          <h1>Published case studies will appear here.</h1>
          <p className="summary">
            Nexaris will only present real client or internal case studies once they are cleared for
            publication.
          </p>
        </div>
        <div className="empty-card">
          <p>{message}</p>
        </div>
      </section>
    </main>
  );
}
