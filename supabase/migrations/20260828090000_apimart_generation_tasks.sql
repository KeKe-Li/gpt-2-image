alter table public.generation_reservations
  add column if not exists provider text not null default 'legacy',
  add column if not exists provider_task_id text,
  add column if not exists provider_cost_usd numeric(12, 6),
  add column if not exists provider_result_url text,
  add column if not exists provider_result_expires_at timestamptz;

create unique index if not exists generation_reservations_provider_task_idx
  on public.generation_reservations (provider, provider_task_id)
  where provider_task_id is not null;

create index if not exists generation_reservations_pending_provider_idx
  on public.generation_reservations (provider, created_at)
  where status = 'pending';

alter table public.generation_reservations
  drop constraint if exists generation_reservations_provider_cost_nonnegative;

alter table public.generation_reservations
  add constraint generation_reservations_provider_cost_nonnegative
  check (provider_cost_usd is null or provider_cost_usd >= 0);
