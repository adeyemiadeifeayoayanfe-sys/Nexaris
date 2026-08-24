import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(scriptDir, '..', '..', '.env') });

const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'OWNER_ADMIN_EMAIL', 'OWNER_ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required variables: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function slugifyPart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

async function generateUniqueUsername(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const base =
    [parts[0], parts[parts.length - 1]]
      .filter(Boolean)
      .map(slugifyPart)
      .join('.') || 'owner.admin';

  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate = `${base}${suffix}`;
    suffix += 1;
  }
}

async function findUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);

    if (match || data.users.length < 1000) {
      return match ?? null;
    }

    page += 1;
  }
}

async function main() {
  const email = process.env.OWNER_ADMIN_EMAIL.trim().toLowerCase();
  const fullName = process.env.OWNER_ADMIN_FULL_NAME?.trim() || 'Nexaris Owner';
  const existingUser = await findUserByEmail(email);
  let userId = existingUser?.id ?? null;

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: process.env.OWNER_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        full_name: fullName
      }
    });

    if (error) {
      throw error;
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: process.env.OWNER_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (error) {
      throw error;
    }

    userId = data.user?.id ?? null;
  }

  if (!userId) {
    throw new Error('Supabase did not return an owner admin user id.');
  }

  const username = await generateUniqueUsername(fullName);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        username,
        full_name: fullName,
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      {
        onConflict: 'id'
      }
    )
    .select('id, email, username, full_name, role, status')
    .single();

  if (profileError) {
    throw profileError;
  }

  console.log(
    JSON.stringify({
      email: profile.email,
      username: profile.username,
      role: profile.role,
      status: profile.status
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
