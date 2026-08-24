# Nexaris Technologies

Nexaris Technologies is a software development company building a public company website and a secure internal collaboration platform for project intake, hiring, delivery, and team operations.

Tagline: `Engineering What's Next.`

This repository is being delivered incrementally. As of Sunday, August 9, 2026, Phase 1 is implemented locally. Later product phases are intentionally not built yet.

## Architecture

The repository is organized as a workspace-based monorepo:

```text
nexaris-platform/
|- frontend/        React + TypeScript + Vite client
|- backend/         Express + TypeScript API
|- supabase/        Config, migrations, and seed placeholders
|- docs/            Architecture and security notes
|- scripts/         Local verification helpers
|- .env.example     Environment template
|- package.json     Workspace scripts
```

## Current Phase

Implemented now:

- Phase 1 schema foundation in [supabase/migrations/20260809193000_phase1_foundation.sql](/C:/Users/User/Documents/Nexaris/supabase/migrations/20260809193000_phase1_foundation.sql)
- Role-aware backend verification routes
- Root environment validation and frontend/backend config wiring
- Supabase CLI project linkage
- Phase 1 frontend status dashboard

Not implemented yet:

- Public website pages
- Project request system UI and API
- Careers system UI and API
- Admin portal
- Worker portal
- File manager
- Monaco editor workspace
- Live preview
- Realtime synchronization
- Chat and notification interfaces

## Prerequisites

- Node.js 22+
- npm 10+
- Git
- A Supabase project

Optional for local database workflows:

- Supabase CLI
- Docker Desktop

## Install Dependencies

```bash
npm install
```

## Environment Variables

Create a root `.env` file at `C:\Users\User\Documents\Nexaris\.env` from [.env.example](/C:/Users/User/Documents/Nexaris/.env.example).

Required values:

- `NODE_ENV`
  Example: `development`
- `SUPABASE_URL`
  Source: Supabase Dashboard -> Project Settings -> API -> Project URL
- `SUPABASE_PUBLISHABLE_KEY`
  Source: Supabase Dashboard -> Project Settings -> API -> publishable key
- `SUPABASE_SECRET_KEY`
  Source: Supabase Dashboard -> Project Settings -> API -> secret key or service role key
- `VITE_SUPABASE_URL`
  Must match `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
  Must match `SUPABASE_PUBLISHABLE_KEY`
- `FRONTEND_URL`
  Example: `http://localhost:5173`
- `PORT`
  Example: `4000`

Example:

```dotenv
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_server_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
FRONTEND_URL=http://localhost:5173
PORT=4000
```

Rules:

- Never commit `.env`
- Never place `SUPABASE_SECRET_KEY` in frontend code
- Keep `.env.example` free of real credentials

## Development Commands

Run the environment check:

```bash
npm run check:env
```

Run both apps:

```bash
npm run dev
```

Run the frontend only:

```bash
npm run dev:frontend
```

Run the backend only:

```bash
npm run dev:backend
```

Build everything:

```bash
npm run build
```

## Backend Verification Routes

- `GET /api/health`
- `GET /api/system/status`
- `GET /api/auth/me` with a valid Supabase bearer token

## Supabase Setup

This repository is configured to use:

- Supabase Auth
- PostgreSQL through Supabase
- Version-controlled SQL migrations
- Row Level Security

The local CLI has already been linked to the Supabase project for this workspace.

## Database and Migrations

The Phase 1 migration defines:

- Core enums for roles, statuses, priorities, file types, and notifications
- Profiles linked to `auth.users`
- Project requests
- Job applications
- Projects
- Project members
- Tasks
- Task comments
- Project files
- File versions
- Project messages
- Direct messages
- Notifications
- Activity logs
- Helper functions for role and project access checks
- RLS policies for admin, worker, and public submission boundaries

Recommended workflow for future schema work:

```bash
npx supabase migration new <name>
npx supabase db push
```

Do not run destructive remote commands without explicit confirmation.
Do not reset the linked remote database.
Do not push destructive SQL blindly.

## Authentication

Phase 1 includes:

- Supabase Auth integration
- Automatic profile creation trigger for new auth users
- Backend bearer-token validation
- Role-aware backend guards
- Database-level access control through RLS

The full login UI and onboarding flows are not implemented yet.

## Security

- Authentication must not rely on frontend role checks alone
- Authorization is enforced in both backend logic and RLS policies
- Secret credentials remain server-side
- Public submission tables allow inserts but not unrestricted reads
- Worker access is scoped to assigned projects
- Direct messaging is restricted to admin-worker communication

## Git Workflow

Do not commit:

- `.env`
- secret keys
- credentials
- temporary files

Recommended commands once Git is available on the machine:

```bash
git init
git add .
git commit -m "feat: implement phase 1 foundation"
```

## Testing and Verification

Phase 1 should be verified with:

- `npm run check:env`
- `npm run build`
- API route checks against `/api/health` and `/api/system/status`
- Review of the generated migration SQL before any `db push`

## Next Phase

The next planned implementation step is Phase 2:

- Public website
- Services
- Careers pages
- Project request flow
- WhatsApp handoff configuration
