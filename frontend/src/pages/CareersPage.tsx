import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchCareers } from '../lib/api';
import type { CareerOpening } from '../types';

export function CareersPage() {
  const [openings, setOpenings] = useState<CareerOpening[]>([]);

  useEffect(() => {
    void fetchCareers().then(setOpenings);
  }, []);

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">Careers</p>
          <h1>Current Nexaris openings.</h1>
          <p className="summary">
            Applications are reviewed manually. Submission stores your application as PENDING and
            then hands you off to WhatsApp for the manual follow-up message.
          </p>
        </div>
        <div className="card-grid">
          {openings.map((opening) => (
            <article className="feature-card" key={opening.slug}>
              <span className="tag">{opening.experienceLevel}</span>
              <h3>{opening.title}</h3>
              <p>{opening.summary}</p>
              <Link className="inline-link" to={`/careers/${opening.slug}`}>
                View role and apply
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
