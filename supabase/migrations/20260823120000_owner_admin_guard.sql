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
        and lower(email) = 'adeyemiadeifeayoaynfe@gmail.com'
        and role = 'ADMIN'
        and status = 'ACTIVE'
    ),
    false
  )
$$;

create or replace function public.prevent_non_owner_admin_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.role = 'ADMIN' and (tg_op = 'INSERT' or old.role is distinct from new.role) then
    if not public.is_owner_admin() then
      raise exception 'Only the owner admin can create admin profiles'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_non_owner_admin_promotion on public.profiles;

create trigger profiles_prevent_non_owner_admin_promotion
before insert or update of role on public.profiles
for each row
execute function public.prevent_non_owner_admin_promotion();
