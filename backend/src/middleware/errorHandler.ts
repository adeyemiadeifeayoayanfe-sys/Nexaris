import type { HttpNext, HttpRequest, HttpResponse } from '../types/http.js';

export function errorHandler(
  error: unknown,
  _request: HttpRequest,
  response: HttpResponse,
  _next: HttpNext
) {
  console.error(error);

  response.status(500).json({
    error: 'Internal server error'
  });
}
