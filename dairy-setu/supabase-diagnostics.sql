-- DairyWalla diagnostics: run after signup/login/profile setup

-- 1) Core counts
select 'auth.users' as table_name, count(*) as row_count from auth.users
union all
select 'public.profiles', count(*) from public.profiles
union all
select 'public.distributor_profiles', count(*) from public.distributor_profiles
union all
select 'public.shopkeeper_profiles', count(*) from public.shopkeeper_profiles
union all
select 'public.connections', count(*) from public.connections
union all
select 'public.products', count(*) from public.products
union all
select 'public.orders', count(*) from public.orders
union all
select 'public.order_items', count(*) from public.order_items
union all
select 'public.notifications', count(*) from public.notifications;

-- 2) Detect profile rows without auth user (should be zero)
select p.id, p.email
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null;

-- 3) Detect role mismatch (profile.role vs actual profile table)
select
  p.id,
  p.email,
  p.role as role_in_profiles,
  case
    when dp.user_id is not null then 'distributor'
    when sp.user_id is not null then 'shopkeeper'
    else 'missing_profile_row'
  end as role_from_profile_tables
from public.profiles p
left join public.distributor_profiles dp on dp.user_id = p.id
left join public.shopkeeper_profiles sp on sp.user_id = p.id
where p.role <>
  case
    when dp.user_id is not null then 'distributor'
    when sp.user_id is not null then 'shopkeeper'
    else p.role
  end
  or (dp.user_id is null and sp.user_id is null);

-- 4) Detect invalid dual-profile users (should be zero)
select p.id, p.email
from public.profiles p
join public.distributor_profiles dp on dp.user_id = p.id
join public.shopkeeper_profiles sp on sp.user_id = p.id;

-- 5) Last 20 profiles (quick audit)
select p.id, p.email, p.role, p.created_at
from public.profiles p
order by p.created_at desc
limit 20;
