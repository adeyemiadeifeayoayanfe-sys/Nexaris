import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicConfig } from '../lib/api';
import type { PublicConfig } from '../types';

export function ContactPage() {
  const [config, setConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    void fetchPublicConfig().then(setConfig);
  }, []);

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">Contact</p>
          <h1>Start the conversation through the configured Nexaris channels.</h1>
          <p className="summary">
            Project request and careers forms are available now. Direct contact details are exposed
            only when configured in the environment.
          </p>
        </div>
        <div className="content-grid">
          <article className="content-card">
            <h3>Project inquiries</h3>
            <p>Use the structured request flow so scope, budget, and requirements are captured properly.</p>
            <Link className="button button-primary" to="/request-project">
              Request a Project
            </Link>
          </article>
          <article className="content-card">
            <h3>Careers</h3>
            <p>Apply through the careers portal for one of the active Nexaris openings.</p>
            <Link className="button button-secondary" to="/careers">
              View Careers
            </Link>
          </article>
          <article className="content-card">
            <h3>WhatsApp</h3>
            <p>
              {config?.whatsappConfigured
                ? `Configured for manual client handoff via ${config.whatsappNumber}.`
                : 'WhatsApp number is not configured in this environment yet.'}
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
