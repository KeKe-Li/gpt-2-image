update public.membership_plans
   set monthly_credits = case id
         when 'starter' then 700
         when 'creator' then 1800
         when 'studio' then 5200
         else monthly_credits
       end,
       description_en = case id
         when 'starter' then '700 credits per month for light prompt testing and daily image experiments.'
         when 'creator' then '1,800 credits per month for frequent remixing, content production, and prompt testing.'
         when 'studio' then '5,200 credits per month for high-volume GPT-Image2 workflows and small teams.'
         else description_en
       end,
       description_zh = case id
         when 'starter' then '每月 700 积分，适合轻量测试提示词和日常生图实验。'
         when 'creator' then '每月 1,800 积分，适合高频复用案例、内容生产和提示词测试。'
         when 'studio' then '每月 5,200 积分，适合高频 GPT-Image2 工作流和小团队使用。'
         else description_zh
       end,
       active = true
 where id in ('starter', 'creator', 'studio');

update public.credit_packs
   set active = false
 where id in ('pack_30', 'pack_120', 'pack_360');

insert into public.credit_packs (
  id,
  name_en,
  name_zh,
  description_en,
  description_zh,
  credits,
  amount_cents,
  sort_order,
  active
)
values
  ('pack_300', '300 Credits', '300 积分包', 'Entry pack for testing more GPT-Image2 cases.', '入门测试包，适合继续尝试更多 GPT-Image2 案例。', 300, 500, 10, true),
  ('pack_1000', '1,000 Credits', '1,000 积分包', 'Creator pack for regular prompt testing and visual iterations.', '常用创作包，适合稳定进行提示词测试和视觉迭代。', 1000, 1500, 20, true),
  ('pack_3000', '3,000 Credits', '3,000 积分包', 'High-volume pack for content batches and small teams.', '高频创作包，适合批量内容生产和小团队使用。', 3000, 3900, 30, true)
on conflict (id) do update
  set name_en = excluded.name_en,
      name_zh = excluded.name_zh,
      description_en = excluded.description_en,
      description_zh = excluded.description_zh,
      credits = excluded.credits,
      amount_cents = excluded.amount_cents,
      sort_order = excluded.sort_order,
      active = excluded.active;

create or replace function public.get_admin_dashboard_metrics(
  p_start_at timestamptz
)
returns table (
  total_users integer,
  range_users integer,
  super_admins integer,
  active_memberships integer,
  total_credit_balance integer,
  total_generations integer,
  range_generations integer,
  succeeded_generations integer,
  failed_generations integer,
  pending_generations integer,
  range_succeeded_generations integer,
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
      (select count(*)::integer from public.profiles where created_at >= p_start_at),
      (select count(*)::integer from public.profiles where role = 'super_admin'),
      (select count(*)::integer from public.user_memberships where status in ('trialing', 'active')),
      (select coalesce(sum(credit_balance), 0)::integer from public.profiles),
      (select count(*)::integer from public.generation_reservations),
      (select count(*)::integer from public.generation_reservations where created_at >= p_start_at),
      (select count(*)::integer from public.generation_reservations where status = 'succeeded'),
      (select count(*)::integer from public.generation_reservations where status = 'failed'),
      (select count(*)::integer from public.generation_reservations where status = 'pending'),
      (select count(*)::integer from public.generation_reservations where status = 'succeeded' and created_at >= p_start_at),
      (select coalesce(sum(credit_amount), 0)::integer from public.generation_reservations where status = 'succeeded'),
      (select coalesce(sum(credit_amount), 0)::integer from public.generation_reservations where status = 'succeeded' and created_at >= p_start_at),
      (select coalesce(sum(amount), 0)::integer from public.credit_transactions where type = 'purchase' and amount > 0),
      (select coalesce(sum(amount), 0)::integer from public.credit_transactions where type = 'membership_grant' and amount > 0);
end;
$$;

create or replace function public.get_admin_user_summaries(
  p_limit integer default 100
)
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  role text,
  credit_balance integer,
  free_generations_used integer,
  created_at timestamptz,
  membership_id uuid,
  membership_plan_id text,
  membership_status text,
  membership_current_period_end timestamptz,
  membership_cancel_at_period_end boolean,
  total_generations integer,
  total_generation_credits integer,
  purchased_credits integer,
  membership_credits integer,
  last_generation_at timestamptz,
  last_generation_case_id integer
)
language sql
security definer
set search_path = public
as $$
  with latest_generation as (
    select distinct on (r.user_id)
      r.user_id,
      r.created_at,
      r.case_id
    from public.generation_reservations as r
    order by r.user_id, r.created_at desc
  ),
  generation_totals as (
    select
      r.user_id,
      count(*) filter (where r.status = 'succeeded')::integer as total_generations,
      coalesce(sum(r.credit_amount) filter (where r.status = 'succeeded'), 0)::integer as total_generation_credits
    from public.generation_reservations as r
    group by r.user_id
  ),
  credit_totals as (
    select
      t.user_id,
      coalesce(sum(t.amount) filter (where t.type = 'purchase' and t.amount > 0), 0)::integer as purchased_credits,
      coalesce(sum(t.amount) filter (where t.type = 'membership_grant' and t.amount > 0), 0)::integer as membership_credits
    from public.credit_transactions as t
    group by t.user_id
  )
  select
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.role,
    p.credit_balance,
    p.free_generations_used,
    p.created_at,
    m.id as membership_id,
    m.plan_id as membership_plan_id,
    m.status as membership_status,
    m.current_period_end as membership_current_period_end,
    coalesce(m.cancel_at_period_end, false) as membership_cancel_at_period_end,
    coalesce(g.total_generations, 0) as total_generations,
    coalesce(g.total_generation_credits, 0) as total_generation_credits,
    coalesce(c.purchased_credits, 0) as purchased_credits,
    coalesce(c.membership_credits, 0) as membership_credits,
    l.created_at as last_generation_at,
    l.case_id as last_generation_case_id
  from public.profiles as p
  left join public.user_memberships as m on m.user_id = p.id
  left join generation_totals as g on g.user_id = p.id
  left join credit_totals as c on c.user_id = p.id
  left join latest_generation as l on l.user_id = p.id
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke execute on function public.get_admin_dashboard_metrics(timestamptz) from public, anon, authenticated;
revoke execute on function public.get_admin_user_summaries(integer) from public, anon, authenticated;

grant execute on function public.get_admin_dashboard_metrics(timestamptz) to service_role;
grant execute on function public.get_admin_user_summaries(integer) to service_role;
