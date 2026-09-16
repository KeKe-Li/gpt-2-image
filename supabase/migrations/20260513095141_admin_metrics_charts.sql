create index if not exists profiles_created_at_idx
  on public.profiles (created_at);

create index if not exists user_memberships_created_at_idx
  on public.user_memberships (created_at);

create index if not exists generation_reservations_created_at_idx
  on public.generation_reservations (created_at);

create or replace function public.get_admin_dashboard_metrics_v2(
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns table (
  total_users integer,
  range_users integer,
  super_admins integer,
  active_memberships integer,
  range_memberships integer,
  total_credit_balance integer,
  total_generations integer,
  range_generations integer,
  succeeded_generations integer,
  failed_generations integer,
  pending_generations integer,
  range_succeeded_generations integer,
  range_failed_generations integer,
  total_generation_credits integer,
  range_generation_credits integer,
  purchased_credits integer,
  membership_credits integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      (select count(*)::integer from public.profiles),
      (select count(*)::integer from public.profiles as p where p.created_at >= p_start_at and p.created_at < p_end_at),
      (select count(*)::integer from public.profiles as p where p.role = 'super_admin'),
      (select count(*)::integer from public.user_memberships as m where m.status in ('trialing', 'active')),
      (select count(*)::integer from public.user_memberships as m where m.status in ('trialing', 'active') and m.created_at >= p_start_at and m.created_at < p_end_at),
      (select coalesce(sum(p.credit_balance), 0)::integer from public.profiles as p),
      (select count(*)::integer from public.generation_reservations),
      (select count(*)::integer from public.generation_reservations as r where r.created_at >= p_start_at and r.created_at < p_end_at),
      (select count(*)::integer from public.generation_reservations as r where r.status = 'succeeded'),
      (select count(*)::integer from public.generation_reservations as r where r.status = 'failed'),
      (select count(*)::integer from public.generation_reservations as r where r.status = 'pending'),
      (select count(*)::integer from public.generation_reservations as r where r.status = 'succeeded' and r.created_at >= p_start_at and r.created_at < p_end_at),
      (select count(*)::integer from public.generation_reservations as r where r.status = 'failed' and r.created_at >= p_start_at and r.created_at < p_end_at),
      (select coalesce(sum(r.credit_amount), 0)::integer from public.generation_reservations as r where r.status = 'succeeded'),
      (select coalesce(sum(r.credit_amount), 0)::integer from public.generation_reservations as r where r.status = 'succeeded' and r.created_at >= p_start_at and r.created_at < p_end_at),
      (select coalesce(sum(t.amount), 0)::integer from public.credit_transactions as t where t.type = 'purchase' and t.amount > 0),
      (select coalesce(sum(t.amount), 0)::integer from public.credit_transactions as t where t.type = 'membership_grant' and t.amount > 0);
end;
$$;

create or replace function public.get_admin_dashboard_daily_metrics(
  p_start_date date,
  p_end_date date
)
returns table (
  metric_date date,
  registrations integer,
  new_members integer,
  generations integer,
  succeeded_generations integer,
  failed_generations integer,
  credits_consumed integer
)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(p_start_date, p_end_date, interval '1 day')::date as metric_date
  ),
  bounds as (
    select
      d.metric_date,
      (d.metric_date::timestamp at time zone 'UTC') as start_at,
      ((d.metric_date + 1)::timestamp at time zone 'UTC') as end_at
    from days as d
  ),
  registrations as (
    select
      b.metric_date,
      count(p.id)::integer as count_value
    from bounds as b
    left join public.profiles as p
      on p.created_at >= b.start_at
     and p.created_at < b.end_at
    group by b.metric_date
  ),
  memberships as (
    select
      b.metric_date,
      count(m.id)::integer as count_value
    from bounds as b
    left join public.user_memberships as m
      on m.created_at >= b.start_at
     and m.created_at < b.end_at
     and m.status in ('trialing', 'active')
    group by b.metric_date
  ),
  generations as (
    select
      b.metric_date,
      count(r.id)::integer as generation_count,
      count(r.id) filter (where r.status = 'succeeded')::integer as succeeded_count,
      count(r.id) filter (where r.status = 'failed')::integer as failed_count,
      coalesce(sum(r.credit_amount) filter (where r.status = 'succeeded'), 0)::integer as credit_count
    from bounds as b
    left join public.generation_reservations as r
      on r.created_at >= b.start_at
     and r.created_at < b.end_at
    group by b.metric_date
  )
  select
    b.metric_date,
    coalesce(registrations.count_value, 0)::integer as registrations,
    coalesce(memberships.count_value, 0)::integer as new_members,
    coalesce(generations.generation_count, 0)::integer as generations,
    coalesce(generations.succeeded_count, 0)::integer as succeeded_generations,
    coalesce(generations.failed_count, 0)::integer as failed_generations,
    coalesce(generations.credit_count, 0)::integer as credits_consumed
  from bounds as b
  left join registrations on registrations.metric_date = b.metric_date
  left join memberships on memberships.metric_date = b.metric_date
  left join generations on generations.metric_date = b.metric_date
  order by b.metric_date;
$$;

revoke execute on function public.get_admin_dashboard_metrics_v2(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.get_admin_dashboard_daily_metrics(date, date) from public, anon, authenticated;

grant execute on function public.get_admin_dashboard_metrics_v2(timestamptz, timestamptz) to service_role;
grant execute on function public.get_admin_dashboard_daily_metrics(date, date) to service_role;
