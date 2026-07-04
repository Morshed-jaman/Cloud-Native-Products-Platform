import crypto from "crypto";
import type { Pool, QueryResult, QueryResultRow } from "pg";
import request from "supertest";
import { createApp } from "../app";
import { createPostgresProductRepository } from "../repositories/products";
import type { CacheClient, HealthCheck, Product } from "../types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: "Test Product",
    description: null,
    price: 10,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function queryResult<T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> {
  return {
    rows,
    rowCount
  } as QueryResult<T>;
}

function makeMockPool(initialProducts: Product[] = []): Pool {
  const products = [...initialProducts];

  // These integration tests mock the pg Pool at the query boundary instead of
  // using a separate database. That keeps HTTP, validation, repository, caching,
  // and error paths covered while avoiding external services in tests.
  const mockPool = {
    async query(queryText: string, values: unknown[] = []): Promise<QueryResult<Product>> {
      if (queryText.includes("FROM products ORDER BY created_at DESC")) {
        return queryResult(products);
      }

      if (queryText.includes("FROM products WHERE id = $1")) {
        const product = products.find((candidate) => candidate.id === values[0]);
        return queryResult(product ? [product] : []);
      }

      if (queryText.includes("INSERT INTO products")) {
        const [name, description, price] = values;
        const product = makeProduct({
          name: String(name),
          description: description === null ? null : String(description),
          price: Number(price)
        });
        products.unshift(product);
        return queryResult([product], 1);
      }

      if (queryText.includes("UPDATE products")) {
        const id = values[values.length - 1];
        const product = products.find((candidate) => candidate.id === id);

        if (!product) {
          return queryResult([], 0);
        }

        let valueIndex = 0;
        if (queryText.includes("name =")) {
          product.name = String(values[valueIndex]);
          valueIndex += 1;
        }

        if (queryText.includes("description =")) {
          product.description = String(values[valueIndex]);
          valueIndex += 1;
        }

        if (queryText.includes("price =")) {
          product.price = Number(values[valueIndex]);
        }

        product.updated_at = new Date().toISOString();
        return queryResult([product], 1);
      }

      if (queryText.includes("DELETE FROM products WHERE id = $1")) {
        const index = products.findIndex((product) => product.id === values[0]);

        if (index === -1) {
          return queryResult([], 0);
        }

        products.splice(index, 1);
        return queryResult([], 1);
      }

      throw new Error(`Unhandled mock query: ${queryText}`);
    }
  };

  return mockPool as unknown as Pool;
}

function makeRepository(initialProducts: Product[] = []) {
  return createPostgresProductRepository(makeMockPool(initialProducts));
}

function makeCache(): CacheClient {
  const store = new Map<string, string>();

  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },

    async set(key: string, value: string): Promise<void> {
      store.set(key, value);
    },

    async del(key: string): Promise<void> {
      store.delete(key);
    }
  };
}

function makeHealthCheck(): HealthCheck {
  return {
    async checkPostgres(): Promise<boolean> {
      return true;
    },
    async checkRedis(): Promise<boolean> {
      return true;
    }
  };
}

function makeTestApp(initialProducts: Product[] = []) {
  return createApp({
    productRepository: makeRepository(initialProducts),
    cache: makeCache(),
    healthCheck: makeHealthCheck(),
    enableLogging: false
  });
}

describe("products API", () => {
  it("returns an empty product list", async () => {
    const response = await request(makeTestApp()).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns a populated product list", async () => {
    const product = makeProduct({ name: "Keyboard", price: 79.99 });

    const response = await request(makeTestApp([product])).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([product]);
  });

  it("rejects product creation when name is missing", async () => {
    const response = await request(makeTestApp())
      .post("/api/products")
      .send({ price: 10 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("creates a product", async () => {
    const response = await request(makeTestApp())
      .post("/api/products")
      .send({ name: "Monitor", description: "27 inch", price: 249.99 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Monitor",
      description: "27 inch",
      price: 249.99
    });
    expect(response.body.id).toEqual(expect.any(String));
  });

  it("returns 404 when deleting a missing product", async () => {
    const response = await request(makeTestApp()).delete(`/api/products/${crypto.randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Product not found" });
  });
});
