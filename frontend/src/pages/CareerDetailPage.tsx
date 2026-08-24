import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCareer, submitJobApplication } from '../lib/api';
import type { CareerOpening } from '../types';

const emptyForm = {
  fullName: '',
  email: '',
  whatsappNumber: '',
  country: '',
  age: '',
  experienceLevel: 'Intermediate',
  programmingLanguages: '',
  frameworks: '',
  technologies: '',
  portfolioUrl: '',
  githubUrl: '',
  aboutYourself: '',
  whyJoin: '',
  contribution: ''
};

export function CareerDetailPage() {
  const { job = '' } = useParams();
  const [opening, setOpening] = useState<CareerOpening | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<null | {
    message: string;
    code: string;
    whatsappUrl: string | null;
    whatsappConfigured: boolean;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCareer(job)
      .then(setOpening)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this opening.');
      });
  }, [job]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitJobApplication({
        ...form,
        age: Number(form.age),
        position: opening?.title
      });

      setResponse({
        message: result.message,
        code: result.applicationCode,
        whatsappUrl: result.whatsappUrl,
        whatsappConfigured: result.whatsappConfigured
      });
    } catch (submitError) {
      const message =
        typeof submitError === 'object' &&
        submitError !== null &&
        'error' in submitError &&
        typeof submitError.error === 'string'
          ? submitError.error
          : submitError instanceof Error
            ? submitError.message
            : 'Unable to submit application.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!opening) {
    return (
      <main className="page">
        <section className="section">
          <div className="empty-card">
            <p>{error ?? 'Loading opening...'}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="section two-column-layout">
        <div className="content-card">
          <p className="section-kicker">Career Opening</p>
          <h1>{opening.title}</h1>
          <p className="summary">{opening.summary}</p>
          <h3>Responsibilities</h3>
          <ul className="bullet-list">
            {opening.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3>Requirements</h3>
          <ul className="bullet-list">
            {opening.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="tag-row">
            {opening.skills.map((skill) => (
              <span className="tag" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </div>

        <form className="content-card form-card" onSubmit={handleSubmit}>
          <h2>Apply for {opening.title}</h2>
          <div className="field-grid">
            <label>
              <span>Full Name *</span>
              <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            </label>
            <label>
              <span>Email *</span>
              <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              <span>WhatsApp Number *</span>
              <input required value={form.whatsappNumber} onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} />
            </label>
            <label>
              <span>Country *</span>
              <input required value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
            </label>
            <label>
              <span>Age *</span>
              <input required min={16} max={100} type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} />
            </label>
            <label>
              <span>Experience *</span>
              <select value={form.experienceLevel} onChange={(event) => setForm({ ...form, experienceLevel: event.target.value })}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label>
              <span>Programming Languages</span>
              <input value={form.programmingLanguages} onChange={(event) => setForm({ ...form, programmingLanguages: event.target.value })} />
            </label>
            <label>
              <span>Frameworks</span>
              <input value={form.frameworks} onChange={(event) => setForm({ ...form, frameworks: event.target.value })} />
            </label>
            <label>
              <span>Technologies</span>
              <input value={form.technologies} onChange={(event) => setForm({ ...form, technologies: event.target.value })} />
            </label>
            <label>
              <span>Portfolio URL</span>
              <input value={form.portfolioUrl} onChange={(event) => setForm({ ...form, portfolioUrl: event.target.value })} />
            </label>
            <label>
              <span>GitHub URL</span>
              <input value={form.githubUrl} onChange={(event) => setForm({ ...form, githubUrl: event.target.value })} />
            </label>
            <label className="field-full">
              <span>About Yourself</span>
              <textarea rows={4} value={form.aboutYourself} onChange={(event) => setForm({ ...form, aboutYourself: event.target.value })} />
            </label>
            <label className="field-full">
              <span>Why do you want to join? *</span>
              <textarea required rows={4} value={form.whyJoin} onChange={(event) => setForm({ ...form, whyJoin: event.target.value })} />
            </label>
            <label className="field-full">
              <span>What can you contribute? *</span>
              <textarea required rows={4} value={form.contribution} onChange={(event) => setForm({ ...form, contribution: event.target.value })} />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          {response ? (
            <div className="success-panel">
              <strong>{response.code}</strong>
              <p>{response.message}</p>
              {response.whatsappUrl ? (
                <a className="button button-primary" href={response.whatsappUrl} rel="noreferrer" target="_blank">
                  Continue to WhatsApp
                </a>
              ) : (
                <p className="form-note">WhatsApp handoff is not configured yet in this environment.</p>
              )}
            </div>
          ) : null}
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Submitting...' : 'Apply Now'}
          </button>
        </form>
      </section>
    </main>
  );
}
