import type { app_role, profile_status } from '../types/database.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string | null;
        role: app_role;
        status: profile_status;
      };
    }
  }
}

export {};
