# DairyWalla Supabase Runbook

## 1) Full reset (fresh start)
1. Supabase Dashboard -> SQL Editor.
2. Run: `supabase-reset.sql`.
3. Re-run schema setup:
   - `supabase-schema.sql`
   - `supabase-trigger.sql`

## 2) Environment check (local app)
Make sure `.env` (or `.env.local`) has:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

If either is missing/incorrect, login/signup and all queries fail.

## 3) Query/data health check
1. Run app.
2. Do one signup as Distributor and one signup as Shopkeeper.
3. Run `supabase-diagnostics.sql` in SQL Editor.
4. Expected:
   - `auth.users` count >= `public.profiles` count.
   - Role mismatch query returns 0 rows.
   - Dual-profile users query returns 0 rows.

## 4) Auth loop and role verification
After recent fixes:
- Login role is derived from actual profile tables.
- If `profiles.role` stale/incorrect, app auto-syncs it.
- Route guards block wrong section access:
  - Distributor cannot stay in `/shop`.
  - Shopkeeper cannot stay in `/distributor`.

Manual test:
1. Signup Distributor -> complete profile -> you should land on `/distributor`.
2. Logout -> login same account -> should again land on `/distributor`.
3. Signup Shopkeeper -> complete profile -> should land on `/shop`.
4. Logout -> login same account -> should again land on `/shop`.

## 5) If `Invalid login credentials` appears
- Ensure exact email/password used at signup.
- Email should be lowercase/no extra spaces.
- Check user exists in `auth.users` (not only in `public.profiles`).

## 6) Enable manual product categories
If distributors need custom categories (for example `lassi`, `ice cream`, `khoa`), run:

- `supabase-flexible-product-categories.sql`

This removes old fixed-category check constraint from `products.category` and allows manual text categories.
