# Neon, GitHub, and Render Deployment

The frontend is at the repository root; the Express API is in `backend/`. The API is already deployed as directed by the project owner. This guide covers preparing changes for the existing Render services; no migration, push, or deployment is performed automatically.

## 1. Create and configure Neon

1. Create a Neon project and database.
2. In the Neon Console, choose **Connect**, select your branch/database/role, and copy the pooled connection string (the host includes `-pooler`).
3. Keep the generated `sslmode=require` option (and any `channel_binding=require` option) in the URL.
4. Put the URL in `backend/.env` as `DATABASE_URL`. Do not put it in a frontend variable or share it in chat.
5. Apply the schema from the backend folder:

   ```powershell
   Set-Location backend
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   npm ci
   npm run db:migrate
   ```

The migration runner applies numbered migrations once. The existing products migration and product rows are preserved; the new authentication migration only adds users and session tables. Migrations do not seed, copy, or delete product rows.

## 2. Verify locally

In the backend folder:

```powershell
npm start
```

In a second terminal at the repository root:

```powershell
npm ci
npm run dev
npm run lint
npm run build
```

Verify `GET /api/v1/health` and `GET /api/v1/products`. The local Vite proxy forwards `/api` to `http://localhost:5000`. The backend must use the Neon URL in `backend/.env`; no Neon credentials are included in this repository.

Run backend route tests from `backend/` with `npm test`. These use an isolated in-memory test store and do not write test accounts to Neon.

## 3. Prepare GitHub

The local repository is already initialized on `main`, and `origin` is already configured for the repository supplied by the user. Nothing is pushed by these instructions. Before staging:

```powershell
git status --short
git check-ignore -v backend/.env
git ls-files backend/.env
```

Review the status and confirm no secret is staged. After you explicitly approve a push, run:

```powershell
git add -A
git commit -m "Prepare GlowCart for Neon deployment"
git push -u origin main
```

The current working repository already has Git initialized and `origin` set, so do not run the setup commands again here. For a fresh local copy only, the exact initialization/remote commands are:

```powershell
git init -b main
git remote add origin https://github.com/Micaella159/GlowCart.git
```

## 4. Update the existing Render services

1. Do not create duplicate Render services. Open the existing API and static-site services (or their existing Blueprint) and confirm they use the intended repository and branch.
2. Push the reviewed changes to GitHub only when ready. Render may automatically deploy a push depending on the service's auto-deploy setting.
3. Confirm the services:
   - `glowcart-api`: Node web service, root `backend`, build `npm ci`, start `npm start`, health path `/api/v1/health`.
   - `glowcart-web`: static site, repository root, build `npm ci && npm run build`, publish directory `dist`, SPA rewrite to `/index.html`.
4. In the API service environment, set or confirm:
   - API `DATABASE_URL`: the Neon pooled URL (secret; leave `sslmode=require`).
   - API `FRONTEND_URL`: the exact HTTPS origin Render assigns to the static site.
   - API `AUTH_TOKEN_SECRET`: a newly generated random secret of at least 32 characters. Keep it only in Render's backend environment.
   - API `GEMINI_API_KEY`: a Gemini API key stored only in the backend environment. Beauty AI returns a clear configuration error until this is set.
   - API `AUTH_SESSION_TTL_HOURS`: optional; defaults to `168`.
   - API `GEMINI_MODEL`: optional; defaults to `gemini-3.5-flash-lite`. Google AI Studio free-tier quotas and data-use terms apply.
5. In the static site's build environment, set or confirm `VITE_API_BASE_URL=https://glowcart-api-slg5.onrender.com/api/v1`. It is public configuration, not a secret.
6. After the updated API code is deployed, run `npm run db:migrate` in the API service's **Shell**. Review the migration first; it adds `users` and `auth_sessions` only and does not change product rows.
7. Redeploy/rebuild the frontend after setting its build-time variable. Confirm the API health check and the actual service URLs in the Render dashboard; do not use guessed frontend hostnames.

## 5. Verify deployment

Open these URLs using the actual domains from Render:

```text
https://<actual-api-host>/api/v1/health
https://<actual-api-host>/api/v1/products
https://<actual-frontend-host>/
https://<actual-frontend-host>/products/<product-id>
```

Check the browser network panel for a successful product request, verify a nested route survives refresh, and confirm the API response is not a cached error. Test the PWA installation and offline catalog behavior on a supported browser/device. A deployment URL is not available until Render creates the services.

## Current limitations

The API supports health, product listing/detail, user sessions, and AI product discovery. Checkout/idempotency, payment, and orders are not implemented. Keep provider/authentication secrets on the backend, never in `VITE_*` variables.
