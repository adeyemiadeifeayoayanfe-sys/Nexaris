import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '..', '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  OWNER_ADMIN_EMAIL: z.email(),
  COMPANY_WHATSAPP_NUMBER: z.string().min(8).optional()
});

export const env = envSchema.parse(process.env);
