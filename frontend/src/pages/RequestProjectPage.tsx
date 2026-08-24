import { FormEvent, useState } from 'react';
import { submitProjectRequest } from '../lib/api';

const initialState = {
  fullName: '',
  email: '',
  whatsappNumber: '',
  companyName: '',
  country: '',
  projectTitle: '',
  projectType: 'Website',
  projectDescription: '',
  requiredFeatures: '',
  estimatedBudget: '',
  expectedTimeline: '',
  existingDesign: false,
  referenceWebsite: '',
  additionalInformation: ''
};

const projectTypes = [
  'Website',
  'Web Application',
  'Landing Page',
  'Dashboard',
  'E-commerce Website',
  'School Management System',
  'Business Software',
  'JavaScript Application',
  'Other'
];

type FieldErrors = Record<string, string>;

function getSubmitErrors(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'fields' in error &&
    Array.isArray(error.fields)
  ) {
    const fieldErrors = Object.fromEntries(
      error.fields
        .filter(
          (field): field is { path: string; message: string } =>
            typeof field === 'object' &&
            field !== null &&
            'path' in field &&
            typeof field.path === 'string' &&
            'message' in field &&
            typeof field.message === 'string'
        )
        .map((field) => [field.path, field.message])
    );

    return {
      message: Object.values(fieldErrors)[0] ?? 'Please correct the highlighted fields.',
      fieldErrors
    };
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'string'
  ) {
    return {
      message: error.error,
      fieldErrors: {}
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Unable to submit request.',
    fieldErrors: {}
  };
}

export function RequestProjectPage() {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [response, setResponse] = useState<null | {
    code: string;
    message: string;
    whatsappUrl: string | null;
    whatsappConfigured: boolean;
  }>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await submitProjectRequest(form);

      setResponse({
        code: result.requestCode,
        message: result.message,
        whatsappUrl: result.whatsappUrl,
        whatsappConfigured: result.whatsappConfigured
      });
    } catch (submitError) {
      const parsedError = getSubmitErrors(submitError);
      setError(parsedError.message);
      setFieldErrors(parsedError.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name: keyof typeof initialState) {
    return fieldErrors[name] ? <small className="field-error">{fieldErrors[name]}</small> : null;
  }

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">Request a Project</p>
          <h1>Tell Nexaris what needs to be built.</h1>
          <p className="summary">
            This form stores your request in Supabase as PENDING and then prepares a WhatsApp
            message for you to send manually.
          </p>
        </div>
        <form className="content-card form-card wide-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label>
              <span>Full Name *</span>
              <input aria-invalid={Boolean(fieldErrors.fullName)} maxLength={120} minLength={2} required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              {fieldError('fullName')}
            </label>
            <label>
              <span>Email *</span>
              <input aria-invalid={Boolean(fieldErrors.email)} maxLength={160} required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              {fieldError('email')}
            </label>
            <label>
              <span>WhatsApp Number *</span>
              <input aria-invalid={Boolean(fieldErrors.whatsappNumber)} maxLength={32} minLength={7} required value={form.whatsappNumber} onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} />
              {fieldError('whatsappNumber')}
            </label>
            <label>
              <span>Company / Organization</span>
              <input aria-invalid={Boolean(fieldErrors.companyName)} maxLength={160} value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
              {fieldError('companyName')}
            </label>
            <label>
              <span>Country</span>
              <input aria-invalid={Boolean(fieldErrors.country)} maxLength={120} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
              {fieldError('country')}
            </label>
            <label>
              <span>Project Title *</span>
              <input aria-invalid={Boolean(fieldErrors.projectTitle)} maxLength={180} minLength={3} required value={form.projectTitle} onChange={(event) => setForm({ ...form, projectTitle: event.target.value })} />
              {fieldError('projectTitle')}
            </label>
            <label>
              <span>Project Type *</span>
              <select aria-invalid={Boolean(fieldErrors.projectType)} required value={form.projectType} onChange={(event) => setForm({ ...form, projectType: event.target.value })}>
                {projectTypes.map((projectType) => (
                  <option key={projectType}>{projectType}</option>
                ))}
              </select>
              {fieldError('projectType')}
            </label>
            <label className="field-full">
              <span>Project Description * <small>minimum 10 characters</small></span>
              <textarea aria-invalid={Boolean(fieldErrors.projectDescription)} maxLength={4000} minLength={10} required rows={5} value={form.projectDescription} onChange={(event) => setForm({ ...form, projectDescription: event.target.value })} />
              {fieldError('projectDescription')}
            </label>
            <label className="field-full">
              <span>Required Features</span>
              <textarea aria-invalid={Boolean(fieldErrors.requiredFeatures)} maxLength={3000} rows={4} value={form.requiredFeatures} onChange={(event) => setForm({ ...form, requiredFeatures: event.target.value })} />
              {fieldError('requiredFeatures')}
            </label>
            <label>
              <span>Estimated Budget</span>
              <input aria-invalid={Boolean(fieldErrors.estimatedBudget)} maxLength={160} value={form.estimatedBudget} onChange={(event) => setForm({ ...form, estimatedBudget: event.target.value })} />
              {fieldError('estimatedBudget')}
            </label>
            <label>
              <span>Expected Timeline</span>
              <input aria-invalid={Boolean(fieldErrors.expectedTimeline)} maxLength={160} value={form.expectedTimeline} onChange={(event) => setForm({ ...form, expectedTimeline: event.target.value })} />
              {fieldError('expectedTimeline')}
            </label>
            <label>
              <span>Reference Website</span>
              <input aria-invalid={Boolean(fieldErrors.referenceWebsite)} placeholder="https://example.com" type="url" value={form.referenceWebsite} onChange={(event) => setForm({ ...form, referenceWebsite: event.target.value })} />
              {fieldError('referenceWebsite')}
            </label>
            <label className="checkbox-field">
              <input checked={form.existingDesign} type="checkbox" onChange={(event) => setForm({ ...form, existingDesign: event.target.checked })} />
              <span>Existing design available</span>
            </label>
            <label className="field-full">
              <span>Additional Information</span>
              <textarea aria-invalid={Boolean(fieldErrors.additionalInformation)} maxLength={3000} rows={4} value={form.additionalInformation} onChange={(event) => setForm({ ...form, additionalInformation: event.target.value })} />
              {fieldError('additionalInformation')}
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
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </section>
    </main>
  );
}
