# Render Deploy Guide (DairyWalla)

## Deployment Type
- Frontend: Render Static Runtime via `render.yaml`
- Backend/Auth/DB: Supabase (already external)

## 1) Pre-check
- GitHub repo updated ho.
- Supabase project ready ho aur credentials available ho:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 2) Deploy from Blueprint
1. Render Dashboard me jao.
2. `New` -> `Blueprint`.
3. GitHub repo `aman2626786/Dairy-Walla` select karo.
4. Render `render.yaml` detect karega.
5. Service create hone se pehle env vars set karo:
   - `VITE_SUPABASE_ENABLED` = `true`
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Deploy start karo.

## 3) Important Notes
- SPA routing already configured hai:
  - `/* -> /index.html` rewrite
- Build command:
  - `npm ci && npm run build`
- Publish directory:
  - `dairy-setu/dist`

## 4) After Deploy
- App open karke login/signup flow test karo.
- Agar auth fail ho to Render env vars re-check karo.
- Supabase dashboard me Auth + table records confirm karo.
