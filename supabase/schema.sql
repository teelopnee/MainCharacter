-- Main Character: cloud save tables.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Every row belongs to one signed-in user; row-level security makes sure
-- people can only read and write their own save.

-- global save: gems, achievements, settings, list of worlds, character library
create table if not exists public.mc_meta (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb  not null,
  saved_at   bigint not null default 0,          -- client clock (ms), newest wins
  updated_at timestamptz not null default now()
);

-- one row per world; deleted worlds stay as tombstones so other devices drop them too
create table if not exists public.mc_worlds (
  user_id    uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  world_id   text   not null,
  data       jsonb,
  saved_at   bigint not null default 0,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, world_id)
);

-- signed-in players may use these tables through the Data API (needed when
-- "Automatically expose new tables" is off); the policies below limit them to their own rows
grant select, insert, update, delete on public.mc_meta, public.mc_worlds to authenticated;
revoke all on public.mc_meta, public.mc_worlds from anon;

alter table public.mc_meta   enable row level security;
alter table public.mc_worlds enable row level security;

drop policy if exists "own meta"   on public.mc_meta;
drop policy if exists "own worlds" on public.mc_worlds;

create policy "own meta" on public.mc_meta
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own worlds" on public.mc_worlds
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
