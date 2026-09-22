alter table public.projects
  add column if not exists project_type text;

alter table public.projects
  drop constraint if exists projects_project_type_check;

alter table public.projects
  add constraint projects_project_type_check
  check (
    project_type is null
    or project_type in (
      'Website',
      'Web Application',
      'Landing Page',
      'Dashboard',
      'E-commerce Website',
      'School Management System',
      'Business Software',
      'JavaScript Application',
      'Other'
    )
  );

create index if not exists projects_project_type_idx
  on public.projects(project_type);
