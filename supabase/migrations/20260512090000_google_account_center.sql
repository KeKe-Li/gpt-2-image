drop function if exists public.reserve_generation_usage(uuid, integer, text);

create or replace function public.reserve_generation_usage(
  p_user_id uuid,
  p_case_id integer,
  p_prompt text,
  p_force_credit boolean default false
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

  if not p_force_credit and v_profile.free_generations_used < 1 then
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
      jsonb_build_object(
        'caseId', p_case_id,
        'usageSource', 'credit',
        'forceCredit', p_force_credit
      )
    );

    return query
      select v_reservation_id, false, 1, v_profile.free_generations_used, v_profile.credit_balance;
    return;
  end if;

  raise exception 'CREDITS_REQUIRED' using errcode = 'P0001';
end;
$$;

create or replace function public.get_user_account_usage(
  p_user_id uuid
)
returns table (
  total_generations integer,
  total_generation_credits integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      count(*)::integer as total_generations,
      coalesce(sum(r.credit_amount), 0)::integer as total_generation_credits
    from public.generation_reservations as r
   where r.user_id = p_user_id
     and r.status = 'succeeded';
end;
$$;

revoke execute on function public.reserve_generation_usage(uuid, integer, text, boolean) from public, anon, authenticated;
revoke execute on function public.get_user_account_usage(uuid) from public, anon, authenticated;

grant execute on function public.reserve_generation_usage(uuid, integer, text, boolean) to service_role;
grant execute on function public.get_user_account_usage(uuid) to service_role;
