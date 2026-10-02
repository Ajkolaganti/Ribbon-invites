create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  plan text not null default 'free' check (plan in ('free', 'plus')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Hosts read their plan" on public.profiles;
create policy "Hosts read their plan"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create table if not exists public.ribbon_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ribbon_events (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (host_id, email)
);

create index if not exists ribbon_guests_event_idx on public.ribbon_guests (event_id);

alter table public.ribbon_guests enable row level security;

grant select, update, delete on public.ribbon_guests to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Hosts read people they invited" on public.ribbon_guests;
create policy "Hosts read people they invited"
  on public.ribbon_guests for select
  to authenticated
  using (host_id = (select auth.uid()));

drop policy if exists "Hosts update people they invited" on public.ribbon_guests;
create policy "Hosts update people they invited"
  on public.ribbon_guests for update
  to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

drop policy if exists "Hosts remove people they invited" on public.ribbon_guests;
create policy "Hosts remove people they invited"
  on public.ribbon_guests for delete
  to authenticated
  using (host_id = (select auth.uid()));

create or replace function public.handle_new_ribbon_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ribbon on auth.users;
create trigger on_auth_user_created_ribbon
  after insert on auth.users
  for each row execute function public.handle_new_ribbon_user();

create or replace function public.ribbon_guest_allowance()
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_plan text := 'free';
  used integer := 0;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;
  select plan into current_plan from public.profiles where id = uid;
  select count(*) into used from public.ribbon_guests where host_id = uid;
  return json_build_object(
    'plan', coalesce(current_plan, 'free'),
    'used', used,
    'limit', case when current_plan = 'plus' then 100 else 20 end
  );
end;
$$;

create or replace function public.add_ribbon_guest(p_event_id uuid, p_name text, p_email text)
returns public.ribbon_guests
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_plan text := 'free';
  used integer := 0;
  cap integer := 20;
  result public.ribbon_guests;
  clean_email text := lower(btrim(p_email));
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;
  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'Name is required';
  end if;
  if clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'That email does not look complete';
  end if;
  if not exists (select 1 from public.ribbon_events where id = p_event_id and host_id = uid) then
    raise exception 'Invite not found';
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select plan into current_plan from public.profiles where id = uid;
  cap := case when current_plan = 'plus' then 100 else 20 end;
  select count(*) into used from public.ribbon_guests where host_id = uid;
  if not exists (select 1 from public.ribbon_guests where host_id = uid and email = clean_email) and used >= cap then
    raise exception 'PLAN_LIMIT';
  end if;
  insert into public.ribbon_guests (event_id, host_id, name, email)
  values (p_event_id, uid, btrim(p_name), clean_email)
  on conflict (host_id, email) do update set
    name = excluded.name,
    sent_at = case
      when public.ribbon_guests.event_id = excluded.event_id then public.ribbon_guests.sent_at
      else null
    end,
    event_id = excluded.event_id
  returning * into result;
  return result;
end;
$$;

revoke all on function public.ribbon_guest_allowance() from public;
revoke all on function public.add_ribbon_guest(uuid, text, text) from public;
grant execute on function public.ribbon_guest_allowance() to authenticated;
grant execute on function public.add_ribbon_guest(uuid, text, text) to authenticated;
