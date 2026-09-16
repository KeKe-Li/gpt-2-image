create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'super_admin')),
  credit_balance integer not null default 0 check (credit_balance >= 0),
  free_generations_used integer not null default 0 check (free_generations_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('grant', 'purchase', 'generation', 'refund', 'adjustment')),
  source text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id integer not null,
  prompt text not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  used_free_generation boolean not null default false,
  credit_amount integer not null default 0 check (credit_amount >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists credit_transactions_user_id_idx on public.credit_transactions (user_id, created_at desc);
create index if not exists generation_reservations_user_id_idx on public.generation_reservations (user_id, created_at desc);
create index if not exists generation_reservations_status_idx on public.generation_reservations (status);

alter table public.profiles enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.generation_reservations enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "Users can read own credit transactions" on public.credit_transactions;
create policy "Users can read own credit transactions"
  on public.credit_transactions for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own generation reservations" on public.generation_reservations;
create policy "Users can read own generation reservations"
  on public.generation_reservations for select
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

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
  select *
    into v_profile
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_profile.free_generations_used < 1 then
    update public.profiles
       set free_generations_used = free_generations_used + 1
     where id = p_user_id
     returning * into v_profile;

    insert into public.generation_reservations (
      user_id,
      case_id,
      prompt,
      used_free_generation,
      credit_amount
    )
    values (p_user_id, p_case_id, p_prompt, true, 0)
    returning id into v_reservation_id;

    return query
      select v_reservation_id, true, 0, v_profile.free_generations_used, v_profile.credit_balance;
    return;
  end if;

  if v_profile.credit_balance >= 1 then
    update public.profiles
       set credit_balance = credit_balance - 1
     where id = p_user_id
     returning * into v_profile;

    insert into public.generation_reservations (
      user_id,
      case_id,
      prompt,
      used_free_generation,
      credit_amount
    )
    values (p_user_id, p_case_id, p_prompt, false, 1)
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
      jsonb_build_object('caseId', p_case_id)
    );

    return query
      select v_reservation_id, false, 1, v_profile.free_generations_used, v_profile.credit_balance;
    return;
  end if;

  raise exception 'CREDITS_REQUIRED' using errcode = 'P0001';
end;
$$;

create or replace function public.complete_generation_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.generation_reservations
     set status = 'succeeded',
         completed_at = now()
   where id = p_reservation_id
     and status = 'pending';
end;
$$;

create or replace function public.release_generation_reservation(
  p_reservation_id uuid,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.generation_reservations%rowtype;
begin
  select *
    into v_reservation
    from public.generation_reservations
   where id = p_reservation_id
   for update;

  if not found or v_reservation.status <> 'pending' then
    return;
  end if;

  if v_reservation.used_free_generation then
    update public.profiles
       set free_generations_used = greatest(free_generations_used - 1, 0)
     where id = v_reservation.user_id;
  elsif v_reservation.credit_amount > 0 then
    update public.profiles
       set credit_balance = credit_balance + v_reservation.credit_amount
     where id = v_reservation.user_id;

    insert into public.credit_transactions (
      user_id,
      amount,
      type,
      source,
      reference_id,
      metadata
    )
    values (
      v_reservation.user_id,
      v_reservation.credit_amount,
      'refund',
      'generation_failed',
      v_reservation.id,
      jsonb_build_object('caseId', v_reservation.case_id, 'error', p_error_code)
    );
  end if;

  update public.generation_reservations
     set status = 'failed',
         error_code = p_error_code,
         completed_at = now()
   where id = p_reservation_id;
end;
$$;

revoke execute on function public.reserve_generation_usage(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.complete_generation_reservation(uuid) from public, anon, authenticated;
revoke execute on function public.release_generation_reservation(uuid, text) from public, anon, authenticated;

grant execute on function public.reserve_generation_usage(uuid, integer, text) to service_role;
grant execute on function public.complete_generation_reservation(uuid) to service_role;
grant execute on function public.release_generation_reservation(uuid, text) to service_role;
