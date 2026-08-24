alter type public.project_status add value if not exists 'PLANNING';
alter type public.project_status add value if not exists 'IN_REVIEW';
alter type public.project_status add value if not exists 'CANCELLED';

alter table public.projects add column if not exists client_email text;
alter table public.projects add column if not exists client_whatsapp text;
alter table public.projects add column if not exists notes text;
