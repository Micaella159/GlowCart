# GlowCart

GlowCart is a mobile-first React/Vite beauty-shopping PWA. Its browser app talks to an Express REST API, and only the API connects to Neon PostgreSQL.

## Features

- Product catalog with search, category filters, product details, local product-image fallbacks, and loading/error/empty states.
- Shopping cart saved in browser storage, with quantity updates and item removal. The subtotal is an estimate; there is no server-side checkout.
- Responsive navigation, online/offline indicator, web app manifest, icons, and Workbox caching for the app shell, public product responses, and images.
- Express endpoints for API health, product listing, and product lookup.

Login, registration, orders, checkout/payment, and AI discovery are not implemented. Their routes explain the limitation and do not simulate successful transactions.

## Technologies and structure

- Frontend: React, Vite, React Router, CSS, `vite-plugin-pwa`.
- Backend: Node.js, Express, `pg`.
- Database: Neon PostgreSQL.

```text
src/                         React app, pages, contexts, API client
public/                      Manifest, icons, offline page, product photos
backend/server.js            Express entry point
backend/src/config/db.js     PostgreSQL pool and TLS settings
backend/src/routes/          REST routes
backend/src/db/migrations/   Versioned SQL schema
backend/src/db/seeds/        Separate, reviewable product seed SQL
render.yaml                  Render Blueprint for static frontend + API
```

## Local setup

Create a Neon project and copy its pooled PostgreSQL connection string from the Neon Console. Keep its `sslmode=require` option. Add it directly to `backend/.env`; never paste it into source files, frontend environment variables, or chat. Do not overwrite an existing `.env` until you have safely exported any database records you intend to retain.

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run db:migrate
npm run dev
```

In another terminal at the project root:

```powershell
npm ci
npm run dev
```

The local Vite proxy forwards `/api` to `http://localhost:5000`. The frontend defaults to `/api/v1`; set `VITE_API_BASE_URL` in a local frontend `.env.local` only when using a different API origin. Never put `DATABASE_URL` in a `VITE_*` variable.

The migration creates the products table and migration ledger but does not insert, copy, or delete product records. If moving existing records, export/import and verify them separately before switching over. Keep the old database until the transfer is checked.

The optional product seed is separate from schema migrations at `backend/src/db/seeds/001_products.sql`. Review it before running; its IDs make repeated execution skip those same rows.

## Configuration

Backend variables are documented in [`backend/.env.example`](./backend/.env.example):

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `DATABASE_URL` (Neon pooled PostgreSQL URL; backend only)
- `AUTH_TOKEN_SECRET` (backend-only random secret, at least 32 characters)
- `AUTH_SESSION_TTL_HOURS` (optional; defaults to 168, maximum 720)
- `OPENAI_API_KEY` (backend-only; optional until Beauty AI is enabled)
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)

Frontend example: [`.env.example`](./.env.example). `VITE_API_BASE_URL` is public and must contain only the API base URL.

## API

The API is rooted at `/api/v1`. See [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for request/response examples and error codes.

## Checks

```powershell
npm run lint
npm run build
```

Run backend tests from `backend/` with `npm test`. Apply database schema changes with `npm run db:migrate`; this also creates authentication tables while preserving the existing products and records. Verify the database with `GET /api/v1/health` and the catalog with `GET /api/v1/products`.

## Render deployment

[`render.yaml`](./render.yaml) defines a Node API service rooted at `backend/` and a static frontend rooted at the repository root. After connecting the repository to Render, provide:

- `DATABASE_URL` on the API service: Neon pooled connection string.
- `FRONTEND_URL` on the API service: the exact frontend origin assigned by Render.
- `VITE_API_BASE_URL` on the static site is configured in `render.yaml` as `https://glowcart-api-slg5.onrender.com/api/v1`.

The API `FRONTEND_URL` is prompted as an unsynchronized Blueprint variable; use the exact frontend URL shown in Render. Do not put database credentials in the frontend. Follow [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for deployment steps. No GitHub push or Render deployment has been performed by this project setup.

## Git safety

`.env`, dependencies, and build output are ignored. Check `git status` and confirm `backend/.env` is ignored and not tracked before committing. Keep example files limited to placeholders.
