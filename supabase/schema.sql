create table if not exists public.ribbon_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete cascade,
  occasion text not null,
  title text not null,
  host_name text not null,
  message text not null default '',
  line text not null default '',
  event_date date not null,
  event_time text not null,
  venue_name text not null,
  venue_address text not null default '',
  foods jsonb not null default '[]'::jsonb,
  art_id text not null,
  motion text not null,
  accent text not null,
  custom boolean not null default false,
  host_email text not null default '',
  media_kind text,
  media_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ribbon_events_host_idx on public.ribbon_events (host_id);

alter table public.ribbon_events enable row level security;

create table if not exists public.ribbon_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ribbon_events (id) on delete cascade,
  name text not null,
  name_key text not null,
  coming boolean not null,
  party_size integer not null default 0,
  food_counts jsonb not null default '{}'::jsonb,
  note text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name_key)
);

alter table public.ribbon_rsvps enable row level security;

create table if not exists public.ribbon_mails (
  id text primary key,
  event_id uuid not null references public.ribbon_events (id) on delete cascade,
  rsvp_id uuid not null references public.ribbon_rsvps (id) on delete cascade,
  kind text not null check (kind in ('host', 'guest')),
  recipient text not null,
  subject text not null,
  body text not null,
  status text not null,
  error text not null default '',
  created_at timestamptz not null default now()
);

alter table public.ribbon_mails enable row level security;

grant select on public.ribbon_events to anon, authenticated;
grant insert, update, delete on public.ribbon_events to authenticated;
grant select, delete on public.ribbon_rsvps to authenticated;
grant select on public.ribbon_mails to authenticated;

drop policy if exists "Anyone can open an invite" on public.ribbon_events;
create policy "Anyone can open an invite"
  on public.ribbon_events for select
  to anon, authenticated
  using (true);

drop policy if exists "Hosts create their invites" on public.ribbon_events;
create policy "Hosts create their invites"
  on public.ribbon_events for insert
  to authenticated
  with check ((select auth.uid()) = host_id);

drop policy if exists "Hosts update their invites" on public.ribbon_events;
create policy "Hosts update their invites"
  on public.ribbon_events for update
  to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id);

drop policy if exists "Hosts delete their invites" on public.ribbon_events;
create policy "Hosts delete their invites"
  on public.ribbon_events for delete
  to authenticated
  using ((select auth.uid()) = host_id);

drop policy if exists "Hosts read replies" on public.ribbon_rsvps;
create policy "Hosts read replies"
  on public.ribbon_rsvps for select
  to authenticated
  using (
    exists (
      select 1 from public.ribbon_events event
      where event.id = event_id and event.host_id = (select auth.uid())
    )
  );

drop policy if exists "Hosts delete replies" on public.ribbon_rsvps;
create policy "Hosts delete replies"
  on public.ribbon_rsvps for delete
  to authenticated
  using (
    exists (
      select 1 from public.ribbon_events event
      where event.id = event_id and event.host_id = (select auth.uid())
    )
  );

drop policy if exists "Hosts read mail" on public.ribbon_mails;
create policy "Hosts read mail"
  on public.ribbon_mails for select
  to authenticated
  using (
    exists (
      select 1 from public.ribbon_events event
      where event.id = event_id and event.host_id = (select auth.uid())
    )
  );

create or replace function public.save_ribbon_rsvp(
  p_event_id uuid,
  p_name text,
  p_coming boolean,
  p_party_size integer,
  p_food_counts jsonb,
  p_note text,
  p_email text
) returns public.ribbon_rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.ribbon_rsvps;
  key text;
begin
  if p_name is null or length(btrim(p_name)) = 0 or length(btrim(p_name)) > 80 then
    raise exception 'Name is required';
  end if;
  if not exists (select 1 from public.ribbon_events where id = p_event_id) then
    raise exception 'Invite not found';
  end if;
  key := lower(btrim(p_name));
  insert into public.ribbon_rsvps (event_id, name, name_key, coming, party_size, food_counts, note, email)
  values (
    p_event_id,
    btrim(p_name),
    key,
    p_coming,
    greatest(coalesce(p_party_size, 0), 0),
    coalesce(p_food_counts, '{}'::jsonb),
    coalesce(p_note, ''),
    coalesce(p_email, '')
  )
  on conflict (event_id, name_key) do update set
    name = excluded.name,
    coming = excluded.coming,
    party_size = excluded.party_size,
    food_counts = excluded.food_counts,
    note = excluded.note,
    email = excluded.email,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.ribbon_guest_reply(p_event_id uuid, p_name text)
returns public.ribbon_rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.ribbon_rsvps;
begin
  if p_name is null or length(btrim(p_name)) = 0 then
    return null;
  end if;
  select * into result
  from public.ribbon_rsvps
  where event_id = p_event_id and name_key = lower(btrim(p_name));
  return result;
end;
$$;

create or replace function public.record_ribbon_mail(
  p_id text,
  p_event_id uuid,
  p_rsvp_id uuid,
  p_kind text,
  p_recipient text,
  p_subject text,
  p_body text,
  p_status text,
  p_error text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('host', 'guest') then
    raise exception 'Unknown mail kind';
  end if;
  if not exists (select 1 from public.ribbon_events where id = p_event_id) then
    raise exception 'Invite not found';
  end if;
  if not exists (select 1 from public.ribbon_rsvps where id = p_rsvp_id and event_id = p_event_id) then
    raise exception 'Reply not found';
  end if;
  insert into public.ribbon_mails (id, event_id, rsvp_id, kind, recipient, subject, body, status, error)
  values (p_id, p_event_id, p_rsvp_id, p_kind, p_recipient, p_subject, p_body, p_status, coalesce(p_error, ''))
  on conflict (id) do update set
    recipient = excluded.recipient,
    subject = excluded.subject,
    body = excluded.body,
    status = excluded.status,
    error = excluded.error,
    created_at = now();
end;
$$;

revoke all on function public.save_ribbon_rsvp(uuid, text, boolean, integer, jsonb, text, text) from public;
revoke all on function public.ribbon_guest_reply(uuid, text) from public;
revoke all on function public.record_ribbon_mail(text, uuid, uuid, text, text, text, text, text, text) from public;
grant execute on function public.save_ribbon_rsvp(uuid, text, boolean, integer, jsonb, text, text) to anon, authenticated;
grant execute on function public.ribbon_guest_reply(uuid, text) to anon, authenticated;
grant execute on function public.record_ribbon_mail(text, uuid, uuid, text, text, text, text, text, text) to anon, authenticated;
