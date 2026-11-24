# GlowCart

GlowCart is a React + Vite beauty-shopping PWA with an Express API backed by Supabase PostgreSQL.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to the Supabase PostgreSQL connection string. Never commit this file.
2. Install and start the API:

   ```powershell
   cd backend
   npm ci
   npm run dev
   ```

3. In a second terminal, start the frontend:

   ```powershell
   npm ci
   npm run dev
   ```

   Vite proxies `/api` to `http://localhost:5000`. The API should respond at `/api/v1/health` and `/api/v1/products`.

## Checks

```powershell
npm run lint
npm run build
```

The current backend serves the product catalog. Login, orders, checkout/payment, and AI routes are not implemented yet; frontend routes explain their unavailable status rather than faking success.

## Render deploy

The root `render.yaml` defines two Render services: `glowcart-api` (Node web service, rooted at `backend`) and `glowcart-web` (static site). Push this repository to GitHub, then in Render choose **New → Blueprint** and select the repository containing `render.yaml`.

During Blueprint setup, provide `DATABASE_URL` as a secret for the API service. It must be the Supabase Postgres connection string, not a Supabase `service_role` key. The frontend API URL and backend CORS origin in `render.yaml` assume the default service domains:

- `https://glowcart-api.onrender.com`
- `https://glowcart-web.onrender.com`

If Render assigns different URLs, update `VITE_API_BASE_URL` and `FRONTEND_URL` to match the actual service domains and redeploy both services. Do not put database credentials in frontend variables.

Render serves HTTPS automatically, and the static-site rewrite in the Blueprint supports client-side routes. Verify `/api/v1/health`, `/api/v1/products`, product images, and a direct refresh of a nested route after deployment.

## PWA

The manifest and PNG icons are in `public/`; Workbox precaches the app shell and caches product GET responses and images. Offline mode does not support checkout or payment. Confirm installation in Chrome DevTools → Application → Manifest and Service Workers.

## GitHub safety

The repository ignores `.env` files, dependencies, and build output. Before the first push, check `git status` and confirm neither `backend/.env` nor any credentials are staged. Keep `.env.example` files limited to placeholders.
