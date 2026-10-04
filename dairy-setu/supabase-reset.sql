-- DairyWalla full reset (Auth + App data)
-- Run in Supabase SQL Editor (service role context).
-- Warning: This permanently deletes all users and app data.

begin;

-- Auth cleanup
delete from auth.refresh_tokens;
delete from auth.sessions;
delete from auth.identities;
delete from auth.mfa_factors;
delete from auth.one_time_tokens;
delete from auth.users;

-- Public schema cleanup (safe if any orphan rows are left)
truncate table public.order_items restart identity cascade;
truncate table public.orders restart identity cascade;
truncate table public.connections restart identity cascade;
truncate table public.notifications restart identity cascade;
truncate table public.products restart identity cascade;
truncate table public.delivery_groups restart identity cascade;
truncate table public.shopkeeper_profiles restart identity cascade;
truncate table public.distributor_profiles restart identity cascade;
truncate table public.profiles restart identity cascade;

commit;
