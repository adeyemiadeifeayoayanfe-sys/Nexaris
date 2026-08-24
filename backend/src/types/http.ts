import type { app_role, profile_status } from './database.js';

export type HttpRequest = {
  body: Record<string, unknown>;
  params: Record<string, string | undefined>;
  query: Record<string, string | string[] | undefined>;
  headers: {
    authorization?: string;
  };
  auth?: {
    userId: string;
    email: string | null;
    role: app_role;
    status: profile_status;
  };
};

export type HttpResponse = {
  status: (code: number) => HttpResponse;
  json: (body: unknown) => HttpResponse;
};

export type HttpNext = (error?: unknown) => void;
