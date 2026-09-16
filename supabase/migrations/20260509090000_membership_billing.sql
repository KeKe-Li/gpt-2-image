alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.generation_reservations
  add column if not exists usage_source text not null default 'legacy',
  add column if not exists generation_cost integer not null default 1 check (generation_cost >= 0);

alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('grant', 'purchase', 'membership_grant', 'generation', 'refund', 'adjustment'));

create table if not exists public.membership_plans (
  id text primary key,
  name_en text not null,
  name_zh text not null,
  description_en text not null,
  description_zh text not null,
  monthly_credits integer not null check (monthly_credits >= 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  interval text not null default 'month' check (interval in ('month', 'year')),
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_packs (
  id text primary key,
  name_en text not null,
  name_zh text not null,
  description_en text not null,
  description_zh text not null,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references public.membership_plans(id),
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  monthly_credits_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (stripe_subscription_id)
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null check (product_type in ('credit_pack', 'membership')),
  product_id text not null,
  status text not null default 'created' check (status in ('created', 'checkout_created', 'completed', 'failed', 'canceled')),
  stripe_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  credits integer not null default 0 check (credits >= 0),
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_orders_stripe_session_id_idx
  on public.payment_orders (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists user_memberships_user_id_idx
  on public.user_memberships (user_id);

create index if not exists user_memberships_status_idx
  on public.user_memberships (status);

create index if not exists payment_orders_user_id_idx
  on public.payment_orders (user_id, created_at desc);

create index if not exists payment_orders_status_idx
  on public.payment_orders (status);

drop trigger if exists membership_plans_set_updated_at on public.membership_plans;
create trigger membership_plans_set_updated_at
  before update on public.membership_plans
  for each row
  execute function public.set_updated_at();

drop trigger if exists credit_packs_set_updated_at on public.credit_packs;
create trigger credit_packs_set_updated_at
  before update on public.credit_packs
  for each row
  execute function public.set_updated_at();

drop trigger if exists user_memberships_set_updated_at on public.user_memberships;
create trigger user_memberships_set_updated_at
  before update on public.user_memberships
  for each row
  execute function public.set_updated_at();

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at
  before update on public.payment_orders
  for each row
  execute function public.set_updated_at();

alter table public.membership_plans enable row level security;
alter table public.credit_packs enable row level security;
alter table public.user_memberships enable row level security;
alter table public.payment_orders enable row level security;

drop policy if exists "Anyone can read active membership plans" on public.membership_plans;
create policy "Anyone can read active membership plans"
  on public.membership_plans for select
  using (active);

drop policy if exists "Anyone can read active credit packs" on public.credit_packs;
create policy "Anyone can read active credit packs"
  on public.credit_packs for select
  using (active);

drop policy if exists "Users can read own membership" on public.user_memberships;
create policy "Users can read own membership"
  on public.user_memberships for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own payment orders" on public.payment_orders;
create policy "Users can read own payment orders"
  on public.payment_orders for select
  using ((select auth.uid()) = user_id);

grant select on public.membership_plans to anon, authenticated;
grant select on public.credit_packs to anon, authenticated;
grant select on public.user_memberships to authenticated;
grant select on public.payment_orders to authenticated;

insert into public.membership_plans (
  id,
  name_en,
  name_zh,
  description_en,
  description_zh,
  monthly_credits,
  amount_cents,
  sort_order
)
values
  ('starter', 'Starter', '入门会员', 'For light prompt testing and daily inspiration.', '适合轻量测试提示词和日常找灵感。', 80, 900, 10),
  ('creator', 'Creator', '创作者会员', 'For frequent case remixing and content production.', '适合高频复用案例并做内容生产。', 220, 1900, 20),
  ('studio', 'Studio', '工作室会员', 'For teams and high-volume GPT-Image2 experiments.', '适合团队和高频 GPT-Image2 实验。', 700, 4900, 30)
on conflict (id) do update
  set name_en = excluded.name_en,
      name_zh = excluded.name_zh,
      description_en = excluded.description_en,
      description_zh = excluded.description_zh,
      monthly_credits = excluded.monthly_credits,
      amount_cents = excluded.amount_cents,
      sort_order = excluded.sort_order,
      active = true;

insert into public.credit_packs (
  id,
  name_en,
  name_zh,
  description_en,
  description_zh,
  credits,
  amount_cents,
  sort_order
)
values
  ('pack_30', '30 Credits', '30 积分包', 'A small pack for trying more cases.', '适合继续尝试更多案例。', 30, 500, 10),
  ('pack_120', '120 Credits', '120 积分包', 'A balanced pack for regular prompt testing.', '适合稳定进行提示词测试。', 120, 1500, 20),
  ('pack_360', '360 Credits', '360 积分包', 'A larger pack for content batches and teams.', '适合批量内容生产和小团队使用。', 360, 3900, 30)
on conflict (id) do update
  set name_en = excluded.name_en,
      name_zh = excluded.name_zh,
      description_en = excluded.description_en,
      description_zh = excluded.description_zh,
      credits = excluded.credits,
      amount_cents = excluded.amount_cents,
      sort_order = excluded.sort_order,
      active = true;

create or replace function public.grant_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_source text default null,
  p_reference_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  credit_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_next_balance integer;
begin
  if p_amount = 0 then
    select p.*
      into v_profile
      from public.profiles as p
     where p.id = p_user_id
     for update;

    if not found then
      raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
    end if;

    return query select v_profile.credit_balance;
    return;
  end if;

  select p.*
    into v_profile
    from public.profiles as p
   where p.id = p_user_id
   for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_next_balance := v_profile.credit_balance + p_amount;
  if v_next_balance < 0 then
    raise exception 'CREDITS_INSUFFICIENT' using errcode = 'P0001';
  end if;

  update public.profiles as p
     set credit_balance = v_next_balance
   where p.id = p_user_id
   returning p.* into v_profile;

  insert into public.credit_transactions (
    user_id,
    amount,
    type,
    source,
    reference_id,
    metadata
  )
  values (
    p_user_id,
    p_amount,
    p_type,
    p_source,
    p_reference_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return query select v_profile.credit_balance;
end;
$$;

create or replace function public.reserve_generation_usage(
  p_user_id uuid,
  p_case_id integer,
  p_prompt text
)
returns table (
  reservation_id uuid,
  used_free_generation boolean,
  credit_amount integer,
  free_generations_used integer,
  credit_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_reservation_id uuid;
begin
  select p.*
    into v_profile
    from public.profiles as p
   where p.id = p_user_id
   for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_profile.free_generations_used < 1 then
    update public.profiles as p
       set free_generations_used = p.free_generations_used + 1
     where p.id = p_user_id
     returning p.* into v_profile;

    insert into public.generation_reservations (
      user_id,
      case_id,
      prompt,
      used_free_generation,
      credit_amount,
      usage_source
    )
    values (p_user_id, p_case_id, p_prompt, true, 0, 'free_generation')
    returning id into v_reservation_id;

    return query
      select v_reservation_id, true, 0, v_profile.free_generations_used, v_profile.credit_balance;
    return;
  end if;

  if v_profile.credit_balance >= 1 then
    update public.profiles as p
       set credit_balance = p.credit_balance - 1
     where p.id = p_user_id
     returning p.* into v_profile;

    insert into public.generation_reservations (
      user_id,
      case_id,
      prompt,
      used_free_generation,
      credit_amount,
      usage_source
    )
    values (p_user_id, p_case_id, p_prompt, false, 1, 'credit')
    returning id into v_reservation_id;

    insert into public.credit_transactions (
      user_id,
      amount,
      type,
      source,
      reference_id,
      metadata
    )
    values (
      p_user_id,
      -1,
      'generation',
      'case_generation_test',
      v_reservation_id,
      jsonb_build_object('caseId', p_case_id, 'usageSource', 'credit')
    );

    return query
      select v_reservation_id, false, 1, v_profile.free_generations_used, v_profile.credit_balance;
    return;
  end if;

  raise exception 'CREDITS_REQUIRED' using errcode = 'P0001';
end;
$$;

revoke execute on function public.grant_user_credits(uuid, integer, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.reserve_generation_usage(uuid, integer, text) from public, anon, authenticated;

grant execute on function public.grant_user_credits(uuid, integer, text, text, uuid, jsonb) to service_role;
grant execute on function public.reserve_generation_usage(uuid, integer, text) to service_role;
