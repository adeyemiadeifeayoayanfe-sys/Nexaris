import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');

if (!existsSync(envPath)) {
  console.error('Missing .env at repository root.');
  process.exit(1);
}

const required = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'OWNER_ADMIN_EMAIL',
  'PORT'
];

const entries = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return index === -1 ? [line, ''] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);

const missing = required.filter((key) => !entries[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (entries.SUPABASE_URL !== entries.VITE_SUPABASE_URL) {
  console.error('SUPABASE_URL and VITE_SUPABASE_URL must match.');
  process.exit(1);
}

if (entries.SUPABASE_PUBLISHABLE_KEY !== entries.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error('SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_PUBLISHABLE_KEY must match.');
  process.exit(1);
}

if (entries.FRONTEND_URL && !/^https?:\/\//.test(entries.FRONTEND_URL)) {
  console.error('FRONTEND_URL must be an absolute http or https URL when provided.');
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entries.OWNER_ADMIN_EMAIL)) {
  console.error('OWNER_ADMIN_EMAIL must be a valid email address.');
  process.exit(1);
}

console.log('Environment configuration looks valid.');
