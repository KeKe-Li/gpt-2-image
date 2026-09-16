create table if not exists public.watcha_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watcha_user_id text not null,
  email text,
  nickname text,
  avatar_url text,
  scope text,
  access_token_expires_at timestamptz,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (watcha_user_id)
);

create index if not exists watcha_accounts_user_id_idx
  on public.watcha_accounts (user_id);

create index if not exists watcha_accounts_watcha_user_id_idx
  on public.watcha_accounts (watcha_user_id);

alter table public.watcha_accounts enable row level security;

grant select on public.watcha_accounts to authenticated;

drop policy if exists "Users can read own watcha account" on public.watcha_accounts;
create policy "Users can read own watcha account"
  on public.watcha_accounts for select
  using ((select auth.uid()) = user_id);

drop trigger if exists watcha_accounts_set_updated_at on public.watcha_accounts;
create trigger watcha_accounts_set_updated_at
  before update on public.watcha_accounts
  for each row
  execute function public.set_updated_at();
