import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(scriptDir, '..', '..', '.env') });

const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required variables for remote schema verification: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const tableChecks = [
  'profiles',
  'project_requests',
  'job_applications',
  'projects',
  'project_members',
  'tasks',
  'task_comments',
  'project_files',
  'file_versions',
  'project_messages',
  'direct_messages',
  'notifications',
  'activity_logs'
];

async function checkTable(table) {
  const { error, count } = await supabase.from(table).select('id', { count: 'exact', head: true });

  if (error) {
    throw new Error(`${table}: ${JSON.stringify(error)}`);
  }

  return {
    table,
    count: count ?? 0
  };
}

async function main() {
  const results = [];

  for (const table of tableChecks) {
    results.push(await checkTable(table));
  }
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    throw new Error(`auth admin probe: ${error.message}`);
  }

  const projectRef = new URL(process.env.SUPABASE_URL).host.split('.')[0] ?? 'unknown';

  console.log(`Supabase project: ${projectRef}`);
  console.log('Remote schema checks passed:');

  for (const result of results) {
    console.log(`- ${result.table}: ok (${result.count} rows)`);
  }

  console.log(`- auth admin probe: ok (${data.users.length} user(s) fetched in probe page)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
