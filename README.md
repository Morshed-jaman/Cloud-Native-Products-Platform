# Products Application

A full-stack Products app with a React + Vite frontend, an Express + TypeScript backend, PostgreSQL persistence, and Redis caching for the product list.

## Prerequisites

- Docker
- Docker Compose

## Run Locally

```bash
cp .env.example .env
docker compose up --build
```

The frontend runs at `http://localhost:3000` and the backend runs at `http://localhost:4000`.

The backend runs SQL migrations automatically on startup from `backend/migrations`.

## Run Backend Tests

```bash
cp .env.example .env
docker compose run --rm backend npm test
```

The backend tests use Supertest with an injected in-memory repository and cache, so they do not need a live Postgres or Redis instance.

## API Endpoints

### `GET /health`

Checks PostgreSQL and Redis connectivity.

Response:

```json
{
  "status": "ok",
  "postgres": true,
  "redis": true
}
```

### `GET /api/products`

Returns all products. The backend checks Redis key `products:all` first and caches database results for 30 seconds on cache miss.

Response:

```json
[
  {
    "id": "4a4abf2f-627a-46c8-bcfd-e635f7fd1c23",
    "name": "Wireless Mouse",
    "description": "Compact Bluetooth mouse",
    "price": 29.99,
    "created_at": "2026-07-03T10:00:00.000Z",
    "updated_at": "2026-07-03T10:00:00.000Z"
  }
]
```

### `GET /api/products/:id`

Returns one product.

Not found response:

```json
{
  "error": "Product not found"
}
```

### `POST /api/products`

Creates a product and invalidates the product-list cache.

Request:

```json
{
  "name": "Wireless Mouse",
  "description": "Compact Bluetooth mouse",
  "price": 29.99
}
```

Success response:

```json
{
  "id": "4a4abf2f-627a-46c8-bcfd-e635f7fd1c23",
  "name": "Wireless Mouse",
  "description": "Compact Bluetooth mouse",
  "price": 29.99,
  "created_at": "2026-07-03T10:00:00.000Z",
  "updated_at": "2026-07-03T10:00:00.000Z"
}
```

Validation error response:

```json
{
  "error": "Name is required"
}
```

### `PUT /api/products/:id`

Updates any subset of `name`, `description`, and `price`, then invalidates the product-list cache.

Request:

```json
{
  "price": 34.99
}
```

Success response:

```json
{
  "id": "4a4abf2f-627a-46c8-bcfd-e635f7fd1c23",
  "name": "Wireless Mouse",
  "description": "Compact Bluetooth mouse",
  "price": 34.99,
  "created_at": "2026-07-03T10:00:00.000Z",
  "updated_at": "2026-07-03T10:05:00.000Z"
}
```

### `DELETE /api/products/:id`

Deletes a product and invalidates the product-list cache.

Success response:

```text
204 No Content
```

Not found response:

```json
{
  "error": "Product not found"
}
```
