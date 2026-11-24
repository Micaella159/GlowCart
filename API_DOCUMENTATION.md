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

The API does not implement authentication, write endpoints, cart synchronization, checkout/idempotency, payments, orders, or AI. No request contract is provided for those features.
