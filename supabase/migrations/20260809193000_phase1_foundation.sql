create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('ADMIN', 'WORKER', 'CLIENT');
create type public.profile_status as enum ('ACTIVE', 'SUSPENDED', 'INACTIVE');
create type public.request_status as enum ('PENDING', 'REVIEWING', 'ACCEPTED', 'DECLINED', 'ARCHIVED');
create type public.application_status as enum ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'ARCHIVED');
create type public.worker_experience_level as enum ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
create type public.project_status as enum ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
create type public.project_member_status as enum ('ACTIVE', 'REMOVED', 'INVITED');
create type public.task_status as enum ('NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'REJECTED');
create type public.task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
create type public.file_kind as enum ('SOURCE', 'ASSET', 'DOCUMENT');
create type public.file_status as enum ('ACTIVE', 'ARCHIVED', 'DELETED');
create type public.message_scope as enum ('PROJECT', 'DIRECT');
create type public.notification_type as enum (
  'TASK_ASSIGNED',
  'TASK_APPROVED',
  'TASK_REJECTED',
  'PROJECT_MESSAGE',
  'DIRECT_MESSAGE',
  'FILE_UPDATED',
  'MENTION',
  'APPLICATION_APPROVED'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique,
  full_name text not null,
  avatar_url text,
  whatsapp_number text,
  country text,
  headline text,
  bio text,
  role public.app_role not null default 'CLIENT',
  status public.profile_status not null default 'ACTIVE',
  last_active_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_format check (username is null or username ~ '^[a-z0-9]+([._-]?[a-z0-9]+)*$')
);

create table if not exists public.project_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  request_code text not null unique default ('REQ-' || upper(substring(encode(extensions.gen_random_bytes(6), 'hex') from 1 for 10))),
  full_name text not null,
  email text not null,
  whatsapp_number text not null,
  company_name text,
  country text,
  project_title text not null,
  project_type text not null,
  project_description text not null,
  required_features text,
  estimated_budget text,
  expected_timeline text,
  existing_design boolean,
  reference_website text,
  additional_information text,
  status public.request_status not null default 'PENDING',
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_applications (
  id uuid primary key default extensions.gen_random_uuid(),
  application_code text not null unique default ('APP-' || upper(substring(encode(extensions.gen_random_bytes(6), 'hex') from 1 for 10))),
  full_name text not null,
  email text not null,
  whatsapp_number text not null,
  country text not null,
  age integer not null,
  position text not null,
  experience_level public.worker_experience_level not null,
  programming_languages text,
  frameworks text,
  technologies text,
  portfolio_url text,
  github_url text,
  about_yourself text,
  motivation text,
  contribution text,
  status public.application_status not null default 'PENDING',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  approved_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint job_applications_age_check check (age >= 16 and age <= 100)
);

create table if not exists public.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  request_id uuid unique references public.project_requests(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  client_name text,
  priority public.task_priority not null default 'MEDIUM',
  status public.project_status not null default 'DRAFT',
  deadline date,
  technologies text[] not null default '{}',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_members (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_role text not null,
  permissions jsonb not null default '{}'::jsonb,
  status public.project_member_status not null default 'ACTIVE',
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_worker_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  priority public.task_priority not null default 'MEDIUM',
  status public.task_status not null default 'NOT_STARTED',
  deadline timestamptz,
  related_file_ids uuid[] not null default '{}',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.task_comments (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_files (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.project_files(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  last_updated_by uuid references public.profiles(id) on delete set null,
  name text not null,
  path text not null,
  extension text,
  mime_type text,
  kind public.file_kind not null default 'SOURCE',
  is_directory boolean not null default false,
  storage_bucket text,
  storage_path text,
  content text,
  size_bytes bigint not null default 0,
  status public.file_status not null default 'ACTIVE',
  lock_version integer not null default 1,
  permissions jsonb not null default '{}'::jsonb,
  last_saved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, path),
  constraint project_files_content_rules check (
    (is_directory = true and content is null)
    or (is_directory = false)
  )
);

create table if not exists public.file_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  file_id uuid not null references public.project_files(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null,
  changed_by uuid references public.profiles(id) on delete set null,
  change_summary text,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (file_id, version_number)
);

create table if not exists public.project_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  parent_message_id uuid references public.project_messages(id) on delete set null,
  body text not null,
  mentions uuid[] not null default '{}',
  attachment_bucket text,
  attachment_path text,
  attachment_name text,
  attachment_mime_type text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.direct_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  attachment_bucket text,
  attachment_path text,
  attachment_name text,
  attachment_mime_type text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint direct_messages_no_self_send check (sender_id <> recipient_id)
);

create table if not exists public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.notification_type not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() = 'ADMIN', false)
$$;

create or replace function public.is_active_worker()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'WORKER'
      and status = 'ACTIVE'
  )
$$;

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.project_members pm
      join public.profiles p on p.id = pm.user_id
      where pm.project_id = target_project_id
        and pm.user_id = auth.uid()
        and pm.status = 'ACTIVE'
        and p.status = 'ACTIVE'
    )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    'CLIENT',
    'ACTIVE'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists project_requests_status_idx on public.project_requests(status);
create index if not exists project_requests_created_at_idx on public.project_requests(created_at desc);
create index if not exists job_applications_status_idx on public.job_applications(status);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists project_members_project_id_idx on public.project_members(project_id);
create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assigned_worker_id_idx on public.tasks(assigned_worker_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists task_comments_task_id_idx on public.task_comments(task_id);
create index if not exists project_files_project_id_idx on public.project_files(project_id);
create index if not exists project_files_parent_id_idx on public.project_files(parent_id);
create index if not exists file_versions_file_id_idx on public.file_versions(file_id);
create index if not exists project_messages_project_id_idx on public.project_messages(project_id);
create index if not exists direct_messages_sender_recipient_idx on public.direct_messages(sender_id, recipient_id);
create index if not exists notifications_recipient_id_idx on public.notifications(recipient_id, read_at);
create index if not exists activity_logs_project_id_idx on public.activity_logs(project_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger project_requests_set_updated_at
before update on public.project_requests
for each row execute procedure public.set_updated_at();

create trigger job_applications_set_updated_at
before update on public.job_applications
for each row execute procedure public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

create trigger project_members_set_updated_at
before update on public.project_members
for each row execute procedure public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute procedure public.set_updated_at();

create trigger task_comments_set_updated_at
before update on public.task_comments
for each row execute procedure public.set_updated_at();

create trigger project_files_set_updated_at
before update on public.project_files
for each row execute procedure public.set_updated_at();

create trigger project_messages_set_updated_at
before update on public.project_messages
for each row execute procedure public.set_updated_at();

create trigger direct_messages_set_updated_at
before update on public.direct_messages
for each row execute procedure public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.project_requests enable row level security;
alter table public.job_applications enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.project_files enable row level security;
alter table public.file_versions enable row level security;
alter table public.project_messages enable row level security;
alter table public.direct_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles select own or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles update own or admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "public submit project requests"
on public.project_requests
for insert
to anon, authenticated
with check (status = 'PENDING');

create policy "admins manage project requests"
on public.project_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "public submit job applications"
on public.job_applications
for insert
to anon, authenticated
with check (status = 'PENDING');

create policy "admins manage job applications"
on public.job_applications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage projects"
on public.projects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "members view accessible projects"
on public.projects
for select
to authenticated
using (public.can_access_project(id));

create policy "admins manage project members"
on public.project_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "members view project members"
on public.project_members
for select
to authenticated
using (public.can_access_project(project_id));

create policy "admins manage tasks"
on public.tasks
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "members view accessible tasks"
on public.tasks
for select
to authenticated
using (public.can_access_project(project_id));

create policy "workers update assigned tasks"
on public.tasks
for update
to authenticated
using (
  assigned_worker_id = auth.uid()
  and public.can_access_project(project_id)
)
with check (
  assigned_worker_id = auth.uid()
  and public.can_access_project(project_id)
);

create policy "members view task comments"
on public.task_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "members add task comments"
on public.task_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_access_project(t.project_id)
  )
);

create policy "admins update task comments"
on public.task_comments
for update
to authenticated
using (public.is_admin() or author_id = auth.uid())
with check (public.is_admin() or author_id = auth.uid());

create policy "members view project files"
on public.project_files
for select
to authenticated
using (public.can_access_project(project_id));

create policy "admins manage project files"
on public.project_files
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "members view file versions"
on public.file_versions
for select
to authenticated
using (public.can_access_project(project_id));

create policy "admins manage file versions"
on public.file_versions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "members view project messages"
on public.project_messages
for select
to authenticated
using (public.can_access_project(project_id));

create policy "members send project messages"
on public.project_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.can_access_project(project_id)
);

create policy "members update own project messages"
on public.project_messages
for update
to authenticated
using (sender_id = auth.uid() or public.is_admin())
with check (sender_id = auth.uid() or public.is_admin());

create policy "admin and recipient direct message access"
on public.direct_messages
for select
to authenticated
using (
  public.is_admin()
  or sender_id = auth.uid()
  or recipient_id = auth.uid()
);

create policy "admin can message workers and users can reply to admin"
on public.direct_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.profiles sender_profile
      join public.profiles recipient_profile on recipient_profile.id = recipient_id
      where sender_profile.id = auth.uid()
        and sender_profile.role = 'WORKER'
        and recipient_profile.role = 'ADMIN'
    )
  )
);

create policy "message owners update direct messages"
on public.direct_messages
for update
to authenticated
using (sender_id = auth.uid() or public.is_admin())
with check (sender_id = auth.uid() or public.is_admin());

create policy "users view own notifications"
on public.notifications
for select
to authenticated
using (recipient_id = auth.uid() or public.is_admin());

create policy "users update own notifications"
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid() or public.is_admin())
with check (recipient_id = auth.uid() or public.is_admin());

create policy "admins manage notifications"
on public.notifications
for insert
to authenticated
with check (public.is_admin());

create policy "members view accessible activity logs"
on public.activity_logs
for select
to authenticated
using (
  public.is_admin()
  or (
    project_id is not null
    and public.can_access_project(project_id)
  )
);

create policy "admins manage activity logs"
on public.activity_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
