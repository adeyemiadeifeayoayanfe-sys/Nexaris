import { useEffect, useState } from 'react';
import { fetchServices } from '../lib/api';
import type { ServiceItem } from '../types';

export function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);

  useEffect(() => {
    void fetchServices().then(setServices);
  }, []);

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">Services</p>
          <h1>Product-focused engineering services.</h1>
          <p className="summary">
            Nexaris focuses on delivery work that demands design clarity, implementation discipline,
            and maintainable code.
          </p>
        </div>
        <div className="card-grid">
          {services.map((service) => (
            <article className="feature-card" key={service.slug}>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <span className="muted-link">Learn more during project scoping</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
