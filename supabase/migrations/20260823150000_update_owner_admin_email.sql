create or replace function public.is_owner_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and lower(email) = 'adeyemiadeifeayoayanfe@gmail.com'
        and role = 'ADMIN'
        and status = 'ACTIVE'
    ),
    false
  )
$$;
