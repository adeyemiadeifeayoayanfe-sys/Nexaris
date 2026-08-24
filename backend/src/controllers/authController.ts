import { getProfileById } from '../services/profileService.js';
import type { HttpRequest, HttpResponse } from '../types/http.js';

export async function authSessionController(request: HttpRequest, response: HttpResponse) {
  const auth = request.auth;

  if (!auth) {
    return response.status(401).json({
      error: 'Authentication required'
    });
  }

  const profile = await getProfileById(auth.userId);

  if (!profile) {
    return response.status(404).json({
      error: 'Profile not found'
    });
  }

  return response.json({
    user: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      fullName: profile.full_name,
      role: profile.role,
      status: profile.status
    }
  });
}
