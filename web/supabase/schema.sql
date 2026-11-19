-- Run once in Supabase > SQL Editor. Change the domain in is_office_user() if your office email domain differs.
create table if not exists public.entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  stack text not null default 'dotnet',
  pct int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.entries enable row level security;
alter table public.profiles enable row level security;

create or replace function public.is_office_user() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'email') ilike '%@fiftyfivetech.io', false)
$$;

drop policy if exists entries_own on public.entries;
create policy entries_own on public.entries for all
  using (auth.uid() = user_id and public.is_office_user())
  with check (auth.uid() = user_id and public.is_office_user());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (public.is_office_user());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (auth.uid() = user_id and public.is_office_user());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (auth.uid() = user_id and public.is_office_user())
  with check (auth.uid() = user_id and public.is_office_user());
