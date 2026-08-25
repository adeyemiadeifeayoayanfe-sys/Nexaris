alter table public.job_applications
add column if not exists account_status text not null default 'NONE'
check (account_status in ('NONE', 'INVITATION_SENT', 'ACTIVE', 'EXISTING_ACCOUNT'));

alter table public.job_applications
add column if not exists invitation_sent_at timestamptz;

alter table public.job_applications
add column if not exists activated_at timestamptz;

create index if not exists job_applications_approved_profile_id_idx
on public.job_applications(approved_profile_id);
