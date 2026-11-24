# Neon, GitHub, and Render Deployment

The frontend is at the repository root; the Express API is in `backend/`. The project is prepared for two Render services and a Neon PostgreSQL database. It has not been pushed or deployed.

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

The migration is repeatable and creates only the products schema plus a migration ledger. It does not seed or copy product rows. If the previous database contains records to retain, export/import those rows into Neon and compare counts before switching the application. Do not delete the old database before verifying the transfer.

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

## 4. Deploy the Render Blueprint

1. Push the project to GitHub only after reviewing the staged files and approving the push.
2. In Render, choose **New → Blueprint** and connect the repository containing `render.yaml`.
3. Confirm the services:
   - `glowcart-api`: Node web service, root `backend`, build `npm ci`, start `npm start`, health path `/api/v1/health`.
   - `glowcart-web`: static site, repository root, build `npm ci && npm run build`, publish directory `dist`, SPA rewrite to `/index.html`.
4. Render will prompt for unsynchronized environment variables. Set:
   - API `DATABASE_URL`: the Neon pooled URL (secret; leave `sslmode=require`).
   - API `FRONTEND_URL`: the exact HTTPS origin Render assigns to the static site.
   - Frontend `VITE_API_BASE_URL` is configured in `render.yaml` as `https://glowcart-api-slg5.onrender.com/api/v1`; confirm the static site's Render environment uses this value.
5. Deploy/redeploy after setting the variables. Do not use example or guessed Render hostnames; copy the real service URLs from the Render dashboard.
6. In the API service's **Shell**, run `npm run db:migrate` once after `DATABASE_URL` is set. This creates the products table before catalog requests are tested.

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

The API currently supports health, product listing, and product detail only. Authentication, checkout/idempotency, payment, orders, and AI are not implemented. The Neon connection and data transfer require your Neon account and are not verified yet.
