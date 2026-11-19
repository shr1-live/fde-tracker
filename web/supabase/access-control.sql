-- Run once in Supabase > SQL Editor, AFTER schema.sql. Safe to re-run.
-- Access model: admin is always approved. The first 3 other users are approved automatically.
-- Everyone after that is "pending" until the admin approves. Users only ever see their own data.

create table if not exists public.access_requests (
  email text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  notified_at timestamptz
);
alter table public.access_requests add column if not exists notified_at timestamptz;
alter table public.access_requests enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) = 'shivanshu.rai@fiftyfivetech.io'
$$;

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.access_requests
    where status = 'approved' and (user_id = auth.uid() or email = lower(auth.jwt() ->> 'email')))
$$;

-- Called by the app right after sign-in. Returns 'approved' | 'pending' | 'rejected' | 'new_pending'
create or replace function public.request_access() returns text
language plpgsql security definer set search_path = public as $$
declare em text := lower(coalesce(auth.jwt() ->> 'email','')); cur text; seats int;
begin
  if auth.uid() is null or em not like '%@fiftyfivetech.io' then raise exception 'not allowed'; end if;
  perform pg_advisory_xact_lock(7001);
  select status into cur from access_requests where email = em;
  if cur is not null then
    update access_requests set user_id = auth.uid() where email = em and user_id is distinct from auth.uid();
    return cur;
  end if;
  if public.is_admin() then
    insert into access_requests(email,user_id,status,decided_at) values (em,auth.uid(),'approved',now());
    return 'approved';
  end if;
  select count(*) into seats from access_requests
    where status = 'approved' and email <> 'shivanshu.rai@fiftyfivetech.io';
  if seats < 3 then
    insert into access_requests(email,user_id,status,decided_at) values (em,auth.uid(),'approved',now());
    return 'approved';
  end if;
  -- abuse cap: at most 25 requests waiting at once; further sign-ups are refused until the admin clears some
  if (select count(*) from access_requests where status = 'pending') >= 25 then raise exception 'too many pending requests'; end if;
  insert into access_requests(email,user_id,status) values (em,auth.uid(),'pending');
  return 'new_pending';
end $$;
revoke all on function public.request_access() from public, anon;
grant execute on function public.request_access() to authenticated;

-- access_requests: users read their own row, admin reads/updates all. Nobody inserts directly.
drop policy if exists ar_read on public.access_requests;
create policy ar_read on public.access_requests for select using (public.is_admin() or user_id = auth.uid());
drop policy if exists ar_admin_update on public.access_requests;
create policy ar_admin_update on public.access_requests for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists ar_admin_delete on public.access_requests;
create policy ar_admin_delete on public.access_requests for delete using (public.is_admin());

-- Private data: own rows only, and only once approved. Only the admin may read everyone's progress.
drop policy if exists entries_own on public.entries;
create policy entries_own on public.entries for all
  using (auth.uid() = user_id and public.is_office_user() and public.is_approved())
  with check (auth.uid() = user_id and public.is_office_user() and public.is_approved());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (auth.uid() = user_id and public.is_office_user() and public.is_approved());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (auth.uid() = user_id and public.is_office_user() and public.is_approved())
  with check (auth.uid() = user_id and public.is_office_user() and public.is_approved());

-- Abuse limits on private data: sane key shape, small values, bounded rows per user.
create or replace function public.limit_entries() returns trigger
language plpgsql as $$
begin
  if new.key !~ '^[a-zA-Z0-9:_-]{1,40}$' then raise exception 'bad key'; end if;
  if octet_length(coalesce(new.value::text,'')) > 20000 then raise exception 'value too large'; end if;
  if tg_op = 'INSERT' and (select count(*) from public.entries where user_id = new.user_id) >= 300 then
    raise exception 'entry limit reached';
  end if;
  return new;
end $$;
drop trigger if exists entries_limit on public.entries;
create trigger entries_limit before insert or update on public.entries for each row execute function public.limit_entries();

create or replace function public.limit_profiles() returns trigger
language plpgsql as $$
begin
  if char_length(coalesce(new.display_name,'')) > 80 or char_length(coalesce(new.stack,'')) > 20 then raise exception 'too long'; end if;
  new.pct := least(greatest(new.pct,0),100);
  return new;
end $$;
drop trigger if exists profiles_limit on public.profiles;
create trigger profiles_limit before insert or update on public.profiles for each row execute function public.limit_profiles();
