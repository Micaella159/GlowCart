# GlowCart API

Base path: `/api/v1`. All responses are JSON. Successes use `{ "success": true, "data": ..., "meta": ... }`; errors use `{ "success": false, "error": { "code": ..., "message": ..., "details": null }, "requestId": ... }`.

## `GET /api/v1`

Returns an API welcome message. No authentication is required.

```json
{
  "success": true,
  "data": { "message": "Welcome to GlowCart API!" },
  "meta": { "requestId": "request-uuid" }
}
```

## `GET /api/v1/health`

Runs a small query on the configured Neon PostgreSQL pool.

Success (`200`):

```json
{
  "success": true,
  "data": { "status": "ok", "database": "connected" },
  "meta": { "requestId": "request-uuid" }
}
```

Database unavailable (`503`):

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "The database is temporarily unavailable.",
    "details": null
  },
  "requestId": "request-uuid"
}
```

## `GET /api/v1/products`

Returns active products newest first. No authentication is currently required.

Success (`200`):

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "00000000-0000-4000-8000-000000000001",
        "name": "Hydrating Face Serum",
        "description": "A hydrating serum for everyday skincare.",
        "price": "299.00",
        "imageUrl": null,
        "category": "Skincare",
        "stock": 30
      }
    ]
  },
  "meta": { "count": 1, "requestId": "request-uuid" }
}
```

Database failure returns `503` with code `PRODUCTS_UNAVAILABLE`. When `imageUrl` is empty, the frontend maps known product names to local product photos; failed API requests do not create fake product records.

## `GET /api/v1/products/:id`

Returns one active product. `id` must be a UUID.

- Invalid UUID: `400 INVALID_PRODUCT_ID`.
- Product not found or inactive: `404 PRODUCT_NOT_FOUND`.
- Database unavailable: `503 PRODUCTS_UNAVAILABLE`.

Success response:

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "00000000-0000-4000-8000-000000000001",
      "name": "Hydrating Face Serum",
      "description": "A hydrating serum for everyday skincare.",
      "price": "299.00",
      "imageUrl": null,
      "category": "Skincare",
      "stock": 30
    }
  },
  "meta": { "requestId": "request-uuid" }
}
```

## Authentication

Passwords are hashed with bcrypt before storage. Sessions use random bearer tokens; only HMAC-SHA-256 hashes of tokens are stored in Neon. Send the returned token as `Authorization: Bearer <token>`. Sessions expire after `AUTH_SESSION_TTL_HOURS` (default 168 hours) and logout revokes the session.

### `POST /api/v1/auth/register`

Request:

```json
{
  "name": "Ava Santos",
  "email": "ava@example.com",
  "password": "a-long-password"
}
```

Returns `201` with `{ "success": true, "data": { "user": { "id": "uuid", "name": "Ava Santos", "email": "ava@example.com" }, "token": "opaque-session-token", "expiresAt": "timestamp" }, "meta": { "requestId": "request-uuid" } }`.

- Invalid fields: `400 INVALID_NAME`, `INVALID_EMAIL`, or `INVALID_PASSWORD`.
- Existing email (case-insensitive): `409 EMAIL_ALREADY_REGISTERED`.
- Missing/invalid `AUTH_TOKEN_SECRET`: `503 AUTH_NOT_CONFIGURED`.
- More than 10 register/login attempts per 15 minutes: `429 AUTH_RATE_LIMITED`.

### `POST /api/v1/auth/login`

Request:

```json
{ "email": "ava@example.com", "password": "a-long-password" }
```

Returns `200` with the same session shape as registration. Invalid credentials return `401 INVALID_CREDENTIALS`; malformed fields return `400 INVALID_CREDENTIALS`.

### `GET /api/v1/auth/me`

Requires a valid bearer token. Returns `200` with `{ "success": true, "data": { "user": { "id": "uuid", "name": "Ava Santos", "email": "ava@example.com" } }, "meta": { "requestId": "request-uuid" } }`. Missing, revoked, or expired sessions return `401`.

### `POST /api/v1/auth/logout`

Requires a valid bearer token. Revokes the server-side session and returns `200` with `{ "success": true, "data": { "loggedOut": true }, "meta": { "requestId": "request-uuid" } }`.

Registration and login are rate limited. The API accepts passwords from 8 to 72 UTF-8 bytes and emails are normalized to lowercase.

## Beauty AI discovery

### `POST /api/v1/ai/discovery`

Request:

```json
{
  "prompt": "A gentle moisturizer for dry skin",
  "limit": 3
}
```

`limit` is optional and defaults to 3; valid values are integers from 1 to 5. Prompts must be 5 to 500 characters. The API sends the prompt and the current in-stock catalog to OpenAI using backend-only `OPENAI_API_KEY` and `OPENAI_MODEL` configuration. Do not include sensitive personal information in a discovery prompt.

Returns `200` with database-verified products:

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "product": {
          "id": "product-uuid",
          "name": "Daily Moisturizer",
          "description": "Product description",
          "price": "349.00",
          "imageUrl": "/products/moisturizer.jpg",
          "category": "Skincare",
          "stock": 12
        },
        "reason": "A short explanation based on your stated goal."
      }
    ]
  },
  "meta": { "count": 1, "requestId": "request-uuid" }
}
```

The model may return product IDs and reasons only. The API checks IDs against active, in-stock rows and returns names, prices, image paths, and stock from Neon; AI-supplied prices or stock are discarded. Unknown IDs are never shown as products.
If the catalog has no in-stock products, the API returns an empty `recommendations` array.

- Invalid request: `400 INVALID_DISCOVERY_PROMPT` or `INVALID_DISCOVERY_LIMIT`.
- Missing `OPENAI_API_KEY`: `503 AI_NOT_CONFIGURED`.
- Provider outage: `503 AI_PROVIDER_UNAVAILABLE`; timeout: `504 AI_PROVIDER_TIMEOUT`.
- Invalid provider output: `502 AI_INVALID_RESPONSE`.
- More than 10 requests per minute: `429 AI_RATE_LIMITED`.

## Other errors

- Unknown API path: `404 ENDPOINT_NOT_FOUND`.
- Disallowed browser origin: `403 CORS_ORIGIN_DENIED`.
- Invalid JSON body: `400 INVALID_JSON`.
- Unexpected server error: `500 INTERNAL_SERVER_ERROR`; internal database details are not returned.

Every request gets an `X-Request-ID` header; the same identifier appears in response metadata or the error body.

## Runtime configuration

- `NODE_ENV`: runtime mode.
- `PORT`: HTTP port; defaults to `5000` locally. Render supplies the production port.
- `FRONTEND_URL`: exact allowed frontend origin for CORS.
- `DATABASE_URL`: Neon pooled PostgreSQL URL, configured only in the backend environment. Keep the generated `sslmode=require` query option.
- `AUTH_TOKEN_SECRET`: backend-only random secret (at least 32 characters) used to HMAC session tokens before storing them.
- `AUTH_SESSION_TTL_HOURS`: optional integer from 1 to 720; defaults to 168.
- `OPENAI_API_KEY`: backend-only OpenAI API key. Without it, discovery returns `503 AI_NOT_CONFIGURED`.
- `OPENAI_MODEL`: optional OpenAI chat model; defaults to `gpt-4o-mini`.

Run `npm run db:migrate` from `backend/` to add the authentication tables. The migration runner records numbered SQL migrations and does not modify existing products.
