-- ============================================================
-- Flexible Product Categories Migration
-- Run this once on existing Supabase project.
-- ============================================================

begin;

-- Drop old category check constraints dynamically
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table public.products drop constraint if exists %I', c.conname);
  end loop;
end $$;

-- Normalize existing data
update public.products
set category = lower(trim(category))
where category is not null;

update public.products
set category = 'other'
where category is null or trim(category) = '';

-- Ensure flexible text category
alter table public.products
  alter column category type text using category::text;

alter table public.products
  alter column category set default 'other';

alter table public.products
  alter column category set not null;

commit;
