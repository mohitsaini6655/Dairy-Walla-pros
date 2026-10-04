-- Auth/Profile V2 (multi-role friendly)
-- Run after supabase-reset.sql and supabase-schema.sql

begin;

-- Track allowed roles per auth user (1 user can have 1 or 2 roles)
create table if not exists public.user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('distributor', 'shopkeeper')),
  created_at timestamptz default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_roles' and policyname='Users can view own roles') then
    create policy "Users can view own roles"
    on public.user_roles for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename='user_roles' and policyname='Users can insert own roles') then
    create policy "Users can insert own roles"
    on public.user_roles for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

-- backfill from existing profile role
insert into public.user_roles(user_id, role)
select id, role
from public.profiles
where role in ('distributor', 'shopkeeper')
on conflict (user_id, role) do nothing;

commit;
