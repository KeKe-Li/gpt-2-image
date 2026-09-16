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
      credit_amount
    )
    values (p_user_id, p_case_id, p_prompt, true, 0)
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
  select r.*
    into v_reservation
    from public.generation_reservations as r
   where r.id = p_reservation_id
   for update;

  if not found or v_reservation.status <> 'pending' then
    return;
  end if;

  if v_reservation.used_free_generation then
    update public.profiles as p
       set free_generations_used = greatest(p.free_generations_used - 1, 0)
     where p.id = v_reservation.user_id;
  elsif v_reservation.credit_amount > 0 then
    update public.profiles as p
       set credit_balance = p.credit_balance + v_reservation.credit_amount
     where p.id = v_reservation.user_id;

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

  update public.generation_reservations as r
     set status = 'failed',
         error_code = p_error_code,
         completed_at = now()
   where r.id = p_reservation_id;
end;
$$;

revoke execute on function public.reserve_generation_usage(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.release_generation_reservation(uuid, text) from public, anon, authenticated;

grant execute on function public.reserve_generation_usage(uuid, integer, text) to service_role;
grant execute on function public.release_generation_reservation(uuid, text) to service_role;
