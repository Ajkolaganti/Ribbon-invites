alter table public.ribbon_events
  add column if not exists media_url text not null default '';

insert into storage.buckets (id, name, public, file_size_limit)
values ('ribbon-media', 'ribbon-media', true, 52428800)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "Hosts upload invite media" on storage.objects;
create policy "Hosts upload invite media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ribbon-media'
    and exists (
      select 1 from public.ribbon_events as event
      where event.id::text = name
        and event.host_id = auth.uid()
    )
  );

drop policy if exists "Hosts replace invite media" on storage.objects;
create policy "Hosts replace invite media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'ribbon-media'
    and exists (
      select 1 from public.ribbon_events as event
      where event.id::text = name
        and event.host_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'ribbon-media'
    and exists (
      select 1 from public.ribbon_events as event
      where event.id::text = name
        and event.host_id = auth.uid()
    )
  );

drop policy if exists "Hosts delete invite media" on storage.objects;
create policy "Hosts delete invite media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ribbon-media'
    and exists (
      select 1 from public.ribbon_events as event
      where event.id::text = name
        and event.host_id = auth.uid()
    )
  );

drop policy if exists "Anyone can view invite media" on storage.objects;
create policy "Anyone can view invite media"
  on storage.objects for select
  to public
  using (bucket_id = 'ribbon-media');
