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
