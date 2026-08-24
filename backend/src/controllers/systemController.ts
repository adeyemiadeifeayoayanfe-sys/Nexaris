import { env } from '../config/env.js';
import type { HttpRequest, HttpResponse } from '../types/http.js';

export function systemStatusController(_request: HttpRequest, response: HttpResponse) {
  const supabaseHost = new URL(env.SUPABASE_URL).host;
  const projectRef = supabaseHost.split('.')[0] ?? null;

  response.json({
    company: 'Nexaris Technologies',
    phase: 'PHASE_1_FOUNDATION',
    environment: env.NODE_ENV,
    frontendOrigin: env.FRONTEND_URL,
    supabase: {
      configured: true,
      projectRef,
      host: supabaseHost,
      auth: 'Supabase Auth configured',
      database: 'Migration and RLS foundation prepared'
    },
    backend: {
      api: 'Express',
      authGuards: true,
      roleAwareRoutes: true
    },
    nextMilestone: 'PHASE_2_PUBLIC_WEBSITE'
  });
}
