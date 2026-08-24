import { supabaseAdmin } from '../config/supabase.js';
import { getProfileById } from '../services/profileService.js';
import type { app_role } from '../types/database.js';
import type { HttpNext, HttpRequest, HttpResponse } from '../types/http.js';

function getBearerToken(request: HttpRequest) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
}

export async function authenticate(request: HttpRequest, response: HttpResponse, next: HttpNext) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return response.status(401).json({
        error: 'Missing bearer token'
      });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return response.status(401).json({
        error: 'Invalid or expired session'
      });
    }

    const profile = await getProfileById(data.user.id);

    if (!profile) {
      return response.status(403).json({
        error: 'Profile not found'
      });
    }

    request.auth = {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(allowedRoles: app_role[]) {
  return (request: HttpRequest, response: HttpResponse, next: HttpNext) => {
    if (!request.auth) {
      return response.status(401).json({
        error: 'Authentication required'
      });
    }

    if (request.auth.status !== 'ACTIVE') {
      return response.status(403).json({
        error: 'Account is not active'
      });
    }

    if (!allowedRoles.includes(request.auth.role)) {
      return response.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    return next();
  };
}
