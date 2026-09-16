create table if not exists public.case_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id integer not null check (case_id > 0),
  created_at timestamptz not null default now(),
  unique (user_id, case_id)
);

create index if not exists case_favorites_user_created_idx
  on public.case_favorites (user_id, created_at desc);

create index if not exists case_favorites_case_id_idx
  on public.case_favorites (case_id);

alter table public.case_favorites enable row level security;

grant select, insert, delete on public.case_favorites to authenticated;

drop policy if exists "Users can read own case favorites" on public.case_favorites;
create policy "Users can read own case favorites"
  on public.case_favorites for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own case favorites" on public.case_favorites;
create policy "Users can create own case favorites"
  on public.case_favorites for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own case favorites" on public.case_favorites;
create policy "Users can delete own case favorites"
  on public.case_favorites for delete
  using ((select auth.uid()) = user_id);
