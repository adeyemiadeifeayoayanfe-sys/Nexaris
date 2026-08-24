import type { CareerOpening, PublicConfig, ServiceItem } from '../types';

async function readJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw data ?? { error: `Request failed with ${response.status}` };
  }

  return data as T;
}

export async function fetchPublicConfig() {
  return readJson<PublicConfig>('/api/public/config');
}

export async function fetchServices() {
  const data = await readJson<{ services: ServiceItem[] }>('/api/public/services');
  return data.services;
}

export async function fetchCareers() {
  const data = await readJson<{ openings: CareerOpening[] }>('/api/public/careers');
  return data.openings;
}

export async function fetchCareer(slug: string) {
  const data = await readJson<{ opening: CareerOpening }>(`/api/public/careers/${slug}`);
  return data.opening;
}

export async function fetchProjects() {
  return readJson<{ projects: []; message: string }>('/api/public/projects');
}

export async function submitProjectRequest(payload: Record<string, unknown>) {
  return readJson<{
    requestId: string;
    requestCode: string;
    whatsappUrl: string | null;
    whatsappConfigured: boolean;
    message: string;
  }>('/api/public/project-requests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function submitJobApplication(payload: Record<string, unknown>) {
  return readJson<{
    applicationId: string;
    applicationCode: string;
    whatsappUrl: string | null;
    whatsappConfigured: boolean;
    message: string;
  }>('/api/public/job-applications', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchViewer(accessToken: string) {
  return readJson<{ user: import('../types').AuthProfile }>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}
