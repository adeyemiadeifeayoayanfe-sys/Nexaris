import { ArrowRight, BriefcaseBusiness, Layers3, ShieldCheck, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  {
    icon: BriefcaseBusiness,
    title: 'Project Requests',
    body: 'Structured intake for clients who need websites, dashboards, business software, or custom web applications.'
  },
  {
    icon: Workflow,
    title: 'Collaborative Delivery',
    body: 'The platform is being built to support admin oversight, worker execution, tasks, files, and project communication.'
  },
  {
    icon: ShieldCheck,
    title: 'Secure Architecture',
    body: 'Supabase Auth, RLS, and backend validation keep permissions enforced beyond the browser.'
  }
];

const process = [
  'Request submission and technical review',
  'Scope alignment, planning, and acceptance',
  'Team assignment and structured delivery',
  'Collaborative implementation and iteration'
];

export function HomePage() {
  return (
    <main className="page">
      <section className="hero-stage">
        <div className="hero-copy">
          <p className="eyebrow">Nexaris Technologies</p>
          <h1>Engineering What&apos;s Next.</h1>
          <p className="summary">
            Building modern digital solutions through thoughtful design, powerful code and
            collaborative engineering.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/request-project">
              Start a Project
            </Link>
            <Link className="button button-secondary" to="/careers">
              Join Our Team
            </Link>
          </div>
        </div>
        <aside className="hero-panel-card">
          <div className="phase-pill">
            <Layers3 size={18} />
            <span>Public Website + Secure Platform Roadmap</span>
          </div>
          <p>
            Nexaris is being built as both a premium software company website and an internal
            engineering operations platform.
          </p>
          <ul className="bullet-list">
            <li>Client project requests with validated intake</li>
            <li>Careers pipeline for approved worker onboarding</li>
            <li>Secure role-based architecture for later portal phases</li>
          </ul>
        </aside>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">Services</p>
          <h2>Software engineering with product discipline.</h2>
        </div>
        <div className="card-grid">
          {highlights.map(({ icon: Icon, title, body }) => (
            <article className="feature-card" key={title}>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-contrast">
        <div className="section-heading">
          <p className="section-kicker">Development Process</p>
          <h2>Delivery is structured, reviewable, and built to scale.</h2>
        </div>
        <div className="timeline-grid">
          {process.map((step, index) => (
            <article className="timeline-step" key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">Selected Projects</p>
          <h2>No public case studies are published yet.</h2>
        </div>
        <div className="empty-card">
          <p>
            The public projects showcase is intentionally empty until real Nexaris delivery work is
            ready to be published.
          </p>
          <Link className="inline-link" to="/projects">
            View projects page <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section cta-band">
        <div>
          <p className="section-kicker">Next Step</p>
          <h2>Need a software delivery partner?</h2>
        </div>
        <Link className="button button-primary" to="/request-project">
          Request a Project
        </Link>
      </section>
    </main>
  );
}
