import { env } from '../config/env.js';
import type { HttpRequest, HttpResponse } from '../types/http.js';

export function healthController(_request: HttpRequest, response: HttpResponse) {
  response.json({
    ok: true,
    service: 'nexaris-backend',
    environment: env.NODE_ENV,
    supabaseConfigured: true
  });
}
